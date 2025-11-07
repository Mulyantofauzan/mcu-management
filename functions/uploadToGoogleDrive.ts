/**
 * Cloudflare Workers Function: Upload MCU File to Google Drive
 *
 * Triggered by HTTP POST request from frontend
 * Handles file upload to Google Drive and metadata storage in Supabase
 *
 * Automatically deployed with Cloudflare Pages when pushed to GitHub
 */

import { google } from 'googleapis';
import { v4 as uuidv4 } from 'uuid';
import { createClient } from '@supabase/supabase-js';
import busboy from 'busboy';

// Environment variables (set in wrangler.toml or Cloudflare dashboard)
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const GOOGLE_CREDENTIALS = JSON.parse(process.env.GOOGLE_CREDENTIALS || '{}');
const GOOGLE_DRIVE_ROOT_FOLDER_ID = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID;

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Initialize Google Auth
const auth = new google.auth.GoogleAuth({
  credentials: GOOGLE_CREDENTIALS,
  scopes: ['https://www.googleapis.com/auth/drive'],
});

const drive = google.drive({ version: 'v3', auth });

/**
 * Main handler function for Cloudflare Workers
 * @param {Request} request - Fetch API Request
 * @param {Object} env - Environment variables
 * @param {Object} ctx - Execution context
 */
export default async function handler(request: Request, env: any, ctx: any) {
  // Handle CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Credentials': 'true',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET,OPTIONS,PATCH,DELETE,POST,PUT',
        'Access-Control-Allow-Headers': 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization',
      },
    });
  }

  // Create response with CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,OPTIONS,PATCH,DELETE,POST,PUT',
    'Access-Control-Allow-Headers': 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization',
  };

  try {
    // Only accept POST requests
    if (request.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        {
          status: 405,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );
    }

    // Check authentication (from request headers)
    const authToken = request.headers.get('Authorization')?.split('Bearer ')[1];
    if (!authToken) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );
    }

    // Parse multipart form data
    const bb = busboy({ headers: request.headers as any });

    let file: any = null;
    let fields: any = {};

    // Parse form fields and file
    await new Promise<void>((resolve, reject) => {
      bb.on('file', (fieldname, stream, info) => {
        if (fieldname === 'file') {
          const chunks: Buffer[] = [];

          stream.on('data', (data) => {
            chunks.push(data);
          });

          stream.on('end', () => {
            const buffer = Buffer.concat(chunks);
            file = {
              buffer: buffer,
              filename: info.filename,
              mimetype: info.mimeType,
              size: buffer.length,
            };
          });

          stream.on('error', reject);
        }
      });

      bb.on('field', (fieldname, value) => {
        fields[fieldname] = value;
      });

      bb.on('finish', resolve);
      bb.on('error', reject);

      // Convert Request body to stream-compatible format
      request.body?.pipeTo(
        new WritableStream({
          write(chunk) {
            bb.write(chunk);
          },
          close() {
            bb.end();
          },
          abort(err) {
            reject(err);
          },
        })
      );
    });

    // Validate inputs
    if (!file) {
      return new Response(
        JSON.stringify({ error: 'No file uploaded' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );
    }

    const { employeeId, userId, userName } = fields;

    if (!employeeId) {
      return new Response(
        JSON.stringify({ error: 'employeeId is required' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );
    }

    // Validate file type
    const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];
    if (!ALLOWED_TYPES.includes(file.mimetype)) {
      return new Response(
        JSON.stringify({
          error: `File type not allowed. Allowed: PDF, JPEG, PNG. Provided: ${file.mimetype}`,
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );
    }

    // Validate file size (should already be compressed from frontend)
    const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
    if (file.size > MAX_FILE_SIZE) {
      return new Response(
        JSON.stringify({
          error: `File size exceeds 5MB limit. Current: ${(file.size / 1024 / 1024).toFixed(2)}MB`,
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );
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
      .insert([
        {
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
        },
      ]);

    if (error) {
      throw new Error(`Failed to save file metadata: ${error.message}`);
    }

    // Log activity
    await supabase.from('activityLog').insert([
      {
        action: 'create',
        entityType: 'MCU_FILE',
        entityId: fileId,
        userId: userId || 'unknown',
        details: `Uploaded file: ${file.filename}. Employee: ${employeeId}. Size: ${(file.size / 1024).toFixed(2)}KB. Google Drive: ${googleDriveFileId}`,
        createdAt: new Date().toISOString(),
      },
    ]);

    // Return success response
    return new Response(
      JSON.stringify({
        success: true,
        fileId: fileId,
        googleDriveFileId: googleDriveFileId,
        fileName: file.filename,
        fileSize: file.size,
        uploadedAt: new Date().toISOString(),
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error('Upload error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  }
}

/**
 * Create or get employee folder in Google Drive
 */
async function createOrGetEmployeeFolder(
  employeeId: string,
  employeeName: string = ''
) {
  try {
    const folderName = `${employeeId}${employeeName ? ' - ' + employeeName : ''}`;

    // Search for existing folder
    const response = await drive.files.list({
      q: `'${GOOGLE_DRIVE_ROOT_FOLDER_ID}' in parents and name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
      spaces: 'drive',
      fields: 'files(id, name)',
      pageSize: 1,
    });

    if (response.data.files && response.data.files.length > 0) {
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
  } catch (error: any) {
    throw new Error(`Failed to create/get employee folder: ${error.message}`);
  }
}

/**
 * Upload file to Google Drive
 */
async function uploadFileToGoogleDrive(
  fileBuffer: Buffer,
  fileName: string,
  mimeType: string,
  parentFolderId: string
) {
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
  } catch (error: any) {
    throw new Error(`Failed to upload file to Google Drive: ${error.message}`);
  }
}
