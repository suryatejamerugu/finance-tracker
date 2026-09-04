/**
 * Google sign-in for a backend-less app.
 *
 * A correction to the usual advice: the authorization-code + PKCE flow needs a
 * token endpoint call that returns a refresh token, and Google will not issue
 * one to a public client without a secret — so on a pure static site you'd have
 * nowhere to put it. The GIS *token client* is the supported path here. It
 * hands back a one-hour access token, and we silently ask for a fresh one when
 * it expires. The cost is that the user re-consents if they clear site data.
 *
 * Scope is `drive.appdata` only. It cannot see, list, or touch any other file
 * in the user's Drive — not even files this app didn't create. That is the
 * whole reason to use it.
 */

export const DRIVE_APPDATA_SCOPE = 'https://www.googleapis.com/auth/drive.appdata';
const PROFILE_SCOPE = 'openid email profile';
const TOKEN_KEY = 'll.token';

export interface StoredToken {
  accessToken: string;
  expiresAt: number;
  email?: string;
}

interface TokenResponse {
  access_token?: string;
  expires_in?: number;
  error?: string;
  error_description?: string;
}

interface TokenClient {
  requestAccessToken: (overrides?: { prompt?: string }) => void;
}

declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            prompt?: string;
            callback: (response: TokenResponse) => void;
            error_callback?: (error: { type?: string; message?: string }) => void;
          }) => TokenClient;
          revoke: (token: string, done: () => void) => void;
        };
      };
    };
  }
}

export const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;

export function isConfigured(): boolean {
  return Boolean(CLIENT_ID && !CLIENT_ID.startsWith('1234567890-'));
}

/** The GIS script is loaded async in index.html, so wait for it. */
function waitForGis(timeoutMs = 10_000): Promise<void> {
  if (window.google?.accounts?.oauth2) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const started = Date.now();
    const tick = window.setInterval(() => {
      if (window.google?.accounts?.oauth2) {
        window.clearInterval(tick);
        resolve();
      } else if (Date.now() - started > timeoutMs) {
        window.clearInterval(tick);
        reject(new Error("Couldn't reach Google sign-in. Check your connection and reload."));
      }
    }, 100);
  });
}

export function loadToken(): StoredToken | null {
  try {
    const raw = localStorage.getItem(TOKEN_KEY);
    if (!raw) return null;
    const token = JSON.parse(raw) as StoredToken;
    // Treat anything inside 60s of expiry as already dead.
    if (token.expiresAt - 60_000 < Date.now()) return null;
    return token;
  } catch {
    return null;
  }
}

function saveToken(token: StoredToken) {
  localStorage.setItem(TOKEN_KEY, JSON.stringify(token));
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

async function fetchEmail(accessToken: string): Promise<string | undefined> {
  try {
    const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) return undefined;
    const data = (await res.json()) as { email?: string };
    return data.email;
  } catch {
    return undefined;
  }
}

/**
 * @param interactive false attempts a silent refresh; true shows the consent popup.
 */
export async function requestToken(interactive: boolean): Promise<StoredToken> {
  if (!CLIENT_ID) {
    throw new Error('No Google client ID set. Add VITE_GOOGLE_CLIENT_ID to your .env file.');
  }
  await waitForGis();

  return new Promise<StoredToken>((resolve, reject) => {
    const client = window.google!.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: `${PROFILE_SCOPE} ${DRIVE_APPDATA_SCOPE}`,
      callback: (response) => {
        if (response.error || !response.access_token) {
          reject(new Error(response.error_description || response.error || 'Sign-in was cancelled.'));
          return;
        }
        const token: StoredToken = {
          accessToken: response.access_token,
          expiresAt: Date.now() + (response.expires_in ?? 3600) * 1000,
        };
        void fetchEmail(token.accessToken).then((email) => {
          token.email = email;
          saveToken(token);
          resolve(token);
        });
      },
      error_callback: (err) => {
        reject(new Error(err.message || 'Sign-in was cancelled.'));
      },
    });

    client.requestAccessToken({ prompt: interactive ? 'consent' : '' });
  });
}

/** A valid token, refreshing silently if the cached one has expired. */
export async function getAccessToken(): Promise<string> {
  const cached = loadToken();
  if (cached) return cached.accessToken;
  const fresh = await requestToken(false);
  return fresh.accessToken;
}

export async function signOut(): Promise<void> {
  const token = loadToken();
  clearToken();
  if (token && window.google?.accounts?.oauth2) {
    await new Promise<void>((resolve) => {
      window.google!.accounts.oauth2.revoke(token.accessToken, resolve);
    });
  }
}
