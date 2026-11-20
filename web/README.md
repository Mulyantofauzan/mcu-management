# Sehatra web

Antarmuka baru aplikasi Manajemen MCU: Vite + Svelte 5. Desainnya mengikuti `design/sehatra/`.

## Menjalankan

Satu kali:

```sh
npm --prefix web install
cp .env.local.example .env.local   # isi sendiri: URL, kunci anon, service role, JWT secret Supabase
```

Dua terminal:

```sh
npm run api:dev     # API lokal di :3000 (handler api/* apa adanya, tanpa Vercel CLI)
npm run web:dev     # aplikasi di http://localhost:5173
```

Panggilan `/api/*` diteruskan ke `API_PROXY` (bawaan `http://localhost:3000`).
Jangan buka berkas lewat `file://`: aplikasi memakai ES module dan path absolut.

## Struktur

```
src/
  main.js, App.svelte, routes.js   pintu masuk, penjaga akses, tabel rute
  lib/                             logika murni (diuji di tests/web) dan state reaktif (*.svelte.js)
  shell/                           Sidebar, Topbar, AppShell
  ui/                              komponen bersama (Icon, Toast, ...)
  pages/<halaman>/                 satu folder per halaman: Page.svelte + bagian kecil
  styles/                          CSS per tanggung jawab, diimpor lewat index.css
```

Aturan: tidak ada berkas sumber di atas 250 baris (dijaga `tests/web/structure.test.js`).
