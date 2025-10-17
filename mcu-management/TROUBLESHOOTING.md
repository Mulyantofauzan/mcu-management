# Troubleshooting Guide - MCU Management System

## 🔴 Problem: "Password Salah" ketika Login

### Quick Fix (Cara Tercepat):

1. **Buka Debug Tool**
   - URL: `http://localhost:8000/debug-login.html`
   - Atau klik link "🔧 Masalah Login? Klik untuk Debug Tool" di halaman login

2. **Klik Tombol Berikut Secara Berurutan:**
   - Klik **"1. Check Database & Users"** → Lihat apakah users ada
   - Jika tidak ada user, klik **"2. Reset & Seed Database"**
   - Tunggu sampai selesai
   - Klik **"3. Test Login"** → Akan auto-login dan redirect

3. **Selesai!** Sekarang Anda bisa login dengan:
   - **Username**: `admin`
   - **Password**: `admin123`

---

## 🔧 Detailed Debugging Steps

### Step 1: Check Browser Console

1. Buka browser (Chrome/Firefox)
2. Tekan `F12` untuk buka DevTools
3. Klik tab **Console**
4. Refresh halaman login
5. Lihat log messages:
   - ✅ Harus ada: "Database seeded: ..."
   - ✅ Harus ada: "Ready for login"
   - ❌ Jika ada error merah, lanjut ke Step 2

### Step 2: Check IndexedDB

1. Di DevTools, klik tab **Application**
2. Klik **IndexedDB** di sidebar kiri
3. Expand **MCU_Database**
4. Klik **users** table
5. Lihat apakah ada 2 records:
   - admin (role: Admin)
   - petugas (role: Petugas)

**Jika tidak ada atau kosong:**
- Database belum di-seed
- Solusi: Gunakan Debug Tool (lihat Quick Fix di atas)

### Step 3: Verify Password Hash

Di browser console, ketik:

```javascript
btoa('admin123')
// Harus return: "YWRtaW4xMjM="
```

Bandingkan dengan passwordHash di IndexedDB:
- Buka Application → IndexedDB → MCU_Database → users
- Klik user "admin"
- Lihat field `passwordHash`
- Harus sama: `YWRtaW4xMjM=`

**Jika berbeda:**
- Password hash tidak match
- Solusi: Manual create user via Debug Tool

---

## 🚨 Common Issues & Solutions

### Issue 1: "Database is initializing..."

**Penyebab**: Database belum selesai di-initialize

**Solusi**:
- Tunggu 5-10 detik
- Refresh page
- Check console untuk error messages

### Issue 2: Login button tidak respond

**Penyebab**: JavaScript error atau module tidak load

**Solusi**:
1. Check browser console untuk errors
2. Pastikan running via http-server (bukan file://)
3. Clear browser cache (`Ctrl+Shift+Delete`)
4. Hard refresh (`Ctrl+F5`)

### Issue 3: Redirect loop (login → redirect → login)

**Penyebab**: Session tidak tersimpan

**Solusi**:
1. Check browser console
2. Open DevTools → Application → Session Storage
3. Harus ada entry `currentUser`
4. Jika tidak ada:
   - Clear all browser data
   - Restart browser
   - Try again

### Issue 4: "Users not found" di console

**Penyebab**: Seed data gagal dibuat

**Solusi**:
1. Buka Debug Tool: `http://localhost:8000/debug-login.html`
2. Klik "Reset & Seed Database"
3. Tunggu sampai selesai
4. Try login again

---

## 🔍 Manual Database Reset

Jika semua cara di atas gagal, reset manual:

### Via Browser Console:

```javascript
// 1. Delete database
indexedDB.deleteDatabase('MCU_Database');

// 2. Refresh page
location.reload();

// 3. Database akan auto-seed saat page load
```

### Via Debug Tool:

1. Buka `debug-login.html`
2. Klik "Reset & Seed Database"
3. Konfirmasi
4. Tunggu sampai selesai (lihat output log)

---

## 📊 Expected Database State (After Seed)

Setelah seed berhasil, IndexedDB harus memiliki:

```
MCU_Database/
├── users (2 records)
│   ├── admin (passwordHash: YWRtaW4xMjM=)
│   └── petugas (passwordHash: cGV0dWdhczEyMw==)
├── employees (50 records, 3 soft-deleted)
├── mcus (120+ records)
├── mcuChanges (multiple records)
├── jobTitles (7 records)
├── departments (5 records)
├── vendors (3 records)
└── activityLog (activity entries)
```

---

## 🛠️ Advanced Debugging

### Check if Dexie is loaded:

```javascript
console.log(typeof Dexie); // Should be "function"
```

### Check if services are loaded:

```javascript
import { authService } from './js/services/authService.js';
console.log(authService); // Should be object
```

### Manually test login:

```javascript
import { authService } from './js/services/authService.js';

authService.login('admin', 'admin123')
  .then(user => console.log('✅ Login success:', user))
  .catch(err => console.error('❌ Login failed:', err));
```

### Check password hashing:

```javascript
const password = 'admin123';
const hash = btoa(password);
console.log('Password:', password);
console.log('Hash:', hash); // YWRtaW4xMjM=
```

---

## 🌐 Browser Compatibility

Pastikan menggunakan browser yang didukung:

- ✅ Chrome 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Edge 90+

**Jangan gunakan**:
- ❌ Internet Explorer
- ❌ Browser mode private/incognito (IndexedDB might be restricted)

---

## 📝 Still Having Issues?

### Check List:

- [ ] Running via HTTP server (not file://)
- [ ] Port 8000 accessible
- [ ] Browser console shows no errors
- [ ] IndexedDB enabled in browser
- [ ] Not in private/incognito mode
- [ ] CSS loaded (page looks styled)
- [ ] JavaScript modules enabled

### Debug Commands:

Open browser console and run:

```javascript
// 1. Check database
import { database } from './js/services/database.js';
const users = await database.getAll('users');
console.log('Users:', users);

// 2. Test password
const testHash = btoa('admin123');
console.log('Expected hash:', testHash);
console.log('Actual hash:', users[0]?.passwordHash);
console.log('Match:', testHash === users[0]?.passwordHash);

// 3. Manual login
import { authService } from './js/services/authService.js';
await authService.login('admin', 'admin123');
console.log('Logged in!');
```

---

## 🎯 Quick Recovery Steps

**If nothing works, follow this:**

1. **Close all browser tabs**
2. **Clear browser data**:
   - Chrome: Settings → Privacy → Clear browsing data
   - Check: Cookies, Cache, Site data
   - Time range: All time
3. **Restart browser**
4. **Start fresh**:
   ```bash
   npx http-server -p 8000
   ```
5. **Open**: `http://localhost:8000/debug-login.html`
6. **Click**: "Reset & Seed Database"
7. **Wait for success message**
8. **Click**: "Test Login"
9. **Done!**

---

## 💡 Prevention Tips

Untuk menghindari masalah di masa depan:

1. **Selalu jalankan via HTTP server**, jangan buka file:// langsung
2. **Check console** setelah seed untuk pastikan sukses
3. **Jangan clear browser data** saat development
4. **Backup IndexedDB** jika ada data penting:
   - DevTools → Application → IndexedDB → Right-click → Export

---

## 📞 Getting Help

Jika masih mengalami masalah:

1. Check [README.md](README.md) untuk dokumentasi lengkap
2. Check browser console untuk error messages
3. Gunakan Debug Tool untuk diagnose
4. Export IndexedDB state untuk review

---

**Last Updated**: 2024-10-17
