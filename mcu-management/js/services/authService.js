/**
 * Authentication Service
 * Handles user authentication and session management
 */

import { database } from './database.js';
import { generateUserId } from '../utils/idGenerator.js';
import { getCurrentTimestamp } from '../utils/dateHelpers.js';

class AuthService {
  constructor() {
    this.currentUser = this.loadCurrentUser();
  }

  loadCurrentUser() {
    const userJson = localStorage.getItem('currentUser');
    return userJson ? JSON.parse(userJson) : null;
  }

  saveCurrentUser(user) {
    this.currentUser = user;
    localStorage.setItem('currentUser', JSON.stringify(user));
  }

  clearCurrentUser() {
    this.currentUser = null;
    localStorage.removeItem('currentUser');
  }

  async createUser(userData) {
    // Simple password hashing (in production, use proper hashing)
    const passwordHash = btoa(userData.password); // Base64 encoding (NOT secure for production)

    const user = {
      userId: generateUserId(),
      username: userData.username,
      passwordHash: passwordHash,
      displayName: userData.displayName,
      role: userData.role || 'Petugas',
      createdAt: getCurrentTimestamp(),
      lastLogin: null,
      active: true
    };

    await database.add('users', user);
    return user;
  }

  async login(username, password) {
    const users = await database.getAll('users');

    // Check active field - if undefined (Supabase old schema), treat as active
    const user = users.find(u => u.username === username && (u.active === undefined || u.active === true));

    if (!user) {
      throw new Error('Username tidak ditemukan atau akun tidak aktif');
    }

    // Simple password verification
    const passwordHash = btoa(password);
    if (user.passwordHash !== passwordHash) {
      throw new Error('Password salah');
    }

    // Update last login
    await database.update('users', user.userId, {
      lastLogin: getCurrentTimestamp()
    });

    // Don't store password hash in session
    const sessionUser = {
      userId: user.userId,
      username: user.username,
      displayName: user.displayName,
      role: user.role
    };

    this.saveCurrentUser(sessionUser);
    return sessionUser;
  }

  logout() {
    this.clearCurrentUser();
    // Redirect to login page - check if we're already in pages/ directory
    const currentPath = window.location.pathname;
    if (currentPath.includes('/pages/')) {
      window.location.href = 'login.html';
    } else {
      window.location.href = 'pages/login.html';
    }
  }

  getCurrentUser() {
    return this.currentUser;
  }

  updateCurrentUser(user) {
    // Update current user session (when user edits their own profile)
    const sessionUser = {
      userId: user.userId,
      username: user.username,
      displayName: user.displayName,
      role: user.role
    };
    this.saveCurrentUser(sessionUser);
  }

  isAuthenticated() {
    return this.currentUser !== null;
  }

  isAdmin() {
    return this.currentUser && this.currentUser.role === 'Admin';
  }

  requireAuth() {
    if (!this.isAuthenticated()) {
      window.location.href = 'pages/login.html';
      return false;
    }
    return true;
  }

  requireAdmin() {
    if (!this.isAdmin()) {
      throw new Error('Akses ditolak. Hanya Admin yang dapat melakukan aksi ini.');
    }
    return true;
  }

  async getAllUsers() {
    return await database.getAll('users');
  }

  async getUserById(userId) {
    return await database.get('users', userId);
  }

  async updateUser(userId, updates) {
    const updateData = { ...updates };

    // If password is being updated, hash it
    if (updates.password) {
      updateData.passwordHash = btoa(updates.password);
      delete updateData.password;
    }

    await database.update('users', userId, updateData);
    return await this.getUserById(userId);
  }

  async deleteUser(userId) {
    // Don't allow deleting yourself
    if (this.currentUser && this.currentUser.userId === userId) {
      throw new Error('Tidak dapat menghapus user yang sedang login');
    }

    await database.delete('users', userId);
    return true;
  }

  async deactivateUser(userId) {
    await database.update('users', userId, { active: false });
    return true;
  }

  async activateUser(userId) {
    await database.update('users', userId, { active: true });
    return true;
  }
}

export const authService = new AuthService();
