/**
 * Supabase Edge Function - Upload MCU Files to Google Drive
 * Using jose library for proper JWT signing
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0';
import * as jose from 'https://deno.land/x/jose@v5.4.1/index.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const googleCredentials = Deno.env.get('GOOGLE_CREDENTIALS') ?? '';
const googleDriveFolderId = Deno.env.get('GOOGLE_DRIVE_ROOT_FOLDER_ID') ?? '';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Parse Google credentials with proper handling of escaped newlines
let serviceAccountKey: Record<string, unknown> = {};
try {
  // Handle both raw JSON and escaped JSON strings
  let credentialsStr = googleCredentials;

  // If it's a string with escaped newlines, unescape them
  if (typeof credentialsStr === 'string' && credentialsStr.includes('\\n')) {
    credentialsStr = credentialsStr.replace(/\\n/g, '\n');
  }

  serviceAccountKey = JSON.parse(credentialsStr);

  // Validate required fields
  if (!serviceAccountKey.private_key) {
    throw new Error('Missing private_key in credentials');
  }

  // Ensure private_key has proper format
  let pk = serviceAccountKey.private_key as string;
  if (!pk.startsWith('-----BEGIN')) {
    // If it's escaped, unescape it
    pk = pk.replace(/\\n/g, '\n');
    serviceAccountKey.private_key = pk;
  }
} catch (e) {
  console.error('Failed to parse GOOGLE_CREDENTIALS:', e instanceof Error ? e.message : String(e));
  console.error('Raw credentials preview:', googleCredentials.substring(0, 100));
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

    // Get access token using service account
    const accessToken = await getAccessTokenFromServiceAccount(serviceAccountKey);
    if (!accessToken) {
      throw new Error('Failed to obtain Google access token');
    }

    // Create/get employee folder
    const employeeFolderId = await getOrCreateEmployeeFolder(accessToken, employeeId, userName);
    if (!employeeFolderId) {
      throw new Error('Failed to create/get employee folder');
    }

    // Upload file to Google Drive
    const fileBuffer = await file.arrayBuffer();
    const googleDriveFileId = await uploadFileToGoogleDrive(
      accessToken,
      file.name,
      mimeType,
      fileBuffer,
      employeeFolderId
    );

    if (!googleDriveFileId) {
      throw new Error('Failed to upload file to Google Drive');
    }

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
 * Get Google access token using service account key with proper JWT signing
 */
async function getAccessTokenFromServiceAccount(serviceAccountKey: Record<string, unknown>): Promise<string> {
  try {
    const clientEmail = serviceAccountKey.client_email as string;
    let privateKeyPem = serviceAccountKey.private_key as string;

    if (!clientEmail || !privateKeyPem) {
      throw new Error('Missing client_email or private_key in Google credentials');
    }

    // Debug: Log private key details
    console.log('Private Key Debug:');
    console.log('- First 50 chars:', privateKeyPem.substring(0, 50));
    console.log('- Last 50 chars:', privateKeyPem.substring(privateKeyPem.length - 50));
    console.log('- Length:', privateKeyPem.length);
    console.log('- Contains escaped newlines:', privateKeyPem.includes('\\n'));
    console.log('- Starts with BEGIN:', privateKeyPem.startsWith('-----BEGIN'));

    // Extra safety: ensure private key is properly formatted
    if (privateKeyPem.includes('\\n')) {
      privateKeyPem = privateKeyPem.replace(/\\n/g, '\n');
      console.log('- Unescaped newlines in private key');
    }

    // Create and sign JWT using jose
    const now = Math.floor(Date.now() / 1000);
    const payload = {
      iss: clientEmail,
      scope: 'https://www.googleapis.com/auth/drive',
      aud: 'https://oauth2.googleapis.com/token',
      exp: now + 3600,
      iat: now,
    };

    console.log('JWT Payload:', JSON.stringify(payload));

    // Import private key
    console.log('Attempting to import PKCS8 key...');
    const key = await jose.importPKCS8(privateKeyPem, 'RS256');
    console.log('Key imported successfully');

    // Sign JWT
    const jwt = await new jose.SignJWT(payload)
      .setProtectedHeader({ alg: 'RS256', typ: 'JWT' })
      .sign(key);

    console.log('JWT signed successfully, first 100 chars:', jwt.substring(0, 100));

    // Exchange JWT for access token
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json() as Record<string, unknown>;
      throw new Error(`Google OAuth error: ${JSON.stringify(errorData)}`);
    }

    const tokenData = await tokenResponse.json() as Record<string, unknown>;
    console.log('Got access token from Google');
    return (tokenData.access_token as string) || '';
  } catch (error) {
    console.error('Failed to get access token:', error instanceof Error ? error.message : String(error));
    throw error;
  }
}

/**
 * Get or create employee folder in Google Drive
 */
async function getOrCreateEmployeeFolder(
  accessToken: string,
  employeeId: string,
  employeeName: string
): Promise<string> {
  try {
    const folderName = `${employeeId}${employeeName ? ' - ' + employeeName : ''}`;

    // Search for existing folder
    const searchQuery = encodeURIComponent(
      `'${googleDriveFolderId}' in parents and name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`
    );
    const searchResponse = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=${searchQuery}&spaces=drive&fields=files(id,name)&pageSize=1`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    if (searchResponse.ok) {
      const searchData = await searchResponse.json() as Record<string, unknown>;
      const files = (searchData.files as Array<Record<string, unknown>>) || [];
      if (files.length > 0) {
        return (files[0].id as string) || '';
      }
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
        parents: [googleDriveFolderId],
      }),
    });

    if (!createResponse.ok) {
      throw new Error('Failed to create employee folder');
    }

    const createData = await createResponse.json() as Record<string, unknown>;
    return (createData.id as string) || '';
  } catch (error) {
    console.error('Failed to get/create folder:', error instanceof Error ? error.message : String(error));
    throw error;
  }
}

/**
 * Upload file to Google Drive
 */
async function uploadFileToGoogleDrive(
  accessToken: string,
  fileName: string,
  mimeType: string,
  fileBuffer: ArrayBuffer,
  parentFolderId: string
): Promise<string> {
  try {
    const boundary = '===============7330845974216740156==';
    const metadata = {
      name: fileName,
      mimeType: mimeType,
      parents: [parentFolderId],
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

    const uploadResponse = await fetch(
      'https://www.googleapis.com/drive/v3/files?uploadType=multipart&fields=id',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': `multipart/related; boundary="${boundary}"`,
        },
        body: body,
      }
    );

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      throw new Error(`Upload failed: ${uploadResponse.status} - ${errorText}`);
    }

    const uploadData = await uploadResponse.json() as Record<string, unknown>;
    return (uploadData.id as string) || '';
  } catch (error) {
    console.error('Failed to upload file:', error instanceof Error ? error.message : String(error));
    throw error;
  }
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};
