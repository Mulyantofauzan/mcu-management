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
  }

  /**
   * Load Google API client library
   */
  async loadGapiScript() {
    return new Promise((resolve, reject) => {
      if (window.gapi) {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://apis.google.com/js/api.js';
      script.async = true;
      script.defer = true;
      script.onload = resolve;
      script.onerror = () => reject(new Error('Failed to load Google API script'));
      document.head.appendChild(script);
    });
  }

  /**
   * Initialize Google Drive service
   * @param {Object} config - Configuration with clientId and rootFolderId
   */
  async init(config) {
    try {
      // Load gapi script
      await this.loadGapiScript();
      this.gapiLoaded = true;

      const { clientId, rootFolderId } = config;
      if (!clientId) {
        throw new Error('Google Client ID not configured');
      }
      if (!rootFolderId) {
        throw new Error('Google Drive root folder ID not configured');
      }

      this.clientId = clientId;
      this.rootFolderId = rootFolderId;

      // Initialize gapi
      await new Promise((resolve, reject) => {
        window.gapi.load('client:auth2', () => {
          window.gapi.client
            .init({
              clientId: clientId,
              scope: 'https://www.googleapis.com/auth/drive.file',
              discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest']
            })
            .then(resolve)
            .catch(reject);
        });
      });

      this.isInitialized = true;
      logger.info('Google Drive service initialized via gapi');
    } catch (error) {
      logger.error('Failed to initialize Google Drive service:', error);
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
      await this.ensureSignedIn();

      // Get or create employee folder
      const folderId = await this.getOrCreateEmployeeFolder(employeeId, employeeName);

      // Upload file
      logger.info(`Uploading file: ${file.name}`);
      const boundary = '-------314159265358979323846';
      const delimiter = `\r\n--${boundary}\r\n`;
      const closeDelim = `\r\n--${boundary}--`;

      const metadata = {
        name: file.name,
        mimeType: file.type,
        parents: [folderId]
      };

      // Convert file to ArrayBuffer for proper binary handling
      const fileBuffer = await file.arrayBuffer();

      // Build multipart body as Uint8Array for proper binary concatenation
      const encoder = new TextEncoder();

      const metadataStr =
        delimiter +
        'Content-Type: application/json\r\n\r\n' +
        JSON.stringify(metadata) +
        delimiter +
        'Content-Type: ' +
        file.type +
        '\r\n\r\n';

      const metadataBytes = encoder.encode(metadataStr);
      const fileBytesArray = new Uint8Array(fileBuffer);
      const closeDelimBytes = encoder.encode(closeDelim);

      // Concatenate all parts as Uint8Array
      const totalLength = metadataBytes.length + fileBytesArray.length + closeDelimBytes.length;
      const body = new Uint8Array(totalLength);
      body.set(metadataBytes, 0);
      body.set(fileBytesArray, metadataBytes.length);
      body.set(closeDelimBytes, metadataBytes.length + fileBytesArray.length);

      const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${window.gapi.auth2.getAuthInstance().currentUser.get().getAuthResponse().access_token}`,
          'Content-Type': `multipart/related; boundary="${boundary}"`
        },
        body: body
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error('Upload response error:', errorText);
        throw new Error(`Upload failed: ${response.statusText}`);
      }

      const result = await response.json();
      logger.info(`File uploaded successfully: ${result.id}`);

      return {
        fileId: result.id,
        fileName: result.name,
        mimeType: result.mimeType,
        size: file.size,
        googleDriveFileId: result.id,
        uploadedAt: new Date().toISOString()
      };
    } catch (error) {
      logger.error('File upload error:', error);
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
