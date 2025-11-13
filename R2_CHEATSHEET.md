# R2 Storage Cheatsheet

## Quick Reference

### System Architecture

```
R2 Bucket (Private)
    ↓
├─ Upload: POST /api/compress-upload (server credentials)
├─ View: GET /api/get-mcu-files (from Supabase DB)
└─ Download: GET /api/download-file (signed URL, 1 hour)
```

### File Structure in R2

```
mcu-files/
└── mcu_files/
    └── John_Doe_EMP001/
        └── MCU-2024-001/
            ├── report.pdf
            ├── xray.jpg
            └── lab.pdf
```

---

## Setup Checklist

- [ ] All 5 env vars set in Vercel
  - `CLOUDFLARE_R2_ENDPOINT`
  - `CLOUDFLARE_R2_ACCESS_KEY_ID`
  - `CLOUDFLARE_R2_SECRET_ACCESS_KEY`
  - `CLOUDFLARE_R2_BUCKET_NAME`
  - `CLOUDFLARE_ACCOUNT_ID`

- [ ] R2 bucket is PRIVATE (public access disabled)
- [ ] Deployed to Vercel: `vercel deploy --prod`
- [ ] AWS SDK installed: `npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner`

---

## API Operations

### 1. Upload File
```bash
curl -X POST \
  -F "file=@report.pdf" \
  -F "employeeId=EMP001" \
  -F "mcuId=MCU-2024-001" \
  https://your-api.com/api/compress-upload
```

**Response:**
```json
{
  "success": true,
  "file": {
    "name": "report.pdf",
    "size": 102400,
    "type": "pdf"
  },
  "storage": {
    "path": "mcu_files/John_Doe_EMP001/MCU-2024-001/report.pdf",
    "publicUrl": "https://..."
  }
}
```

### 2. List Files
```bash
curl https://your-api.com/api/get-mcu-files?mcuId=MCU-2024-001
```

**Response:**
```json
{
  "success": true,
  "files": [
    {
      "fileid": "MCU-2024-001-123",
      "filename": "report.pdf",
      "filesize": 102400,
      "uploadedat": "2024-01-15T10:30:00Z"
    }
  ],
  "count": 1
}
```

### 3. Get Signed URL (Download)
```bash
# Single file
curl "https://your-api.com/api/download-file?fileId=MCU-2024-001-123&userId=USER123"

# All files for MCU
curl "https://your-api.com/api/download-file?mcuId=MCU-2024-001&userId=USER123"
```

**Response:**
```json
{
  "success": true,
  "signedUrl": "https://fd1c39fefc6430.../mcu_files/...?X-Amz-Algorithm=...",
  "fileName": "report.pdf",
  "expiresIn": 3600
}
```

---

## Frontend Code

### Upload
```javascript
import { uploadFileToSupabase } from './services/supabaseStorageService.js';

const result = await uploadFileToSupabase(file, employeeId, mcuId);
if (result.success) console.log('Uploaded:', result.fileName);
```

### View
```javascript
import { getFilesByMCU } from './services/supabaseStorageService.js';

const result = await getFilesByMCU(mcuId);
console.log('Files:', result.files);
```

### Download
```javascript
import { downloadFile } from './services/supabaseStorageService.js';

const result = await downloadFile(fileId, fileName, userId);
if (result.success) console.log('Download started');
```

---

## Troubleshooting

| Issue | Cause | Fix |
|-------|-------|-----|
| Upload fails | Missing env vars | Check all 5 env vars in Vercel |
| Upload fails | Bucket name wrong | Verify `mcu-files` exactly |
| Download 403 | Not authorized | Verify userId owns the MCU |
| Download 404 | File not found | Check fileId exists in DB |
| Can't view files | Wrong mcuId | Verify MCU ID exists |

---

## Limits & Quotas

| Item | Limit | Notes |
|------|-------|-------|
| File size | 2 MB | Per file max |
| R2 free tier | 10 GB | Plenty for medical docs |
| Signed URL | 1 hour | Generate fresh on demand |
| Request rate | 1000s/hour | More than enough |

---

## Performance

- Upload: ~2 seconds (depends on file size + network)
- List files: ~0.5 seconds (DB query)
- Download (signed URL generation): ~0.2 seconds
- File download: Browser handles, fast from CDN

---

## Files & Docs

| File | Purpose |
|------|---------|
| `/api/r2StorageService.js` | Upload service |
| `/api/r2SignedUrlService.js` | Signed URL service |
| `/api/download-file/index.js` | Download API endpoint |
| `R2_SIGNED_URLS.md` | Complete guide |
| `R2_SIGNED_URLS_FAQ.md` | FAQ & examples |
| `R2_BUCKET_SETUP.md` | Bucket setup |
| `R2_TROUBLESHOOTING.md` | Debug guide |

---

## Environment Variables

```bash
# Add to Vercel project settings:

CLOUDFLARE_R2_ENDPOINT=https://fd1c39fefc64308d6692bb137a7a55c0.r2.cloudflarestorage.com
CLOUDFLARE_R2_ACCESS_KEY_ID=9c414074a10f8be1f5832b17833048ea
CLOUDFLARE_R2_SECRET_ACCESS_KEY=d63c43da985786e1a6a2563d870a0deedb01674212f208c6b8ef7a29f51e123a
CLOUDFLARE_R2_BUCKET_NAME=mcu-files
CLOUDFLARE_ACCOUNT_ID=fd1c39fefc64308d6692bb137a7a55c0

# Keep existing:
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
SUPABASE_ANON_KEY=...
```

---

## Common Tasks

### Task: Check if file uploaded
```sql
-- Query Supabase
SELECT fileid, filename, uploadedat
FROM mcufiles
WHERE mcuid = 'MCU-2024-001'
ORDER BY uploadedat DESC;
```

### Task: Generate download link for user
```javascript
const url = await downloadFile(fileId, fileName, userId);
// Send url.signedUrl to user via email/SMS
```

### Task: Prefetch all URLs when viewing MCU
```javascript
const files = await getMCUFilesWithSignedUrls(mcuId, userId);
// All files now have signed URLs, instant download
```

### Task: Handle expired signed URL
```javascript
// Automatic! Just call downloadFile again
const newUrl = await downloadFile(fileId, fileName, userId);
// Gets fresh signed URL
```

---

## Security Reminders

✅ Do:
- Server generates all signed URLs
- Check user authorization before generating
- Use environment variables for credentials
- Keep R2 bucket private

❌ Don't:
- Hardcode credentials in frontend
- Cache signed URLs in localStorage
- Share signed URLs with other users
- Enable public access on R2 bucket

---

## Monitoring

### Check Vercel Logs
```bash
vercel logs --tail

# Look for:
# ✅ Signed URL generated successfully
# ❌ Unauthorized: You do not have access
# ⚠️ R2 Config Error
```

### Monitor R2 Usage
```
Cloudflare Dashboard → R2 → mcu-files → Metrics
- Objects count
- Storage usage
- Bandwidth used
```

---

## Cost Breakdown

| Item | Cost |
|------|------|
| Storage (first 10GB) | Free |
| Storage (>10GB) | $0.015/GB/month |
| Download bandwidth | Free |
| Request (PUT/GET) | ~$0.0000005 per req |
| **Total for 100 MCUs** | < $1/month |

---

## Support

See documentation files:
1. **Setup:** [R2_BUCKET_SETUP.md](R2_BUCKET_SETUP.md)
2. **Guide:** [R2_SIGNED_URLS.md](R2_SIGNED_URLS.md)
3. **FAQ:** [R2_SIGNED_URLS_FAQ.md](R2_SIGNED_URLS_FAQ.md)
4. **Debug:** [R2_TROUBLESHOOTING.md](R2_TROUBLESHOOTING.md)

---

## Summary

```
UPLOAD: Works always ✅
VIEW:   Works always ✅
DOWNLOAD: Generate fresh signed URL on demand ✅

Result: Private, secure, automatic! 🎉
```
