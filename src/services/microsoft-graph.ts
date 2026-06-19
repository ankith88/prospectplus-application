import { Client } from '@microsoft/microsoft-graph-client';
import fetch from 'node-fetch'; // or use native fetch in Next.js 15
import { firestore as db } from '@/lib/firebase'; // Adjust based on the actual firebase setup
import { UserProfile } from '../lib/types';
import { doc, getDoc, updateDoc } from 'firebase/firestore';

const CLIENT_ID = process.env.MICROSOFT_CLIENT_ID!;
const CLIENT_SECRET = process.env.MICROSOFT_CLIENT_SECRET!;
const REDIRECT_URI = process.env.NODE_ENV === 'development' 
  ? 'http://localhost:9002/api/integrations/microsoft/callback' 
  : `https://${process.env.NEXT_PUBLIC_APP_URL || 'mailplus-website-y2ofq.web.app'}/api/integrations/microsoft/callback`;
// Adjust production URL to the actual deployed domain

export const getAuthUrl = (amId: string) => {
  const scopes = ['offline_access', 'Calendars.ReadWrite', 'User.Read'];
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    response_type: 'code',
    redirect_uri: REDIRECT_URI,
    response_mode: 'query',
    scope: scopes.join(' '),
    state: amId, // Pass amId as state to identify the user on callback
  });

  return `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${params.toString()}`;
};

export const exchangeCodeForTokens = async (code: string) => {
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    scope: 'offline_access Calendars.ReadWrite User.Read',
    code,
    redirect_uri: REDIRECT_URI,
    grant_type: 'authorization_code',
    client_secret: CLIENT_SECRET,
  });

  const response = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });

  if (!response.ok) {
    const errorData = await response.text();
    console.error('Error exchanging code:', errorData);
    throw new Error('Failed to exchange authorization code for tokens');
  }

  return response.json() as Promise<{
    access_token: string;
    refresh_token: string;
    expires_in: number;
  }>;
};

export const refreshAccessToken = async (refreshToken: string) => {
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    scope: 'offline_access Calendars.ReadWrite User.Read',
    refresh_token: refreshToken,
    redirect_uri: REDIRECT_URI,
    grant_type: 'refresh_token',
    client_secret: CLIENT_SECRET,
  });

  const response = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });

  if (!response.ok) {
    throw new Error('Failed to refresh access token');
  }

  return response.json() as Promise<{
    access_token: string;
    refresh_token: string;
    expires_in: number;
  }>;
};

export const getValidAccessToken = async (amId: string): Promise<string> => {
  const userRef = doc(db, 'users', amId);
  const userSnap = await getDoc(userRef);
  
  if (!userSnap.exists()) {
    throw new Error('User not found');
  }
  
  const userData = userSnap.data() as UserProfile;
  if (!userData.microsoftRefreshToken) {
    throw new Error('User has not connected their Outlook calendar');
  }

  const now = Date.now();
  if (userData.microsoftAccessToken && userData.microsoftTokenExpiresAt && userData.microsoftTokenExpiresAt > now + 60000) {
    // Token is still valid (with 1 minute buffer)
    return userData.microsoftAccessToken;
  }

  // Token is expired, refresh it
  const tokens = await refreshAccessToken(userData.microsoftRefreshToken);
  
  await updateDoc(userRef, {
    microsoftAccessToken: tokens.access_token,
    microsoftRefreshToken: tokens.refresh_token, // Sometimes refresh tokens are rotated
    microsoftTokenExpiresAt: Date.now() + tokens.expires_in * 1000,
  });

  return tokens.access_token;
};

export const getGraphClient = async (amId: string) => {
  const accessToken = await getValidAccessToken(amId);
  return Client.init({
    authProvider: (done) => {
      done(null, accessToken);
    },
  });
};
