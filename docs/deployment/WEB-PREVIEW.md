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
1. Pastikan folder ini sudah terhubung ke proyek `mcu-management` (tim Adel's projects): `vercel link`.
2. Di dashboard Vercel, Project Settings > Environment Variables, pastikan variabel berikut juga aktif untuk **Preview**
   (sebagian besar sekarang hanya Production): `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_JWT_SECRET`,
   `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, serta kunci R2 (`R2_*` dan `CLOUDFLARE_R2_*`).
3. Deploy preview (tanpa `--prod`):
   ```
   vercel deploy --local-config vercel.web.json
   ```
   Hasilnya URL `https://mcu-management-xxxx.vercel.app` khusus preview. Aplikasi produksi lama tidak tersentuh.
4. Buka URL itu, masuk dengan akun MADIS.

## Peringatan
- Preview memakai **database dan penyimpanan R2 yang sama dengan produksi** (variabel lingkungan sama). Simpan, edit, dan hapus di preview mengubah data nyata. Uji dengan data uji.
- Preview Vercel biasanya dilindungi Vercel Authentication (hanya anggota tim). Atur di Project Settings > Deployment Protection bila perlu dibagikan.
- Setelah yakin, cutover produksi = isi `vercel.json` diganti isi `vercel.web.json`, lalu hapus `mcu-management/`. Itu langkah terpisah dan sengaja belum dilakukan.
