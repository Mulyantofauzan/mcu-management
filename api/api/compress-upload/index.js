/**
 * File Upload API - Google Drive Primary Storage
 * Endpoint: POST /api/compress-upload
 *
 * Simplified flow:
 * - Accept file upload from client
 * - Store file directly in Google Drive (per-employee folder)
 * - Save Google Drive link + metadata in Supabase
 * - No compression (unlimited Google Drive storage)
 */

const { createClient } = require('@supabase/supabase-js');
const busboy = require('busboy');
const { v4: uuid } = require('uuid');
const { uploadToGoogleDrive } = require('../../googleDriveService');

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const ALLOWED_TYPES = {
  'application/pdf': 'pdf',
  'image/jpeg': 'image',
  'image/jpg': 'image',
  'image/png': 'image'
};

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB max file size

/**
 * Upload file directly to Google Drive (no compression)
 * Save metadata to Supabase for reference
 */
async function saveFileMetadata(fileName, employeeId, mcuId, fileSize, mimeType, googleDriveInfo) {
  try {
    const fileRecord = {
      fileid: uuid(),
      mcuid: mcuId,
      employeeid: employeeId,
      filename: fileName,
      filetype: mimeType,
      filesize: fileSize,
      google_drive_file_id: googleDriveInfo.fileId,
      google_drive_link: googleDriveInfo.link,
      google_drive_folder_id: googleDriveInfo.folderId,
      uploadedat: new Date().toISOString(),
      uploadedby: 'system',
      createdat: new Date().toISOString(),
      updatedat: new Date().toISOString()
    };

    const { data, error: dbError } = await supabase
      .from('mcufiles')
      .insert([fileRecord])
      .select();

    if (dbError) {
      console.error('⚠️ Warning: Google Drive OK but database insert failed:', dbError.message);
      // File is safe in Google Drive, continue without DB record
      return fileRecord;
    }

    console.log(`✅ Database record created successfully`);
    return data?.[0] || fileRecord;
  } catch (error) {
    console.error('⚠️ Database operation failed:', error.message);
    // Don't fail - file is safely in Google Drive
    return null;
  }
}

/**
 * Main handler function
 */
module.exports = async (req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Parse multipart/form-data
    const bb = busboy({ headers: req.headers });

    let file = null;
    let fields = {};
    let completed = false;

    return new Promise((resolve) => {
      bb.on('file', (fieldname, fileStream, info) => {
        const { filename, encoding, mimeType } = info;

        // Check file type
        if (!ALLOWED_TYPES[mimeType]) {
          fileStream.resume();
          return res.status(400).json({
            error: 'File type not allowed. Only PDF and images (JPG/PNG) allowed.'
          });
        }

        let size = 0;
        const chunks = [];

        fileStream.on('data', (data) => {
          size += data.length;
          if (size > MAX_FILE_SIZE) {
            fileStream.destroy();
            return res.status(413).json({
              error: `File too large. Max size: ${MAX_FILE_SIZE / 1024 / 1024}MB`
            });
          }
          chunks.push(data);
        });

        fileStream.on('end', () => {
          file = {
            filename,
            mimeType,
            buffer: Buffer.concat(chunks),
            size
          };
        });

        fileStream.on('error', (error) => {
          return res.status(400).json({
            error: `File stream error: ${error.message}`
          });
        });
      });

      bb.on('field', (fieldname, val) => {
        fields[fieldname] = val;
      });

      bb.on('close', async () => {
        if (completed) return;
        completed = true;

        try {
          // Validate required fields
          const { employeeId, mcuId } = fields;
          if (!employeeId || !mcuId) {
            return res.status(400).json({
              error: 'Missing required fields: employeeId, mcuId'
            });
          }

          if (!file) {
            return res.status(400).json({
              error: 'No file provided'
            });
          }

          console.log(`\n📄 Processing file: ${file.filename}`);
          console.log(`   Size: ${(file.size / 1024).toFixed(1)}KB`);
          console.log(`   Type: ${file.mimeType}`);
          console.log(`   Employee: ${employeeId}`);
          console.log(`   MCU ID: ${mcuId}`);

          const fileType = ALLOWED_TYPES[file.mimeType];

          // Upload directly to Google Drive (no compression)
          console.log(`\n📤 Uploading to Google Drive...`);
          const googleDriveInfo = await uploadToGoogleDrive(
            file.buffer,
            file.filename,
            employeeId,
            employeeId,
            file.mimeType
          );

          console.log(`✅ Google Drive upload successful!`);
          console.log(`   File ID: ${googleDriveInfo.fileId}`);
          console.log(`   Link: ${googleDriveInfo.link}`);

          // Save metadata to Supabase
          await saveFileMetadata(
            file.filename,
            employeeId,
            mcuId,
            file.size,
            file.mimeType,
            googleDriveInfo
          );

          return res.status(200).json({
            success: true,
            file: {
              name: file.filename,
              size: file.size,
              type: fileType
            },
            googleDrive: {
              fileId: googleDriveInfo.fileId,
              link: googleDriveInfo.link,
              folderId: googleDriveInfo.folderId
            },
            message: 'File uploaded successfully to Google Drive'
          });
        } catch (error) {
          console.error('❌ Error:', error.message);
          return res.status(500).json({
            error: error.message || 'Internal server error'
          });
        }
      });

      bb.on('error', (error) => {
        return res.status(400).json({
          error: `Form parsing error: ${error.message}`
        });
      });

      req.pipe(bb);
    });
  } catch (error) {
    console.error('❌ Unhandled error:', error.message);
    return res.status(500).json({
      error: 'Internal server error'
    });
  }
};
