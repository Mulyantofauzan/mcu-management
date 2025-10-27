/**
 * Kelola User Page
 * Manage system users
 */

import { authService } from '../services/authService.js';
import { showToast, openModal, closeModal, hideAdminMenuForNonAdmin } from '../utils/uiHelpers.js';
import { initializeSidebar } from '../sidebar-manager.js';
import { database } from '../services/database.js';
import { generateUserId } from '../utils/idGenerator.js';
import { getCurrentTimestamp } from '../utils/dateHelpers.js';

let users = [];

async function init() {
    // Check auth - only Admin can access
    if (!authService.isAuthenticated()) {
        window.location.href = 'login.html';
        return;
    }

    const currentUser = authService.getCurrentUser();
    if (currentUser.role !== 'Admin') {
        showToast('Hanya Admin yang dapat mengakses halaman ini', 'error');
        setTimeout(() => {
            window.location.href = '../index.html';
        }, 2000);
        return;
    }

    updateUserInfo();
    await loadUsers();
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

async function loadUsers() {
    try {
        users = await database.getAll('users');
        renderTable();
    } catch (error) {
        console.error('Error loading users:', error);
        showToast('Gagal memuat data user: ' + error.message, 'error');
    }
}

function renderTable() {
    const container = document.getElementById('user-table-container');

    if (users.length === 0) {
        container.innerHTML = '<p class="text-center text-gray-500 py-8">Belum ada user</p>';
        return;
    }

    let html = '<div class="table-container"><table class="table"><thead><tr>';
    html += '<th>Username</th>';
    html += '<th>Nama Lengkap</th>';
    html += '<th>Role</th>';
    html += '<th>Dibuat</th>';
    html += '<th>Aksi</th>';
    html += '</tr></thead><tbody>';

    users.forEach(user => {
        const createdDate = new Date(user.createdAt).toLocaleDateString('id-ID');
        const isCurrentUser = authService.getCurrentUser().userId === user.userId;

        html += '<tr>';
        html += `<td><span class="font-medium text-gray-900">${user.username}</span></td>`;
        html += `<td>${user.displayName}</td>`;
        html += `<td><span class="badge ${user.role === 'Admin' ? 'badge-primary' : 'badge-secondary'}">${user.role}</span></td>`;
        html += `<td class="text-sm text-gray-600">${createdDate}</td>`;
        html += '<td>';

        if (!isCurrentUser) {
            html += `<button onclick="window.editUser('${user.userId}')" class="btn btn-sm btn-secondary mr-2" title="Edit">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
            </button>`;
            html += `<button onclick="window.deleteUser('${user.userId}')" class="btn btn-sm btn-danger" title="Hapus">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
            </button>`;
        } else {
            html += '<span class="text-xs text-gray-500 italic">User saat ini</span>';
        }

        html += '</td>';
        html += '</tr>';
    });

    html += '</tbody></table></div>';
    container.innerHTML = html;
}

window.openAddUserModal = function() {
    document.getElementById('add-user-form').reset();
    openModal('add-user-modal');
};

window.closeAddUserModal = function() {
    closeModal('add-user-modal');
};

window.handleAddUser = async function(event) {
    event.preventDefault();

    const username = document.getElementById('add-username').value.trim();
    const displayName = document.getElementById('add-displayname').value.trim();
    const password = document.getElementById('add-password').value;
    const passwordConfirm = document.getElementById('add-password-confirm').value;
    const role = document.getElementById('add-role').value;

    // Validation
    if (password !== passwordConfirm) {
        showToast('Password dan konfirmasi password tidak sama', 'error');
        return;
    }

    if (password.length < 6) {
        showToast('Password minimal 6 karakter', 'error');
        return;
    }

    try {
        // Check if username already exists
        const allUsers = await database.getAll('users');
        const existingUser = allUsers.find(u => u.username === username);
        if (existingUser) {
            showToast('Username sudah digunakan', 'error');
            return;
        }

        // Create user
        const userId = generateUserId();
        const newUser = {
            userId: userId,
            username: username,
            passwordHash: btoa(password), // Simple encoding for demo (use bcrypt in production)
            displayName: displayName,
            role: role,
            active: true,
            createdAt: getCurrentTimestamp(),
            updatedAt: getCurrentTimestamp()
        };

        await database.add('users', newUser);

        showToast('User berhasil ditambahkan', 'success');
        window.closeAddUserModal();
        await loadUsers();

    } catch (error) {
        console.error('Error adding user:', error);
        showToast('Gagal menambahkan user: ' + error.message, 'error');
    }
};

window.editUser = async function(userId) {
    try {
        const user = await database.get('users', userId);
        if (!user) {
            showToast('User tidak ditemukan', 'error');
            return;
        }

        // Fill form
        document.getElementById('edit-user-id').value = user.userId;
        document.getElementById('edit-username').value = user.username;
        document.getElementById('edit-displayname').value = user.displayName;
        document.getElementById('edit-role').value = user.role;
        document.getElementById('edit-change-password').checked = false;
        document.getElementById('password-fields').classList.add('hidden');
        document.getElementById('edit-password').value = '';
        document.getElementById('edit-password-confirm').value = '';

        openModal('edit-user-modal');
    } catch (error) {
        console.error('Error loading user:', error);
        showToast('Gagal memuat data user: ' + error.message, 'error');
    }
};

window.closeEditUserModal = function() {
    closeModal('edit-user-modal');
};

window.togglePasswordFields = function() {
    const checkbox = document.getElementById('edit-change-password');
    const fields = document.getElementById('password-fields');

    if (checkbox.checked) {
        fields.classList.remove('hidden');
        document.getElementById('edit-password').required = true;
        document.getElementById('edit-password-confirm').required = true;
    } else {
        fields.classList.add('hidden');
        document.getElementById('edit-password').required = false;
        document.getElementById('edit-password-confirm').required = false;
        document.getElementById('edit-password').value = '';
        document.getElementById('edit-password-confirm').value = '';
    }
};

window.handleEditUser = async function(event) {
    event.preventDefault();

    const userId = document.getElementById('edit-user-id').value;
    const username = document.getElementById('edit-username').value.trim();
    const displayName = document.getElementById('edit-displayname').value.trim();
    const role = document.getElementById('edit-role').value;
    const changePassword = document.getElementById('edit-change-password').checked;

    try {
        // Check if username is taken by another user
        const allUsers = await database.getAll('users');
        const existingUser = allUsers.find(u => u.username === username);
        if (existingUser && existingUser.userId !== userId) {
            showToast('Username sudah digunakan oleh user lain', 'error');
            return;
        }

        const updateData = {
            username: username,
            displayName: displayName,
            role: role,
            updatedAt: getCurrentTimestamp()
        };

        // Update password if requested
        if (changePassword) {
            const password = document.getElementById('edit-password').value;
            const passwordConfirm = document.getElementById('edit-password-confirm').value;

            if (password !== passwordConfirm) {
                showToast('Password dan konfirmasi password tidak sama', 'error');
                return;
            }

            if (password.length < 6) {
                showToast('Password minimal 6 karakter', 'error');
                return;
            }

            updateData.passwordHash = btoa(password);
        }

        await database.update('users', userId, updateData);

        showToast('User berhasil diupdate', 'success');
        window.closeEditUserModal();
        await loadUsers();

        // If current user updated their own info, refresh session
        const currentUser = authService.getCurrentUser();
        if (currentUser.userId === userId) {
            const updatedUser = await database.get('users', userId);
            authService.updateCurrentUser(updatedUser);
            updateUserInfo();
        }

    } catch (error) {
        console.error('Error updating user:', error);
        showToast('Gagal mengupdate user: ' + error.message, 'error');
    }
};

window.deleteUser = async function(userId) {
    const user = await database.get('users', userId);
    if (!user) {
        showToast('User tidak ditemukan', 'error');
        return;
    }

    const confirmed = confirm(`Apakah Anda yakin ingin menghapus user "${user.displayName}"?\n\nTindakan ini tidak dapat dibatalkan.`);
    if (!confirmed) return;

    try {
        await database.delete('users', userId);

        showToast('User berhasil dihapus', 'success');
        await loadUsers();
    } catch (error) {
        console.error('Error deleting user:', error);
        showToast('Gagal menghapus user: ' + error.message, 'error');
    }
};

window.handleLogout = function() {
    authService.logout();
};

// Initialize
init();
