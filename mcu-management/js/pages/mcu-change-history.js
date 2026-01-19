/**
 * MCU Change History Page
 * Displays chronological history of all MCU data changes
 */

import { authService } from '../services/authService.js';
import { mcuService } from '../services/mcuService.js';
import { employeeService } from '../services/employeeService.js';
import database from '../services/databaseAdapter.js';
import { formatDateDisplay } from '../utils/dateHelpers.js';
import { showToast } from '../utils/uiHelpers.js';
import { supabaseReady } from '../config/supabase.js';

// State
let allChanges = [];
let filteredChanges = [];

/**
 * Initialize the MCU Change History page
 */
export async function initMCUChangeHistory() {
    try {
        await supabaseReady;

        // Check auth
        const user = await authService.getCurrentUser();
        if (!user) {
            showToast('Anda harus login terlebih dahulu', 'error');
            return;
        }

        // Set user info
        const userName = user.user_metadata?.name || user.email || 'User';
        document.getElementById('user-name').textContent = userName;
        document.getElementById('user-initial').textContent = userName.charAt(0).toUpperCase();
        document.getElementById('user-role').textContent = user.user_metadata?.role || 'User';

        // Setup event handlers
        setupEventHandlers();

        document.body.classList.add('initialized');
    } catch (error) {
        console.error('Error initializing MCU Change History:', error);
        showToast('Gagal memuat halaman: ' + error.message, 'error');
        document.body.classList.add('initialized');
    }
}

/**
 * Setup event handlers
 */
function setupEventHandlers() {
    // Search button
    window.handleSearch = handleSearch;

    // Search input - allow Enter to search
    document.getElementById('search-input').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            handleSearch();
        }
    });

    // Filter change
    document.getElementById('change-type-filter').addEventListener('change', () => {
        if (allChanges.length > 0) {
            applyFilters();
        }
    });
}

/**
 * Handle search
 */
async function handleSearch() {
    try {
        const searchQuery = document.getElementById('search-input').value.trim();

        if (!searchQuery) {
            showToast('Masukkan MCU ID atau nama karyawan', 'warning');
            return;
        }

        // Show loading
        const resultsContainer = document.getElementById('results-container');
        resultsContainer.innerHTML = '<div class="text-center py-8"><p class="text-gray-500">Sedang mencari...</p></div>';

        // Search for MCU
        let mcuRecords = [];
        const searchLower = searchQuery.toLowerCase();

        // Try to find by MCU ID
        const mcuById = await mcuService.getById(searchQuery);
        if (mcuById) {
            mcuRecords.push(mcuById);
        }

        // Try to find by employee name
        const allEmployees = await employeeService.getAll();
        const matchingEmployees = allEmployees.filter(emp =>
            emp.name && emp.name.toLowerCase().includes(searchLower)
        );

        // Get MCUs for matching employees
        for (const emp of matchingEmployees) {
            const empMCUs = await mcuService.getByEmployeeId(emp.employeeId);
            mcuRecords.push(...empMCUs);
        }

        if (mcuRecords.length === 0) {
            resultsContainer.innerHTML = `
                <div class="no-changes">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.172 16.172a4 4 0 015.656 0M9 10a4 4 0 018 0m-6 7h6m-6 0a7 7 0 11-7-7 7 7 0 017 7z"></path>
                    </svg>
                    <p>Tidak ada MCU ditemukan untuk "${searchQuery}"</p>
                </div>
            `;
            return;
        }

        // Load changes for all found MCUs
        allChanges = [];
        for (const mcu of mcuRecords) {
            const changes = await database.query('mcuChanges', 'mcu_id', mcu.mcuId);
            if (changes && changes.length > 0) {
                // Enrich changes with MCU and employee info
                changes.forEach(change => {
                    change.mcu = mcu;
                    change.employee = matchingEmployees.find(e => e.employeeId === mcu.employeeId) || null;
                });
                allChanges.push(...changes);
            }
        }

        if (allChanges.length === 0) {
            resultsContainer.innerHTML = `
                <div class="no-changes">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                    <p>Tidak ada riwayat perubahan untuk MCU yang ditemukan</p>
                </div>
            `;
            return;
        }

        // Sort by date descending (newest first)
        allChanges.sort((a, b) => {
            const dateA = new Date(a.changed_at || a.createdAt || 0);
            const dateB = new Date(b.changed_at || b.createdAt || 0);
            return dateB - dateA;
        });

        // Apply filters and render
        applyFilters();
    } catch (error) {
        console.error('Error searching changes:', error);
        showToast('Gagal mencari riwayat: ' + error.message, 'error');
    }
}

/**
 * Apply filters to changes
 */
function applyFilters() {
    const changeTypeFilter = document.getElementById('change-type-filter').value;
    const dateFrom = document.getElementById('date-from').value;

    filteredChanges = allChanges.filter(change => {
        // Filter by change type
        if (changeTypeFilter && changeTypeFilter !== 'all' && change.field_name !== changeTypeFilter) {
            return false;
        }

        // Filter by date
        if (dateFrom) {
            const changeDate = new Date(change.changed_at || change.createdAt).toISOString().split('T')[0];
            if (changeDate < dateFrom) {
                return false;
            }
        }

        return true;
    });

    renderResults();
}

/**
 * Render change history results
 */
function renderResults() {
    const resultsContainer = document.getElementById('results-container');

    if (filteredChanges.length === 0) {
        resultsContainer.innerHTML = `
            <div class="no-changes">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.172 16.172a4 4 0 015.656 0M9 10a4 4 0 018 0m-6 7h6m-6 0a7 7 0 11-7-7 7 7 0 017 7z"></path>
                </svg>
                <p>Tidak ada perubahan yang cocok dengan filter</p>
            </div>
        `;
        return;
    }

    // Group changes by MCU
    const changesByMCU = {};
    filteredChanges.forEach(change => {
        const mcuId = change.mcu_id || change.mcuId;
        if (!changesByMCU[mcuId]) {
            changesByMCU[mcuId] = [];
        }
        changesByMCU[mcuId].push(change);
    });

    // Render grouped by MCU
    let html = '';
    for (const [mcuId, changes] of Object.entries(changesByMCU)) {
        const firstChange = changes[0];
        const mcu = firstChange.mcu;
        const employee = firstChange.employee;

        html += `
            <div class="mb-8 pb-8 border-b border-gray-200 last:border-b-0">
                <div class="flex items-start justify-between mb-4">
                    <div>
                        <h3 class="text-lg font-semibold text-gray-900">${mcuId}</h3>
                        <p class="text-sm text-gray-600">
                            ${employee ? `${employee.name} - ${employee.department || 'N/A'}` : 'N/A'}
                        </p>
                        ${mcu ? `<p class="text-xs text-gray-500 mt-1">Tipe: ${mcu.mcuType}, Tanggal: ${formatDateDisplay(mcu.mcuDate)}</p>` : ''}
                    </div>
                    <span class="text-xs text-gray-500">${changes.length} perubahan</span>
                </div>

                <div class="timeline">
                    ${changes.map((change, idx) => renderChangeItem(change, idx)).join('')}
                </div>
            </div>
        `;
    }

    resultsContainer.innerHTML = html;
}

/**
 * Render individual change item
 */
function renderChangeItem(change, index) {
    const fieldLabel = getFieldLabel(change.field_name);
    const changeDate = new Date(change.changed_at || change.createdAt);
    const dateStr = formatDateDisplay(changeDate);
    const timeStr = changeDate.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

    const oldValue = change.old_value || '(kosong)';
    const newValue = change.new_value || '(kosong)';

    return `
        <div class="timeline-item">
            <div class="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <div class="flex items-start justify-between mb-3">
                    <div>
                        <h4 class="font-semibold text-gray-900">${fieldLabel}</h4>
                        <p class="text-xs text-gray-500 mt-1">${dateStr} • ${timeStr}</p>
                    </div>
                    <span class="change-badge modified">Diubah</span>
                </div>

                <div class="value-comparison">
                    <div class="value-box old">
                        <label>Nilai Sebelumnya</label>
                        <div class="value">${escapeHtml(oldValue)}</div>
                    </div>
                    <div class="value-box new">
                        <label>Nilai Baru</label>
                        <div class="value">${escapeHtml(newValue)}</div>
                    </div>
                </div>

                ${change.changed_by ? `
                    <p class="text-xs text-gray-500 mt-3 border-t border-gray-200 pt-3">
                        Diubah oleh: <span class="font-medium">${change.changed_by}</span>
                    </p>
                ` : ''}
            </div>
        </div>
    `;
}

/**
 * Get human-readable field label
 */
function getFieldLabel(fieldName) {
    const labels = {
        // Vital signs
        'bloodPressure': 'Tekanan Darah',
        'bmi': 'BMI (Body Mass Index)',
        'pulse': 'Denyut Jantung',
        'respiratoryRate': 'Laju Pernapasan',
        'temperature': 'Suhu Tubuh',
        'chestCircumference': 'Lingkar Dada',

        // Vision
        'visionDistantUnaideLeft': 'Penglihatan Jauh Mata Kiri (Tanpa Koreksi)',
        'visionDistantUnaideRight': 'Penglihatan Jauh Mata Kanan (Tanpa Koreksi)',
        'visionDistantSpectaclesLeft': 'Penglihatan Jauh Mata Kiri (Dengan Koreksi)',
        'visionDistantSpectaclesRight': 'Penglihatan Jauh Mata Kanan (Dengan Koreksi)',
        'visionNearUnaideLeft': 'Penglihatan Dekat Mata Kiri (Tanpa Koreksi)',
        'visionNearUnaideRight': 'Penglihatan Dekat Mata Kanan (Tanpa Koreksi)',
        'visionNearSpectaclesLeft': 'Penglihatan Dekat Mata Kiri (Dengan Koreksi)',
        'visionNearSpectaclesRight': 'Penglihatan Dekat Mata Kanan (Dengan Koreksi)',

        // Exams
        'audiometry': 'Audiometri',
        'spirometry': 'Spirometri',
        'xray': 'Rontgen Paru',
        'ekg': 'EKG (Elektrokardiogram)',
        'treadmill': 'Treadmill Test',
        'hbsag': 'HBsAg (Hepatitis B)',
        'napza': 'NAPZA (Narkoba)',
        'colorblind': 'Buta Warna',
        'sgot': 'SGOT',
        'sgpt': 'SGPT',
        'cbc': 'CBC (Sel Darah Lengkap)',

        // Results
        'initialResult': 'Hasil Awal',
        'initialNotes': 'Catatan Awal',
        'finalResult': 'Hasil Akhir',
        'finalNotes': 'Catatan Akhir',

        // Lifestyle
        'smokingStatus': 'Status Merokok',
        'exerciseFrequency': 'Frekuensi Olahraga',

        // Rujukan
        'doctor': 'Dokter Pemeriksa',
        'recipient': 'Penerima Rujukan',
        'keluhanUtama': 'Keluhan Utama',
        'diagnosisKerja': 'Diagnosis Kerja',
        'alasanRujuk': 'Alasan Rujukan',

        // Type & Date
        'mcuType': 'Tipe MCU',
        'mcuDate': 'Tanggal MCU'
    };

    return labels[fieldName] || fieldName;
}

/**
 * Escape HTML special characters
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
