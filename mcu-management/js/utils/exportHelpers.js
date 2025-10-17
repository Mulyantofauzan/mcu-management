/**
 * Export Helper Utilities
 * Handle CSV and PDF export
 */

import { formatDateDisplay } from './dateHelpers.js';
import { showToast } from './uiHelpers.js';

/**
 * Export data to CSV
 */
export function exportToCSV(data, filename, columnMapping = null) {
  if (!data || data.length === 0) {
    showToast('Tidak ada data untuk diekspor', 'warning');
    return;
  }

  try {
    let headers;
    let rows;

    if (columnMapping) {
      // Use custom column mapping
      headers = Object.values(columnMapping);
      rows = data.map(row => {
        return Object.keys(columnMapping).map(key => {
          let value = row[key];
          if (value === null || value === undefined) return '';
          return value;
        });
      });
    } else {
      // Use all keys from first object
      headers = Object.keys(data[0]);
      rows = data.map(row => Object.values(row));
    }

    // Build CSV content
    const csvRows = [
      headers.join(','),
      ...rows.map(row =>
        row.map(cell => {
          if (cell === null || cell === undefined) return '';

          // Convert to string
          let value = String(cell);

          // Escape quotes and wrap in quotes if contains comma, quote, or newline
          if (value.includes(',') || value.includes('"') || value.includes('\n')) {
            value = `"${value.replace(/"/g, '""')}"`;
          }

          return value;
        }).join(',')
      )
    ];

    const csvContent = '\ufeff' + csvRows.join('\n'); // Add BOM for Excel UTF-8 support

    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${filename}_${Date.now()}.csv`;
    link.click();

    showToast('Data berhasil diekspor ke CSV', 'success');
  } catch (error) {
    console.error('Error exporting CSV:', error);
    showToast('Gagal mengekspor data: ' + error.message, 'error');
  }
}

/**
 * Export table to PDF (using html2pdf if available)
 */
export async function exportToPDF(elementId, filename) {
  try {
    // Check if html2pdf is loaded
    if (typeof html2pdf === 'undefined') {
      // Fallback: just print
      showToast('Menggunakan print untuk PDF...', 'info');
      window.print();
      return;
    }

    const element = document.getElementById(elementId);
    if (!element) {
      showToast('Element tidak ditemukan', 'error');
      return;
    }

    const opt = {
      margin: 10,
      filename: `${filename}_${Date.now()}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' }
    };

    await html2pdf().set(opt).from(element).save();
    showToast('PDF berhasil diekspor', 'success');
  } catch (error) {
    console.error('Error exporting PDF:', error);
    showToast('Gagal mengekspor PDF: ' + error.message, 'error');
  }
}

/**
 * Export MCU data with proper column names
 */
export function exportMCUData(mcuList, employees, filename = 'data_mcu') {
  const exportData = mcuList.map(mcu => {
    const employee = employees.find(e => e.employeeId === mcu.employeeId);

    return {
      'ID MCU': mcu.mcuId,
      'ID Karyawan': mcu.employeeId,
      'Nama Karyawan': employee?.name || '-',
      'Tanggal MCU': formatDateDisplay(mcu.mcuDate),
      'Jenis MCU': mcu.mcuType,
      'Usia': mcu.ageAtMCU,
      'BMI': mcu.bmi || '-',
      'Tekanan Darah': mcu.bloodPressure || '-',
      'Penglihatan': mcu.vision || '-',
      'HBsAg': mcu.hbsag || '-',
      'Hasil Awal': mcu.initialResult,
      'Hasil Akhir': mcu.finalResult || '-',
      'Status': mcu.status
    };
  });

  exportToCSV(exportData, filename);
}

/**
 * Export Employee data
 */
export function exportEmployeeData(employees, jobTitles, departments, filename = 'data_karyawan') {
  const exportData = employees.map(emp => {
    const jobTitle = jobTitles.find(j => j.jobTitleId === emp.jobTitleId);
    const department = departments.find(d => d.departmentId === emp.departmentId);

    return {
      'ID Karyawan': emp.employeeId,
      'Nama': emp.name,
      'Jabatan': jobTitle?.name || '-',
      'Departemen': department?.name || '-',
      'Tanggal Lahir': formatDateDisplay(emp.birthDate),
      'Status Karyawan': emp.employmentStatus,
      'Vendor': emp.vendorName || '-',
      'Status Aktif': emp.activeStatus,
      'Golongan Darah': emp.bloodType
    };
  });

  exportToCSV(exportData, filename);
}
