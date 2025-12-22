
import { AppState, UserProfile } from "../types";

declare global {
  interface Window {
    gapi: any;
    google: any;
  }
}

let CLIENT_ID = '';
let API_KEY = '';
let CLIENT_SECRET = '';

// Safe environment variable loader
try {
  // Use process.env which is polyfilled in index.html
  if (typeof process !== 'undefined' && process.env) {
      CLIENT_ID = process.env.VITE_GOOGLE_CLIENT_ID || '';
      API_KEY = process.env.VITE_GOOGLE_API_KEY || '';
      CLIENT_SECRET = process.env.VITE_GOOGLE_CLIENT_SECRET || '';
  }
} catch (e) {}

const DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest';
const SCOPES = 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile';
const BACKUP_FILENAME = 'live_act_pro_backup.json';

// Storage Keys
const STORAGE_REFRESH_TOKEN = 'gdrive_refresh_token';
const STORAGE_ACCESS_TOKEN = 'gdrive_access_token';
const STORAGE_TOKEN_EXPIRY = 'gdrive_token_expiry';

let tokenClient: any;
let gapiInited = false;

const waitForGlobal = (key: 'gapi' | 'google', timeout = 5000) => {
  return new Promise<void>((resolve, reject) => {
    const start = Date.now();
    const check = () => {
      if (window[key]) resolve();
      else if (Date.now() - start > timeout) reject(new Error(`${key} timeout`));
      else setTimeout(check, 100);
    };
    check();
  });
};

// --- TOKEN MANAGEMENT (AUTH CODE FLOW) ---

const saveTokens = (data: any) => {
  if (data.access_token) {
    localStorage.setItem(STORAGE_ACCESS_TOKEN, data.access_token);
    // Calculate expiry (subtract 1 minute for safety buffer)
    const expiry = Date.now() + (data.expires_in * 1000) - 60000;
    localStorage.setItem(STORAGE_TOKEN_EXPIRY, expiry.toString());
    
    // Update GAPI client immediately
    if (window.gapi && window.gapi.client) {
      window.gapi.client.setToken({ access_token: data.access_token });
    }
  }
  
  // Refresh token is only returned on the first consent or if prompt='consent'
  if (data.refresh_token) {
    localStorage.setItem(STORAGE_REFRESH_TOKEN, data.refresh_token);
  }
};

const exchangeCodeForToken = async (code: string) => {
  const params = new URLSearchParams();
  params.append('client_id', CLIENT_ID);
  params.append('client_secret', CLIENT_SECRET);
  params.append('code', code);
  params.append('grant_type', 'authorization_code');
  params.append('redirect_uri', 'postmessage');

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error_description || 'Token exchange failed');
  }

  const data = await response.json();
  saveTokens(data);
};

const refreshAccessToken = async () => {
  const refreshToken = localStorage.getItem(STORAGE_REFRESH_TOKEN);
  if (!refreshToken) throw new Error("No refresh token available");

  const params = new URLSearchParams();
  params.append('client_id', CLIENT_ID);
  params.append('client_secret', CLIENT_SECRET);
  params.append('refresh_token', refreshToken);
  params.append('grant_type', 'refresh_token');

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params
  });

  if (!response.ok) {
    // If refresh fails (e.g., token revoked), clear storage
    localStorage.removeItem(STORAGE_REFRESH_TOKEN);
    localStorage.removeItem(STORAGE_ACCESS_TOKEN);
    throw new Error("Failed to refresh token");
  }

  const data = await response.json();
  saveTokens(data);
};

// Ensure we have a valid access token before making requests
const ensureValidToken = async () => {
  const expiry = parseInt(localStorage.getItem(STORAGE_TOKEN_EXPIRY) || '0');
  const now = Date.now();

  // If token is valid, ensure GAPI has it
  if (now < expiry) {
    const token = localStorage.getItem(STORAGE_ACCESS_TOKEN);
    if (token && window.gapi?.client) {
      const currentGapiToken = window.gapi.client.getToken();
      if (!currentGapiToken) {
        window.gapi.client.setToken({ access_token: token });
      }
    }
    return;
  }

  // If token expired, try to refresh
  if (localStorage.getItem(STORAGE_REFRESH_TOKEN)) {
    console.log("Access token expired, refreshing...");
    await refreshAccessToken();
    return;
  }

  throw new Error("Session expired. Please login again.");
};

// --- INITIALIZATION ---

export const restoreSession = (): boolean => {
  // With Refresh Token flow, having a refresh token means we are "logged in"
  // We don't check access token validity here, ensureValidToken() handles that later.
  return !!localStorage.getItem(STORAGE_REFRESH_TOKEN);
};

export const initGapi = async (): Promise<void> => {
  if (!CLIENT_ID || !API_KEY) return;
  await waitForGlobal('gapi');
  return new Promise((resolve) => {
    window.gapi.load('client', async () => {
      try {
        await window.gapi.client.init({ apiKey: API_KEY, discoveryDocs: [DISCOVERY_DOC] });
        gapiInited = true;
        
        // Attempt to load token from storage if available
        const token = localStorage.getItem(STORAGE_ACCESS_TOKEN);
        if (token) window.gapi.client.setToken({ access_token: token });
        
        resolve();
      } catch (e) { resolve(); }
    });
  });
};

export const initGis = async (onTokenReceived: () => void): Promise<void> => {
  if (!CLIENT_ID) return;
  await waitForGlobal('google');
  
  // Use initCodeClient for Authorization Code Flow
  tokenClient = window.google.accounts.oauth2.initCodeClient({
    client_id: CLIENT_ID,
    scope: SCOPES,
    ux_mode: 'popup',
    access_type: 'offline', // Critical for Refresh Token
    prompt: 'consent',      // Force consent to ensure we get refresh_token
    callback: async (response: any) => {
      if (response.code) {
        try {
          await exchangeCodeForToken(response.code);
          onTokenReceived();
        } catch (e) {
          console.error("Auth Error:", e);
        }
      }
    },
  });
};

export const requestAuth = (silent: boolean = false): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (!tokenClient) return reject("GIS not initialized");
    
    // Override callback for this specific request
    const originalCallback = tokenClient.callback;
    tokenClient.callback = async (resp: any) => {
      if (resp.error) {
        tokenClient.callback = originalCallback; // Restore
        return reject(resp);
      }
      if (resp.code) {
        try {
          await exchangeCodeForToken(resp.code);
          tokenClient.callback = originalCallback; // Restore
          resolve();
        } catch (e) {
          reject(e);
        }
      }
    };
    
    tokenClient.requestCode();
  });
};

export const signOut = () => {
  localStorage.removeItem(STORAGE_ACCESS_TOKEN);
  localStorage.removeItem(STORAGE_REFRESH_TOKEN);
  localStorage.removeItem(STORAGE_TOKEN_EXPIRY);
  if (window.gapi && window.gapi.client) {
    window.gapi.client.setToken(null);
  }
};

// --- API METHODS ---

export const getUserProfile = async (): Promise<UserProfile | null> => {
  try {
    await ensureValidToken(); // Guard
    const accessToken = window.gapi.client.getToken().access_token;
    const response = await fetch('https://www.googleapis.com/oauth2/v1/userinfo?alt=json', {
      headers: { 'Authorization': 'Bearer ' + accessToken }
    });
    if (response.ok) {
      return await response.json();
    }
  } catch (e) { console.error("Profile fetch error", e); }
  return null;
};

// Returns object with id and size, or null
const findBackupFile = async (): Promise<{ id: string, size?: string } | null> => {
  try {
    await ensureValidToken(); // Guard
    const response = await window.gapi.client.drive.files.list({
      q: `name = '${BACKUP_FILENAME}' and trashed = false`,
      fields: 'files(id, name, size)',
    });
    return response.result.files?.[0] || null;
  } catch (e) { return null; }
};

// Check if critical data is empty
const isStateEmpty = (state: AppState): boolean => {
  return state.notes.length === 0 &&
         state.tasks.length === 0 &&
         state.flashcards.length === 0 &&
         state.journal.length === 0;
};

export const saveToDrive = async (state: AppState): Promise<void> => {
  if (!gapiInited) throw new Error("Drive unavailable");
  await ensureValidToken(); // Guard
  
  const existingFile = await findBackupFile();

  // SAFETY LOCK: If remote file has data (> 500 bytes) and we are trying to save an empty state, BLOCK IT.
  if (existingFile && existingFile.size && parseInt(existingFile.size) > 500 && isStateEmpty(state)) {
    throw new Error("SAFETY_LOCK: Попытка перезаписи данных пустым состоянием");
  }

  const fileContent = JSON.stringify(state);
  const metadata = {
    name: BACKUP_FILENAME,
    mimeType: 'application/json'
  };
  
  // Ensure we get the latest token (it might have been refreshed in ensureValidToken)
  const accessToken = window.gapi.client.getToken().access_token;
  
  // Manual Multipart/Related Construction to avoid FormData (multipart/form-data) issues with Drive API
  const boundary = '-------314159265358979323846';
  const delimiter = "\r\n--" + boundary + "\r\n";
  const close_delim = "\r\n--" + boundary + "--";

  const multipartRequestBody =
      "--" + boundary + "\r\n" +
      'Content-Type: application/json\r\n\r\n' +
      JSON.stringify(metadata) +
      delimiter +
      'Content-Type: application/json\r\n\r\n' +
      fileContent +
      close_delim;
  
  const url = existingFile 
    ? `https://www.googleapis.com/upload/drive/v3/files/${existingFile.id}?uploadType=multipart`
    : 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';
  
  const response = await fetch(url, {
    method: existingFile ? 'PATCH' : 'POST',
    headers: new Headers({ 
        'Authorization': 'Bearer ' + accessToken,
        'Content-Type': 'multipart/related; boundary="' + boundary + '"'
    }),
    body: multipartRequestBody,
  });

  if (!response.ok) {
      const errorText = await response.text();
      console.error("Drive Upload Error:", errorText);
      throw new Error(`Upload failed: ${response.status}`);
  }
};

export const loadFromDrive = async (): Promise<AppState | null> => {
  if (!gapiInited) return null;
  await ensureValidToken(); // Guard
  
  const file = await findBackupFile();
  if (!file) return null;
  
  const response = await window.gapi.client.drive.files.get({ fileId: file.id, alt: 'media' });
  return response.result as AppState;
};
