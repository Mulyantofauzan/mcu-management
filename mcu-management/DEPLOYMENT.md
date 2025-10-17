# 🚀 Deployment Guide - MCU Management System

Panduan lengkap untuk deploy aplikasi MCU Management ke Netlify dengan Supabase database.

---

## 📋 Prerequisites

Sebelum mulai, pastikan Anda punya:
- ✅ Akun GitHub (untuk version control)
- ✅ Akun Netlify (gratis) - [Sign up di sini](https://app.netlify.com/signup)
- ✅ Akun Supabase (gratis) - [Sign up di sini](https://supabase.com/)
- ✅ Git terinstall di komputer
- ✅ Node.js & npm terinstall

---

## 🗄️ Step 1: Setup Supabase Database

### 1.1. Buat Project Supabase

1. Login ke [Supabase Dashboard](https://app.supabase.com/)
2. Klik **"New Project"**
3. Isi:
   - **Name**: `mcu-management` (atau nama lain)
   - **Database Password**: buat password yang kuat (SIMPAN INI!)
   - **Region**: pilih yang terdekat (e.g., `Southeast Asia (Singapore)`)
4. Klik **"Create new project"**
5. Tunggu ~2 menit sampai project selesai dibuat

### 1.2. Jalankan SQL Schema

1. Di Supabase Dashboard, buka **SQL Editor** (di sidebar kiri)
2. Klik **"New query"**
3. Copy-paste seluruh isi file `supabase-schema.sql` ke editor
4. Klik **"Run"** (atau tekan Ctrl/Cmd + Enter)
5. Verify: Buka **Table Editor**, Anda harus melihat 8 tabel:
   - users
   - employees
   - mcus
   - mcu_changes
   - job_titles
   - departments
   - vendors
   - activity_log

### 1.3. Dapatkan API Credentials

1. Di Supabase Dashboard, buka **Settings** → **API**
2. Copy 2 values ini (SIMPAN DI TEMPAT AMAN):
   - **Project URL** (e.g., `https://abcdefgh.supabase.co`)
   - **anon public** key (key panjang yang starts with `eyJ...`)

---

## 📦 Step 2: Push ke GitHub

### 2.1. Initialize Git (jika belum)

```bash
cd /Users/mulyanto/Desktop/MCU-APP/mcu-management

# Initialize git
git init

# Add all files
git add .

# Commit
git commit -m "Initial commit - MCU Management System"
```

### 2.2. Buat Repository di GitHub

1. Login ke [GitHub](https://github.com/)
2. Klik **"New repository"**
3. Isi:
   - **Repository name**: `mcu-management`
   - **Description**: "Medical Check Up Management System"
   - **Visibility**: Private atau Public (terserah)
   - **DON'T** check "Initialize with README" (karena sudah ada)
4. Klik **"Create repository"**

### 2.3. Push ke GitHub

```bash
# Add remote (ganti USERNAME dengan username GitHub Anda)
git remote add origin https://github.com/USERNAME/mcu-management.git

# Push
git branch -M main
git push -u origin main
```

---

## 🌐 Step 3: Deploy ke Netlify

### 3.1. Connect Repository

1. Login ke [Netlify](https://app.netlify.com/)
2. Klik **"Add new site"** → **"Import an existing project"**
3. Pilih **"Deploy with GitHub"**
4. Authorize Netlify untuk akses GitHub
5. Pilih repository `mcu-management`

### 3.2. Configure Build Settings

Di halaman deploy configuration:

**Build settings:**
- **Branch to deploy**: `main`
- **Build command**: `npm run build`
- **Publish directory**: `.` (titik, artinya root directory)

Klik **"Show advanced"** → **"New variable"** untuk tambah environment variables:

| Key | Value |
|-----|-------|
| `SUPABASE_URL` | Paste **Project URL** dari Step 1.3 |
| `SUPABASE_ANON_KEY` | Paste **anon public** key dari Step 1.3 |

### 3.3. Deploy!

1. Klik **"Deploy site"**
2. Tunggu ~1-2 menit sampai build selesai
3. Netlify akan assign URL random (e.g., `https://random-name-123.netlify.app`)
4. Klik URL untuk buka site Anda!

### 3.4. Custom Domain (Opsional)

Di Netlify dashboard:
1. Buka site Anda
2. **Site settings** → **Domain management**
3. Klik **"Options"** → **"Edit site name"**
4. Ganti dengan nama yang lebih baik, misalnya: `mcu-management.netlify.app`

---

## 🔧 Step 4: Update HTML untuk Supabase

Aplikasi sudah siap menggunakan Supabase! Pastikan file HTML load Supabase SDK:

### 4.1. Update Login Page

File `pages/login.html` perlu load Supabase SDK. Tambahkan di `<head>`:

```html
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Login - MCU Management</title>
    <link rel="stylesheet" href="../css/output.css">

    <!-- Dexie (IndexedDB) - Fallback -->
    <script src="https://cdn.jsdelivr.net/npm/dexie@3.2.4/dist/dexie.min.js"></script>

    <!-- Supabase - Production -->
    <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>

    <!-- Environment Variables (Netlify injects these) -->
    <script>
        window.ENV = {
            SUPABASE_URL: '{{SUPABASE_URL}}' || '',
            SUPABASE_ANON_KEY: '{{SUPABASE_ANON_KEY}}' || ''
        };
    </script>
</head>
```

### 4.2. Update All Other Pages

Tambahkan script yang sama di semua halaman HTML:
- `index.html`
- `pages/tambah-karyawan.html`
- `pages/kelola-karyawan.html`
- `pages/follow-up.html`
- `pages/data-master.html`
- `pages/data-terhapus.html`
- `pages/analysis.html`

### 4.3. Update Service Files (Optional)

Jika ingin menggunakan database adapter sepenuhnya, update import di service files:

```javascript
// OLD (IndexedDB only):
import { db } from './database.js';

// NEW (Supabase + IndexedDB fallback):
import { Employees, MCUs, Users } from './databaseAdapter.js';
```

**CATATAN**: Untuk deployment pertama, Anda bisa skip langkah 4.3 dulu. Aplikasi akan tetap berjalan dengan IndexedDB (data disimpan di browser masing-masing user). Nanti bisa migrate ke Supabase secara bertahap.

---

## ✅ Step 5: Verify Deployment

### 5.1. Test Login

1. Buka URL Netlify Anda
2. Akan redirect ke login page
3. Login dengan credentials:
   - **Username**: `admin`
   - **Password**: `admin123`
4. Harus berhasil login dan redirect ke dashboard

### 5.2. Test Database

Di browser, buka Developer Console (F12), jalankan:

```javascript
// Check apakah Supabase terdeteksi
import('./js/config/supabase.js').then(m => {
    console.log('Supabase enabled:', m.isSupabaseEnabled());
    m.testConnection().then(result => console.log('Connection test:', result));
});
```

Jika Supabase configured dengan benar, akan muncul:
```
✅ Supabase client initialized
Supabase enabled: true
Connection test: { success: true, message: 'Supabase connection successful' }
```

### 5.3. Test CRUD Operations

1. **Tambah Karyawan**: Buat employee baru
2. **Kelola Karyawan**: Lihat list, edit, detail
3. **Follow-Up**: Update MCU
4. **Data Master**: Tambah/edit jabatan/dept/vendor

Semua harus berfungsi normal!

---

## 🐛 Troubleshooting

### Problem: Build Failed

**Error**: `npm run build` gagal

**Fix**:
```bash
# Di local, test build dulu
npm install
npm run build

# Pastikan tidak ada error, lalu commit & push
git add .
git commit -m "Fix build"
git push
```

### Problem: Environment Variables Tidak Terbaca

**Symptoms**: Supabase not initialized, masih pakai IndexedDB

**Fix**:
1. Buka Netlify Dashboard → Site settings → Environment variables
2. Pastikan `SUPABASE_URL` dan `SUPABASE_ANON_KEY` ada dan benar
3. Klik **"Trigger deploy"** → **"Clear cache and deploy site"**

### Problem: CORS Error

**Error**: `Access to fetch at 'https://...supabase.co' from origin 'https://...netlify.app' has been blocked by CORS`

**Fix**:
1. Buka Supabase Dashboard → **Authentication** → **URL Configuration**
2. Di **Site URL**, tambahkan Netlify URL Anda: `https://your-site.netlify.app`
3. Di **Redirect URLs**, tambahkan: `https://your-site.netlify.app/**`

### Problem: Database Empty Setelah Deploy

**Symptoms**: Login berhasil tapi tidak ada data

**Solution**: Ini normal! Supabase sudah punya user default dari SQL schema, tapi belum ada employee/MCU data.

**Options**:
1. **Manual**: Input data via aplikasi (tambah karyawan satu-satu)
2. **Seed Script**: Buat script untuk bulk insert (lihat `seedData.js` untuk referensi)

### Problem: IndexedDB Data Hilang

**Symptoms**: Data yang dibuat di local tidak muncul di Netlify

**Explanation**: IndexedDB adalah local storage di browser. Data tidak dibawa ke server.

**Solution**: Setelah deploy dengan Supabase, data baru yang dibuat akan tersimpan di cloud. Data lama di IndexedDB tidak otomatis migrate.

**Migration Path**:
1. Export data dari IndexedDB (buat script export to JSON)
2. Import JSON ke Supabase (via SQL INSERT atau bulk import script)

---

## 🔄 Continuous Deployment

Setelah setup awal selesai, setiap kali Anda push ke GitHub, Netlify otomatis rebuild & redeploy!

```bash
# Workflow:
git add .
git commit -m "Update feature X"
git push

# Netlify auto-deploys dalam 1-2 menit
```

---

## 📊 Monitoring & Logs

### Netlify Logs

1. Buka Netlify Dashboard → Site Anda
2. **Deploys** tab: Lihat history & status
3. Klik deploy tertentu → **Deploy log**: Lihat build output

### Supabase Logs

1. Buka Supabase Dashboard
2. **Logs** → **Postgres Logs**: Lihat database queries
3. **API** → **Logs**: Lihat API requests

---

## 🎯 Next Steps (Production-Ready)

Untuk production yang lebih robust:

1. **Custom Domain**:
   - Beli domain (e.g., Namecheap, GoDaddy)
   - Connect ke Netlify (Settings → Domain management)

2. **SSL Certificate**:
   - Netlify provide free SSL (Let's Encrypt)
   - Auto-enabled untuk custom domain

3. **Password Hashing**:
   - Update `authService.js` untuk pakai bcrypt (bukan Base64)
   - Supabase punya built-in Auth bisa dipakai

4. **Row Level Security (RLS)**:
   - Enable RLS di Supabase tables
   - Buat policies untuk security

5. **Database Backups**:
   - Supabase free tier: automatic daily backups
   - Paid: more frequent + point-in-time recovery

6. **Analytics**:
   - Netlify Analytics (built-in)
   - Google Analytics (add script)
   - Supabase query analytics

---

## 📚 Resources

- **Netlify Docs**: https://docs.netlify.com/
- **Supabase Docs**: https://supabase.com/docs
- **GitHub Help**: https://docs.github.com/

---

## ✅ Deployment Checklist

- [ ] Supabase project created
- [ ] SQL schema executed (8 tables created)
- [ ] Supabase credentials saved
- [ ] Repository pushed to GitHub
- [ ] Netlify site created
- [ ] Environment variables configured
- [ ] Site deployed successfully
- [ ] Login tested
- [ ] Database connection verified
- [ ] CRUD operations working
- [ ] (Optional) Custom domain configured
- [ ] (Optional) Supabase adapter integrated

---

🎉 **Congratulations!** Aplikasi MCU Management Anda sudah live di internet!

Share URL Netlify Anda ke tim untuk mulai pakai aplikasi.

Need help? Check troubleshooting section atau contact support.
