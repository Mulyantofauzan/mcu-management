# ⚡ Netlify Deployment - Quick Start

Panduan cepat untuk deploy aplikasi MCU Management ke Netlify dalam 10 menit!

---

## 📝 Checklist Sebelum Deploy

Pastikan sudah punya:
- ✅ Akun GitHub
- ✅ Akun Netlify (gratis)
- ✅ Akun Supabase (gratis)
- ✅ Project sudah di-push ke GitHub

---

## 🚀 5 Langkah Deploy

### 1️⃣ Setup Supabase (3 menit)

```bash
# 1. Buka https://supabase.com/ → Login → "New Project"
# 2. Isi:
#    - Name: mcu-management
#    - Password: [buat password kuat]
#    - Region: Southeast Asia (Singapore)
# 3. Tunggu project selesai dibuat (~2 menit)

# 4. Buka SQL Editor → New Query
# 5. Copy-paste isi file supabase-schema.sql → Run
# 6. Verify di Table Editor: ada 8 tabel

# 7. Buka Settings → API → Copy:
#    - Project URL: https://abcxyz.supabase.co
#    - anon public key: eyJ...
```

**Save credentials ini!** Akan dipakai di step berikutnya.

---

### 2️⃣ Push ke GitHub (1 menit)

```bash
cd /Users/mulyanto/Desktop/MCU-APP/mcu-management

# Jika belum init git:
git init
git add .
git commit -m "Ready for Netlify deployment"

# Buat repo di GitHub, lalu:
git remote add origin https://github.com/USERNAME/mcu-management.git
git branch -M main
git push -u origin main
```

✅ Done! Repository sudah di GitHub.

---

### 3️⃣ Deploy ke Netlify (2 menit)

```bash
# 1. Buka https://app.netlify.com/ → Login
# 2. "Add new site" → "Import an existing project"
# 3. "Deploy with GitHub" → Authorize → Pilih repo "mcu-management"

# 4. Build settings:
#    - Branch: main
#    - Build command: npm run build
#    - Publish directory: .

# 5. Klik "Show advanced" → "New variable":
```

| Key | Value |
|-----|-------|
| `SUPABASE_URL` | [Paste Project URL dari step 1] |
| `SUPABASE_ANON_KEY` | [Paste anon key dari step 1] |

```bash
# 6. Klik "Deploy site"
# 7. Tunggu 1-2 menit → Site live!
```

---

### 4️⃣ Update Site Name (30 detik)

```bash
# Di Netlify Dashboard:
# Site settings → Domain management → Options → Edit site name
# Ganti: random-name-123 → mcu-management
# URL jadi: https://mcu-management.netlify.app
```

---

### 5️⃣ Test Aplikasi (1 menit)

```bash
# 1. Buka URL Netlify Anda
# 2. Login:
#    - Username: admin
#    - Password: admin123
# 3. Test fitur:
#    - Dashboard loading
#    - Tambah karyawan
#    - Tambah MCU (via Kelola Karyawan atau Tambah Karyawan)
#    - Follow-up
#    - Kelola User (khusus Admin)
#    - Data Master
```

✅ Jika semua berfungsi → **Deployment berhasil!** 🎉

---

## 🔧 Troubleshooting Cepat

### Build Failed?

```bash
# Test build di local dulu:
npm install
npm run build

# Jika OK, commit & push:
git add .
git commit -m "Fix build"
git push
```

### Supabase Not Working?

```bash
# Check environment variables di Netlify:
# Site settings → Environment variables

# Pastikan ada:
# - SUPABASE_URL
# - SUPABASE_ANON_KEY

# Jika salah → Edit → Save → "Trigger deploy" → "Clear cache and deploy site"
```

### Database Empty?

**Normal!** Default users sudah ada (dari SQL schema):
- Username: `admin` / Password: `admin123` (Role: Admin)
- Username: `petugas` / Password: `petugas123` (Role: Petugas)

Tapi belum ada employee data, master data (departments, job titles, vendors) sudah di-seed.

**Solusi**: Input data employee & MCU manual via aplikasi.

---

## 📊 Monitoring

### Netlify Dashboard
- **Deploys**: Lihat build history & logs
- **Functions**: (future: serverless functions)
- **Analytics**: Traffic & performance

### Supabase Dashboard
- **Table Editor**: Lihat data
- **Logs**: Database queries
- **API**: Request logs

---

## 🔄 Update Aplikasi

Setelah deploy, setiap push otomatis redeploy:

```bash
# Edit code
git add .
git commit -m "Update feature X"
git push

# Netlify auto-redeploys dalam 1-2 menit!
```

---

## 🎯 Next Steps

1. **Custom Domain** (opsional):
   - Beli domain
   - Connect di Netlify

2. **Invite Team**:
   - Share URL
   - Create user accounts via menu Kelola User (Admin only)

3. **Add Data**:
   - Input employees & MCU records

4. **Embed Looker Dashboard** (opsional):
   - Create dashboard di Looker Studio
   - Update `pages/analysis.html` dengan embed URL

---

## 🎉 Done!

Aplikasi MCU Management Anda sudah live dan accessible dari mana saja!

**URL**: https://your-site.netlify.app

Share link ini ke tim untuk mulai menggunakan aplikasi.

---

**Need Help?**
- 📖 Full guide: [DEPLOYMENT.md](DEPLOYMENT.md)
- 🐛 Troubleshooting: [TROUBLESHOOTING.md](TROUBLESHOOTING.md)
- 📚 Docs: [README.md](README.md)
