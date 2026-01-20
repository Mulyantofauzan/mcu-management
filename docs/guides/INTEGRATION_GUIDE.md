# Server-Side Compression Integration Guide

## How to Integrate with Existing System

Your current file upload system has two workflows:

### Current Flow (Temp Storage):
```
File selected in FileUploadWidget
    ↓
Store in tempFileStorage (memory)
    ↓
User clicks "Simpan MCU"
    ↓
uploadBatchFiles() uploads from temp storage to Supabase
```

### New Flow (Server Compression):
```
File selected in FileUploadWidget
    ↓
uploadFileWithServerCompression() via /api/compress-upload
    ↓
API compresses on server
    ↓
Returns compressed file info
    ↓
File already in Supabase Storage
```

## Integration Options

### Option 1: Replace uploadBatchFiles (Recommended)

**Location**: `/mcu-management/js/services/supabaseStorageService.js`

Replace the `uploadBatchFiles` function to use server compression:

```javascript
export async function uploadBatchFiles(
  files,
  employeeId,
  mcuId,
  userId,
  progressCallback
) {
  // NEW: Use server-side compression instead
  const { uploadFilesWithServerCompression } = await import('./serverCompressionService.js');

  try {
    const results = await uploadFilesWithServerCompression(
      files,
      employeeId,
      mcuId,
      progressCallback
    );

    // Count successes
    const uploadedCount = results.filter(r => r.success).length;
    const failedCount = results.filter(r => !r.success).length;

    return {
      success: uploadedCount > 0,
      uploadedCount,
      failedCount,
      results
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}
```

### Option 2: Direct Use in FileUploadWidget

**Location**: `/mcu-management/js/components/fileUploadWidget.js`

Update the `uploadFileToStorage` method:

```javascript
import { uploadFileWithServerCompression } from '../services/serverCompressionService.js';

async uploadFileToStorage(file) {
  this.isUploading = true;
  this.showProgress(`Compressing and uploading ${file.name}...`);

  if (this.options.onUploadStart) {
    this.options.onUploadStart();
  }

  try {
    // Upload directly with server compression
    const result = await uploadFileWithServerCompression(
      file,
      this.options.employeeId,
      this.options.mcuId,
      (current, total, message) => {
        this.showProgress(message);
      }
    );

    if (result.success) {
      this.isUploading = false;
      this.showSuccess(
        `File compressed by ${result.compressionRatio}% and uploaded: ${file.name}`
      );

      // Add to list
      this.addFileToList({
        fileid: result.fileId,
        filename: result.fileName,
        filetype: file.type,
        filesize: result.compressedSize,
        uploadedat: new Date().toISOString(),
        uploadedby: 'user',
        supabase_storage_path: result.storagePath,
        isUploaded: true // Mark as already uploaded
      });

      if (this.options.onUploadComplete) {
        this.options.onUploadComplete(result);
      }
    } else {
      throw new Error(result.error);
    }
  } catch (error) {
    this.isUploading = false;
    this.showError(`Upload failed: ${error.message}`);

    if (this.options.onError) {
      this.options.onError(error.message);
    }
  }
}
```

### Option 3: Hybrid Approach (Recommended for Safety)

Keep both systems working:
- Use **server compression** for new uploads
- Keep **tempFileStorage** as fallback
- Migrate gradually

```javascript
async uploadFileToStorage(file) {
  // Try server compression first
  if (window.location.hostname !== 'localhost') {
    try {
      return await this.uploadFileWithServerCompression(file);
    } catch (error) {
      console.warn('Server compression failed, falling back:', error.message);
      // Fall back to temp storage
    }
  }

  // Fallback: Use temp storage (existing flow)
  return this.uploadFileToTempStorage(file);
}
```

## Implementation Checklist

- [ ] **Install dependencies**:
  ```bash
  cd api
  npm install sharp pako
  ```

- [ ] **Create API endpoint**: `/api/compress-upload.js` ✅ (Already created)

- [ ] **Create service**: `serverCompressionService.js` ✅ (Already created)

- [ ] **Update package.json in `/api`**: ✅ (Already updated)

- [ ] **Choose integration option** (1, 2, or 3)

- [ ] **Update FileUploadWidget** or `uploadBatchFiles`

- [ ] **Deploy to Vercel**:
  ```bash
  vercel deploy
  ```

- [ ] **Test upload** with sample PDF and image

- [ ] **Monitor** Supabase storage usage

## Testing

### Test with curl:
```bash
curl -X POST http://localhost:3000/api/compress-upload \
  -F "file=@document.pdf" \
  -F "employeeId=emp-123" \
  -F "mcuId=mcu-456"
```

### Test in browser console:
```javascript
const file = document.querySelector('input[type="file"]').files[0];
const { uploadFileWithServerCompression } = await import('/js/services/serverCompressionService.js');

const result = await uploadFileWithServerCompression(file, 'emp-123', 'mcu-456');
console.log(`Compressed by ${result.compressionRatio}%`);
```

## Performance Impact

### Before (Client-side compression):
- Browser processing: 2-5 seconds per file
- Can block UI
- Uses client CPU

### After (Server-side compression):
- Server processing: 2-3 seconds
- Non-blocking (XHR with progress events)
- Server has more resources
- Multiple files upload in parallel possible

## Storage Savings

Example with 100 MCU records, 3 files each:

| Type | Without Compression | With Server Compression | Saved |
|------|-------------------|----------------------|-------|
| PDFs | 100 MB | 25-30 MB | 70-75 MB |
| Images | 50 MB | 10-15 MB | 35-40 MB |
| **Total** | **150 MB** | **35-45 MB** | **105-115 MB** |

**Result**: Store 3-4x more data in same 1GB quota

## Monitoring

### In Vercel Console:
```bash
vercel logs
```

Look for:
- `✅ File compressed and uploaded`
- `📦 PDF Compressed: X → Y bytes`
- `🖼️ Image Compressed: X → Y bytes`

### In Supabase:
- Check `mcufiles` table for file records
- Verify `filesize` column shows compressed size

## Rollback (If needed)

If server compression causes issues:

1. Keep using `tempFileStorage` and old `uploadBatchFiles`
2. Revert FileUploadWidget changes
3. The API endpoint is only used if you call it directly

## Questions?

Refer to `COMPRESSION_SETUP.md` for:
- Detailed API documentation
- Troubleshooting
- Environment variables
- Supported file types
