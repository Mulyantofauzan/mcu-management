/**
 * File Upload API - Cloudflare R2
 * Endpoint: POST /api/compress-upload
 *
 * Flow:
 * - Accept file upload from client
 * - Validate file type and size (max 3MB)
 * - Store file in Cloudflare R2 bucket
 * - Save metadata + public URL to Supabase database
 *
 * IMPORTANT: This ONLY uploads to Cloudflare R2, NOT Supabase Storage
 */

const busboy = require('busboy');
const { uploadFileToStorage, ALLOWED_TYPES, MAX_FILE_SIZE } = require('../r2StorageService');

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
    let error_occurred = false;

    return new Promise((resolve) => {
      bb.on('file', (fieldname, fileStream, info) => {
        if (error_occurred) {
          fileStream.resume();
          return;
        }

        const { filename, encoding, mimeType } = info;

        // Check file type
        if (!ALLOWED_TYPES[mimeType]) {
          fileStream.resume();
          error_occurred = true;
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
            error_occurred = true;
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
          error_occurred = true;
          return res.status(400).json({
            error: `File stream error: ${error.message}`
          });
        });
      });

      bb.on('field', (fieldname, val) => {
        fields[fieldname] = val;
      });

      bb.on('close', async () => {
        if (completed || error_occurred) return;
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
          console.log(`   Size: ${(file.size / 1024).toFixed(1)}KB`);
          const fileType = ALLOWED_TYPES[file.mimeType];

          // Upload to Supabase Storage
          const uploadResult = await uploadFileToStorage(
            file.buffer,
            file.filename,
            employeeId,
            mcuId,
            file.mimeType
          );
          return res.status(200).json({
            success: true,
            file: {
              name: uploadResult.fileName,
              size: uploadResult.fileSize,
              type: uploadResult.fileType
            },
            storage: {
              bucket: 'mcu-files',
              path: uploadResult.storagePath,
              publicUrl: uploadResult.publicUrl
            },
            message: 'File uploaded successfully to Cloudflare R2'
          });
        } catch (error) {
          return res.status(500).json({
            error: error.message || 'Internal server error'
          });
        }
      });

      bb.on('error', (error) => {
        error_occurred = true;
        return res.status(400).json({
          error: `Form parsing error: ${error.message}`
        });
      });

      req.pipe(bb);
    });
  } catch (error) {
    return res.status(500).json({
      error: 'Internal server error'
    });
  }
};
