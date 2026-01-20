# Quick Reference - Google Drive File Upload

## ⚡ Quick Setup (5 minutes)

### 1. Files Already Created ✅
- ✅ Google Cloud credentials stored
- ✅ Frontend components ready
- ✅ Backend Cloud Function ready
- ✅ Environment variables configured

### 2. Next: Deploy Cloud Function

```bash
cd /Users/mulyanto/Desktop/MCU-APP/functions
npm install
firebase deploy --only functions:uploadToGoogleDrive
```

After deployment, copy the function URL and update:
```env
# mcu-management/.env.local
VITE_GOOGLE_DRIVE_UPLOAD_ENDPOINT=https://us-central1-mcu-management-xxxxx.cloudfunctions.net/uploadToGoogleDrive
```

### 3. Create Database Table

Go to Supabase Dashboard → SQL Editor, paste:
```sql
CREATE TABLE mcuFiles (
  fileId TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  employeeId TEXT NOT NULL,
  mcuId TEXT,
  fileName TEXT NOT NULL,
  fileType TEXT NOT NULL,
  fileSize INTEGER NOT NULL,
  googleDriveFileId TEXT NOT NULL UNIQUE,
  uploadedBy TEXT NOT NULL,
  uploadedAt TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deletedAt TIMESTAMP WITH TIME ZONE,
  createdAt TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updatedAt TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT fk_employee FOREIGN KEY (employeeId) REFERENCES employees(employeeId) ON DELETE CASCADE,
  CONSTRAINT fk_mcu FOREIGN KEY (mcuId) REFERENCES mcus(mcuId) ON DELETE SET NULL
);

CREATE INDEX idx_mcufiles_employeeId ON mcuFiles(employeeId);
CREATE INDEX idx_mcufiles_mcuId ON mcuFiles(mcuId);
```

### 4. Integrate into MCU Form

Add to HTML (e.g., `tambah-karyawan.html`):
```html
<div class="form-group">
    <label>📎 Upload Medical Documents</label>
    <div id="file-upload-container"></div>
</div>
```

Then in JavaScript:
```javascript
import { FileUploadWidget } from '../components/fileUploadWidget.js';

let fileUploadWidget = null;

window.openAddMCUForEmployee = async function(employeeId) {
    fileUploadWidget = new FileUploadWidget('file-upload-container', {
        employeeId: employeeId,
        maxFiles: 5
    });
};

window.handleAddMCU = async function(event) {
    const uploadedFiles = fileUploadWidget?.getUploadedFiles() || [];
    // Save with MCU data...
    fileUploadWidget?.clear();
};
```

---

## 📊 Implementation Status

| Component | Status | Location |
|-----------|--------|----------|
| Google Cloud Setup | ✅ Complete | `/credentials/` |
| Frontend Components | ✅ Complete | `/js/services/`, `/js/components/`, `/js/utils/` |
| Cloud Function | ✅ Ready | `/functions/` |
| Environment Config | ✅ Ready | `/.env.local` |
| Database Schema | ⏳ To Create | Supabase SQL Editor |
| MCU Form Integration | ⏳ To Add | `/pages/*.html` |

---

## 🔗 Important Links

- Folder ID: `1XJ2utC4aWHUdhdqerfRr96E3SSILmntH`
- Service Account: `mcu-file-upload@mcu-management.iam.gserviceaccount.com`
- Cloud Project: `mcu-management`

---

For complete guide, see: `docs/GOOGLE_DRIVE_SETUP.md` and `docs/INTEGRATION_GUIDE.md`
