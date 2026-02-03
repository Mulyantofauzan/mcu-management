/**
 * Excel Export Service
 * Exports Jakarta Cardiovascular assessment data to Excel with styling
 * Uses ExcelJS from CDN (loaded in HTML)
 */

/**
 * Add resume/summary sheet to workbook
 * @param {Workbook} workbook - ExcelJS workbook
 * @param {array} allData - All cardiovascular data
 */
function addResumeSummarySheet(workbook, allData) {
    const ExcelJSLib = window.ExcelJS;
    const summarySheet = workbook.addWorksheet('Resume', { index: 0 });

    // Set column widths
    summarySheet.columns = [
        { width: 25 },
        { width: 15 },
        { width: 15 }
    ];

    // Add title
    const titleRow = summarySheet.addRow(['Jakarta Cardiovascular Score - Resume']);
    titleRow.font = { bold: true, size: 14, color: { argb: 'FF1F2937' } };
    titleRow.alignment = { horizontal: 'left', vertical: 'center' };

    // Add empty row
    summarySheet.addRow([]);

    // Add date
    const dateRow = summarySheet.addRow([`Generated: ${new Date().toLocaleDateString('id-ID')}`]);
    dateRow.font = { size: 10, color: { argb: 'FF6B7280' } };

    // Add empty row
    summarySheet.addRow([]);

    // Calculate risk distribution
    const counts = { 1: 0, 2: 0, 3: 0, 4: 0 };
    const total = allData.length;

    allData.forEach(item => {
        if (item.riskLevel) {
            counts[item.riskLevel]++;
        }
    });

    // Add header
    const headerRow = summarySheet.addRow(['Risk Level', 'Count', 'Percentage']);
    headerRow.font = { bold: true, size: 11, color: { argb: 'FFFFFFFF' } };
    headerRow.eachCell((cell) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF374151' } };
        cell.alignment = { horizontal: 'center', vertical: 'center' };
        cell.border = {
            top: { style: 'thin', color: { argb: 'FFD1D5DB' } },
            left: { style: 'thin', color: { argb: 'FFD1D5DB' } },
            bottom: { style: 'thin', color: { argb: 'FFD1D5DB' } },
            right: { style: 'thin', color: { argb: 'FFD1D5DB' } }
        };
    });

    // Add data rows with colors
    const riskLevels = [
        { label: 'Low Risk', level: 1, color: 'FF22C55E' },
        { label: 'Medium Risk', level: 2, color: 'FFEAB308' },
        { label: 'High Risk', level: 3, color: 'FFEF4444' },
        { label: 'Critical', level: 4, color: 'FFA855F7' }
    ];

    riskLevels.forEach(({ label, level, color }) => {
        const count = counts[level];
        const percentage = total === 0 ? '0%' : `${((count / total) * 100).toFixed(1)}%`;

        const row = summarySheet.addRow([label, count, percentage]);
        row.eachCell((cell, colNum) => {
            if (colNum === 1) {
                cell.font = { bold: true, size: 10, color: { argb: 'FF1F2937' } };
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F4F6' } };
            } else {
                cell.font = { size: 10, color: { argb: 'FF1F2937' } };
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } };
                cell.alignment = { horizontal: 'center', vertical: 'center' };
            }
            cell.border = {
                top: { style: 'thin', color: { argb: 'FFD1D5DB' } },
                left: { style: 'thin', color: { argb: 'FFD1D5DB' } },
                bottom: { style: 'thin', color: { argb: 'FFD1D5DB' } },
                right: { style: 'thin', color: { argb: 'FFD1D5DB' } }
            };
        });
    });

    // Add total row
    summarySheet.addRow([]);
    const totalRow = summarySheet.addRow(['TOTAL', total, '100%']);
    totalRow.font = { bold: true, size: 10, color: { argb: 'FFFFFFFF' } };
    totalRow.eachCell((cell) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F2937' } };
        cell.alignment = { horizontal: 'center', vertical: 'center' };
        cell.border = {
            top: { style: 'thin', color: { argb: 'FFD1D5DB' } },
            left: { style: 'thin', color: { argb: 'FFD1D5DB' } },
            bottom: { style: 'thin', color: { argb: 'FFD1D5DB' } },
            right: { style: 'thin', color: { argb: 'FFD1D5DB' } }
        };
    });

    // Set print options
    summarySheet.pageSetup = { paperSize: summarySheet.PAPERSIZE.A4, orientation: 'portrait' };
}

/**
 * Export cardiovascular assessment data to Excel
 * @param {array} data - Array of assessment data (filtered data)
 * @param {array} allData - Array of all assessment data (for resume calculations)
 * @returns {Promise} Promise that resolves when export is complete
 */
export async function exportToExcel(data, allData = null) {
    try {
        // Wait for ExcelJS to be available (loaded from CDN)
        if (typeof ExcelJS === 'undefined') {
            throw new Error('ExcelJS library tidak tersedia. Pastikan koneksi internet stabil.');
        }

        const ExcelJSLib = window.ExcelJS;
        const workbook = new ExcelJSLib.Workbook();

        // Add resume/summary sheet if allData is provided
        if (allData && allData.length > 0) {
            addResumeSummarySheet(workbook, allData);
        }

        const worksheet = workbook.addWorksheet('Jakarta Cardiovascular');

        // Set column widths
        worksheet.columns = [
            { width: 8 },      // No
            { width: 25 },     // Nama
            { width: 12 },     // JK (CV)
            { width: 12 },     // Umur (CV)
            { width: 12 },     // TD (CV)
            { width: 12 },     // IMT (CV)
            { width: 15 },     // Merokok (CV)
            { width: 15 },     // Diabetes (CV)
            { width: 18 },     // Aktivitas Fisik (CV)
            { width: 12 },     // Nilai (CV)
            { width: 12 },     // Risk (CV)
            { width: 12 },     // LP (Metabolik)
            { width: 12 },     // TG (Metabolik)
            { width: 12 },     // HDL (Metabolik)
            { width: 12 },     // TD (Metabolik)
            { width: 12 },     // GDP (Metabolik)
            { width: 12 },     // Nilai (Metabolik)
            { width: 12 },     // Risk (Metabolik)
            { width: 12 },     // Risk Total
            { width: 15 }      // Risk Level
        ];

        // Add title row
        const titleRow = worksheet.addRow(['Jakarta Cardiovascular Assessment Report']);
        titleRow.font = { bold: true, size: 14, color: { argb: 'FF1F2937' } };
        titleRow.alignment = { horizontal: 'left', vertical: 'center' };

        // Add empty row
        worksheet.addRow([]);

        // Add date row
        const dateRow = worksheet.addRow([`Generated: ${new Date().toLocaleDateString('id-ID')}`]);
        dateRow.font = { size: 10, color: { argb: 'FF6B7280' } };

        // Add empty row
        worksheet.addRow([]);

        // Add header row 1 (category headers)
        const header1 = worksheet.addRow([
            'No',
            'Nama',
            '', '', '', '', '', '', '', '', '',  // Jakarta CV columns (9 cols, but merged)
            '', '', '', '', '', '', '',           // Sindrom Metabolik columns (7 cols, but merged)
            '',                                   // Risk Total
            ''                                    // Risk Level
        ]);

        // Merge cells for category headers
        worksheet.mergeCells('C7:K7');  // Jakarta Cardiovascular Score
        worksheet.mergeCells('L7:R7');  // Sindrom Metabolik

        // Style category headers
        const header1Range = worksheet.getRow(7);
        header1Range.getCell(1).value = 'No';
        header1Range.getCell(2).value = 'Nama';
        header1Range.getCell(3).value = 'Jakarta Cardiovascular Score';
        header1Range.getCell(12).value = 'Sindrom Metabolik';
        header1Range.getCell(19).value = 'Risk Total';
        header1Range.getCell(20).value = 'Risk Level';

        header1Range.eachCell((cell, colNum) => {
            if (colNum <= 2) {
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } };
                cell.font = { bold: true, size: 11, color: { argb: 'FF1F2937' } };
            } else if (colNum >= 3 && colNum <= 11) {
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFCD34D' } };
                cell.font = { bold: true, size: 11, color: { argb: 'FF1F2937' } };
            } else if (colNum >= 12 && colNum <= 18) {
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF93C5FD' } };
                cell.font = { bold: true, size: 11, color: { argb: 'FF1F2937' } };
            } else if (colNum === 19) {
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFECACA' } };
                cell.font = { bold: true, size: 11, color: { argb: 'FF1F2937' } };
            } else if (colNum === 20) {
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE5E7EB' } };
                cell.font = { bold: true, size: 11, color: { argb: 'FF1F2937' } };
            }
            cell.alignment = { horizontal: 'center', vertical: 'center', wrapText: true };
            cell.border = {
                top: { style: 'thin', color: { argb: 'FFD1D5DB' } },
                left: { style: 'thin', color: { argb: 'FFD1D5DB' } },
                bottom: { style: 'thin', color: { argb: 'FFD1D5DB' } },
                right: { style: 'thin', color: { argb: 'FFD1D5DB' } }
            };
        });

        header1Range.height = 25;

        // Add header row 2 (sub-headers)
        const header2 = worksheet.addRow([
            'No',
            'Nama',
            'JK', 'Umur', 'TD', 'IMT', 'Merokok', 'Diabetes', 'Aktivitas Fisik', 'Nilai', 'Risk',
            'LP', 'TG', 'HDL', 'TD', 'GDP', 'Nilai', 'Risk',
            'Risk Total',
            'Risk Level'
        ]);

        header2.eachCell((cell, colNum) => {
            if (colNum <= 2) {
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } };
            } else if (colNum >= 3 && colNum <= 11) {
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF3C7' } };
            } else if (colNum >= 12 && colNum <= 18) {
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDBEAFE' } };
            } else if (colNum === 19) {
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFECACA' } };
            } else if (colNum === 20) {
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE5E7EB' } };
            }
            cell.font = { bold: true, size: 10, color: { argb: 'FF1F2937' } };
            cell.alignment = { horizontal: 'center', vertical: 'center', wrapText: true };
            cell.border = {
                top: { style: 'thin', color: { argb: 'FFD1D5DB' } },
                left: { style: 'thin', color: { argb: 'FFD1D5DB' } },
                bottom: { style: 'thin', color: { argb: 'FFD1D5DB' } },
                right: { style: 'thin', color: { argb: 'FFD1D5DB' } }
            };
        });

        header2.height = 20;

        // Add data rows
        data.forEach((item, idx) => {
            const riskTotal = item.riskTotal || 0;
            const riskLevel = item.riskLevel || 0;

            // Get colors for cells
            let riskTotalBgColor = 'FFFFFFFF';
            if (riskTotal === 1 || riskTotal === 2) {
                riskTotalBgColor = 'FFDCFCE7';  // Green
            } else if (riskTotal === 3 || riskTotal === 4) {
                riskTotalBgColor = 'FFFEF3C7';  // Yellow
            } else if (riskTotal === 6) {
                riskTotalBgColor = 'FFFED7AA';  // Orange
            } else if (riskTotal === 9) {
                riskTotalBgColor = 'FFFCA5A5';  // Red
            }

            // Determine row background
            let rowBgColor = 'FFFFFFFF';
            if (riskLevel === 1) {
                rowBgColor = 'FFF0FDF4';  // Green
            } else if (riskLevel === 2) {
                rowBgColor = 'FFFEF3C7';  // Yellow (light)
            } else if (riskLevel === 3) {
                rowBgColor = 'FFFEF2F2';  // Red
            } else if (riskLevel === 4) {
                rowBgColor = 'FFFAF5FF';  // Purple
            }

            const row = worksheet.addRow([
                idx + 1,
                item.name || '-',
                item.scores?.jk !== undefined ? item.scores.jk : '-',
                item.scores?.umur !== undefined ? item.scores.umur : '-',
                item.scores?.td !== undefined ? item.scores.td : '-',
                item.scores?.imt !== undefined ? item.scores.imt : '-',
                item.scores?.merokok !== undefined ? item.scores.merokok : '-',
                item.scores?.diabetes !== undefined ? item.scores.diabetes : '-',
                item.scores?.aktivitasFisik !== undefined ? item.scores.aktivitasFisik : '-',
                item.score !== undefined ? item.score : '-',
                getJakartaCVRiskDisplay(item.score),
                item.metabolicSyndrome?.scores?.lp !== undefined ? item.metabolicSyndrome.scores.lp : '-',
                item.metabolicSyndrome?.scores?.tg !== undefined ? item.metabolicSyndrome.scores.tg : '-',
                item.metabolicSyndrome?.scores?.hdl !== undefined ? item.metabolicSyndrome.scores.hdl : '-',
                item.metabolicSyndrome?.scores?.td !== undefined ? item.metabolicSyndrome.scores.td : '-',
                item.metabolicSyndrome?.scores?.gdp !== undefined ? item.metabolicSyndrome.scores.gdp : '-',
                item.metabolicSyndrome?.totalScore !== undefined ? item.metabolicSyndrome.totalScore : '-',
                item.metabolicSyndrome?.risk !== undefined ? item.metabolicSyndrome.risk : '-',
                riskTotal,
                getRiskLevelLabel(riskLevel)
            ]);

            // Style data row
            row.eachCell((cell, colNum) => {
                if (colNum === 1 || colNum === 2) {
                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } };
                } else if (colNum >= 3 && colNum <= 11) {
                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF3C7' } };
                } else if (colNum >= 12 && colNum <= 18) {
                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDBEAFE' } };
                } else if (colNum === 19) {
                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: riskTotalBgColor } };
                } else if (colNum === 20) {
                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: rowBgColor } };
                }

                cell.font = { size: 10, color: { argb: 'FF1F2937' } };
                cell.alignment = { horizontal: 'center', vertical: 'center' };
                cell.border = {
                    top: { style: 'thin', color: { argb: 'FFD1D5DB' } },
                    left: { style: 'thin', color: { argb: 'FFD1D5DB' } },
                    bottom: { style: 'thin', color: { argb: 'FFD1D5DB' } },
                    right: { style: 'thin', color: { argb: 'FFD1D5DB' } }
                };
            });

            row.height = 18;
        });

        // Freeze panes (freeze first 2 columns and header rows)
        worksheet.views = [
            { state: 'frozen', xSplit: 2, ySplit: 8 }
        ];

        // Generate file
        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

        // Create download link
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        const now = new Date();
        const dateStr = now.toLocaleDateString('id-ID').replace(/\//g, '-');
        link.href = url;
        link.download = `Jakarta Cardiovascular - ${dateStr}.xlsx`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        return { success: true, message: 'Export berhasil!' };
    } catch (error) {
        throw error;
    }
}

/**
 * Get Jakarta CV Risk Level for export
 */
function getJakartaCVRiskDisplay(score) {
    if (score >= -7 && score <= 1) return '1';
    if (score >= 2 && score <= 4) return '2';
    if (score >= 5) return '3';
    return '-';
}

/**
 * Get Risk Level Label for export
 */
function getRiskLevelLabel(riskLevel) {
    const labels = {
        1: 'Low',
        2: 'Medium',
        3: 'High',
        4: 'Critical'
    };
    return labels[riskLevel] || '-';
}

export default {
    exportToExcel
};
