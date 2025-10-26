/**
 * Tambah Karyawan Page
 * Add new employee and MCU records
 */

import { authService } from '../services/authService.js';
import { employeeService } from '../services/employeeService.js';
import { mcuService } from '../services/mcuService.js';
import { masterDataService } from '../services/masterDataService.js';
import { formatDateDisplay, calculateAge } from '../utils/dateHelpers.js';
import { showToast, openModal, closeModal, hideAdminMenuForNonAdmin } from '../utils/uiHelpers.js';

let searchResults = [];
let jobTitles = [];
let departments = [];
let currentEmployee = null;

async function init() {
    if (!authService.isAuthenticated()) {
        window.location.href = 'login.html';
        return;
    }

    updateUserInfo();
    await loadMasterData();
    populateDropdowns();
}

function updateUserInfo() {
    const user = authService.getCurrentUser();
    if (user) {
        document.getElementById('user-name').textContent = user.displayName;
        document.getElementById('user-role').textContent = user.role;
        document.getElementById('user-initial').textContent = user.displayName.charAt(0).toUpperCase();
        hideAdminMenuForNonAdmin(user);
    }
}

async function loadMasterData() {
    try {
        jobTitles = await masterDataService.getAllJobTitles();
        departments = await masterDataService.getAllDepartments();
    } catch (error) {
        console.error('Error loading master data:', error);
        showToast('Gagal memuat data master', 'error');
    }
}

// Helper: Add jobTitleId and departmentId based on names (for Supabase compatibility)
function enrichEmployeeWithIds(emp) {
    if (!emp.jobTitleId && emp.jobTitle) {
        const job = jobTitles.find(j => j.name === emp.jobTitle);
        if (job) emp.jobTitleId = job.id;  // Use 'id' not 'jobTitleId' - Supabase format
    }
    if (!emp.departmentId && emp.department) {
        const dept = departments.find(d => d.name === emp.department);
        if (dept) emp.departmentId = dept.id;  // Use 'id' not 'departmentId' - Supabase format
    }
    return emp;
}

function populateDropdowns() {
    // Job Titles - Searchable datalist
    const jobDatalist = document.getElementById('job-list');
    const jobInput = document.getElementById('emp-job');
    jobDatalist.innerHTML = ''; // Clear existing

    const jobFragment = document.createDocumentFragment();

    // Add all job titles to datalist
    jobTitles.forEach(job => {
        const option = document.createElement('option');
        option.value = job.name;  // Display name in input
        option.setAttribute('data-id', job.jobTitleId);  // Store ID
        option.textContent = job.name;  // SAFE: textContent auto-escapes
        jobFragment.appendChild(option);
    });

    jobDatalist.appendChild(jobFragment);  // Single DOM operation

    // Handle job selection - update hidden ID field when user selects from datalist
    jobInput.addEventListener('input', function() {
        const selectedName = this.value;
        const job = jobTitles.find(j => j.name === selectedName);
        if (job) {
            document.getElementById('emp-job-id').value = job.jobTitleId;
        } else {
            document.getElementById('emp-job-id').value = '';
        }
    });

    // Departments - Same approach
    const deptSelect = document.getElementById('emp-dept');
    deptSelect.innerHTML = '';

    const deptFragment = document.createDocumentFragment();

    const defaultDeptOption = document.createElement('option');
    defaultDeptOption.value = '';
    defaultDeptOption.textContent = 'Pilih...';
    deptFragment.appendChild(defaultDeptOption);

    departments.forEach(dept => {
        const option = document.createElement('option');
        option.value = dept.departmentId;
        option.textContent = dept.name;  // SAFE: textContent auto-escapes
        deptFragment.appendChild(option);
    });

    deptSelect.appendChild(deptFragment);  // Single DOM operation
}

window.handleSearch = async function() {
    const searchTerm = document.getElementById('search-input').value.trim();
    const resultsContainer = document.getElementById('search-results');

    if (!searchTerm) {
        resultsContainer.innerHTML = '';
        return;
    }

    if (searchTerm.length < 2) {
        resultsContainer.innerHTML = '<p class="text-sm text-gray-500 text-center py-4">Ketik minimal 2 karakter untuk mencari...</p>';
        return;
    }

    try {
        searchResults = await employeeService.search(searchTerm);

        if (searchResults.length === 0) {
            resultsContainer.innerHTML = '<p class="text-sm text-gray-500 text-center py-4">Tidak ditemukan</p>';
            return;
        }

        // Enrich search results with IDs (for Supabase which only stores names)
        searchResults = searchResults.map(emp => enrichEmployeeWithIds(emp));

        let html = '<div class="table-container"><table class="table"><thead><tr>';
        html += '<th>Nama</th><th>ID</th><th>Tanggal Lahir</th><th>Jabatan</th><th>Departemen</th><th>Aksi</th>';
        html += '</tr></thead><tbody>';

        searchResults.forEach(emp => {
            const job = jobTitles.find(j => j.id === emp.jobTitleId);
            const dept = departments.find(d => d.id === emp.departmentId);

            html += '<tr>';
            html += `<td><span class="font-medium text-gray-900">${emp.name}</span></td>`;
            html += `<td><span class="text-sm text-gray-600">${emp.employeeId}</span></td>`;
            html += `<td>${formatDateDisplay(emp.birthDate)}</td>`;
            html += `<td>${job?.name || '-'}</td>`;
            html += `<td>${dept?.name || '-'}</td>`;
            html += `<td><button onclick="openAddMCUForEmployee('${emp.employeeId}')" class="btn btn-sm btn-primary">+ Tambah MCU</button></td>`;
            html += '</tr>';
        });

        html += '</tbody></table></div>';
        resultsContainer.innerHTML = html;

    } catch (error) {
        console.error('Error searching:', error);
        showToast('Gagal mencari: ' + error.message, 'error');
    }
};

window.openAddEmployeeModal = function() {
    // Reset form
    document.getElementById('employee-form').reset();
    document.getElementById('vendor-field').classList.add('hidden');
    document.getElementById('inactive-reason-field').classList.add('hidden');

    openModal('add-employee-modal');
};

window.closeAddEmployeeModal = function() {
    closeModal('add-employee-modal');
};

window.toggleVendorField = function() {
    const status = document.getElementById('emp-status').value;
    const vendorField = document.getElementById('vendor-field');

    if (status === 'Vendor') {
        vendorField.classList.remove('hidden');
    } else {
        vendorField.classList.add('hidden');
        document.getElementById('emp-vendor').value = '';
    }
};

window.handleAddEmployee = async function(event) {
    event.preventDefault();

    try {
        const currentUser = authService.getCurrentUser();
        const employeeData = {
            name: document.getElementById('emp-name').value,
            jobTitleId: document.getElementById('emp-job-id').value,  // Use hidden field with ID
            departmentId: document.getElementById('emp-dept').value,
            birthDate: document.getElementById('emp-birthdate').value,
            jenisKelamin: document.getElementById('emp-gender').value,
            bloodType: document.getElementById('emp-blood').value,
            employmentStatus: document.getElementById('emp-status').value,
            vendorName: document.getElementById('emp-vendor').value || null,
            activeStatus: document.getElementById('emp-active').value,
            inactiveReason: document.getElementById('emp-inactive-reason').value || null
        };

        const newEmployee = await employeeService.create(employeeData, currentUser);

        showToast('Karyawan berhasil ditambahkan!', 'success');

        // Auto-close modal
        closeAddEmployeeModal();

        // Auto-open MCU modal
        setTimeout(() => {
            openAddMCUForEmployee(newEmployee.employeeId);
        }, 300);

    } catch (error) {
        console.error('Error adding employee:', error);
        showToast('Gagal menambah karyawan: ' + error.message, 'error');
    }
};

window.openAddMCUForEmployee = async function(employeeId) {
    try {
        currentEmployee = await employeeService.getById(employeeId);

        if (!currentEmployee) {
            showToast('Karyawan tidak ditemukan', 'error');
            return;
        }

        // Enrich employee with IDs (for Supabase which only stores names)
        currentEmployee = enrichEmployeeWithIds(currentEmployee);

        const job = jobTitles.find(j => j.id === currentEmployee.jobTitleId);
        const dept = departments.find(d => d.id === currentEmployee.departmentId);

        // Fill employee summary
        document.getElementById('mcu-emp-name').textContent = currentEmployee.name;
        document.getElementById('mcu-emp-id').textContent = currentEmployee.employeeId;
        document.getElementById('mcu-emp-job').textContent = job?.name || '-';
        document.getElementById('mcu-emp-dept').textContent = dept?.name || '-';
        document.getElementById('mcu-employee-id').value = employeeId;

        // Reset form
        document.getElementById('mcu-form').reset();
        document.getElementById('mcu-employee-id').value = employeeId;

        // Set default date to today
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('mcu-date').value = today;

        openModal('add-mcu-modal');
    } catch (error) {
        console.error('Error opening MCU modal:', error);
        showToast('Gagal membuka form MCU: ' + error.message, 'error');
    }
};

window.closeAddMCUModal = function() {
    closeModal('add-mcu-modal');
    currentEmployee = null;
};

window.handleAddMCU = async function(event) {
    event.preventDefault();

    try {
        const currentUser = authService.getCurrentUser();

        const mcuData = {
            employeeId: document.getElementById('mcu-employee-id').value,
            mcuType: document.getElementById('mcu-type').value,
            mcuDate: document.getElementById('mcu-date').value,
            bmi: document.getElementById('mcu-bmi').value || null,
            bloodPressure: document.getElementById('mcu-bp').value || null,
            respiratoryRate: document.getElementById('mcu-rr').value || null,
            pulse: document.getElementById('mcu-pulse').value || null,
            temperature: document.getElementById('mcu-temp').value || null,
            vision: document.getElementById('mcu-vision').value || null,
            audiometry: document.getElementById('mcu-audio').value || null,
            spirometry: document.getElementById('mcu-spiro').value || null,
            xray: document.getElementById('mcu-xray').value || null,
            ekg: document.getElementById('mcu-ekg').value || null,
            treadmill: document.getElementById('mcu-treadmill').value || null,
            kidneyLiverFunction: document.getElementById('mcu-kidney').value || null,
            hbsag: document.getElementById('mcu-hbsag').value || null,
            sgot: document.getElementById('mcu-sgot').value || null,
            sgpt: document.getElementById('mcu-sgpt').value || null,
            cbc: document.getElementById('mcu-cbc').value || null,
            napza: document.getElementById('mcu-napza').value || null,
            keluhanUtama: document.getElementById('mcu-keluhan').value || null,
            diagnosisKerja: document.getElementById('mcu-diagnosis').value || null,
            alasanRujuk: document.getElementById('mcu-alasan').value || null,
            initialResult: document.getElementById('mcu-result').value,
            initialNotes: document.getElementById('mcu-notes').value
        };

        await mcuService.create(mcuData, currentUser);

        showToast('MCU berhasil ditambahkan!', 'success');

        // Manual close (user can copy data before closing)
        // User closes modal manually dengan tombol "Batal"

    } catch (error) {
        console.error('Error adding MCU:', error);
        showToast('Gagal menambah MCU: ' + error.message, 'error');
    }
};

window.handleLogout = function() {
    authService.logout();
};

// Initialize
init();
