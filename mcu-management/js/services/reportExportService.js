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

import { supabaseReady, isSupabaseEnabled } from '../config/supabase.js';
import { labService } from './labService.js';
import { LAB_ITEMS_MAPPING, getAllLabItems } from '../data/labItemsMapping.js';

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
   */
  async buildConsolidatedData(filteredMCUs, employees, allDepartments, allJobTitles) {
    const consolidatedData = [];
    const processedEmployees = new Set();

    // Get all lab items for reference
    const allLabItems = getAllLabItems();

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

      // Build base row
      const row = {
        // Employee Info
        nama_karyawan: employee.name || '-',
        departemen: (dept && dept.name) ? dept.name : empDept || '-',
        jabatan: (jobTitle && jobTitle.name) ? jobTitle.name : empJobTitle || '-',
        tanggal_lahir: employee.birthDate || '-',
        jenis_kelamin: employee.jenisKelamin || '-',
        golongan_darah: employee.bloodType || '-',

        // MCU Info
        tanggal_mcu: new Date(mcu.mcuDate).toLocaleDateString('id-ID'),
        tipe_mcu: mcu.mcuType || '-',
        umur_saat_mcu: mcu.ageAtMCU || '-',
        dokter: mcu.doctor || '-',

        // Physical Exam Results
        tekanan_darah: mcu.bloodPressure || '-',
        nadi: mcu.pulse || '-',
        suhu: mcu.temperature || '-',
        bmi: mcu.bmi || '-',
        tinggi_badan: mcu.height || '-',
        berat_badan: mcu.weight || '-',

        // Physical Examination Categories
        mata: mcu.mata || '-',
        gigi: mcu.gigi || '-',
        telinga: mcu.telinga || '-',
        tenggorokan: mcu.tenggorokan || '-',
        jantung: mcu.jantung || '-',
        paru: mcu.paru || '-',
        perut: mcu.perut || '-',
        kulit: mcu.kulit || '-',
        muskuloskeletal: mcu.muskuloskeletal || '-',
        neurologi: mcu.neurologi || '-',

        // EKG
        ekg: mcu.ekg || '-',
        ekg_status: mcu.ekgStatus || '-',

        // X-Ray
        xray: mcu.xray || '-',
        xray_status: mcu.xrayStatus || '-',

        // USG
        usg: mcu.usg || '-',
        usg_status: mcu.usgStatus || '-',

        // Overall Status
        status_kesehatan: mcu.initialResult || '-',
        hasil_awal: mcu.initialResult || '-',
        hasil_akhir: mcu.finalResult || '-',

        // Notes
        catatan_awal: mcu.initialNotes || '-',
        catatan_akhir: mcu.finalNotes || '-'
      };

      // ✅ UPDATED: Add only lab VALUES (no status column)
      for (const labItem of allLabItems) {
        const labResult = labMap[labItem.id];
        const labValue = labResult ? labResult.value : null;

        // Column name only for lab value (no separate status column)
        const colName = `lab_${labItem.name.toLowerCase().replace(/\s+/g, '_')}`;

        row[colName] = labValue || '-';
      }

      consolidatedData.push(row);
    }

    return consolidatedData;
  }

  /**
   * Convert data to CSV format
   */
  dataToCSV(dataArray) {
    if (dataArray.length === 0) {
      return '';
    }

    // Get all unique keys (column names) from all rows
    const allKeys = new Set();
    dataArray.forEach(row => {
      Object.keys(row).forEach(key => allKeys.add(key));
    });

    const keys = Array.from(allKeys);

    // Create header row with proper formatting
    const headerRow = keys.map(key =>
      `"${key.replace(/_/g, ' ').toUpperCase()}"`
    ).join(',');

    // Create data rows
    const dataRows = dataArray.map(row => {
      return keys.map(key => {
        const value = row[key] === null || row[key] === undefined ? '' : String(row[key]);
        // Escape quotes and wrap in quotes
        return `"${value.replace(/"/g, '""')}"`;
      }).join(',');
    });

    return [headerRow, ...dataRows].join('\n');
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
