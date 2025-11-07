# File Upload Integration Guide

This guide shows how to integrate the file upload widget into MCU forms.

## Quick Start

### 1. Import the Component

In your page JavaScript file (e.g., `tambah-karyawan.js` or `kelola-karyawan.js`):

```javascript
import { FileUploadWidget } from '../components/fileUploadWidget.js';
```

### 2. Add HTML Container

In your MCU form modal HTML:

```html
<!-- In your MCU form modal -->
<div id="add-mcu-modal" class="modal-overlay hidden">
    <div class="modal-content">
        <form id="mcu-form" onsubmit="window.handleAddMCU(event)">
            <!-- ... existing MCU form fields ... -->

            <!-- File Upload Widget -->
            <div class="form-group">
                <label for="mcu-files">📎 Upload Medical Documents</label>
                <div id="file-upload-container"></div>
            </div>

            <!-- ... rest of form ... -->
        </form>
    </div>
</div>
```

### 3. Initialize Widget in JavaScript

In your page's MCU modal opening function:

```javascript
// Global variable to store widget instance
let fileUploadWidget = null;

window.openAddMCUModal = async function(employeeId) {
    try {
        // ... existing code to open modal ...

        // Initialize file upload widget
        fileUploadWidget = new FileUploadWidget('file-upload-container', {
            employeeId: employeeId,
            maxFiles: 5,
            onUploadComplete: (files) => {
                console.log('Files uploaded:', files);
                // Optionally store file references with MCU
            }
        });

        openModal('add-mcu-modal');
    } catch (error) {
        showToast('Error opening MCU form: ' + error.message, 'error');
    }
};
```

### 4. Save Uploaded Files with MCU

In your MCU save handler:

```javascript
window.handleAddMCU = async function(event) {
    event.preventDefault();

    try {
        // Get uploaded files from widget
        const uploadedFiles = fileUploadWidget ? fileUploadWidget.getUploadedFiles() : [];

        // Create MCU data
        const mcuData = {
            // ... existing MCU fields ...
            attachedFiles: uploadedFiles.map(f => ({
                fileId: f.fileId,
                fileName: f.fileName,
                googleDriveFileId: f.googleDriveFileId,
                fileSize: f.fileSize
            }))
        };

        // Save MCU
        const result = await mcuService.add(mcuData, currentUser);

        // Clear widget
        if (fileUploadWidget) {
            fileUploadWidget.clear();
        }

        closeModal('add-mcu-modal');
        showToast('MCU saved successfully!', 'success');

    } catch (error) {
        showToast('Error saving MCU: ' + error.message, 'error');
    }
};
```

---

## Integration Examples

### Example 1: Tambah Karyawan Page

**File:** `mcu-management/js/pages/tambah-karyawan.js`

```javascript
import { FileUploadWidget } from '../components/fileUploadWidget.js';

let fileUploadWidget = null;

window.openAddMCUForEmployee = async function(employeeId) {
    try {
        // ... existing code ...

        // Clear previous widget if exists
        const container = document.getElementById('file-upload-container');
        if (container) container.innerHTML = '';

        // Initialize new widget
        fileUploadWidget = new FileUploadWidget('file-upload-container', {
            employeeId: employeeId,
            mcuId: null,
            maxFiles: 5,
            onUploadComplete: (files) => {
                logger.info('MCU files uploaded:', files);
            }
        });

        openModal('add-mcu-modal');
    } catch (error) {
        showToast('Error: ' + error.message, 'error');
    }
};

window.handleAddMCU = async function(event) {
    event.preventDefault();

    try {
        const currentUser = authService.getCurrentUser();
        const uploadedFiles = fileUploadWidget ? fileUploadWidget.getUploadedFiles() : [];

        const mcuData = {
            employeeId: document.getElementById('mcu-employee-id').value,
            mcuDate: document.getElementById('mcu-date').value,
            mcuType: document.getElementById('mcu-type').value || 'Regular',
            bloodPressure: document.getElementById('bp').value || null,
            // ... other MCU fields ...
            attachedFiles: uploadedFiles
        };

        const result = await mcuService.add(mcuData, currentUser);

        if (fileUploadWidget) {
            fileUploadWidget.clear();
        }

        closeModal('add-mcu-modal');
        showToast('MCU recorded successfully!', 'success');

    } catch (error) {
        showToast('Error: ' + error.message, 'error');
    }
};
```

### Example 2: Edit MCU with File Upload

In edit MCU modal:

```html
<!-- Edit MCU Modal -->
<div id="edit-mcu-modal" class="modal-overlay hidden">
    <div class="modal-content">
        <form id="edit-mcu-form" onsubmit="window.handleEditMCU(event)">
            <!-- ... MCU fields ... -->

            <div class="form-group">
                <label>Existing Files</label>
                <ul id="existing-files-list"></ul>
            </div>

            <div class="form-group">
                <label>Add More Documents</label>
                <div id="edit-file-upload-container"></div>
            </div>

            <!-- ... -->
        </form>
    </div>
</div>
```

```javascript
let editFileUploadWidget = null;

window.openEditMCU = async function(mcuId) {
    try {
        const mcu = await mcuService.getById(mcuId);

        // ... populate existing MCU fields ...

        // Show existing files
        if (mcu.attachedFiles && mcu.attachedFiles.length > 0) {
            const filesList = document.getElementById('existing-files-list');
            mcu.attachedFiles.forEach(file => {
                const li = document.createElement('li');
                li.innerHTML = `
                    <a href="${googleDriveService.getDownloadUrl(file.googleDriveFileId)}"
                       target="_blank">${file.fileName}</a>
                    <button type="button" onclick="removeFileFromMCU('${file.fileId}')">Remove</button>
                `;
                filesList.appendChild(li);
            });
        }

        // Initialize upload widget for adding more files
        editFileUploadWidget = new FileUploadWidget('edit-file-upload-container', {
            employeeId: mcu.employeeId,
            mcuId: mcuId,
            maxFiles: 5
        });

        openModal('edit-mcu-modal');
    } catch (error) {
        showToast('Error: ' + error.message, 'error');
    }
};
```

---

## Widget Options

```javascript
new FileUploadWidget(containerId, {
    // Required
    employeeId: 'EMP001',

    // Optional
    mcuId: 'MCU123',                    // Associate with specific MCU
    maxFiles: 5,                         // Maximum files allowed
    onUploadComplete: (files) => {       // Callback after upload
        console.log('Files:', files);
    }
});
```

## Widget API

### Methods

```javascript
// Get uploaded files
const files = fileUploadWidget.getUploadedFiles();
// Returns: [{ fileId, fileName, googleDriveFileId, fileSize, uploadedAt }, ...]

// Clear widget
fileUploadWidget.clear();

// Set employee ID (before uploading)
fileUploadWidget.employeeId = 'EMP002';
```

### Events

```javascript
// Upload complete callback
fileUploadWidget.onUploadComplete = (files) => {
    console.log('Upload finished:', files);
};
```

---

## File Structure in Google Drive

After uploading, files are organized in Google Drive like this:

```
MCU Documents/
├── EMP001 - John Doe/
│   ├── chest-xray-2024-01.pdf
│   ├── blood-test-2024-01.jpg
│   └── ekg-2024-01.pdf
```

Each employee gets their own folder named `{employeeId} - {employeeName}`.

---

## Supabase Schema Update

Add file references to MCU records:

```sql
ALTER TABLE mcus ADD COLUMN attachedFiles JSONB DEFAULT '[]';

-- Example data:
{
  "attachedFiles": [
    {
      "fileId": "uuid-123",
      "fileName": "chest-xray.pdf",
      "googleDriveFileId": "drive-123",
      "fileSize": 2048576,
      "uploadedAt": "2024-01-15T10:30:00Z"
    }
  ]
}
```

Or create separate `mcuFiles` table (recommended):

```sql
CREATE TABLE mcuFiles (
  fileId TEXT PRIMARY KEY,
  mcuId TEXT REFERENCES mcus(mcuId),
  employeeId TEXT REFERENCES employees(employeeId),
  fileName TEXT NOT NULL,
  fileSize INTEGER,
  googleDriveFileId TEXT UNIQUE NOT NULL,
  uploadedAt TIMESTAMP DEFAULT NOW()
);
```

---

## Error Handling

The widget handles these errors automatically:

- **Invalid file type** - Only PDF, JPEG, PNG allowed
- **File too large** - Max 5MB (auto-compressed)
- **Upload failed** - Shows error message and retry option
- **Network error** - Caught and displayed to user

Custom error handling:

```javascript
try {
    fileUploadWidget = new FileUploadWidget('file-upload-container', {
        employeeId: employeeId,
        onUploadComplete: (files) => {
            // Handle success
        }
    });
} catch (error) {
    console.error('Widget initialization error:', error);
    showToast('Failed to initialize upload: ' + error.message, 'error');
}
```

---

## Testing

### Local Testing with Firebase Emulator

```bash
# Start Firebase emulator
firebase emulators:start --only functions

# Open app and test file upload
# Check emulator logs for upload function execution
firebase functions:log
```

### Production Testing

1. Deploy Cloud Function: `firebase deploy --only functions`
2. Update `.env.local` with production endpoint
3. Test file upload in application
4. Verify files appear in Google Drive
5. Verify metadata in Supabase

---

## Troubleshooting

### "Widget not initialized" Error
- Make sure `FileUploadWidget` is imported
- Ensure `file-upload-container` div exists in HTML
- Check browser console for initialization errors

### Files not uploading
- Check Cloud Function is deployed
- Verify endpoint URL in `.env.local`
- Check browser Network tab for upload request
- Look at Cloud Function logs for errors

### Files appear in Google Drive but not in Supabase
- Check Supabase connection
- Verify `mcuFiles` table exists in Supabase
- Check for database errors in logs

### File compression not working
- Ensure file is < 50MB before compression
- Check browser console for compression errors
- Try with smaller file first

---

## Next Steps

1. ✅ Add file upload widget to MCU form
2. ✅ Test local upload with Firebase Emulator
3. ✅ Deploy Cloud Function to production
4. ✅ Add file list view to MCU detail page
5. ✅ Add download functionality for files
6. ✅ Add delete file functionality
7. ⏳ Add file preview (images/PDFs)
8. ⏳ Add bulk file upload
9. ⏳ Add file search/filtering
