/**
 * Vercel API - JWT Signing Service
 * Uses official Google Auth Library for reliable credential handling
 */

const { GoogleAuth } = require('google-auth-library');

const googleCredentialsJson = process.env.GOOGLE_CREDENTIALS_JSON;

console.log('=== API STARTUP ===');
console.log('GOOGLE_CREDENTIALS_JSON exists:', !!googleCredentialsJson);
if (googleCredentialsJson) {
  console.log('Length:', googleCredentialsJson.length);
  console.log('First 100 chars:', googleCredentialsJson.substring(0, 100));
  console.log('Contains \\n:', googleCredentialsJson.includes('\\n'));
}

let credentials;
try {
  let credStr = googleCredentialsJson;
  // Handle escaped newlines (from environment variable)
  if (credStr && credStr.includes('\\n')) {
    console.log('Found escaped newlines, unescaping...');
    credStr = credStr.replace(/\\n/g, '\n');
  }
  credentials = JSON.parse(credStr);
  console.log('✅ Google credentials loaded successfully');
  console.log('Client email:', credentials.client_email);
  console.log('Key type:', credentials.type);
  console.log('Has private_key:', !!credentials.private_key);
  if (credentials.private_key) {
    console.log('Private key starts with:', credentials.private_key.substring(0, 50));
    console.log('Private key ends with:', credentials.private_key.substring(credentials.private_key.length - 50));
  }
} catch (e) {
  console.error('❌ Failed to parse GOOGLE_CREDENTIALS_JSON:', e.message);
  console.error('Credentials preview:', googleCredentialsJson ? googleCredentialsJson.substring(0, 50) : 'NOT SET');
}

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('=== SIGN JWT REQUEST ===');
    console.log('Credentials loaded:', !!credentials);

    if (!credentials) {
      throw new Error('Google credentials not configured. Please set GOOGLE_CREDENTIALS_JSON environment variable.');
    }

    // Verify credentials structure
    if (!credentials.private_key) {
      throw new Error('Credentials missing private_key field');
    }

    if (!credentials.client_email) {
      throw new Error('Credentials missing client_email field');
    }

    // Create Google Auth instance
    console.log('Creating GoogleAuth instance with scopes...');
    const auth = new GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/drive'],
    });
    console.log('✅ GoogleAuth instance created');
    console.log('Auth credentials type:', auth.constructor.name);

    console.log('Getting access token from Google...');

    // Get access token
    const { token } = await auth.getAccessToken();

    if (!token) {
      throw new Error('Failed to obtain access token from Google');
    }

    console.log('✅ Access token obtained successfully');
    console.log('Token length:', token.length);
    console.log('Token type:', token.split('.').length === 3 ? 'JWT' : 'Unknown');

    return res.status(200).json({
      access_token: token,
      token_type: 'Bearer',
      expires_in: 3600,
    });
  } catch (error) {
    console.error('❌ JWT signing error:', error.message);
    console.error('Stack:', error.stack);
    return res.status(500).json({ error: error.message });
  }
}
