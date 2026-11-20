# Deploy aplikasi web (Vite + Svelte)

`vercel.json` di folder utama adalah konfigurasi aplikasi web baru (`web/`) dan fungsi API (`api/`).

## Perintah
```
./scripts/deploy-web.sh            # PREVIEW (URL sementara, produksi tidak tersentuh)
./scripts/deploy-web.sh --prod     # PRODUKSI
```
Skrip memakai folder staging sementara agar `.env.local` dan folder besar tidak ikut ter-upload (`.vercelignore` tidak mengecualikan `.env*`).

## Yang dilakukan konfigurasi
- Build: `npm --prefix web ci && npm --prefix web run build`, hasil di `web/dist`.
- Rewrite SPA ke `index.html` untuk semua alamat selain `/api/*`, `/assets/*`, `/fonts/*`.
- Alamat lama `/pages/xxx.html` dan `/index.html` dialihkan ke rute baru (bookmark lama tetap jalan).
- CSP ketat: `script-src 'self'` (tanpa inline/eval), sudah diuji dengan Chrome.
- `sw.js` pengganti: browser yang masih memegang service worker aplikasi lama menghapus cache lama dan mencopot dirinya.

## Variabel lingkungan (per scope: Production dan Preview)
`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_JWT_SECRET`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `CLOUDFLARE_ACCOUNT_ID`,
`CLOUDFLARE_R2_ENDPOINT`, `CLOUDFLARE_R2_ACCESS_KEY_ID`, `CLOUDFLARE_R2_SECRET_ACCESS_KEY`, `CLOUDFLARE_R2_BUCKET_NAME`. (`R2_*` tidak dipakai kode.)
Variabel baru hanya berlaku untuk deployment berikutnya.

## Jalur mundur
- Cepat (tanpa kode): di dashboard Vercel, buka deployment produksi sebelumnya lalu "Promote to Production", atau `vercel rollback`.
- Deployment produksi aplikasi lama terakhir: `mcu-management-mio2z3o74-adels-projects-5899a1ad.vercel.app`.
- Kode aplikasi lama masih ada di `mcu-management/` (belum dihapus) dan di riwayat Git.

## Peringatan
- Preview dan produksi memakai **database dan R2 yang sama**. Uji dengan data uji.
- Preview dilindungi Vercel Authentication (hanya anggota tim).
