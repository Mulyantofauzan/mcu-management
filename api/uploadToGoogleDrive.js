/**
 * Vercel Serverless Function: Upload MCU File to Google Drive
 *
 * Triggered by HTTP POST request from frontend
 * Handles file upload to Google Drive and metadata storage in Supabase
 *
 * Automatically deployed when pushed to GitHub/Vercel
 */

const { google } = require('googleapis');
const { v4: uuidv4 } = require('uuid');
const { createClient } = require('@supabase/supabase-js');
const Busboy = require('busboy');

// Validate environment variables
if (!process.env.SUPABASE_URL) {
  console.error('ERROR: SUPABASE_URL not set');
}
if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('ERROR: SUPABASE_SERVICE_ROLE_KEY not set');
}
if (!process.env.GOOGLE_CREDENTIALS) {
  console.error('ERROR: GOOGLE_CREDENTIALS not set');
}
if (!process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID) {
  console.error('ERROR: GOOGLE_DRIVE_ROOT_FOLDER_ID not set');
}

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Load Google Cloud credentials from environment variable
let SERVICE_ACCOUNT_KEY = {};
try {
  SERVICE_ACCOUNT_KEY = JSON.parse(process.env.GOOGLE_CREDENTIALS || '{}');
} catch (e) {
  console.error('ERROR: Failed to parse GOOGLE_CREDENTIALS:', e.message);
}
const GOOGLE_DRIVE_ROOT_FOLDER_ID = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID;

// Initialize Google Auth
let auth, drive;
try {
  auth = new google.auth.GoogleAuth({
    credentials: SERVICE_ACCOUNT_KEY,
    scopes: ['https://www.googleapis.com/auth/drive'],
  });
  drive = google.drive({ version: 'v3', auth });
} catch (e) {
  console.error('ERROR: Failed to initialize Google Auth:', e.message);
}

/**
 * Main handler function for Vercel
 * @param {Object} req - Node.js HTTP request
 * @param {Object} res - Node.js HTTP response
 */
async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    // Only accept POST requests
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    // TODO: Add proper authentication
    // For now, skip auth validation for testing
    // In production, implement Firebase Admin SDK verification

    // Parse multipart form data
    const busboy = Busboy({ headers: req.headers });

    let file = null;
    let fields = {};

    await new Promise((resolve, reject) => {
      busboy.on('file', (fieldname, stream, filename, encoding, mimetype) => {
        if (fieldname === 'file') {
          const chunks = [];
          stream.on('data', (data) => chunks.push(data));
          stream.on('end', () => {
            file = {
              buffer: Buffer.concat(chunks),
              filename: filename,
              mimetype: mimetype || 'application/octet-stream', // Fallback if not provided
              size: Buffer.concat(chunks).length,
            };
          });
          stream.on('error', reject);
        }
      });

      busboy.on('field', (fieldname, value) => {
        fields[fieldname] = value;
      });

      busboy.on('finish', resolve);
      busboy.on('error', reject);

      req.pipe(busboy);
    });

    // Validate inputs
    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { employeeId, userId, userName } = fields;

    if (!employeeId) {
      return res.status(400).json({ error: 'employeeId is required' });
    }

    // Validate file type
    const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];
    if (!ALLOWED_TYPES.includes(file.mimetype)) {
      return res.status(400).json({
        error: `File type not allowed. Allowed: PDF, JPEG, PNG. Provided: ${file.mimetype}`
      });
    }

    // Validate file size (should already be compressed from frontend, but double-check)
    const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
    if (file.size > MAX_FILE_SIZE) {
      return res.status(400).json({
        error: `File size exceeds 5MB limit. Current: ${(file.size / 1024 / 1024).toFixed(2)}MB`
      });
    }

    // Create employee folder in Google Drive (if doesn't exist)
    const employeeFolderId = await createOrGetEmployeeFolder(employeeId, userName);

    // Upload file to Google Drive
    const googleDriveFileId = await uploadFileToGoogleDrive(
      file.buffer,
      file.filename,
      file.mimetype,
      employeeFolderId
    );

    // Extract file extension
    const fileExt = file.filename.split('.').pop().toLowerCase();

    // Create metadata record in Supabase
    const fileId = uuidv4();
    const { data, error } = await supabase
      .from('mcuFiles')
      .insert([{
        fileId: fileId,
        employeeId: employeeId,
        fileName: file.filename,
        fileType: fileExt,
        fileSize: file.size,
        googleDriveFileId: googleDriveFileId,
        uploadedBy: userId || 'unknown',
        uploadedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }]);

    if (error) {
      throw new Error(`Failed to save file metadata: ${error.message}`);
    }

    // Log activity
    await supabase
      .from('activityLog')
      .insert([{
        action: 'create',
        entityType: 'MCU_FILE',
        entityId: fileId,
        userId: userId || 'unknown',
        details: `Uploaded file: ${file.filename}. Employee: ${employeeId}. Size: ${(file.size / 1024).toFixed(2)}KB. Google Drive: ${googleDriveFileId}`,
        createdAt: new Date().toISOString(),
      }]);

    // Return success response
    return res.status(200).json({
      success: true,
      fileId: fileId,
      googleDriveFileId: googleDriveFileId,
      fileName: file.filename,
      fileSize: file.size,
      uploadedAt: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Upload error:', error?.message || String(error));

    // Return detailed error for debugging
    let errorMessage = 'Unknown error occurred';

    // Extract error message safely
    if (error?.message) {
      errorMessage = error.message;
    } else if (error?.errors?.[0]?.message) {
      errorMessage = error.errors[0].message;
    } else if (typeof error === 'string') {
      errorMessage = error;
    }

    // Return safe error response (avoid exposing code snippets)
    return res.status(500).json({
      error: errorMessage.substring(0, 500) // Limit length to prevent XSS
    });
  }
}

/**
 * Create or get employee folder in Google Drive
 * @param {string} employeeId - Employee ID
 * @param {string} employeeName - Employee name (for folder display)
 * @returns {Promise<string>} - Folder ID
 */
async function createOrGetEmployeeFolder(employeeId, employeeName = '') {
  try {
    // Validate inputs
    if (!employeeId) {
      throw new Error('Employee ID is required');
    }

    if (!GOOGLE_DRIVE_ROOT_FOLDER_ID) {
      throw new Error('Google Drive root folder ID not configured');
    }

    const folderName = `${employeeId}${employeeName ? ' - ' + employeeName : ''}`;

    // Search for existing folder
    const response = await drive.files.list({
      q: `'${GOOGLE_DRIVE_ROOT_FOLDER_ID}' in parents and name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
      spaces: 'drive',
      fields: 'files(id, name)',
      pageSize: 1,
    });

    // Check if folder exists
    if (response?.data?.files && response.data.files.length > 0) {
      console.log(`Found existing folder for ${employeeId}: ${response.data.files[0].id}`);
      return response.data.files[0].id;
    }

    // Create new folder
    console.log(`Creating new folder for ${employeeId}: ${folderName}`);
    const createResponse = await drive.files.create({
      resource: {
        name: folderName,
        mimeType: 'application/vnd.google-apps.folder',
        parents: [GOOGLE_DRIVE_ROOT_FOLDER_ID],
      },
      fields: 'id',
    });

    if (!createResponse?.data?.id) {
      throw new Error('Failed to get folder ID from Google Drive response');
    }

    return createResponse.data.id;
  } catch (error) {
    const errorMsg = `Failed to create/get employee folder: ${error?.message || String(error)}`;
    console.error(errorMsg);
    throw new Error(errorMsg);
  }
}

/**
 * Upload file to Google Drive
 * @param {Buffer} fileBuffer - File content
 * @param {string} fileName - File name
 * @param {string} mimeType - MIME type
 * @param {string} parentFolderId - Parent folder ID
 * @returns {Promise<string>} - Google Drive file ID
 */
async function uploadFileToGoogleDrive(fileBuffer, fileName, mimeType, parentFolderId) {
  try {
    // Validate inputs
    if (!fileBuffer) {
      throw new Error('File buffer is required');
    }
    if (!fileName) {
      throw new Error('File name is required');
    }
    if (!mimeType) {
      throw new Error('MIME type is required');
    }
    if (!parentFolderId) {
      throw new Error('Parent folder ID is required');
    }

    console.log(`Uploading file to Google Drive: ${fileName} (${mimeType}, ${fileBuffer.length} bytes)`);

    const response = await drive.files.create({
      resource: {
        name: fileName,
        mimeType: mimeType,
        parents: [parentFolderId],
      },
      media: {
        mimeType: mimeType,
        body: fileBuffer,
      },
      fields: 'id',
    });

    if (!response?.data?.id) {
      throw new Error('Failed to get file ID from Google Drive response');
    }

    console.log(`File uploaded successfully: ${response.data.id}`);
    return response.data.id;
  } catch (error) {
    const errorMsg = `Failed to upload file to Google Drive: ${error?.message || String(error)}`;
    console.error(errorMsg);
    throw new Error(errorMsg);
  }
}

// Export for Vercel
module.exports = handler;
