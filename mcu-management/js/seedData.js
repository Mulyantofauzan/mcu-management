/**
 * Seed Data Script
 * Populates database with demo data for testing
 */

import { database } from './services/database.js';
import { employeeService } from './services/employeeService.js';
import { mcuService } from './services/mcuService.js';
import { masterDataService } from './services/masterDataService.js';
import { authService } from './services/authService.js';

const bloodTypes = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const mcuTypes = ['Pre-Employee', 'Annual', 'Khusus', 'Final'];
const mcuResults = ['Fit', 'Follow-Up', 'Unfit'];
const hbsagValues = ['Negatif', 'Positif', 'Reaktif'];

// Indonesian names for demo data
const firstNames = [
  'Budi', 'Ari', 'Siti', 'Dewi', 'Ahmad', 'Rini', 'Agus', 'Wati',
  'Bambang', 'Sri', 'Hadi', 'Endang', 'Sutrisno', 'Ningsih', 'Joko',
  'Lestari', 'Widodo', 'Sulistyo', 'Purwanto', 'Rahayu', 'Santoso',
  'Handayani', 'Setiawan', 'Wulandari', 'Prasetyo', 'Utami', 'Wijaya',
  'Maharani', 'Gunawan', 'Kusuma', 'Nugroho', 'Saputra', 'Pratama',
  'Kurniawan', 'Permata', 'Hidayat', 'Cahya', 'Rahman', 'Fitri',
  'Taufik', 'Indah', 'Yusuf', 'Maya', 'Irwan', 'Sari', 'Deni',
  'Ayu', 'Eko', 'Putri', 'Andi'
];

const lastNames = [
  'Santoso', 'Wijaya', 'Kusuma', 'Pratama', 'Saputra', 'Hidayat',
  'Rahman', 'Fitri', 'Nugraha', 'Permadi', 'Wibowo', 'Hartono',
  'Suryanto', 'Prabowo', 'Hermawan', 'Syahputra', 'Pradipta'
];

function randomItem(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomDate(start, end) {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

function generateRandomName() {
  return `${randomItem(firstNames)} ${randomItem(lastNames)}`;
}

function generateRandomBirthDate() {
  const now = new Date();
  const minDate = new Date(now.getFullYear() - 60, 0, 1);
  const maxDate = new Date(now.getFullYear() - 20, 11, 31);
  return randomDate(minDate, maxDate).toISOString().split('T')[0];
}

function generateRandomBloodPressure() {
  const systolic = randomInt(90, 180);
  const diastolic = randomInt(60, 120);
  return `${systolic}/${diastolic}`;
}

function generateRandomBMI() {
  return (randomInt(160, 320) / 10).toFixed(1);
}

export async function seedDatabase() {
  try {

    // Clear existing data (only for IndexedDB, not Supabase)
    // For Supabase, we skip clearing to preserve production data
    try {
      await database.clearAll();
      console.log('[seedData.js] Database cleared');
    } catch (error) {
      console.log('[seedData.js] Could not clear database (expected if using Supabase):', error.message);
    }

    // 1. Create Master Data

    const departments = [];
    const departmentNames = ['IT', 'HR', 'Finance', 'Operations', 'Marketing'];
    for (const name of departmentNames) {
      const dept = await masterDataService.createDepartment({ name });
      departments.push(dept);
    }

    const jobTitles = [];
    const jobTitleNames = ['Manager', 'Staff', 'Supervisor', 'Officer', 'Analyst', 'Specialist', 'Coordinator'];
    for (const name of jobTitleNames) {
      const job = await masterDataService.createJobTitle({ name });
      jobTitles.push(job);
    }

    const vendors = [];
    const vendorNames = ['PT Vendor A', 'PT Vendor B', 'CV Outsource C'];
    for (const name of vendorNames) {
      const vendor = await masterDataService.createVendor({ name });
      vendors.push(vendor);
    }

    // 2. Create Users

    await authService.createUser({
      username: 'admin',
      password: 'admin123',
      displayName: 'Administrator',
      role: 'Admin'
    });

    await authService.createUser({
      username: 'petugas',
      password: 'petugas123',
      displayName: 'Petugas MCU',
      role: 'Petugas'
    });


    // 3. Create Employees

    const employees = [];
    for (let i = 0; i < 50; i++) {
      const isVendor = Math.random() < 0.2; // 20% vendor employees

      const employeeData = {
        name: generateRandomName(),
        jobTitleId: randomItem(jobTitles).jobTitleId,
        departmentId: randomItem(departments).departmentId,
        birthDate: generateRandomBirthDate(),
        employmentStatus: isVendor ? 'Vendor' : 'Company',
        vendorName: isVendor ? randomItem(vendors).name : null,
        activeStatus: Math.random() < 0.95 ? 'Active' : 'Inactive',
        inactiveReason: Math.random() < 0.95 ? null : 'Resigned',
        bloodType: randomItem(bloodTypes)
      };

      const employee = await employeeService.create(employeeData);
      employees.push(employee);
    }

    // 4. Create MCU Records

    const dummyUser = { userId: 'SYSTEM', username: 'system' };
    let mcuCount = 0;

    for (const employee of employees) {
      // Each employee gets 1-3 MCU records
      const numMCUs = randomInt(1, 3);

      for (let i = 0; i < numMCUs; i++) {
        const mcuDate = randomDate(
          new Date(2023, 0, 1),
          new Date()
        ).toISOString().split('T')[0];

        const initialResult = randomItem(mcuResults);

        const mcuData = {
          employeeId: employee.employeeId,
          mcuType: i === 0 ? 'Pre-Employee' : randomItem(mcuTypes),
          mcuDate: mcuDate,
          bmi: generateRandomBMI(),
          bloodPressure: generateRandomBloodPressure(),
          vision: randomItem(['6/6', '6/9', '6/12', '6/18']),
          audiometry: `${randomInt(15, 30)} dB`,
          spirometry: randomItem(['Normal', 'Restricted', 'Obstructive']),
          xray: randomItem(['Normal', 'Cardiomegaly', 'Infiltrate']),
          ekg: randomItem(['Normal', 'Sinus Tachycardia', 'Sinus Bradycardia']),
          treadmill: randomItem(['Normal', 'Positive', 'Negative']),
          kidneyLiverFunction: 'Normal',
          hbsag: randomItem(hbsagValues),
          sgot: `${randomInt(10, 40)} U/L`,
          sgpt: `${randomInt(10, 40)} U/L`,
          cbc: 'Normal',
          napza: 'Negatif',
          initialResult: initialResult,
          initialNotes: `Pemeriksaan ${initialResult}. ${
            initialResult === 'Follow-Up' ? 'Perlu pemeriksaan lanjutan untuk tekanan darah.' :
            initialResult === 'Fit' ? 'Kondisi kesehatan baik.' :
            'Tidak layak untuk posisi saat ini.'
          }`
        };

        const mcu = await mcuService.create(mcuData, dummyUser);
        mcuCount++;

        // For some Follow-Up cases, add follow-up updates
        if (initialResult === 'Follow-Up' && Math.random() < 0.6) {
          const finalResult = Math.random() < 0.7 ? 'Fit' : 'Follow-Up';

          await mcuService.updateFollowUp(
            mcu.mcuId,
            {
              bloodPressure: generateRandomBloodPressure(),
              finalResult: finalResult,
              finalNotes: finalResult === 'Fit' ?
                'Setelah pemeriksaan ulang, kondisi sudah membaik.' :
                'Masih perlu follow-up lebih lanjut.'
            },
            dummyUser
          );
        }
      }
    }

    // 5. Create some soft-deleted records for testing restore

    const employeesToDelete = employees.slice(0, 3);
    for (const emp of employeesToDelete) {
      await employeeService.softDelete(emp.employeeId);
    }


    return {
      success: true,
      counts: {
        departments: departments.length,
        jobTitles: jobTitles.length,
        vendors: vendors.length,
        users: 2,
        employees: employees.length,
        mcus: mcuCount,
        deleted: employeesToDelete.length
      }
    };

  } catch (error) {

    return {
      success: false,
      error: error.message
    };
  }
}

// ============================================
// PRODUCTION MODE - AUTO-SEEDING DISABLED
// ============================================
// Auto-seeding is DISABLED for production to prevent dummy data contamination
// For development/testing only: Set ENABLE_AUTO_SEED = true in env-config.js

export async function checkAndSeedIfEmpty() {
  // Check if auto-seeding is enabled (default: DISABLED for production)
  const enableAutoSeed = window.ENV?.ENABLE_AUTO_SEED === true;

  if (!enableAutoSeed) {

    return { success: true, message: 'Auto-seeding disabled for production' };
  }

  // Development mode: Auto-seed if database is empty

  try {
    // Check if users exist (more important than employees for login)
    const users = await database.getAll('users');
    if (!users || users.length === 0) {

      return await seedDatabase();
    }

    return { success: true, message: 'Database already has data' };
  } catch (error) {

    return { success: false, error: error.message };
  }
}
