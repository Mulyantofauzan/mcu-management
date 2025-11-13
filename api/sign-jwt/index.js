/**
 * Vercel API - JWT Signing Service
 * Signs JWT tokens for Google OAuth using Node.js crypto (proven to work)
 */

const crypto = require('crypto');

const googleCredentialsJson = process.env.GOOGLE_CREDENTIALS_JSON;

// Parse credentials once at startup
let serviceAccountKey = {};
try {
  let credentialsStr = googleCredentialsJson;
  if (typeof credentialsStr === 'string' && credentialsStr.includes('\\n')) {
    credentialsStr = credentialsStr.replace(/\\n/g, '\n');
  }
  serviceAccountKey = JSON.parse(credentialsStr);
  console.log('Google credentials parsed at startup');
} catch (e) {
  console.error('Failed to parse GOOGLE_CREDENTIALS:', e.message);
}

async function signJWT(scope) {
  try {
    const clientEmail = serviceAccountKey.client_email;
    const privateKey = serviceAccountKey.private_key;

    if (!clientEmail || !privateKey) {
      throw new Error('Missing client_email or private_key in Google credentials');
    }

    // Create JWT
    const now = Math.floor(Date.now() / 1000);
    const header = { alg: 'RS256', typ: 'JWT' };
    const payload = {
      iss: clientEmail,
      scope: scope,
      aud: 'https://oauth2.googleapis.com/token',
      exp: now + 3600,
      iat: now,
    };

    // Base64url encode
    const encodeBase64Url = (str) => {
      return Buffer.from(str).toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');
    };

    const headerEncoded = encodeBase64Url(JSON.stringify(header));
    const payloadEncoded = encodeBase64Url(JSON.stringify(payload));
    const signatureInput = `${headerEncoded}.${payloadEncoded}`;

    // Sign using Node.js crypto
    const sign = crypto.createSign('RSA-SHA256');
    sign.update(signatureInput);
    const signatureBuffer = sign.sign(privateKey);

    const signatureBase64 = signatureBuffer.toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');

    const jwt = `${signatureInput}.${signatureBase64}`;

    // Exchange JWT for access token
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json();
      throw new Error(`Google OAuth error: ${JSON.stringify(errorData)}`);
    }

    const tokenData = await tokenResponse.json();
    return tokenData.access_token;
  } catch (error) {
    console.error('Failed to sign JWT:', error.message);
    throw error;
  }
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
    const { scope } = req.body;

    if (!scope) {
      return res.status(400).json({ error: 'Missing scope parameter' });
    }

    const accessToken = await signJWT(scope);

    return res.status(200).json({
      access_token: accessToken,
      token_type: 'Bearer',
      expires_in: 3600,
    });
  } catch (error) {
    console.error('JWT signing error:', error.message);
    return res.status(500).json({ error: error.message });
  }
}
