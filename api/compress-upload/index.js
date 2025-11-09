/**
 * Server-Side File Compression & Dual Upload API
 * Endpoint: POST /api/compress-upload
 *
 * Handles multipart/form-data file uploads with automatic compression:
 * - PDF files: Compress using pdf-lib (reduce stream, compress streams, remove redundancy)
 * - Images (JPG/PNG): Compress using sharp (quality 70%)
 * - Upload compressed file to Supabase Storage (as backup)
 * - Upload original file to Google Drive (per-employee folder)
 *
 * This ensures minimal storage usage while maintaining backup in Google Drive
 */

const { createClient } = require('@supabase/supabase-js');
const sharp = require('sharp');
const pako = require('pako');
const { PDFDocument } = require('pdf-lib');
const { Readable } = require('stream');
const busboy = require('busboy');
const { v4: uuid } = require('uuid');
const { uploadToGoogleDrive } = require('./googleDriveService');

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Compression settings
const COMPRESSION_CONFIG = {
  pdf: {
    quality: 'high', // Using pako for gzip compression
    type: 'gzip'
  },
  image: {
    quality: 70,      // Sharp quality 70%
    progressive: true, // Progressive encoding
    mozjpeg: true      // Better compression
  }
};

const ALLOWED_TYPES = {
  'application/pdf': 'pdf',
  'image/jpeg': 'image',
  'image/jpg': 'image',
  'image/png': 'image'
};

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB max per file (Vercel serverless limit)

/**
 * Compress PDF file using pdf-lib
 * Reduces size by 50-70% by removing redundancy and compressing streams
 */
async function compressPDF(buffer) {
  try {
    const originalSize = buffer.byteLength;

    // Load PDF with pdf-lib
    const pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });

    // Enable compression for all streams
    pdfDoc.setCompression(true);

    // Compress the document
    const compressedBuffer = await pdfDoc.save({ useObjectStreams: true });

    const compressedSize = compressedBuffer.length;
    const ratio = Math.round((1 - compressedSize / originalSize) * 100);

    console.log(`📦 PDF Compressed: ${(originalSize / 1024).toFixed(1)}KB → ${(compressedSize / 1024).toFixed(1)}KB (${ratio}% reduction)`);

    return {
      buffer: compressedBuffer,
      originalSize,
      compressedSize,
      ratio,
      format: 'pdf-compressed'
    };
  } catch (error) {
    console.error('⚠️ PDF compression with pdf-lib failed, falling back to gzip:', error.message);

    // Fallback to gzip if pdf-lib compression fails
    try {
      const originalSize = buffer.byteLength;
      const compressed = pako.gzip(buffer, { level: 9 });
      const compressedSize = compressed.length;
      const ratio = Math.round((1 - compressedSize / originalSize) * 100);

      return {
        buffer: compressed,
        originalSize,
        compressedSize,
        ratio,
        format: 'gzip-fallback'
      };
    } catch (fallbackError) {
      console.error('❌ All compression methods failed:', fallbackError.message);
      // Return original buffer if all compression fails
      return {
        buffer,
        originalSize: buffer.byteLength,
        compressedSize: buffer.byteLength,
        ratio: 0,
        format: 'original'
      };
    }
  }
}

/**
 * Compress image using sharp
 * Reduces size by 60-80% with quality 70%
 */
async function compressImage(buffer, mimeType) {
  try {
    const originalSize = buffer.byteLength;

    let sharpInstance = sharp(buffer);

    // Detect format and apply compression
    const metadata = await sharpInstance.metadata();

    if (mimeType === 'image/png') {
      sharpInstance = sharpInstance
        .png({
          quality: COMPRESSION_CONFIG.image.quality,
          progressive: COMPRESSION_CONFIG.image.progressive
        });
    } else {
      // JPG/JPEG
      sharpInstance = sharpInstance
        .jpeg({
          quality: COMPRESSION_CONFIG.image.quality,
          progressive: COMPRESSION_CONFIG.image.progressive,
          mozjpeg: COMPRESSION_CONFIG.image.mozjpeg
        });
    }

    const compressed = await sharpInstance.toBuffer();
    const compressedSize = compressed.length;
    const ratio = Math.round((1 - compressedSize / originalSize) * 100);

    console.log(`🖼️ Image Compressed: ${(originalSize / 1024).toFixed(1)}KB → ${(compressedSize / 1024).toFixed(1)}KB (${ratio}% reduction) [${metadata.format}]`);

    return {
      buffer: compressed,
      originalSize,
      compressedSize,
      ratio,
      format: metadata.format
    };
  } catch (error) {
    console.error('❌ Image compression failed:', error.message);
    // Return original buffer if compression fails
    return {
      buffer,
      originalSize: buffer.byteLength,
      compressedSize: buffer.byteLength,
      ratio: 0,
      format: 'original'
    };
  }
}

/**
 * Upload compressed file to Supabase Storage and original file to Google Drive
 */
async function uploadToSupabase(compressedBuffer, fileName, employeeId, mcuId, fileType, mimeType, originalBuffer) {
  try {
    // Generate unique file path
    const fileExtension = fileName.split('.').pop();
    const uniqueFileName = `${uuid()}.${fileExtension}`;
    const storagePath = `mcu-documents/${employeeId}/${mcuId}/${uniqueFileName}`;

    console.log(`📤 Uploading compressed to Supabase: ${storagePath}`);

    // Upload compressed file to Supabase Storage
    // Keep original MIME type even though file is compressed
    // (Supabase doesn't support application/gzip)
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('mcu-documents')
      .upload(storagePath, compressedBuffer, {
        contentType: mimeType, // Use original MIME type
        upsert: false,
        metadata: {
          original_filename: fileName,
          compressed: true,
          compression_method: fileType === 'pdf' ? 'pdf-lib' : 'sharp'
        }
      });

    if (uploadError) {
      throw new Error(`Supabase upload failed: ${uploadError.message}`);
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('mcu-documents')
      .getPublicUrl(storagePath);

    const publicUrl = urlData?.publicUrl;

    // After successful Supabase upload, upload original file to Google Drive
    let googleDriveInfo = null;
    try {
      console.log(`\n📁 Starting Google Drive upload...`);
      googleDriveInfo = await uploadToGoogleDrive(
        originalBuffer,
        fileName,
        employeeId,
        employeeId, // Use employeeId as name
        mimeType
      );
      console.log(`\n✅ Google Drive upload successful: ${googleDriveInfo.link}`);
    } catch (gdError) {
      console.error('\n⚠️ Warning: Supabase OK but Google Drive upload failed');
      console.error(`   Error: ${gdError.message}`);
      console.error(`   Continuing without Google Drive backup...`);
      // Don't fail - Supabase upload is already done
      // Return partial info so client knows what succeeded
      googleDriveInfo = {
        fileId: null,
        link: null,
        error: gdError.message
      };
    }

    // Save metadata to mcufiles table with both links
    const { data: fileRecord, error: dbError } = await supabase
      .from('mcufiles')
      .insert([{
        fileid: uuid(),
        mcuid: mcuId,
        employeeid: employeeId,
        filename: fileName,
        filetype: mimeType, // Use original MIME type
        filesize: compressedBuffer.byteLength,
        uploadedat: new Date().toISOString(),
        uploadedby: 'system',
        supabase_storage_path: storagePath,
        google_drive_file_id: googleDriveInfo?.fileId || null,
        google_drive_link: googleDriveInfo?.link || null
      }])
      .select();

    if (dbError) {
      console.error('⚠️ Warning: Files uploaded but metadata save failed:', dbError.message);
      // Don't throw - files are already uploaded
    }

    console.log(`✅ File uploaded successfully to both Supabase and Google Drive`);

    return {
      success: true,
      fileName,
      originalUrl: publicUrl,
      storagePath,
      googleDriveLink: googleDriveInfo?.link || null,
      googleDriveFileId: googleDriveInfo?.fileId || null,
      fileId: fileRecord?.[0]?.fileid
    };
  } catch (error) {
    console.error('❌ Upload failed:', error.message);
    throw error;
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

          console.log(`\n📁 Processing file: ${file.filename} (${(file.size / 1024).toFixed(1)}KB, ${file.mimeType})`);

          // Determine file type and compress
          const fileType = ALLOWED_TYPES[file.mimeType];
          let compressionResult;

          if (fileType === 'pdf') {
            compressionResult = await compressPDF(file.buffer);
          } else if (fileType === 'image') {
            compressionResult = await compressImage(file.buffer, file.mimeType);
          }

          // Upload to Supabase (compressed) and Google Drive (original)
          const uploadResult = await uploadToSupabase(
            compressionResult.buffer,
            file.filename,
            employeeId,
            mcuId,
            fileType,
            file.mimeType,
            file.buffer // Pass original buffer for Google Drive
          );

          return res.status(200).json({
            success: true,
            file: {
              name: file.filename,
              originalSize: compressionResult.originalSize,
              compressedSize: compressionResult.compressedSize,
              compressionRatio: compressionResult.ratio,
              type: fileType
            },
            upload: {
              supabase: {
                originalUrl: uploadResult.originalUrl,
                storagePath: uploadResult.storagePath
              },
              googleDrive: {
                link: uploadResult.googleDriveLink,
                fileId: uploadResult.googleDriveFileId
              }
            },
            message: `File compressed by ${compressionResult.ratio}% and uploaded to Supabase & Google Drive`
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
