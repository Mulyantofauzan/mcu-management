/**
 * Vercel API - JWT Signing Service
 * Uses official Google Auth Library for reliable credential handling
 *
 * Credentials can be provided via:
 * 1. Environment variable GOOGLE_CREDENTIALS_JSON
 * 2. Request body (for Supabase Edge Function calls)
 */

const { GoogleAuth } = require('google-auth-library');
const crypto = require('crypto');

// Try to get credentials from env var at startup
let cachedCredentials = null;
const googleCredentialsJson = process.env.GOOGLE_CREDENTIALS_JSON;

if (googleCredentialsJson) {
  console.log('=== API STARTUP ===');
  console.log('GOOGLE_CREDENTIALS_JSON found in environment');

  try {
    let credStr = googleCredentialsJson;
    if (credStr.includes('\\n')) {
      credStr = credStr.replace(/\\n/g, '\n');
    }
    cachedCredentials = JSON.parse(credStr);
    console.log('✅ Google credentials loaded from env');
  } catch (e) {
    console.error('❌ Failed to parse env GOOGLE_CREDENTIALS_JSON:', e.message);
  }
}

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('=== SIGN JWT REQUEST ===');

    // Get credentials from cache or request body
    let credentials = cachedCredentials;

    // If no cached credentials, try to get from request body (Supabase Edge Function)
    if (!credentials && req.body) {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      if (body.credentials) {
        credentials = body.credentials;
        console.log('Using credentials from request body');
      }
    }

    console.log('Credentials available:', !!credentials);

    if (!credentials) {
      throw new Error('Google credentials not configured. Provide via GOOGLE_CREDENTIALS_JSON env var or in request body.');
    }

    // Verify credentials structure
    if (!credentials.private_key) {
      throw new Error('Credentials missing private_key field');
    }

    if (!credentials.client_email) {
      throw new Error('Credentials missing client_email field');
    }

    console.log('Client email:', credentials.client_email);
    console.log('Creating GoogleAuth instance...');

    // Create Google Auth instance
    const auth = new GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/drive'],
    });
    console.log('✅ GoogleAuth instance created');

    console.log('Getting access token from Google...');

    // Get access token - getAccessToken() returns the token directly (not wrapped in object)
    const token = await auth.getAccessToken();

    if (!token) {
      throw new Error('Failed to obtain access token from Google');
    }

    console.log('✅ Access token obtained successfully');
    console.log('Token length:', token.length);
    console.log('Token type:', typeof token);

    return res.status(200).json({
      access_token: token,
      token_type: 'Bearer',
      expires_in: 3600,
    });
  } catch (error) {
    console.error('❌ JWT signing error:', error.message);
    if (error.stack) {
      console.error('Stack:', error.stack);
    }
    return res.status(500).json({ error: error.message });
  }
}
