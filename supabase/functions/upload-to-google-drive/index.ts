/**
 * Supabase Edge Function - Upload MCU Files to Google Drive
 *
 * Triggered by HTTP POST request from frontend
 * Handles file upload to Google Drive and metadata storage
 *
 * Setup:
 * 1. Deploy: supabase functions deploy upload-to-google-drive
 * 2. Call from frontend: https://your-project.supabase.co/functions/v1/upload-to-google-drive
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0';

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const googleCredentials = Deno.env.get('GOOGLE_CREDENTIALS') ?? '';
const googleDriveFolderId = Deno.env.get('GOOGLE_DRIVE_ROOT_FOLDER_ID') ?? '';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Parse Google credentials
let serviceAccountKey: Record<string, unknown> = {};
try {
  serviceAccountKey = JSON.parse(googleCredentials);
} catch (e) {
  console.error('Failed to parse GOOGLE_CREDENTIALS:', e.message);
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Only accept POST
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Parse multipart form data
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const employeeId = formData.get('employeeId') as string;
    const mcuId = formData.get('mcuId') as string;
    const userId = (formData.get('userId') as string) || 'unknown';
    const userName = (formData.get('userName') as string) || 'Unknown';

    // Validate inputs
    if (!file || !employeeId || !mcuId) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: file, employeeId, mcuId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!googleDriveFolderId) {
      return new Response(
        JSON.stringify({ error: 'Google Drive root folder not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate file type
    const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];
    const mimeType = file.type || 'application/octet-stream';

    if (!ALLOWED_TYPES.includes(mimeType)) {
      return new Response(
        JSON.stringify({ error: `File type not allowed. Allowed: PDF, JPEG, PNG. Got: ${mimeType}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate file size (5MB limit)
    const MAX_FILE_SIZE = 5 * 1024 * 1024;
    if (file.size > MAX_FILE_SIZE) {
      return new Response(
        JSON.stringify({ error: `File size exceeds 5MB limit. Got: ${(file.size / 1024 / 1024).toFixed(2)}MB` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get Google Drive auth token
    const accessToken = await getGoogleAccessToken(serviceAccountKey);
    if (!accessToken) {
      throw new Error('Failed to get Google Drive access token');
    }

    // Create/get employee folder
    const employeeFolderId = await createOrGetEmployeeFolder(accessToken, employeeId, userName);

    // Upload file to Google Drive
    const googleDriveFileId = await uploadFileToGoogleDrive(
      accessToken,
      file,
      mimeType,
      employeeFolderId
    );

    // Save metadata to Supabase
    const fileId = crypto.randomUUID();
    const { error: dbError } = await supabase
      .from('mcufiles')
      .insert([{
        fileid: fileId,
        employeeid: employeeId,
        mcuid: mcuId,
        filename: file.name,
        filetype: file.name.split('.').pop()?.toLowerCase() || 'unknown',
        filesize: file.size,
        googledriveid: googleDriveFileId,
        google_drive_link: `https://drive.google.com/file/d/${googleDriveFileId}/view`,
        uploadedby: userId,
        uploadedat: new Date().toISOString(),
        createdat: new Date().toISOString(),
        updatedat: new Date().toISOString(),
      }]);

    if (dbError) {
      throw new Error(`Failed to save file metadata: ${dbError.message}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        fileId,
        googleDriveFileId,
        fileName: file.name,
        fileSize: file.size,
        googleDriveLink: `https://drive.google.com/file/d/${googleDriveFileId}/view`,
        downloadUrl: `https://drive.google.com/uc?export=download&id=${googleDriveFileId}`,
        uploadedAt: new Date().toISOString(),
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Upload error:', errorMessage);

    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

/**
 * Get Google Drive access token using service account
 */
async function getGoogleAccessToken(serviceAccountKey: Record<string, unknown>): Promise<string> {
  try {
    const now = Math.floor(Date.now() / 1000);
    const expiresAt = now + 3600;

    const header = {
      alg: 'RS256',
      typ: 'JWT',
    };

    const payload = {
      iss: serviceAccountKey.client_email,
      scope: 'https://www.googleapis.com/auth/drive',
      aud: 'https://oauth2.googleapis.com/token',
      exp: expiresAt,
      iat: now,
    };

    // Create JWT (simplified - in production use proper JWT library)
    const headerEncoded = btoa(JSON.stringify(header));
    const payloadEncoded = btoa(JSON.stringify(payload));
    const signature = await signJwt(`${headerEncoded}.${payloadEncoded}`, serviceAccountKey.private_key as string);

    const jwt = `${headerEncoded}.${payloadEncoded}.${signature}`;

    // Exchange JWT for access token
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
    });

    const tokenData = await tokenResponse.json() as Record<string, unknown>;
    return (tokenData.access_token as string) || '';
  } catch (error) {
    console.error('Failed to get Google access token:', error);
    throw error;
  }
}

/**
 * Create or get employee folder in Google Drive
 */
async function createOrGetEmployeeFolder(
  accessToken: string,
  employeeId: string,
  employeeName: string
): Promise<string> {
  try {
    const folderName = `${employeeId}${employeeName ? ' - ' + employeeName : ''}`;

    // Search for existing folder
    const searchResponse = await fetch(
      `https://www.googleapis.com/drive/v3/files?q='${Deno.env.get('GOOGLE_DRIVE_ROOT_FOLDER_ID')}' in parents and name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false&spaces=drive&fields=files(id,name)&pageSize=1`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    const searchData = await searchResponse.json() as Record<string, unknown>;
    const files = (searchData.files as Array<Record<string, unknown>>) || [];

    if (files.length > 0) {
      return (files[0].id as string) || '';
    }

    // Create new folder
    const createResponse = await fetch('https://www.googleapis.com/drive/v3/files?fields=id', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: folderName,
        mimeType: 'application/vnd.google-apps.folder',
        parents: [Deno.env.get('GOOGLE_DRIVE_ROOT_FOLDER_ID')],
      }),
    });

    const createData = await createResponse.json() as Record<string, unknown>;
    return (createData.id as string) || '';
  } catch (error) {
    console.error('Failed to create/get employee folder:', error);
    throw error;
  }
}

/**
 * Upload file to Google Drive
 */
async function uploadFileToGoogleDrive(
  accessToken: string,
  file: File,
  mimeType: string,
  parentFolderId: string
): Promise<string> {
  try {
    const fileBuffer = await file.arrayBuffer();

    const createResponse = await fetch(
      'https://www.googleapis.com/drive/v3/files?uploadType=multipart&fields=id',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        body: createMultipartBody(file.name, mimeType, fileBuffer),
      }
    );

    const uploadData = await createResponse.json() as Record<string, unknown>;
    return (uploadData.id as string) || '';
  } catch (error) {
    console.error('Failed to upload file to Google Drive:', error);
    throw error;
  }
}

/**
 * Create multipart body for Google Drive upload
 */
function createMultipartBody(fileName: string, mimeType: string, fileBuffer: ArrayBuffer): BodyInit {
  const boundary = '===============7330845974216740156==';
  const metadata = {
    name: fileName,
    mimeType: mimeType,
  };

  const parts = [
    `--${boundary}`,
    'Content-Type: application/json; charset=UTF-8',
    '',
    JSON.stringify(metadata),
    `--${boundary}`,
    `Content-Type: ${mimeType}`,
    '',
  ];

  const beforeFile = parts.join('\r\n') + '\r\n';
  const afterFile = `\r\n--${boundary}--`;

  const beforeBytes = new TextEncoder().encode(beforeFile);
  const afterBytes = new TextEncoder().encode(afterFile);

  const totalLength = beforeBytes.length + fileBuffer.byteLength + afterBytes.length;
  const body = new Uint8Array(totalLength);

  body.set(beforeBytes);
  body.set(new Uint8Array(fileBuffer), beforeBytes.length);
  body.set(afterBytes, beforeBytes.length + fileBuffer.byteLength);

  return body;
}

/**
 * Sign JWT using RSA with private key
 */
async function signJwt(message: string, privateKey: string): Promise<string> {
  try {
    // Convert private key from PEM format to crypto key
    const keyData = privateKey
      .replace('-----BEGIN PRIVATE KEY-----', '')
      .replace('-----END PRIVATE KEY-----', '')
      .replace(/\n/g, '');

    const binaryString = atob(keyData);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    // For Deno, use native crypto API
    const key = await crypto.subtle.importKey(
      'pkcs8',
      bytes.buffer,
      {
        name: 'RSASSA-PKCS1-v1_5',
        hash: 'SHA-256',
      },
      false,
      ['sign']
    );

    const encoder = new TextEncoder();
    const signatureBuffer = await crypto.subtle.sign(
      'RSASSA-PKCS1-v1_5',
      key,
      encoder.encode(message)
    );

    // Convert signature to base64
    const signatureArray = new Uint8Array(signatureBuffer);
    let binarySignature = '';
    for (let i = 0; i < signatureArray.length; i++) {
      binarySignature += String.fromCharCode(signatureArray[i]);
    }

    return btoa(binarySignature);
  } catch (error) {
    console.error('JWT signing error:', error);
    throw new Error('Failed to sign JWT');
  }
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};
