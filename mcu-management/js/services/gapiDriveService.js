/**
 * Google Drive Service using gapi client library
 * Direct upload from frontend using user's Google account
 * No backend serverless function needed
 */

import { logger } from '../utils/logger.js';

class GapiDriveService {
  constructor() {
    this.rootFolderId = null;
    this.isInitialized = false;
    this.gapiLoaded = false;
    this.initPromise = null;
  }

  /**
   * Load Google API client library
   */
  async loadGapiScript() {
    return new Promise((resolve, reject) => {
      // Check if gapi is already loaded
      if (window.gapi && window.gapi.client) {
        logger.info('gapi already loaded in window');
        resolve();
        return;
      }

      logger.info('Loading Google API script...');
      const script = document.createElement('script');
      script.src = 'https://apis.google.com/js/api.js';
      script.async = true;
      script.defer = true;

      let timeoutId = setTimeout(() => {
        logger.error('Google API script timeout after 10s');
        reject(new Error('Google API script load timeout'));
      }, 10000);

      script.onload = () => {
        clearTimeout(timeoutId);
        logger.info('Google API script loaded successfully');
        // Wait for gapi to be ready
        if (window.gapi) {
          resolve();
        } else {
          reject(new Error('window.gapi not available after script load'));
        }
      };

      script.onerror = () => {
        clearTimeout(timeoutId);
        logger.error('Failed to load Google API script');
        reject(new Error('Failed to load Google API script'));
      };

      document.head.appendChild(script);
    });
  }

  /**
   * Initialize Google Drive service
   * @param {Object} config - Configuration with clientId and rootFolderId
   */
  async init(config) {
    // Prevent multiple concurrent initializations
    if (this.initPromise) {
      logger.info('Init already in progress, waiting...');
      return this.initPromise;
    }

    this.initPromise = this._doInit(config);
    return this.initPromise;
  }

  async _doInit(config) {
    try {
      const { clientId, rootFolderId } = config;

      if (!clientId) {
        throw new Error('Google Client ID not configured');
      }
      if (!rootFolderId) {
        throw new Error('Google Drive root folder ID not configured');
      }

      logger.info('Starting Google Drive service initialization');

      // Load gapi script
      await this.loadGapiScript();
      this.gapiLoaded = true;

      this.clientId = clientId;
      this.rootFolderId = rootFolderId;

      // Initialize gapi with timeout
      logger.info('Initializing gapi client with timeout...');
      await new Promise((resolve, reject) => {
        let timeoutId = setTimeout(() => {
          logger.error('gapi initialization timeout after 10s');
          reject(new Error('gapi initialization timeout'));
        }, 10000);

        try {
          window.gapi.load('client:auth2', async () => {
            try {
              logger.info('gapi modules loaded, initializing client...');
              await window.gapi.client.init({
                clientId: clientId,
                scope: 'https://www.googleapis.com/auth/drive.file',
                discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest']
              });
              clearTimeout(timeoutId);
              logger.info('gapi client initialized successfully');
              resolve();
            } catch (e) {
              clearTimeout(timeoutId);
              logger.error('Error during gapi.client.init:', e);
              reject(e);
            }
          });
        } catch (e) {
          clearTimeout(timeoutId);
          logger.error('Error in gapi.load:', e);
          reject(e);
        }
      });

      this.isInitialized = true;
      logger.info('Google Drive service fully initialized');
    } catch (error) {
      logger.error('Failed to initialize Google Drive service:', error?.message || error);
      this.isInitialized = false;
      this.initPromise = null;
      throw error;
    }
  }

  /**
   * Check if user is signed in, if not prompt sign-in
   */
  async ensureSignedIn() {
    const auth = window.gapi.auth2.getAuthInstance();
    if (!auth.isSignedIn.get()) {
      await auth.signIn();
    }
  }

  /**
   * Create or get employee folder
   * @param {string} employeeId - Employee ID
   * @param {string} employeeName - Employee name
   * @returns {Promise<string>} - Folder ID
   */
  async getOrCreateEmployeeFolder(employeeId, employeeName = '') {
    try {
      const folderName = `${employeeId}${employeeName ? ' - ' + employeeName : ''}`;

      // Search for existing folder
      const response = await window.gapi.client.drive.files.list({
        q: `'${this.rootFolderId}' in parents and name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
        spaces: 'drive',
        fields: 'files(id, name)',
        pageSize: 1
      });

      if (response.result.files && response.result.files.length > 0) {
        logger.info(`Found existing folder for ${employeeId}`);
        return response.result.files[0].id;
      }

      // Create new folder
      logger.info(`Creating new folder for ${employeeId}: ${folderName}`);
      const createResponse = await window.gapi.client.drive.files.create({
        resource: {
          name: folderName,
          mimeType: 'application/vnd.google-apps.folder',
          parents: [this.rootFolderId]
        },
        fields: 'id'
      });

      return createResponse.result.id;
    } catch (error) {
      logger.error('Error getting/creating employee folder:', error);
      throw error;
    }
  }

  /**
   * Upload file to Google Drive using gapi.client.drive.files.create()
   * @param {File} file - File object
   * @param {string} employeeId - Employee ID
   * @param {string} employeeName - Employee name
   * @returns {Promise<Object>} - Upload result with fileId and metadata
   */
  async uploadFile(file, employeeId, employeeName = '') {
    try {
      logger.info('========== FILE UPLOAD STARTED ==========');
      logger.info(`File: ${file.name}, Size: ${file.size} bytes, Type: ${file.type}`);

      // Ensure user is signed in
      logger.info('Step 1: Ensuring user is signed in...');
      try {
        await this.ensureSignedIn();
        logger.info('✓ User signed in successfully');
      } catch (signInError) {
        logger.error('✗ Sign-in failed:', signInError?.message || signInError);
        throw signInError;
      }

      // Get or create employee folder
      logger.info(`Step 2: Getting/creating folder for employee: ${employeeId}`);
      let folderId;
      try {
        folderId = await this.getOrCreateEmployeeFolder(employeeId, employeeName);
        logger.info(`✓ Folder ID: ${folderId}`);
      } catch (folderError) {
        logger.error('✗ Folder creation failed:', folderError?.message || folderError);
        throw folderError;
      }

      // Use gapi.client.drive.files.create() for upload
      logger.info(`Step 3: Preparing file upload for: ${file.name}`);

      // Create file metadata
      const fileMetadata = {
        name: file.name,
        mimeType: file.type,
        parents: [folderId]
      };
      logger.info('File metadata:', JSON.stringify(fileMetadata));

      // Create media object from File
      // Important: gapi needs Blob or ArrayBuffer, convert File to Blob if needed
      let fileBlob = file;
      if (file instanceof File) {
        // File is already a Blob subclass, but let's be explicit
        fileBlob = new Blob([file], { type: file.type });
      }

      const media = {
        mimeType: file.type,
        body: fileBlob
      };
      logger.info(`Media type: ${media.mimeType}, Body type: ${typeof media.body}, Body instanceof Blob: ${fileBlob instanceof Blob}`);

      logger.info('Step 4: Calling gapi.client.drive.files.create()...');

      let response;
      try {
        response = await window.gapi.client.drive.files.create({
          resource: fileMetadata,
          media: media,
          fields: 'id, name, mimeType, createdTime, webViewLink'
        });
        logger.info('✓ API call completed');
      } catch (apiError) {
        logger.error('✗ gapi API call failed');
        logger.error('Error type:', apiError?.constructor?.name);
        logger.error('Error message:', apiError?.message);
        logger.error('Error status:', apiError?.status);
        logger.error('Error details:', JSON.stringify(apiError, null, 2));
        throw new Error(`gapi.client.drive.files.create() failed: ${apiError?.message}`);
      }

      logger.info('Step 5: Validating response...');
      logger.info('Response object:', typeof response);
      logger.info('Response keys:', Object.keys(response || {}));

      if (!response) {
        logger.error('✗ Response is null/undefined');
        throw new Error('Google Drive API returned null response');
      }

      logger.info('Response.result:', response.result);
      logger.info('Response.error:', response.error);

      if (response.error) {
        logger.error('✗ API returned error:', response.error);
        throw new Error(`Google Drive API error: ${response.error}`);
      }

      if (!response.result) {
        logger.error('✗ No result in response');
        throw new Error('Google Drive API did not return a result object');
      }

      const result = response.result;
      logger.info('File result:', JSON.stringify(result));

      if (!result.id) {
        logger.error('✗ No file ID in result');
        throw new Error('Google Drive API did not return a file ID');
      }

      logger.info(`✓ File uploaded successfully: ${result.id}`);
      logger.info('========== FILE UPLOAD COMPLETE ==========');

      return {
        fileId: result.id,
        fileName: result.name || file.name,
        mimeType: result.mimeType || file.type,
        size: file.size,
        googleDriveFileId: result.id,
        uploadedAt: new Date().toISOString()
      };
    } catch (error) {
      logger.error('========== FILE UPLOAD FAILED ==========');
      logger.error('Error type:', error?.constructor?.name);
      logger.error('Error message:', error?.message);
      logger.error('Error stack:', error?.stack);
      logger.error('Full error object:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
      throw error;
    }
  }

  /**
   * Get preview URL for a file
   * @param {string} googleDriveFileId - Google Drive file ID
   * @returns {string} - Preview URL
   */
  getPreviewUrl(googleDriveFileId) {
    return `https://drive.google.com/file/d/${googleDriveFileId}/preview`;
  }
}

export const gapiDriveService = new GapiDriveService();
