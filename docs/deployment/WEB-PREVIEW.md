# Preview deployment aplikasi web baru (Vite + Svelte)

Konfigurasi ada di `vercel.web.json`, terpisah dari `vercel.json`. Build otomatis dari Git tetap memakai `vercel.json` (aplikasi lama), jadi
berkas ini tidak mengubah apa pun sampai Anda sendiri menjalankannya dengan `--local-config`.

## Yang dilakukan konfigurasi ini
- Build: `npm --prefix web ci && npm --prefix web run build`, hasil di `web/dist`.
- Rewrite SPA: semua alamat selain `/api/*`, `/assets/*`, `/fonts/*` diarahkan ke `index.html`.
- Fungsi API (`api/*`) sama dengan `vercel.json` (login, unggah, unduh, hapus, user).
- CSP lebih ketat dari aplikasi lama: `script-src 'self'` (tanpa `unsafe-inline` dan `unsafe-eval`). Sudah diuji dengan Chrome: semua halaman dan ekspor Excel jalan tanpa pelanggaran.
- `sw.js` pengganti: browser yang masih memegang service worker aplikasi lama akan menghapus cache lama lalu mencopot dirinya.

## Langkah (Anda yang menjalankan, ini membuat deployment di internet)
1. Pastikan folder ini terhubung ke proyek `mcu-management` (tim Adel's projects): `vercel link`.
2. Pastikan variabel berikut aktif untuk **Preview** di Project Settings > Environment Variables: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`,
   `SUPABASE_JWT_SECRET`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `CLOUDFLARE_ACCOUNT_ID`, dan `CLOUDFLARE_R2_ENDPOINT`,
   `CLOUDFLARE_R2_ACCESS_KEY_ID`, `CLOUDFLARE_R2_SECRET_ACCESS_KEY`, `CLOUDFLARE_R2_BUCKET_NAME`. (`R2_*` tidak dipakai kode.)
   Yang sering kurang: `SUPABASE_JWT_SECRET` (rahasia, tambahkan sendiri: `vercel env add SUPABASE_JWT_SECRET preview`).
3. Deploy preview:
   ```
   ./scripts/deploy-web-preview.sh
   ```
   Skrip menolak `--prod`. Hasilnya URL `https://mcu-management-xxxx.vercel.app` khusus preview; aplikasi produksi lama tidak tersentuh.
   Catatan: `vercel deploy --local-config vercel.web.json` saja **tidak cukup** karena build tetap memakai `vercel.json` yang ikut ter-upload.
4. Buka URL itu, masuk dengan akun MADIS. Variabel lingkungan baru hanya berlaku untuk deployment berikutnya, jadi jalankan skrip lagi setelah menambah variabel.

## Peringatan
- Preview memakai **database dan penyimpanan R2 yang sama dengan produksi**. Simpan, edit, dan hapus di preview mengubah data nyata. Uji dengan data uji.
- Preview dilindungi Vercel Authentication: hanya yang login ke Vercel sebagai anggota tim yang bisa membukanya. Untuk komputer lain, login ke Vercel dengan akun tim atau atur Deployment Protection.
- Cutover produksi = isi `vercel.json` diganti isi `vercel.web.json`, lalu hapus `mcu-management/`. Itu langkah terpisah dan sengaja belum dilakukan.
