# Desain Perbaikan Share WhatsApp

## Masalah

Share hasil review berhenti sebelum WhatsApp dibuka karena penyalinan ringkasan
ke clipboard menjadi langkah wajib. Chrome dapat menolak
`navigator.clipboard.writeText()` walaupun pengguna menekan tombol share.

## Alur Terpilih

1. Sistem membuat ringkasan hanya dari hasil review Dokter yang sudah disetujui.
2. Sistem membuka tab sementara ketika pengguna menekan tombol share.
3. Ringkasan dimasukkan langsung ke URL WhatsApp sebagai parameter `text`.
4. Tab sementara diarahkan ke WhatsApp sehingga pengguna memilih grup HR/SHE
   dan menekan kirim.
5. Clipboard tidak diminta dan tidak menentukan keberhasilan share.
6. Untuk hasil Follow-Up atau Temporary Unfit, surat rujukan tetap diunduh agar
   pengguna dapat melampirkannya manual.

## Error

- Pop-up diblokir: tampilkan `WORKFLOW_WHATSAPP_FAILED` dengan pesan agar pop-up
  diizinkan.
- Ringkasan review belum tersedia: pertahankan error workflow yang asli.
- Unduhan surat gagal: pertahankan error dokumen yang asli; jangan menyebut
  clipboard.
- Status share hanya menjadi `confirmed_by_user` setelah pengguna menekan
  konfirmasi bahwa pesan sudah dikirim.

## Pengujian

- URL WhatsApp memuat ringkasan yang sudah di-encode.
- Share tidak memanggil Clipboard API.
- Hasil terminal tidak mengunduh surat.
- Follow-Up dan Temporary Unfit tetap mengunduh surat.
- Pop-up yang tidak tersedia menghasilkan error WhatsApp khusus.

## Batasan

Browser dan WhatsApp tidak mengizinkan web memilih grup atau mengirim pesan
secara otomatis. Pengguna tetap memilih grup HR/SHE dan menekan kirim.
