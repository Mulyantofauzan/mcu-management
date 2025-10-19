# 🐛 Debug Login Issue

Ikuti langkah-langkah ini untuk debug masalah login.

---

## Step 1: Clear IndexedDB (WAJIB!)

**Di Chrome/Edge:**
1. Buka page aplikasi
2. F12 → Tab **Application**
3. Sidebar kiri: **Storage** → **IndexedDB** → **MCU_Database**
4. **Klik kanan** pada "MCU_Database" → **Delete database**
5. Refresh page (F5)

**Di Firefox:**
1. F12 → Tab **Storage**
2. Sidebar: **Indexed DB** → **https://your-site**
3. Klik kanan → **Delete All**
4. Refresh page

**Di Safari:**
1. F12 → Tab **Storage**
2. Sidebar: **Indexed Databases**
3. Pilih database → Delete
4. Refresh page

---

## Step 2: Check Console Logs

Setelah refresh, di **Console tab**, harus muncul:

**✅ Expected (GOOD):**
```
📦 env-config.js loaded
✅ Supabase credentials configured (atau ⚠️ IndexedDB fallback)
Database initialized successfully
🔄 Initializing database...
Database initialized successfully
No users found. Auto-seeding database...
Starting database seeding...
Creating master data...
Created 5 departments
Created 7 job titles
Created 3 vendors
Creating users...
Created 2 users (admin/admin123, petugas/petugas123)  ← PENTING!
Creating employees...
Created 50 employees
✅ Database seeded successfully!
```

**❌ If you see (BAD):**
```
Database already has 2 user(s)  ← IndexedDB belum di-clear!
```

**❌ If you see error:**
```
Error seeding database: ...
```
Screenshot error-nya!

---

## Step 3: Verify Database Content

**Paste script ini di Console:**

```javascript
// Test 1: Cek database content
(async () => {
  console.log('=== DEBUG: Checking database ===');

  try {
    // Import database
    const { database } = await import('./js/services/database.js');

    // Get all users
    const users = await database.getAll('users');
    console.log('Total users:', users.length);
    console.log('Users:', users);

    // Check each user
    users.forEach(user => {
      console.log(`User: ${user.username}`);
      console.log(`  - userId: ${user.userId}`);
      console.log(`  - active: ${user.active}`);
      console.log(`  - passwordHash: ${user.passwordHash ? 'EXISTS' : 'MISSING'}`);
    });

  } catch (error) {
    console.error('Error checking database:', error);
  }
})();
```

**Expected Output:**
```
=== DEBUG: Checking database ===
Total users: 2
Users: [{...}, {...}]
User: admin
  - userId: USR-20241019-XXXX
  - active: true
  - passwordHash: EXISTS
User: petugas
  - userId: USR-20241019-XXXX
  - active: true
  - passwordHash: EXISTS
```

---

## Step 4: Test Login Manually

**Paste script ini di Console:**

```javascript
// Test 2: Test login function
(async () => {
  console.log('=== DEBUG: Testing login ===');

  try {
    const { authService } = await import('./js/services/authService.js');

    // Test login
    console.log('Attempting login with admin/admin123...');
    const result = await authService.login('admin', 'admin123');
    console.log('✅ Login SUCCESS!', result);

  } catch (error) {
    console.error('❌ Login FAILED:', error.message);
    console.error('Full error:', error);

    // Debug: Check what authService sees
    const { database } = await import('./js/services/database.js');
    const users = await database.getAll('users');
    console.log('Users in database:', users);

    // Test filter logic
    const username = 'admin';
    const user = users.find(u => u.username === username && u.active);
    console.log('Filter result:', user);

    // Check each user
    users.forEach(u => {
      console.log(`Username: ${u.username}, Active: ${u.active}, Match: ${u.username === username && u.active}`);
    });
  }
})();
```

**Expected Output:**
```
=== DEBUG: Testing login ===
Attempting login with admin/admin123...
✅ Login SUCCESS! {userId: "...", username: "admin", ...}
```

**If error:**
```
❌ Login FAILED: Username tidak ditemukan atau akun tidak aktif
Users in database: [{username: "admin", active: undefined, ...}]  ← PROBLEM!
Filter result: undefined
Username: admin, Active: undefined, Match: false  ← active is undefined!
```

---

## Step 5: If Active Field is Undefined

Berarti IndexedDB masih version 1 (belum upgrade ke version 2).

**Solution: Force Delete IndexedDB**

**Paste ini di Console:**
```javascript
// Force delete IndexedDB
indexedDB.deleteDatabase('MCU_Database');
console.log('IndexedDB deleted. Please refresh page (F5)');
```

Kemudian **Refresh page** (F5).

---

## Step 6: Manual Create User (Last Resort)

Jika seeding masih gagal, buat user manual:

**Paste ini di Console:**

```javascript
// Manual create admin user
(async () => {
  console.log('=== Creating admin user manually ===');

  try {
    const { authService } = await import('./js/services/authService.js');

    const user = await authService.createUser({
      username: 'admin',
      password: 'admin123',
      displayName: 'Administrator',
      role: 'Admin'
    });

    console.log('✅ User created:', user);
    console.log('Try login now!');

  } catch (error) {
    console.error('❌ Error creating user:', error);
  }
})();
```

Kemudian test login lagi.

---

## Common Issues

### Issue 1: "Database already has X user(s)" tapi login gagal
**Problem:** IndexedDB lama dengan version 1 schema (no 'active' field)
**Solution:** Delete IndexedDB via DevTools, refresh

### Issue 2: "active: undefined" di user object
**Problem:** Schema belum upgrade ke version 2
**Solution:**
```javascript
indexedDB.deleteDatabase('MCU_Database');
location.reload();
```

### Issue 3: Seeding tidak jalan
**Problem:** Database sudah ada user dari seeding sebelumnya
**Solution:** Clear IndexedDB dulu sebelum refresh

### Issue 4: Error "Cannot read properties of undefined"
**Problem:** Supabase digunakan tapi tables belum dibuat
**Solution:** Pastikan console shows "📦 Using IndexedDB (Dexie) as fallback database"

---

## Quick Debug Checklist

Jalankan semua ini di Console, screenshot hasilnya:

```javascript
// 1. Check window.ENV
console.log('ENV:', window.ENV);

// 2. Check database type
const { isSupabaseEnabled } = await import('./js/config/supabase.js');
console.log('Using Supabase?', isSupabaseEnabled());

// 3. Check users
const { database } = await import('./js/services/database.js');
const users = await database.getAll('users');
console.log('Users:', users);

// 4. Test login
const { authService } = await import('./js/services/authService.js');
try {
  const result = await authService.login('admin', 'admin123');
  console.log('✅ LOGIN SUCCESS:', result);
} catch (e) {
  console.log('❌ LOGIN FAILED:', e.message);
}
```

---

**Kirim screenshot hasil dari script di atas, saya akan bantu debug!** 🔍
