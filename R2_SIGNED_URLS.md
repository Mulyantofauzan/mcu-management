# Cloudflare R2 Private Bucket dengan Signed URLs

## Konsep

Signed URLs memungkinkan R2 bucket tetap **private** (aman), tetapi server dapat membuat URL sementara yang memungkinkan download file dengan batasan waktu.

### Keuntungan:
✅ **Secure** - R2 bucket sepenuhnya private
✅ **Authorized** - Hanya file owner yang bisa download
✅ **Limited** - URL hanya valid untuk waktu terbatas (default: 1 jam)
✅ **No Public Access** - Tidak perlu enable public access pada bucket
✅ **Audit Trail** - Server bisa log semua download attempts

## Bagaimana Cara Kerja

```
User clicks "Download"
    ↓
Frontend requests signed URL from server
    ↓
Server checks authorization (verify user owns file)
    ↓
Server generates signed URL (valid for 1 hour)
    ↓
Frontend opens signed URL in browser
    ↓
R2 verifies signature is valid
    ↓
File downloads (max 1 hour after URL generation)
```

## Setup Private R2 Bucket

### Langkah 1: Keep R2 Bucket Private

Pastikan R2 bucket **TIDAK** memiliki public access:

```
Cloudflare Dashboard → R2 → mcu-files → Settings
→ Public Access: DISABLED (atau tidak ada option di-enable)
```

### Langkah 2: Verifikasi Environment Variables

Semua 5 variables harus ada di Vercel:

```bash
CLOUDFLARE_R2_ENDPOINT=https://fd1c39fefc64308d6692bb137a7a55c0.r2.cloudflarestorage.com
CLOUDFLARE_R2_ACCESS_KEY_ID=9c414074a10f8be1f5832b17833048ea
CLOUDFLARE_R2_SECRET_ACCESS_KEY=d63c43da985786e1a6a2563d870a0deedb01674212f208c6b8ef7a29f51e123a
CLOUDFLARE_R2_BUCKET_NAME=mcu-files
CLOUDFLARE_ACCOUNT_ID=fd1c39fefc64308d6692bb137a7a55c0
```

### Langkah 3: Deploy ke Vercel

```bash
vercel deploy --prod
```

## API Endpoints

### Upload File
```
POST /api/compress-upload
Content-Type: multipart/form-data

file: (File object)
employeeId: "EMP001"
mcuId: "MCU-2024-001"

Response:
{
  "success": true,
  "file": { "name": "report.pdf", "size": 102400, "type": "pdf" },
  "storage": {
    "bucket": "mcu-files",
    "path": "mcu_files/John_Doe_EMP001/MCU-2024-001/report.pdf",
    "publicUrl": "https://..." (for reference in DB)
  }
}
```

### Download Single File (Get Signed URL)
```
GET /api/download-file?fileId=MCU-2024-001-1234567&userId=USER123

Response:
{
  "success": true,
  "signedUrl": "https://fd1c39fefc64308d6692bb137a7a55c0.r2.cloudflarestorage.com/mcu_files/...?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=...",
  "fileName": "report.pdf",
  "expiresIn": 3600
}
```

### Get All Files for MCU (Batch Signed URLs)
```
GET /api/download-file?mcuId=MCU-2024-001&userId=USER123

Response:
{
  "success": true,
  "files": [
    {
      "fileId": "MCU-2024-001-1111111",
      "filename": "report.pdf",
      "signedUrl": "https://...",
      "expiresIn": 3600
    },
    {
      "fileId": "MCU-2024-001-2222222",
      "filename": "xray.jpg",
      "signedUrl": "https://...",
      "expiresIn": 3600
    }
  ],
  "count": 2
}
```

## Frontend Usage

### Upload File
```javascript
import { uploadFileToSupabase } from './services/supabaseStorageService.js';

// Upload file (same as before)
const result = await uploadFileToSupabase(file, employeeId, mcuId);

if (result.success) {
  console.log('File uploaded:', result.fileName);
  // File metadata automatically saved to Supabase
}
```

### Download Single File
```javascript
import { downloadFile } from './services/supabaseStorageService.js';
import { authService } from './services/authService.js';

// Get current user ID
const user = authService.getCurrentUser();

// Download file - server generates signed URL
const result = await downloadFile(fileId, fileName, user.id);

if (result.success) {
  console.log('Download started for:', result.fileName);
  // File opens in new tab automatically
}
```

### Get All Files with Signed URLs
```javascript
import { getMCUFilesWithSignedUrls } from './services/supabaseStorageService.js';

// Get all files for an MCU
const result = await getMCUFilesWithSignedUrls(mcuId, userId);

if (result.success) {
  result.files.forEach(file => {
    console.log(`${file.filename}: ${file.signedUrl}`);

    // Can create download links in HTML
    // <a href="${file.signedUrl}" download>Download</a>
  });
}
```

## Authorization & Security

### Who Can Download?
Hanya **file owner** (employee yang punya MCU):

```javascript
// Server checks:
1. Find file in mcufiles table (by fileId)
2. Find MCU associated with file (by mcuId)
3. Find employee associated with MCU (by employeeId)
4. Find user associated with employee (by userId)
5. Verify requesting user === file owner

If check fails: Return 403 Unauthorized
```

### Signed URL Security
- URL berisi cryptographic signature dari Cloudflare
- URL hanya valid untuk waktu terbatas (default 1 jam)
- URL tidak bisa di-forward tanpa ekspirasi
- Setiap download request di-log di server (optional)

## Mengubah Expiry Time

Default signed URL berlaku 1 jam. Untuk mengubah:

**File: `/api/r2SignedUrlService.js`**
```javascript
const SIGNED_URL_EXPIRY_SECONDS = 3600; // 1 hour

// Ubah ke:
const SIGNED_URL_EXPIRY_SECONDS = 7200; // 2 hours
// atau
const SIGNED_URL_EXPIRY_SECONDS = 86400; // 24 hours
```

## Contoh Implementation di UI

### Download Button
```html
<!-- In file list -->
<button onclick="downloadMCUFile('${file.fileId}')">
  <svg>...</svg> Download
</button>

<script>
async function downloadMCUFile(fileId) {
  const user = authService.getCurrentUser();

  try {
    const result = await downloadFile(fileId, null, user.id);

    if (!result.success) {
      showToast('Download error: ' + result.error, 'error');
      return;
    }

    showToast('Download started: ' + result.fileName, 'success');
  } catch (error) {
    showToast('Error: ' + error.message, 'error');
  }
}
</script>
```

### Batch Download Links
```javascript
async function showMCUFilesList(mcuId) {
  const user = authService.getCurrentUser();

  const result = await getMCUFilesWithSignedUrls(mcuId, user.id);

  if (!result.success) {
    showToast('Error: ' + result.error, 'error');
    return;
  }

  // Create HTML for file list
  let html = '<div class="file-list">';

  result.files.forEach(file => {
    if (file.error) {
      html += `<div class="file-error">${file.filename}: ${file.error}</div>`;
    } else {
      html += `
        <div class="file-item">
          <a href="${file.signedUrl}" download>
            📄 ${file.filename}
          </a>
          <small>Expires in 1 hour</small>
        </div>
      `;
    }
  });

  html += '</div>';
  document.getElementById('files-container').innerHTML = html;
}
```

## Troubleshooting

### Error: "Unauthorized: You do not have access to this file"
**Cause:** User tidak memiliki permission untuk file tersebut
**Solution:** Pastikan user ID benar dan user adalah employee pemilik MCU

### Error: "File not found"
**Cause:** File ID tidak ada di database
**Solution:** Verify file ID correct, check database mcufiles table

### Error: "MCU not found for this file"
**Cause:** MCU dalam database terhapus tapi file masih ada
**Solution:** Clean up orphaned files dari database

### Signed URL Returns 403 After 1 Hour
**Expected behavior!** Signed URL hanya valid 1 jam.
**Solution:** Generate URL baru saat user mau download lagi

### Files Downloaded tapi Corrupted
**Cause:** Network issue saat download
**Solution:** Try download again, check file size sama di R2

## Performance Tips

1. **Cache Signed URLs** - Jangan generate ulang dalam 5 menit
```javascript
// Simple cache
const urlCache = new Map();

if (urlCache.has(fileId)) {
  return urlCache.get(fileId);
}

// Generate new URL
const signedUrl = await getSignedUrl(fileId);
urlCache.set(fileId, signedUrl);
```

2. **Batch Operations** - Get semua files sekaligus daripada satu-satu
```javascript
// Better: Get all at once
const files = await getMCUFilesWithSignedUrls(mcuId, userId);

// Worse: Loop dan request one by one
for (const file of mcuFiles) {
  const url = await downloadFile(file.fileId, ...);
}
```

3. **Prefetch URLs** - Generate URLs saat modal dibuka, bukan saat download
```javascript
// Good: Generate URLs when viewing MCU
async function viewMCUDetail(mcuId) {
  // ... load MCU data ...

  // Also prefetch signed URLs
  const files = await getMCUFilesWithSignedUrls(mcuId, userId);
  // URLs ready when user clicks Download
}
```

## Database Schema

Files ditrack di `mcufiles` table:
```sql
SELECT
  fileid,
  filename,
  supabase_storage_path,  -- R2 file path
  google_drive_link,      -- Signed URL reference (or leave empty)
  uploadedat,
  uploadedby
FROM mcufiles
WHERE mcuid = 'MCU-2024-001';
```

## Monitoring & Logs

Check Vercel logs untuk download activity:
```bash
vercel logs --tail

# Output akan menampilkan:
# 📥 Download request received
# 🔐 Authorizing signed URL request
# ✅ User authorized to access file
# 🔑 Generating signed URL for: mcu_files/...
# ✅ Signed URL generated successfully
```

## Comparison: Public vs Private Bucket

| Aspek | Public Bucket | Private Bucket + Signed URLs |
|-------|---------------|------------------------------|
| **Security** | Low (everyone can access) | High (auth required) |
| **Setup Complexity** | Simple | Medium |
| **URL Type** | Permanent | Temporary (1 hour) |
| **Authorization** | None | Yes (checked by server) |
| **Cost** | Same | Same |
| **Access Control** | Binary (all or nothing) | Granular (per user) |

## Kesimpulan

Untuk R2 bucket tetap private:
1. ✅ Don't enable public access pada R2
2. ✅ Implement signed URLs di server
3. ✅ Check authorization sebelum generate URL
4. ✅ Set expiry time (default 1 jam)
5. ✅ Frontend request signed URL sebelum download

File akan **aman**, **terenkripsi**, dan hanya **authorized users** yang bisa akses!
