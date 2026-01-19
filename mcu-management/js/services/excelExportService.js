/**
 * Excel Export Service
 * Exports Jakarta Cardiovascular assessment data to Excel with styling
 */

import ExcelJS from 'exceljs';

/**
 * Convert hex color to RGB format for ExcelJS
 */
function hexToRgb(hex) {
    // Remove # and convert to RGB
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? result[1] + result[2] + result[3] : 'FFFFFF';
}

/**
 * Get cell color based on Tailwind class
 */
function getColorFromTailwind(tailwindClass) {
    const colorMap = {
        'bg-yellow-100': 'FFFBEB', // Jakarta CV header
        'bg-blue-100': '93C5FD',   // Sindrom Metabolik header (approximation)
        'bg-red-100': 'FECACA',    // Risk Total header
        'bg-green-100': 'DCFCE7',  // Green risk background
        'bg-yellow-100-light': 'FEF3C7', // Jakarta CV sub-header
        'bg-blue-200': 'DBEAFE',   // Sindrom Metabolik sub-header
        'bg-gray-100': 'F3F4F6',   // Gray header
        'bg-green-50': 'F0FDF4',   // Green row background
        'bg-yellow-50': 'FFFEF3',  // Yellow row background
        'bg-red-50': 'FEF2F2',     // Red row background
        'bg-purple-50': 'FAF5FF'   // Purple row background
    };
    return colorMap[tailwindClass] || 'FFFFFF';
}

/**
 * Export cardiovascular assessment data to Excel
 * @param {array} data - Array of assessment data
 * @returns {Promise} Promise that resolves when export is complete
 */
export async function exportToExcel(data) {
    try {
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Jakarta Cardiovascular');

        // Set column widths
        worksheet.columns = [
            { width: 8 },      // No
            { width: 25 },     // Nama
            { width: 12 },     // JK (CV)
            { width: 12 },     // Umur (CV)
            { width: 12 },     // TD (CV)
            { width: 12 },     // IMT (CV)
            { width: 12 },     // Merokok (CV)
            { width: 12 },     // Diabetes (CV)
            { width: 12 },     // Aktivitas Fisik (CV)
            { width: 12 },     // Nilai (CV)
            { width: 12 },     // Risk (CV)
            { width: 10 },     // LP (Metabolik)
            { width: 10 },     // TG (Metabolik)
            { width: 10 },     // HDL (Metabolik)
            { width: 10 },     // TD (Metabolik)
            { width: 10 },     // GDP (Metabolik)
            { width: 12 },     // Nilai (Metabolik)
            { width: 12 },     // Risk (Metabolik)
            { width: 12 },     // Risk Total
            { width: 15 }      // Risk Level
        ];

        // Add header row 1 (category headers)
        const header1 = worksheet.addRow([
            'No',
            'Nama',
            '',
            '',
            '',
            '',
            '',
            '',
            '',
            '',
            '',
            '',
            '',
            '',
            '',
            '',
            '',
            '',
            '',
            ''
        ]);

        // Merge cells for category headers
        worksheet.mergeCells('C1:K1'); // Jakarta Cardiovascular Score
        worksheet.mergeCells('L1:S1'); // Sindrom Metabolik (7 columns)
        worksheet.unMergeCells('L1:S1');
        worksheet.mergeCells('L1:R1'); // Sindrom Metabolik (7 columns)

        // Style category headers
        const categoryStyle = {
            fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFBEB' } },
            font: { bold: true, size: 11, color: { argb: '000000' } },
            alignment: { horizontal: 'center', vertical: 'middle', wrapText: true },
            border: {
                left: { style: 'thin', color: { argb: 'D1D5DB' } },
                right: { style: 'thin', color: { argb: 'D1D5DB' } },
                top: { style: 'thin', color: { argb: 'D1D5DB' } },
                bottom: { style: 'thin', color: { argb: 'D1D5DB' } }
            }
        };

        // Apply styling to category headers
        header1.eachCell((cell, colNumber) => {
            if (colNumber >= 3 && colNumber <= 10) {
                cell.value = colNumber === 3 ? 'Jakarta Cardiovascular Score' : '';
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFBEB' } };
            } else if (colNumber >= 11 && colNumber <= 17) {
                cell.value = colNumber === 11 ? 'Sindrom Metabolik' : '';
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '93C5FD' } };
            } else if (colNumber === 18) {
                cell.value = 'Risk Total';
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FECACA' } };
            } else if (colNumber === 19) {
                cell.value = '';
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F3F4F6' } };
            }
            cell.font = categoryStyle.font;
            cell.alignment = categoryStyle.alignment;
            cell.border = categoryStyle.border;
        });

        // Add header row 2 (column headers)
        const header2 = worksheet.addRow([
            'No',
            'Nama',
            'JK',
            'Umur',
            'TD',
            'IMT',
            'Merokok',
            'Diabetes',
            'Aktivitas Fisik',
            'Nilai',
            'Risk',
            'LP',
            'TG',
            'HDL',
            'TD',
            'GDP',
            'Nilai',
            'Risk',
            'Risk Total',
            'Risk Level'
        ]);

        // Style sub-headers
        const subHeaderStyle = {
            font: { bold: true, size: 10, color: { argb: '000000' } },
            alignment: { horizontal: 'center', vertical: 'middle' },
            border: {
                left: { style: 'thin', color: { argb: 'D1D5DB' } },
                right: { style: 'thin', color: { argb: 'D1D5DB' } },
                top: { style: 'thin', color: { argb: 'D1D5DB' } },
                bottom: { style: 'thin', color: { argb: 'D1D5DB' } }
            }
        };

        header2.eachCell((cell, colNumber) => {
            if (colNumber >= 3 && colNumber <= 10) {
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FEF3C7' } };
            } else if (colNumber >= 11 && colNumber <= 17) {
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'DBEAFE' } };
            } else if (colNumber === 18) {
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FEC9C9' } };
            } else if (colNumber === 19) {
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F3F4F6' } };
            }
            cell.font = subHeaderStyle.font;
            cell.alignment = subHeaderStyle.alignment;
            cell.border = subHeaderStyle.border;
        });

        // Add data rows
        data.forEach((item, index) => {
            const cvRisk = getJakartaCVRiskLevelForExport(item.score);
            const metabolikRisk = item.metabolicSyndrome?.risk;
            const riskLevel = getRiskLevelLabelForExport(item.riskLevel);

            const row = worksheet.addRow([
                index + 1,
                item.name,
                item.scores.jk,
                item.scores.umur,
                item.scores.td,
                item.scores.imt,
                item.scores.merokok,
                item.scores.diabetes,
                item.scores.aktivitasFisik,
                item.score,
                cvRisk.text,
                item.metabolicSyndrome?.scores.lp !== undefined ? item.metabolicSyndrome.scores.lp : '-',
                item.metabolicSyndrome?.scores.tg !== undefined ? item.metabolicSyndrome.scores.tg : '-',
                item.metabolicSyndrome?.scores.hdl !== undefined ? item.metabolicSyndrome.scores.hdl : '-',
                item.metabolicSyndrome?.scores.td !== undefined ? item.metabolicSyndrome.scores.td : '-',
                item.metabolicSyndrome?.scores.gdp !== undefined ? item.metabolicSyndrome.scores.gdp : '-',
                item.metabolicSyndrome?.totalScore !== undefined ? item.metabolicSyndrome.totalScore : '-',
                metabolikRisk !== undefined ? metabolikRisk : '-',
                item.riskTotal || '-',
                riskLevel.label
            ]);

            // Style data rows
            const dataStyle = {
                font: { size: 10 },
                alignment: { horizontal: 'center', vertical: 'middle' },
                border: {
                    left: { style: 'thin', color: { argb: 'D1D5DB' } },
                    right: { style: 'thin', color: { argb: 'D1D5DB' } },
                    top: { style: 'thin', color: { argb: 'D1D5DB' } },
                    bottom: { style: 'thin', color: { argb: 'D1D5DB' } }
                }
            };

            row.eachCell((cell, colNumber) => {
                // Set basic styling
                cell.font = dataStyle.font;
                cell.alignment = dataStyle.alignment;
                cell.border = dataStyle.border;

                // Color CV columns
                if (colNumber >= 3 && colNumber <= 10) {
                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFBEB' } };
                }
                // Color Metabolik columns
                else if (colNumber >= 11 && colNumber <= 17) {
                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F0F9FF' } };
                }
                // Color Risk Total column based on value
                else if (colNumber === 18) {
                    const riskTotal = item.riskTotal;
                    if (riskTotal === 1 || riskTotal === 2) {
                        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'DCFCE7' } };
                    } else if (riskTotal === 3 || riskTotal === 4) {
                        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FEF3C7' } };
                    } else if (riskTotal === 6) {
                        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FED7AA' } };
                    } else if (riskTotal === 9) {
                        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FCA5A5' } };
                    }
                }
                // Color Risk Level column based on value
                else if (colNumber === 19) {
                    if (riskLevel.bgColor === 'bg-green-50') {
                        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F0FDF4' } };
                    } else if (riskLevel.bgColor === 'bg-yellow-50') {
                        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF3' } };
                    } else if (riskLevel.bgColor === 'bg-red-50') {
                        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FEF2F2' } };
                    } else if (riskLevel.bgColor === 'bg-purple-50') {
                        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FAF5FF' } };
                    }
                }
            });
        });

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
        console.error('Error exporting to Excel:', error);
        throw error;
    }
}

/**
 * Get Jakarta CV Risk Level for export
 */
function getJakartaCVRiskLevelForExport(score) {
    if (score >= -7 && score <= 1) return { level: 1, text: '1' };
    if (score >= 2 && score <= 4) return { level: 2, text: '2' };
    if (score >= 5) return { level: 3, text: '3' };
    return { level: 0, text: '-' };
}

/**
 * Get Risk Level Label for export
 */
function getRiskLevelLabelForExport(riskLevel) {
    const badges = {
        1: { label: 'Low', bgColor: 'bg-green-50' },
        2: { label: 'Medium', bgColor: 'bg-yellow-50' },
        3: { label: 'High', bgColor: 'bg-red-50' },
        4: { label: 'Critical', bgColor: 'bg-purple-50' }
    };
    return badges[riskLevel] || { label: 'Unknown', bgColor: 'bg-gray-100' };
}

export default {
    exportToExcel
};
