# Quick Start Guide - MCU Management System

## 🚀 Mulai dalam 3 Langkah

### 1️⃣ Install Dependencies
```bash
cd mcu-management
npm install
```

### 2️⃣ Build CSS
```bash
npm run build
```

### 3️⃣ Jalankan Aplikasi

**Pilihan A - VS Code Live Server (Recommended):**
1. Install extension "Live Server" di VS Code
2. Right-click pada `index.html`
3. Pilih "Open with Live Server"
4. Browser akan otomatis membuka aplikasi

**Pilihan B - Python HTTP Server:**
```bash
python3 -m http.server 8000
# Buka browser: http://localhost:8000
```

**Pilihan C - Node.js http-server:**
```bash
npx http-server -p 8000
# Buka browser: http://localhost:8000
```

## 🔐 Login Credentials

Aplikasi akan otomatis membuat demo data saat pertama kali dibuka.

**Demo Users:**
- **Admin**: `admin` / `admin123`
- **Petugas**: `petugas` / `petugas123`

## 📊 Demo Data

Setelah login pertama kali, aplikasi otomatis membuat:
- ✅ 50 karyawan (berbagai departemen & jabatan)
- ✅ 120+ MCU records
- ✅ Multiple MCU per karyawan
- ✅ Follow-up cases
- ✅ Soft-deleted records untuk testing

## 🎯 Fitur yang Sudah Bisa Dicoba

### ✅ **Login Page**
- Login dengan credentials di atas
- Auto-seed database

### ✅ **Dashboard**
- Lihat KPI cards (Total Karyawan, MCU, Fit, Follow-Up, Unfit)
- Filter berdasarkan date range
- Lihat 4 charts dengan data labels:
  - Distribusi per Departemen
  - Jenis MCU
  - Status MCU
  - Golongan Darah
- Preview list Follow-Up
- Activity log

### ✅ **Follow-Up Page**
- Lihat daftar karyawan yang perlu follow-up
- Klik "Update" untuk membuka modal
- Lihat nilai pemeriksaan sebelumnya
- Input hasil akhir dan catatan
- Submit → MCU akan di-update (tidak buat baru)
- Jika hasil akhir = "Fit", record otomatis hilang dari list

## 🛠️ Development Mode

Untuk development dengan auto-rebuild CSS:

```bash
npm run dev
```

Biarkan terminal ini berjalan. Setiap kali Anda ubah file di `css/input.css` atau HTML, CSS akan otomatis di-rebuild.

## 🔄 Reset Demo Data

Jika ingin reset dan buat ulang demo data:

1. Buka Browser Console (F12)
2. Ketik:
   ```javascript
   reseedDatabase()
   ```
3. Tunggu proses selesai
4. Refresh halaman

## 🐛 Troubleshooting

### CSS tidak muncul / styling berantakan
```bash
npm run build
```
Pastikan file `css/output.css` ter-generate.

### Data tidak muncul
- Buka Browser Console (F12) dan cek error
- Pastikan browser support ES6 modules
- Gunakan browser modern (Chrome 90+, Firefox 88+, Safari 14+)

### Login gagal
- Pastikan Anda di halaman `pages/login.html`
- Jika langsung buka `index.html`, akan redirect ke login
- Gunakan credentials yang benar: admin/admin123

### Charts tidak muncul
- Pastikan CDN Chart.js loaded (check Network tab)
- Refresh halaman
- Check browser console untuk error

## 📱 Browser Support

- ✅ Chrome 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Edge 90+

## 📂 Struktur Project

```
mcu-management/
├── index.html              # Dashboard (halaman utama)
├── pages/
│   ├── login.html         # ✅ Login page
│   └── follow-up.html     # ✅ Follow-up page
├── js/
│   ├── services/          # ✅ All CRUD services
│   ├── utils/             # ✅ Helpers & utilities
│   ├── pages/             # ✅ Page-specific logic
│   └── seedData.js        # ✅ Demo data generator
├── css/
│   ├── input.css          # Tailwind source
│   └── output.css         # Generated CSS
└── README.md              # Full documentation
```

## 🎓 Next Steps

Setelah mencoba fitur yang sudah ada, Anda bisa:

1. **Baca [README.md](README.md)** untuk dokumentasi lengkap
2. **Baca [IMPLEMENTATION_GUIDE.md](IMPLEMENTATION_GUIDE.md)** untuk panduan implementasi halaman lainnya
3. **Implementasi halaman-halaman tersisa**:
   - Tambah Karyawan (struktur service sudah siap)
   - Kelola Karyawan (service ready)
   - Data Master (service ready)
   - Data Terhapus (service ready)
   - Analysis (iframe simple)

## 💡 Tips

- **Debug Mode**: Login sebagai Admin, klik tombol "🔧 Debug" di top bar untuk melihat activity log
- **Inspect IndexedDB**: Buka DevTools → Application → IndexedDB → MCU_Database
- **Check Network**: Jika ada masalah loading, check Network tab di DevTools
- **Console Logs**: Semua operasi penting di-log ke console untuk debugging

## 📞 Need Help?

Check dokumentasi:
- **README.md** - Overview lengkap & setup
- **IMPLEMENTATION_GUIDE.md** - Guide untuk developer
- Browser Console - Cek error messages

---

**Selamat mencoba! 🎉**

Aplikasi ini sudah memiliki foundation yang sangat solid dengan semua critical features (ID generation, latest MCU logic, follow-up behavior, change tracking, restore cascade) sudah terimplementasi dengan benar.
