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
   * Upload file to Google Drive
   * @param {File} file - File object
   * @param {string} employeeId - Employee ID
   * @param {string} employeeName - Employee name
   * @returns {Promise<Object>} - Upload result with fileId and metadata
   */
  async uploadFile(file, employeeId, employeeName = '') {
    try {
      // Ensure user is signed in
      logger.info('Ensuring user is signed in...');
      await this.ensureSignedIn();

      // Get or create employee folder
      logger.info(`Getting/creating folder for employee: ${employeeId}`);
      const folderId = await this.getOrCreateEmployeeFolder(employeeId, employeeName);
      logger.info(`Using folder: ${folderId}`);

      // Use gapi to upload file directly
      logger.info(`Uploading file to Google Drive: ${file.name}`);

      // Create FormData for upload
      const formData = new FormData();
      formData.append('metadata', new Blob([JSON.stringify({
        name: file.name,
        mimeType: file.type,
        parents: [folderId]
      })], { type: 'application/json' }));
      formData.append('file', file);

      // Get access token
      const auth = window.gapi.auth2.getAuthInstance();
      const accessToken = auth.currentUser.get().getAuthResponse().access_token;

      logger.info('Sending upload request to Google Drive API');
      const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`
        },
        body: formData
      });

      logger.info(`Upload response status: ${response.status}`);
      logger.info(`Upload response headers:`, response.headers.get('content-type'));

      if (!response.ok) {
        const errorText = await response.text();
        logger.error('Upload response error:', errorText.substring(0, 500));
        throw new Error(`Upload failed: ${response.status} ${response.statusText}`);
      }

      // Debug: Log raw response text before parsing
      const responseText = await response.text();
      logger.info(`Raw response text (first 500 chars):`, responseText.substring(0, 500));

      let result;
      try {
        result = JSON.parse(responseText);
      } catch (parseError) {
        logger.error('Failed to parse JSON response:', parseError.message);
        logger.error('Response text:', responseText.substring(0, 1000));
        throw new Error(`Invalid JSON response from Google Drive: ${parseError.message}`);
      }

      if (!result.id) {
        logger.error('No file ID in response');
        throw new Error('Google Drive API did not return a file ID');
      }

      logger.info(`File uploaded successfully: ${result.id}`);

      return {
        fileId: result.id,
        fileName: result.name || file.name,
        mimeType: result.mimeType || file.type,
        size: file.size,
        googleDriveFileId: result.id,
        uploadedAt: new Date().toISOString()
      };
    } catch (error) {
      logger.error('File upload error:', error?.message || error);
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
