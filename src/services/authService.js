/**
 * Client Device ID management
 * Generates an RFC4122 v4 UUID and stores it in localStorage under "clientDeviceId"
 */
export function getOrCreateDeviceId() {
  const STORAGE_KEY = 'clientDeviceId';
  let deviceId = localStorage.getItem(STORAGE_KEY);
  if (!deviceId) {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      deviceId = crypto.randomUUID();
    } else {
      // Fallback RFC4122 v4 UUID generator
      deviceId = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      });
    }
    localStorage.setItem(STORAGE_KEY, deviceId);
  }
  return deviceId;
}

/**
 * Storage helpers for auth session
 */
const AUTH_STORAGE_KEY = 'webrtc_auth_session';

export function saveAuthSession(authData) {
  try {
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authData));
    if (authData.accessToken) {
      localStorage.setItem('accessToken', authData.accessToken);
    }
    if (authData.userId) {
      localStorage.setItem('userId', authData.userId);
    }
  } catch (err) {
    console.warn('Failed to save auth session to localStorage', err);
  }
}

export function getSavedAuthSession() {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (raw) return JSON.parse(raw);

    // Fallback if individual keys exist
    const token = localStorage.getItem('accessToken');
    const userId = localStorage.getItem('userId');
    if (token) {
      return { accessToken: token, userId: userId || '' };
    }
    return null;
  } catch (err) {
    return null;
  }
}

export function clearAuthSession() {
  try {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    localStorage.removeItem('accessToken');
    localStorage.removeItem('userId');
  } catch (err) {
    console.warn('Failed to clear auth session', err);
  }
}

/**
 * Executes login against the backend /api/auth/login endpoint
 */
export async function loginUser(apiBaseUrl, credentials) {
  // Normalize base URL
  let baseUrl = (apiBaseUrl || 'http://localhost:5201').trim();
  if (baseUrl.endsWith('/')) {
    baseUrl = baseUrl.slice(0, -1);
  }

  const endpoint = `${baseUrl}/api/auth/login`;
  const clientDeviceId = credentials.clientDeviceId || getOrCreateDeviceId();

  const payload = {
    account: credentials.account?.trim(),
    password: credentials.password,
    clientDeviceId: clientDeviceId,
    deviceName: credentials.deviceName || navigator.userAgent,
    platform: credentials.platform || 'Web',
    deviceModel: credentials.deviceModel || 'Browser',
    appVersion: credentials.appVersion || '1.0.0',
  };

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const res = await response.json();

    // Check if the API returned success
    if (response.ok && res.success && res.data) {
      saveAuthSession(res.data);
      return {
        success: true,
        message: res.message || 'Login success',
        data: res.data,
      };
    } else {
      return {
        success: false,
        message: res.message || (res.errors ? JSON.stringify(res.errors) : 'Login failed with status ' + response.status),
        data: null,
        errors: res.errors,
      };
    }
  } catch (err) {
    console.error('Login request network error:', err);
    throw new Error(
      `Unable to reach backend at ${endpoint}. Please ensure the ASP.NET Core backend is running and CORS allows origin '${window.location.origin}'. Error: ${err.message}`
    );
  }
}
