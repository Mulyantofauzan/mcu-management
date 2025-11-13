# Signed URLs - FAQ & Flow Explanation

## Q: Kalau signed URL expire (1 jam), apa upload dan view masih berfungsi?

**Jawab: IYA, upload dan view tetap berfungsi!** Signed URL hanya untuk **download**, bukan untuk upload atau view di app.

---

## Flow Lengkap Sistem

### 1️⃣ UPLOAD File (Nggak butuh signed URL)

```
User upload file
    ↓
Frontend send ke: POST /api/compress-upload
    ↓
Server authenticate user
    ↓
Server upload file ke R2 (using server credentials)
    ↓
Server save metadata ke Supabase
    ↓
Return success response
    ↓
File ada di R2 (PERMANENT)
```

**Key point:** Upload pake **server credentials** (bukan signed URL), jadi tetap bisa upload kapan saja ✅

---

### 2️⃣ VIEW File dalam App (Nggak butuh signed URL)

```
User buka MCU detail
    ↓
Frontend fetch file list dari: GET /api/get-mcu-files
    ↓
Server query Supabase mcufiles table
    ↓
Return file metadata (filename, size, date, dll)
    ↓
Show di UI sebagai table/list
    ↓
User bisa lihat kapan saja
```

**Key point:** View/list file pake **database**, bukan signed URL, jadi tetap bisa view kapan saja ✅

---

### 3️⃣ DOWNLOAD File (Pake signed URL, expire 1 jam)

```
User klik "Download" button
    ↓
Frontend request: GET /api/download-file?fileId=XXX&userId=YYY
    ↓
Server check authorization (user punya akses?)
    ↓
Server generate SIGNED URL dari file path
    ↓
Return signed URL (valid 1 jam)
    ↓
Frontend open signed URL → Browser download
    ↓
SETELAH 1 JAM: Signed URL invalid
    ↓
User klik "Download" lagi → Generate NEW signed URL
```

**Key point:** Signed URL hanya untuk download, generate fresh setiap kali user klik ✅

---

## Diagram Lengkap

```
MCU APP Flow:
================

UPLOAD (Permanent)
┌─────────────────────────────────────────────────────┐
│ 1. User select file                                 │
│ 2. POST /api/compress-upload                        │
│ 3. Server upload ke R2 + save metadata              │
│ 4. File permanent di R2 ✅                          │
│ ※ Bisa upload kapan saja, tidak terpengaruh expiry  │
└─────────────────────────────────────────────────────┘
         ↓
    File tersimpan di:
    - R2 Storage (file actual)
    - Supabase DB (metadata)
         ↓
┌─────────────────────────────────────────────────────┐
│ VIEW FILE LIST (Permanent)                          │
│ ┌───────────────────────────────────────────────┐   │
│ │ GET /api/get-mcu-files                        │   │
│ │ Return: [{filename, size, date, fileId}, ...] │   │
│ │ Bisa view kapan saja ✅                       │   │
│ └───────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
         ↓
    User lihat file list di MCU detail:
    - Report.pdf (102 KB)
    - Xray.jpg (245 KB)
    - Lab.pdf (89 KB)
         ↓
┌─────────────────────────────────────────────────────┐
│ DOWNLOAD FILE (Temporary - 1 hour)                  │
│ ┌───────────────────────────────────────────────┐   │
│ │ User klik "Download"                          │   │
│ │ ↓                                              │   │
│ │ GET /api/download-file?fileId=ABC&userId=XYZ │   │
│ │ ↓                                              │   │
│ │ Server generate signed URL (valid 1 hour)     │   │
│ │ ↓                                              │   │
│ │ Browser download file                         │   │
│ │ ↓                                              │   │
│ │ After 1 hour: URL expired ❌                  │   │
│ │ ↓                                              │   │
│ │ User klik "Download" lagi: Generate new URL ✅ │   │
│ └───────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

---

## Timeline Contoh

### Hari Pertama (Monday 10:00)

| Waktu | Aksi | Signed URL | Status |
|-------|------|-----------|--------|
| 10:00 | User upload file | - | ✅ Upload berhasil |
| 10:15 | User view MCU detail | - | ✅ Lihat file list |
| 10:30 | User klik Download | Generated (valid until 11:30) | ✅ Download OK |
| 11:00 | User klik Download lagi | New URL generated (valid until 12:00) | ✅ Download OK |
| 11:45 | User klik Download lagi | New URL generated (valid until 12:45) | ✅ Download OK |
| 12:00 | First signed URL expired | (tapi OK, generate URL baru) | ✅ Download OK |

### Besok Hari (Tuesday 09:00)

| Waktu | Aksi | Signed URL | Status |
|-------|------|-----------|--------|
| 09:00 | User view MCU detail | - | ✅ Lihat file list (MASIH ADA!) |
| 09:15 | User klik Download | Generated (valid until 10:15) | ✅ Download OK |
| 23:59 | Download terakhir kemarin expired | (tapi OK) | ✅ Still can download |

---

## Implementation: Autoupdate Signed URL

Frontend bisa auto-refresh signed URL jika sudah lama. Contoh:

```javascript
class FileDownloader {
  constructor() {
    this.urlCache = new Map(); // { fileId: { url, expireTime } }
    this.URL_REFRESH_THRESHOLD = 5 * 60 * 1000; // 5 menit sebelum expire
  }

  async getValidSignedUrl(fileId, userId) {
    // Check if URL masih valid
    const cached = this.urlCache.get(fileId);

    if (cached) {
      const timeRemaining = cached.expireTime - Date.now();

      // Jika masih >5 menit, pake URL yang ada
      if (timeRemaining > this.URL_REFRESH_THRESHOLD) {
        console.log(`✅ Using cached URL (${Math.round(timeRemaining/60000)} min remaining)`);
        return cached.url;
      }

      // Jika <5 menit, generate URL baru
      console.log(`⚠️ URL expiring soon, refreshing...`);
    }

    // Generate URL baru
    const signedUrl = await this.generateSignedUrl(fileId, userId);

    // Cache URL (valid 1 jam dari sekarang)
    this.urlCache.set(fileId, {
      url: signedUrl,
      expireTime: Date.now() + 3600 * 1000
    });

    return signedUrl;
  }

  async generateSignedUrl(fileId, userId) {
    const response = await fetch(
      `/api/download-file?fileId=${fileId}&userId=${userId}`
    );
    const data = await response.json();
    return data.signedUrl;
  }

  download(fileId, fileName, userId) {
    this.getValidSignedUrl(fileId, userId).then(url => {
      window.open(url, '_blank');
    });
  }

  // Clear cache (optional)
  clearCache() {
    this.urlCache.clear();
  }
}

// Usage:
const downloader = new FileDownloader();
document.getElementById('download-btn').addEventListener('click', () => {
  downloader.download('file-123', 'report.pdf', 'user-456');
});
```

---

## Operasi yang Terpengaruh Expiry (dan yang tidak)

### ❌ TERPENGARUH (Hanya Download)
```
User download file
  → Harus ada signed URL yang valid
  → Kalau URL expire, generate URL baru
  → Takes 1 second (call /api/download-file, generate URL)
```

### ✅ TIDAK TERPENGARUH (Upload & View)

```
1. Upload file
   - Pake server credentials
   - Independent dari signed URL
   - Tetap bisa upload kapan saja

2. View/List file
   - Dari database Supabase
   - Independent dari signed URL
   - Tetap bisa lihat kapan saja

3. Edit MCU data
   - Dari database Supabase
   - Independent dari signed URL
   - Tetap bisa edit kapan saja

4. Delete file
   - Call server endpoint (not implemented yet)
   - Server verify permission
   - Independent dari signed URL
```

---

## Real World Scenario

### Scenario 1: User download, tunggu, download lagi

```
Monday 10:30 - User klik Download file
  → Generate signed URL (valid until 11:30)
  → File download

Monday 12:00 - User klik Download again
  → First signed URL expired 30 min ago
  → No problem! Generate NEW signed URL
  → File download
```

### Scenario 2: User view MCU lewat beberapa hari

```
Monday 10:00 - User upload file
  → File permanent di R2

Wednesday 14:00 - User open MCU detail
  → Still see file list (from database)
  → File masih ada ✅

Wednesday 14:15 - User klik Download
  → Generate signed URL (totally new)
  → File download ✅

Thursday 10:00 - User klik Download lagi
  → Previous signed URL expired 20 jam lalu
  → Generate NEW signed URL
  → File download ✅
```

---

## API Error Handling

Jika user klik download dan signed URL expired:

```javascript
async function downloadFile(fileId, fileName, userId) {
  try {
    const response = await fetch(
      `/api/download-file?fileId=${fileId}&userId=${userId}`
    );

    if (response.status === 401) {
      showError('Unauthorized: You do not have access to this file');
      return;
    }

    if (!response.ok) {
      showError('Failed to generate download link');
      return;
    }

    const result = await response.json();

    if (!result.signedUrl) {
      showError('No download link available');
      return;
    }

    // Success - open download
    window.open(result.signedUrl, '_blank');
    showSuccess('Download started');

  } catch (error) {
    showError('Network error: ' + error.message);
  }
}
```

---

## Security: Jangan Cache Signed URL di Frontend

**JANGAN:**
```javascript
// ❌ WRONG: Storing signed URL in localStorage
localStorage.setItem('fileUrl', signedUrl);

// Problematic: URL bisa di-steal dari storage, bisa di-forward
```

**LAKUKAN:**
```javascript
// ✅ RIGHT: Generate fresh URL setiap kali
async function download(fileId, userId) {
  const url = await getSignedUrlFromServer(fileId, userId);
  window.open(url, '_blank');
}

// URL tidak persistent, hanya berlaku 1 jam
// Setiap download trigger generate URL baru
```

---

## Performance Optimization

### Option 1: Generate URL saat modal dibuka (Prefetch)
```javascript
async function viewMCUDetail(mcuId, userId) {
  // Load MCU data
  const mcu = await mcuService.getById(mcuId);

  // Prefetch signed URLs untuk semua files
  const filesWithUrls = await getMCUFilesWithSignedUrls(mcuId, userId);

  // URL ready ketika user klik download
  // No waiting, instant download start
}
```

### Option 2: Generate URL saat download (On-demand)
```javascript
async function downloadFile(fileId, userId) {
  // Generate URL hanya ketika user klik
  const url = await getSignedUrl(fileId, userId);
  window.open(url, '_blank');

  // Takes 1 second, acceptable UX
}
```

### Option 3: Smart caching (Recommended)
```javascript
// Cache URL, tapi refresh jika sudah 50 menit dalam 1 jam
if (cachedUrl && remainingTime > 10 * 60 * 1000) {
  return cachedUrl; // Use existing
} else {
  return generateNewUrl(); // Generate fresh
}
```

---

## Summary

| Operasi | Signed URL Needed? | Terpengaruh Expiry? | Solution |
|---------|------------------|-------------------|----------|
| Upload file | ❌ No | ❌ No | Upload anytime |
| View file list | ❌ No | ❌ No | View anytime |
| Edit MCU data | ❌ No | ❌ No | Edit anytime |
| Download file | ✅ Yes | ✅ Yes | Generate fresh URL per download |

**Kesimpulan:** Hanya **download** yang terpengaruh expiry, dan solution-nya simple: generate URL baru saat user klik download. User nggak perlu apa-apa, automatic!

---

## Next Steps

1. Deploy ke Vercel
2. Test upload file ✅ (should work)
3. Test view file list ✅ (should work)
4. Test download file ✅ (generate URL, auto open)
5. Wait >1 hour, test download lagi ✅ (generate new URL)

All should work seamlessly! 🎉
