/**
 * Authentication Service
 * Handles user authentication and session management
 */

import { database } from './database.js';
import { generateUserId } from '../utils/idGenerator.js';
import { getCurrentTimestamp } from '../utils/dateHelpers.js';

/**
 * Simple password hashing using Web Crypto API
 * Creates a salted hash suitable for password storage
 */
async function hashPassword(password) {
  // Generate random salt
  const salt = crypto.getRandomValues(new Uint8Array(16));

  // Encode password as UTF-8
  const encoder = new TextEncoder();
  const data = encoder.encode(password + Array.from(salt).map(b => String.fromCharCode(b)).join(''));

  // Hash using SHA-256
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);

  // Combine salt and hash
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const saltArray = Array.from(salt);
  const combined = saltArray.concat(hashArray);

  // Convert to base64 for storage
  return btoa(String.fromCharCode(...combined));
}

/**
 * Verify password against stored hash
 * Supports both new (salted SHA-256) and old (btoa Base64) formats for backward compatibility
 */
async function verifyPassword(password, storedHash) {
  try {
    // Try new format first (salted SHA-256)
    // New format: salt (16 bytes) + SHA-256 hash (32 bytes) = 48 bytes total
    const combined = Uint8Array.from(atob(storedHash), c => c.charCodeAt(0));

    // Check if this looks like a new format hash (should be 48 bytes)
    if (combined.length === 48) {
      // New format verification
      const salt = combined.slice(0, 16);

      // Hash the provided password with the same salt
      const encoder = new TextEncoder();
      const data = encoder.encode(password + Array.from(salt).map(b => String.fromCharCode(b)).join(''));
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));

      // Compare hashes
      const storedHashArray = Array.from(combined.slice(16));
      return hashArray.every((val, idx) => val === storedHashArray[idx]);
    } else {
      // Old format verification (btoa/Base64 encoding)
      // Old format: just btoa(password)
      const oldFormatHash = btoa(password);
      return storedHash === oldFormatHash;
    }
  } catch (error) {
    return false;
  }
}

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
    // Hash password using Web Crypto API with salt
    const passwordHash = await hashPassword(userData.password);

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

    // Verify password using Web Crypto API (supports both old and new formats)
    const isPasswordValid = await verifyPassword(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new Error('Password salah');
    }

    // ✅ Auto-migrate old password hashes to new secure format
    // Check if password is in old format (not 48 bytes when decoded)
    try {
      const decoded = Uint8Array.from(atob(user.passwordHash), c => c.charCodeAt(0));
      if (decoded.length !== 48) {
        // Old format detected, migrate to new format
        const newHash = await hashPassword(password);
        await database.update('users', user.userId, {
          passwordHash: newHash,
          lastLogin: getCurrentTimestamp()
        });
      } else {
        // New format, just update last login
        await database.update('users', user.userId, {
          lastLogin: getCurrentTimestamp()
        });
      }
    } catch (e) {
      // If decode fails, just update last login
      await database.update('users', user.userId, {
        lastLogin: getCurrentTimestamp()
      });
    }

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

    // If password is being updated, hash it using Web Crypto API
    if (updates.password) {
      updateData.passwordHash = await hashPassword(updates.password);
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
