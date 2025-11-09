/**
 * Google Drive Service
 * Handles file uploads to Google Drive per employee folder
 *
 * Features:
 * - Create per-employee folders
 * - Upload files to employee folder
 * - Share files with appropriate permissions
 * - Track file IDs for reference
 */

const { google } = require('googleapis');
const { Readable } = require('stream');

let driveClient = null;

/**
 * Initialize Google Drive client using service account credentials
 */
function initializeDriveClient() {
  if (driveClient) return driveClient;

  try {
    const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS_JSON);

    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: [
        'https://www.googleapis.com/auth/drive',
        'https://www.googleapis.com/auth/drive.file'
      ]
    });

    driveClient = google.drive({ version: 'v3', auth });
    console.log('✅ Google Drive client initialized');
    return driveClient;
  } catch (error) {
    console.error('❌ Failed to initialize Google Drive client:', error.message);
    throw new Error('Google Drive not configured');
  }
}

/**
 * Get or create employee folder in Google Drive
 * Folder structure: MCU Documents / Employee ID
 */
async function getOrCreateEmployeeFolder(employeeId, employeeName) {
  const drive = initializeDriveClient();

  const rootFolderName = 'MCU Documents';
  const employeeFolderName = employeeId; // Use just the ID as folder name

  try {
    // Find or create root folder
    let rootFolderId = await findOrCreateFolder(null, rootFolderName);
    console.log(`📁 Root folder: ${rootFolderName} (${rootFolderId})`);

    // Find or create employee folder
    let employeeFolderId = await findOrCreateFolder(rootFolderId, employeeFolderName);
    console.log(`👤 Employee folder: ${employeeFolderName} (${employeeFolderId})`);

    return employeeFolderId;
  } catch (error) {
    console.error('❌ Failed to get/create employee folder:', error.message);
    throw error;
  }
}

/**
 * Find folder by name in parent, or create if not exists
 */
async function findOrCreateFolder(parentFolderId, folderName) {
  const drive = initializeDriveClient();

  try {
    // Search for existing folder
    let query = `name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`;
    if (parentFolderId) {
      query += ` and '${parentFolderId}' in parents`;
    }

    const searchResult = await drive.files.list({
      q: query,
      spaces: 'drive',
      fields: 'files(id, name)',
      pageSize: 1
    });

    if (searchResult.data.files.length > 0) {
      console.log(`✅ Folder exists: ${folderName}`);
      return searchResult.data.files[0].id;
    }

    // Create folder if not found
    const fileMetadata = {
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder'
    };

    if (parentFolderId) {
      fileMetadata.parents = [parentFolderId];
    }

    const createResult = await drive.files.create({
      resource: fileMetadata,
      fields: 'id'
    });

    console.log(`✨ Created folder: ${folderName} (${createResult.data.id})`);
    return createResult.data.id;
  } catch (error) {
    console.error('❌ Failed to find/create folder:', error.message);
    throw error;
  }
}

/**
 * Upload file to Google Drive
 */
async function uploadToGoogleDrive(fileBuffer, fileName, employeeId, employeeName, mimeType) {
  const drive = initializeDriveClient();

  try {
    // Validate input
    if (!fileBuffer || fileBuffer.length === 0) {
      throw new Error('File buffer is empty');
    }

    console.log(`\n🔄 Starting Google Drive upload...`);
    console.log(`   File: ${fileName}`);
    console.log(`   Size: ${fileBuffer.length} bytes`);
    console.log(`   MIME: ${mimeType}`);
    console.log(`   Employee: ${employeeId}`);

    // Get or create employee folder
    const folderId = await getOrCreateEmployeeFolder(employeeId, employeeName);
    console.log(`✅ Target folder ID: ${folderId}`);

    // Upload file with proper metadata
    const fileMetadata = {
      name: fileName,
      parents: [folderId]
    };

    console.log(`📝 Creating file in Google Drive...`);

    // Use direct buffer instead of stream to ensure proper handling
    const uploadResult = await drive.files.create(
      {
        resource: fileMetadata,
        media: {
          mimeType: mimeType,
          body: fileBuffer
        },
        fields: 'id, webViewLink, name, size, parents'
      },
      {
        // Add retry logic for transient failures
        maxRetries: 3,
        retryDelay: 100
      }
    );

    if (!uploadResult.data || !uploadResult.data.id) {
      throw new Error('Google Drive API returned no file ID');
    }

    const googleDriveFileId = uploadResult.data.id;
    const googleDriveLink = uploadResult.data.webViewLink;

    console.log(`\n✅ Successfully uploaded to Google Drive!`);
    console.log(`   File ID: ${googleDriveFileId}`);
    console.log(`   Link: ${googleDriveLink}`);
    console.log(`   Name: ${uploadResult.data.name}`);
    if (uploadResult.data.size) {
      console.log(`   Size: ${uploadResult.data.size} bytes`);
    }

    return {
      success: true,
      fileId: googleDriveFileId,
      fileName: uploadResult.data.name,
      link: googleDriveLink,
      folderId: folderId
    };
  } catch (error) {
    console.error('\n❌ Failed to upload to Google Drive:');
    console.error(`   Error message: ${error.message}`);
    if (error.code) {
      console.error(`   Error code: ${error.code}`);
    }
    if (error.status) {
      console.error(`   Status: ${error.status}`);
    }
    // Log full error for debugging
    console.error('   Full error:', JSON.stringify(error, null, 2));
    throw error;
  }
}

/**
 * Get file info from Google Drive
 */
async function getFileInfo(fileId) {
  const drive = initializeDriveClient();

  try {
    const result = await drive.files.get({
      fileId: fileId,
      fields: 'id, name, size, webViewLink, createdTime'
    });

    return {
      success: true,
      fileId: result.data.id,
      name: result.data.name,
      size: result.data.size,
      link: result.data.webViewLink,
      createdTime: result.data.createdTime
    };
  } catch (error) {
    console.error('❌ Failed to get file info:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

module.exports = {
  initializeDriveClient,
  getOrCreateEmployeeFolder,
  uploadToGoogleDrive,
  getFileInfo
};
