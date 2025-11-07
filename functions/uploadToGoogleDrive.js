/**
 * Firebase Cloud Function: Upload MCU File to Google Drive
 *
 * Triggered by HTTP request from frontend
 * Handles file upload to Google Drive and metadata storage in Supabase
 *
 * Deploy with:
 * firebase deploy --only functions:uploadToGoogleDrive
 */

const functions = require('firebase-functions');
const admin = require('firebase-admin');
const { google } = require('googleapis');
const { v4: uuidv4 } = require('uuid');

// Initialize Firebase Admin
admin.initializeApp();

// Load Google Cloud credentials from environment variable
const SERVICE_ACCOUNT_KEY = JSON.parse(process.env.GOOGLE_CREDENTIALS || '{}');
const GOOGLE_DRIVE_ROOT_FOLDER_ID = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID;

// Initialize Google Auth
const auth = new google.auth.GoogleAuth({
  credentials: SERVICE_ACCOUNT_KEY,
  scopes: ['https://www.googleapis.com/auth/drive'],
});

const drive = google.drive({ version: 'v3', auth });

// Supabase client
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * HTTP Cloud Function: Upload file to Google Drive
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
exports.uploadToGoogleDrive = functions.https.onRequest(async (req, res) => {
  try {
    // Only accept POST requests
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    // Check authentication (from request headers or Firebase auth)
    const authToken = req.headers.authorization?.split('Bearer ')[1];
    if (!authToken) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Verify Firebase token
    let userId, displayName;
    try {
      const decodedToken = await admin.auth().verifyIdToken(authToken);
      userId = decodedToken.uid;
      displayName = decodedToken.display_name || decodedToken.email;
    } catch (err) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    // Parse multipart form data
    const Busboy = require('busboy');
    const busboy = new Busboy({ headers: req.headers });

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
              mimetype: mimetype,
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

    const { employeeId, userId: formUserId, userName } = fields;

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
    const employeeFolderId = await createOrGetEmployeeFolder(employeeId, formUserId || userName);

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
        uploadedBy: userId,
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
        userId: userId,
        details: `Uploaded file: ${file.filename}. Employee: ${employeeId}. Size: ${(file.size / 1024).toFixed(2)}KB. Google Drive: ${googleDriveFileId}`,
        createdAt: new Date().toISOString(),
      }]);

    // Return success response
    res.json({
      success: true,
      fileId: fileId,
      googleDriveFileId: googleDriveFileId,
      fileName: file.filename,
      fileSize: file.size,
      uploadedAt: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Create or get employee folder in Google Drive
 * @param {string} employeeId - Employee ID
 * @param {string} employeeName - Employee name (for folder display)
 * @returns {Promise<string>} - Folder ID
 */
async function createOrGetEmployeeFolder(employeeId, employeeName = '') {
  try {
    const folderName = `${employeeId}${employeeName ? ' - ' + employeeName : ''}`;

    // Search for existing folder
    const response = await drive.files.list({
      q: `'${GOOGLE_DRIVE_ROOT_FOLDER_ID}' in parents and name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
      spaces: 'drive',
      fields: 'files(id, name)',
      pageSize: 1,
    });

    if (response.data.files.length > 0) {
      return response.data.files[0].id;
    }

    // Create new folder
    const createResponse = await drive.files.create({
      resource: {
        name: folderName,
        mimeType: 'application/vnd.google-apps.folder',
        parents: [GOOGLE_DRIVE_ROOT_FOLDER_ID],
      },
      fields: 'id',
    });

    return createResponse.data.id;
  } catch (error) {
    throw new Error(`Failed to create/get employee folder: ${error.message}`);
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

    return response.data.id;
  } catch (error) {
    throw new Error(`Failed to upload file to Google Drive: ${error.message}`);
  }
}
