/**
 * Report Export Service
 *
 * Handles consolidated export of MCU data:
 * - Single Excel file with complete employee + MCU + lab data
 * - All lab results (filled or empty)
 * - All physical exam parameters
 * - All EKG and other examinations
 * - Both initial and final notes
 * - No ID columns (data anonymization)
 */

import { labService } from './labService.js';

class ReportExportService {
  /**
   * Determine lab result status (Normal/Low/High)
   */
  determineLabStatus(value, minRange, maxRange) {
    if (value === null || value === undefined || value === '') {
      return '-';
    }

    const numValue = parseFloat(value);
    const numMin = parseFloat(minRange);
    const numMax = parseFloat(maxRange);

    if (isNaN(numValue) || isNaN(numMin) || isNaN(numMax)) {
      return 'Unknown';
    }

    if (numValue < numMin) return 'Low';
    if (numValue > numMax) return 'High';
    return 'Normal';
  }

  /**
   * Group lab items by category/type
   */
  groupLabItemsByCategory() {
    const groups = {
      'Darah (Blood)': [1, 2, 3, 5, 6], // SGOT, SGPT, Hemoglobin, Leukosit, Trombosit
      'Metabolik (Metabolic)': [7, 8, 9, 10, 11, 12, 13, 31, 32] // Gula darah, Kolesterol, Ureum, Kreatinin, Asam Urat
    };
    return groups;
  }

  /**
   * Build consolidated export data for single sheet
   * One row = one employee with all their data
   * ✅ FIXED: Uses database lab items, not hardcoded mapping
   */
  async buildConsolidatedData(filteredMCUs, employees, allDepartments, allJobTitles) {
    const consolidatedData = [];
    const processedEmployees = new Set();

    // Get all lab items from database (not hardcoded)
    const allLabItems = await labService.getAllLabItems(false);

    for (const mcu of filteredMCUs) {
      // Skip soft-deleted MCU
      if (mcu.deletedAt) continue;

      const employee = employees.find(e => e.employeeId === mcu.employeeId);
      if (!employee || employee.deletedAt) continue;

      // Only process each employee once (take latest MCU)
      if (processedEmployees.has(employee.employeeId)) continue;
      processedEmployees.add(employee.employeeId);

      // Get department and job title names
      const empDept = (employee.department || '').trim();
      const dept = allDepartments.find(d =>
        d.name === empDept ||
        (d.name && d.name.trim().toLowerCase() === empDept.toLowerCase())
      );

      const empJobTitle = (employee.jobTitle || '').trim();
      const jobTitle = allJobTitles.find(j =>
        j.name === empJobTitle ||
        (j.name && j.name.trim().toLowerCase() === empJobTitle.toLowerCase())
      );

      // Get all lab results for this MCU
      const labResults = await labService.getPemeriksaanLabByMcuId(mcu.mcuId);

      // Build lab results map
      const labMap = {};
      labResults.forEach(lab => {
        labMap[lab.lab_item_id] = lab;
      });

      // Build base row with fixed column order (important for clean CSV)
      // ✅ FIXED: Only use columns that exist in database schema
      const row = {
        // Employee Info (columns 1-6)
        nama_karyawan: employee.name || '-',
        departemen: (dept && dept.name) ? dept.name : empDept || '-',
        jabatan: (jobTitle && jobTitle.name) ? jobTitle.name : empJobTitle || '-',
        tanggal_lahir: employee.birthDate || '-',
        jenis_kelamin: employee.jenisKelamin || '-',
        golongan_darah: employee.bloodType || '-',

        // MCU Info (columns 7-10)
        tanggal_mcu: new Date(mcu.mcuDate).toLocaleDateString('id-ID'),
        tipe_mcu: mcu.mcuType || '-',
        dokter: mcu.doctor || '-',

        // Vital Signs & Measurements (columns 11-15)
        tekanan_darah: mcu.bloodPressure || '-',
        nadi: mcu.pulse || '-',
        suhu: mcu.temperature || '-',
        respiratory_rate: mcu.respiratoryRate || '-',
        bmi: mcu.bmi || '-',

        // Examination Results (columns 16-20)
        vision: mcu.vision || '-',
        colorblind: mcu.colorblind || '-',
        audiometry: mcu.audiometry || '-',
        spirometry: mcu.spirometry || '-',
        napza: mcu.napza || '-',

        // Investigasi Results (columns 21-23)
        hbsag: mcu.hbsag || '-',
        xray: mcu.xray || '-',
        ekg: mcu.ekg || '-',
        treadmill: mcu.treadmill || '-',

        // Clinical Info (columns 24-27)
        keluhan_utama: mcu.keluhanUtama || '-',
        diagnosis_kerja: mcu.diagnosisKerja || '-',
        alasan_rujuk: mcu.alasanRujuk || '-',
        recipient: mcu.recipient || '-',

        // Overall Status & Notes (columns 28-31)
        status_kesehatan: mcu.initialResult || '-',
        hasil_awal: mcu.initialResult || '-',
        hasil_akhir: mcu.finalResult || '-',
        catatan_awal: mcu.initialNotes || '-',
        catatan_akhir: mcu.finalNotes || '-'
      };

      // ✅ Add lab VALUES in database order (only from actual database items)
      // Sort by database ID for consistent column order
      const sortedLabItems = allLabItems.sort((a, b) => a.id - b.id);

      for (const labItem of sortedLabItems) {
        const labResult = labMap[labItem.id];
        const labValue = labResult ? labResult.value : null;

        // Column name: lab_[name converted to snake_case]
        const colName = `lab_${labItem.name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')}`;

        row[colName] = labValue || '-';
      }

      consolidatedData.push(row);
    }

    return consolidatedData;
  }

  /**
   * Convert data to CSV format with consistent column ordering
   * ✅ FIXED: Maintains consistent column order across all rows
   */
  dataToCSV(dataArray) {
    if (dataArray.length === 0) {
      return '';
    }

    // Define column order to ensure consistent export format
    // ✅ FIXED: Only include columns that exist in database schema
    const columnOrder = [
      // Employee Info (6 cols)
      'nama_karyawan', 'departemen', 'jabatan', 'tanggal_lahir', 'jenis_kelamin', 'golongan_darah',
      // MCU Info (3 cols)
      'tanggal_mcu', 'tipe_mcu', 'dokter',
      // Vital Signs & Measurements (5 cols)
      'tekanan_darah', 'nadi', 'suhu', 'respiratory_rate', 'bmi',
      // Examination Results (5 cols)
      'vision', 'colorblind', 'audiometry', 'spirometry', 'napza',
      // Investigasi Results (4 cols)
      'hbsag', 'xray', 'ekg', 'treadmill',
      // Clinical Info (4 cols)
      'keluhan_utama', 'diagnosis_kerja', 'alasan_rujuk', 'recipient',
      // Status & Notes (5 cols)
      'status_kesehatan', 'hasil_awal', 'hasil_akhir', 'catatan_awal', 'catatan_akhir'
      // Lab items will be added dynamically at the end
    ];

    // Get all unique keys and extract lab items (any key starting with 'lab_')
    const allKeys = new Set();
    const labKeys = [];

    dataArray.forEach(row => {
      Object.keys(row).forEach(key => {
        allKeys.add(key);
        if (key.startsWith('lab_') && !labKeys.includes(key)) {
          labKeys.push(key);
        }
      });
    });

    // Sort lab keys alphabetically for consistent order
    labKeys.sort();

    // Final column order: base columns + lab columns
    const keys = [...columnOrder, ...labKeys];

    // Create header row with proper formatting
    const headerRow = keys.map(key =>
      `"${key.replace(/_/g, ' ').toUpperCase()}"`
    ).join(',');

    // Create data rows
    const dataRows = dataArray.map(row => {
      return keys.map(key => {
        let value = row[key] === null || row[key] === undefined ? '' : String(row[key]);
        // Clean up: remove newlines and extra whitespace to prevent multi-line cells
        value = value.replace(/\n/g, ' ').replace(/\r/g, '').trim();
        // Escape quotes and wrap in quotes
        return `"${value.replace(/"/g, '""')}"`;
      }).join(',');
    });

    // Add UTF-8 BOM for Excel compatibility
    const bom = '\ufeff';
    return bom + [headerRow, ...dataRows].join('\n');
  }

  /**
   * Main export function - generates single consolidated Excel (as CSV)
   */
  async exportConsolidatedReport(filteredMCUs, employees, allDepartments, allJobTitles) {
    try {
      // Build consolidated data
      const consolidatedData = await this.buildConsolidatedData(
        filteredMCUs,
        employees,
        allDepartments,
        allJobTitles
      );

      if (consolidatedData.length === 0) {
        throw new Error('Tidak ada data untuk di-export');
      }

      // Convert to CSV
      const csvContent = this.dataToCSV(consolidatedData);

      // Generate filename
      const now = new Date();
      const dateStr = now.toISOString().split('T')[0];
      const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '-');
      const filename = `laporan-mcu-lengkap-${dateStr}-${timeStr}.csv`;

      // Download
      this.downloadCSV(csvContent, filename);

      return {
        success: true,
        message: `Export berhasil! ${consolidatedData.length} data karyawan`,
        dataCount: consolidatedData.length
      };
    } catch (error) {
      console.error('[ReportExportService] Export error:', error);
      return {
        success: false,
        message: 'Gagal export: ' + error.message,
        error: error
      };
    }
  }

  /**
   * Helper: Download CSV file
   */
  downloadCSV(csvContent, filename) {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}

export const reportExportService = new ReportExportService();
