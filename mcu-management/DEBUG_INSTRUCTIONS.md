# Debug Instructions - Unexpected Token ':' Error

## Langkah-Langkah Untuk Men-Debug Error

### 1. Buka Browser Developer Tools
- Tekan **F12** atau **Cmd+Option+J** (Mac)
- Pilih tab **Console**

### 2. Buka Login Page
- Navigasi ke halaman login: `pages/login.html`
- **Perhatikan console untuk melihat log messages**

### 3. Cari Error Message
Anda akan melihat berbagai console.log messages seperti:
```
[index.html] Page starting to load...
[index.html] window.location: ...
[env-config.js] Starting loadConfig...
[envConfig.js] loadEnvironmentConfig() called
[supabase.js] Module loading...
...
```

### 4. Identifikasi Dimana Error Terjadi
Error "Unexpected token ':'" akan muncul **setelah** salah satu dari log messages ini.
Catat **log message terakhir sebelum error** terjadi.

### 5. Clear Cache Jika Perlu
Jika masih melihat error lama:
- Buka DevTools → Application → Cache Storage → Delete semua caches
- Atau tekan: **Ctrl+Shift+Delete** untuk Clear Site Data

### 6. Hard Refresh
- **Ctrl+Shift+R** (Windows/Linux)
- **Cmd+Shift+R** (Mac)

## Log Messages Yang Akan Anda Lihat

Urutan normal log messages (dari yang paling awal):

1. `[index.html] Page starting to load...`
2. `[index.html] Supabase CDN script tag loaded...`
3. `[index.html] window.supabase is now available`
4. `[env-config.js] Starting loadConfig...`
5. `[env-config.js] loadConfig completed`
6. `[envConfig.js] initializeEnv() called`
7. `[envConfig.js] loadEnvironmentConfig() called`
8. `[envConfig.js] Trying /api/config endpoint...`
9. `[dashboard.js] Module loading...` (jika berhasil login)

## Jika Melihat Error

Catat:
1. **Nama file** tempat error muncul
2. **Log message terakhir** sebelum error
3. **Error message lengkap** dari console
4. **Stack trace** (jika ada)

Contoh format laporan:
```
Error terjadi setelah log message: [supabase.js] Module loading...
File: supabase.js
Error: Unexpected token ':' at line 23
Stack: ...
```

## Testing Page

Ada page testing khusus di: `/test-syntax.html`
- Page ini load modules secara bertahap
- Memudahkan identifikasi module mana yang error

## Files Dengan Console.log

Files yang sudah ditambahkan console.log untuk debugging:
- `index.html`
- `env-config.js`
- `js/config/envConfig.js`
- `js/config/supabase.js`
- `js/pages/dashboard.js`
- `js/services/database.js`
- `js/seedData.js`

**Catatan:** Setelah error fixed, semua console.log ini akan dihapus.
