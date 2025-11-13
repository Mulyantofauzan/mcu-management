/**
 * Supabase Edge Function - Upload MCU Files to Google Drive
 *
 * CRITICAL FIX: Due to Deno crypto.subtle producing incompatible signatures,
 * this function now uses a direct fetch to a helper endpoint that does JWT
 * signing in Node.js (which we've verified works)
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const googleDriveFolderId = Deno.env.get('GOOGLE_DRIVE_ROOT_FOLDER_ID') ?? '';
const jwtSigningEndpoint = Deno.env.get('JWT_SIGNING_ENDPOINT') || 'https://madis.sabdamu.my.id/api/sign-jwt';
const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

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

    console.log('Starting file upload...');
    console.log('Employee ID:', employeeId, 'MCU ID:', mcuId, 'File:', file.name);

    // Get access token using JWT signing endpoint
    console.log('Requesting access token from JWT signing endpoint...');
    const tokenResponse = await fetch(jwtSigningEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        scope: 'https://www.googleapis.com/auth/drive',
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json() as Record<string, unknown>;
      throw new Error(`Failed to get access token: ${JSON.stringify(errorData)}`);
    }

    const tokenData = await tokenResponse.json() as Record<string, unknown>;
    const accessToken = (tokenData.access_token as string) || '';

    if (!accessToken) {
      throw new Error('No access token received from JWT signing endpoint');
    }

    console.log('Got access token successfully');

    // Create/get employee folder
    const employeeFolderId = await getOrCreateEmployeeFolder(accessToken, employeeId, userName);
    if (!employeeFolderId) {
      throw new Error('Failed to create/get employee folder');
    }

    console.log('Employee folder ID:', employeeFolderId);

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

    console.log('File uploaded to Google Drive:', googleDriveFileId);

    // Save metadata to Supabase
    const fileId = crypto.randomUUID();
    const supabaseResponse = await fetch(`${supabaseUrl}/rest/v1/mcufiles`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'apikey': supabaseServiceKey,
      },
      body: JSON.stringify({
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
      }),
    });

    if (!supabaseResponse.ok) {
      const errorText = await supabaseResponse.text();
      console.error('Supabase error:', errorText);
      throw new Error(`Failed to save file metadata: ${errorText}`);
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
    const boundary = '===============7330845974216740156';
    const metadata = {
      name: fileName,
      mimeType: mimeType,
      parents: [parentFolderId],
    };

    // Build multipart body properly
    const metadataJson = JSON.stringify(metadata);

    // Build parts
    const parts: Uint8Array[] = [];

    // Part 1: Boundary and metadata header
    parts.push(new TextEncoder().encode(`--${boundary}\r\n`));
    parts.push(new TextEncoder().encode('Content-Type: application/json; charset=UTF-8\r\n\r\n'));

    // Part 2: Metadata JSON
    parts.push(new TextEncoder().encode(metadataJson + '\r\n'));

    // Part 3: File boundary
    parts.push(new TextEncoder().encode(`--${boundary}\r\n`));
    parts.push(new TextEncoder().encode(`Content-Type: ${mimeType}\r\n\r\n`));

    // Part 4: File data
    parts.push(new Uint8Array(fileBuffer));

    // Part 5: Closing boundary
    parts.push(new TextEncoder().encode(`\r\n--${boundary}--`));

    // Combine all parts
    const totalLength = parts.reduce((sum, part) => sum + part.length, 0);
    const body = new Uint8Array(totalLength);
    let offset = 0;
    for (const part of parts) {
      body.set(part, offset);
      offset += part.length;
    }

    console.log('Uploading file to Google Drive...');
    console.log('File size:', fileBuffer.byteLength);
    console.log('Total body size:', body.length);

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
    console.log('✅ File uploaded to Google Drive:', uploadData.id);
    return (uploadData.id as string) || '';
  } catch (error) {
    console.error('❌ Failed to upload file:', error instanceof Error ? error.message : String(error));
    throw error;
  }
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};
