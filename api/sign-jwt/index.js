/**
 * Vercel API - JWT Signing Service
 * Uses official Google Auth Library for reliable credential handling
 */

const { GoogleAuth } = require('google-auth-library');

const googleCredentialsJson = process.env.GOOGLE_CREDENTIALS_JSON;

let credentials;
try {
  let credStr = googleCredentialsJson;
  // Handle escaped newlines
  if (credStr && credStr.includes('\\n')) {
    credStr = credStr.replace(/\\n/g, '\n');
  }
  credentials = JSON.parse(credStr);
  console.log('Google credentials loaded successfully');
} catch (e) {
  console.error('Failed to parse GOOGLE_CREDENTIALS_JSON:', e.message);
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
    if (!credentials) {
      throw new Error('Google credentials not configured. Please set GOOGLE_CREDENTIALS_JSON environment variable.');
    }

    // Create Google Auth instance
    const auth = new GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/drive'],
    });

    console.log('Getting access token from Google...');

    // Get access token
    const { token } = await auth.getAccessToken();

    if (!token) {
      throw new Error('Failed to obtain access token from Google');
    }

    console.log('Access token obtained successfully');

    return res.status(200).json({
      access_token: token,
      token_type: 'Bearer',
      expires_in: 3600,
    });
  } catch (error) {
    console.error('JWT signing error:', error.message);
    console.error('Stack:', error.stack);
    return res.status(500).json({ error: error.message });
  }
}
