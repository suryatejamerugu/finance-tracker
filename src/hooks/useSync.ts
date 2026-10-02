import { useCallback, useEffect, useRef, useState } from 'react';
import { buildSnapshot, mergeSnapshot } from '../lib/db';
import * as drive from '../sync/drive';
import {
  getAccountHint,
  isConfigured,
  loadToken,
  requestToken,
  signOut as revoke,
  type StoredToken,
} from '../sync/google';

export type SyncState = 'offline' | 'idle' | 'syncing' | 'error';

const LAST_SYNC_KEY = 'll.lastSync';
const PUSH_DEBOUNCE_MS = 2500;
/** Backoff between automatic retries after a failed sync — gives transient network blips a few chances before it's treated as a real problem the user needs to act on. */
const RETRY_DELAYS_MS = [5_000, 15_000, 45_000];

/**
 * A device that has signed in before (it has an account hint, saved once on
 * first connect and only cleared by disconnecting) should look "connected"
 * from the moment the page loads, even on a fresh load where the cached
 * access token has since expired — that expiry is just the normal hourly
 * rhythm of OAuth, refreshed silently by getAccessToken() the moment a real
 * request needs it, not a sign the user disconnected. Falling back to the
 * hint keeps the UI (and connectedRef below) reading "connected" through
 * that refresh instead of flashing "Back up to Drive" and demanding an
 * interactive re-consent for something that doesn't need one.
 */
function initialToken(): StoredToken | null {
  const cached = loadToken();
  if (cached) return cached;
  const hint = getAccountHint();
  return hint ? { accessToken: '', expiresAt: 0, email: hint } : null;
}

export function useSync() {
  const [token, setToken] = useState<StoredToken | null>(() => initialToken());
  const [state, setState] = useState<SyncState>('offline');
  const [error, setError] = useState<string | null>(null);
  const [lastSync, setLastSync] = useState<number | null>(() => {
    const raw = localStorage.getItem(LAST_SYNC_KEY);
    return raw ? Number(raw) : null;
  });

  const timer = useRef<number | null>(null);
  const inFlight = useRef(false);
  const retryAttempt = useRef(0);
  const retryTimer = useRef<number | null>(null);

  const markSynced = useCallback(() => {
    const now = Date.now();
    localStorage.setItem(LAST_SYNC_KEY, String(now));
    setLastSync(now);
  }, []);

  // Mirrors `Boolean(token)` in a ref so syncNow/scheduleSync (both stable
  // callbacks) can read "are we connected" synchronously without becoming
  // stale closures or needing `token` in their own dependency arrays.
  const connectedRef = useRef(Boolean(token));
  useEffect(() => {
    connectedRef.current = Boolean(token);
  }, [token]);

  const syncNow = useCallback(async () => {
    if (!connectedRef.current || inFlight.current) return;
    if (retryTimer.current) {
      window.clearTimeout(retryTimer.current);
      retryTimer.current = null;
    }
    inFlight.current = true;
    setState('syncing');
    setError(null);
    try {
      // Pull before push, so a change made on another device survives.
      const remote = await drive.pull();
      if (remote) await mergeSnapshot(remote);
      await drive.push(await buildSnapshot());
      markSynced();
      setState('idle');
      retryAttempt.current = 0;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Sync failed.');
      setState('error');
      // A few automatic retries with backoff before leaving it to the user —
      // most failures here are a dropped connection, not a real problem. A
      // genuine auth failure (consent revoked, etc.) surfaces as this same
      // "error" state with a specific message rather than silently reverting
      // to "offline" — the user stays informed and in control of
      // reconnecting, instead of it happening invisibly on a timer.
      if (retryAttempt.current < RETRY_DELAYS_MS.length) {
        const delay = RETRY_DELAYS_MS[retryAttempt.current];
        retryAttempt.current += 1;
        retryTimer.current = window.setTimeout(() => void syncNow(), delay);
      }
    } finally {
      inFlight.current = false;
    }
  }, [markSynced]);

  /** Call after any write. Coalesces a burst of edits into one upload. */
  const scheduleSync = useCallback(() => {
    if (!connectedRef.current) return;
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => void syncNow(), PUSH_DEBOUNCE_MS);
  }, [syncNow]);

  const connect = useCallback(async () => {
    setError(null);
    try {
      const next = await requestToken(true);
      setToken(next);
      await syncNow();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Sign-in failed.');
      setState('error');
    }
  }, [syncNow]);

  const disconnect = useCallback(async () => {
    if (retryTimer.current) {
      window.clearTimeout(retryTimer.current);
      retryTimer.current = null;
    }
    retryAttempt.current = 0;
    await revoke();
    drive.forgetFileId();
    localStorage.removeItem(LAST_SYNC_KEY);
    setToken(null);
    setLastSync(null);
    setState('offline');
  }, []);

  // Sync on load, when the tab regains focus, and when the network returns.
  useEffect(() => {
    if (!token) {
      setState('offline');
      return;
    }
    void syncNow();
    const onFocus = () => {
      if (document.visibilityState === 'visible') void syncNow();
    };
    document.addEventListener('visibilitychange', onFocus);
    window.addEventListener('online', onFocus);
    return () => {
      document.removeEventListener('visibilitychange', onFocus);
      window.removeEventListener('online', onFocus);
    };
  }, [token, syncNow]);

  // A push scheduled by scheduleSync is just a pending setTimeout — closing
  // or backgrounding the tab within that 2.5s window would otherwise drop it
  // silently, leaving the most recent edit unsynced until the next visit.
  // Flush it immediately instead, as soon as the tab is about to go away.
  useEffect(() => {
    const flushIfPending = () => {
      if (document.visibilityState !== 'hidden' || !timer.current) return;
      window.clearTimeout(timer.current);
      timer.current = null;
      void syncNow();
    };
    document.addEventListener('visibilitychange', flushIfPending);
    window.addEventListener('pagehide', flushIfPending);
    return () => {
      document.removeEventListener('visibilitychange', flushIfPending);
      window.removeEventListener('pagehide', flushIfPending);
    };
  }, [syncNow]);

  return {
    configured: isConfigured(),
    connected: Boolean(token),
    email: token?.email,
    state,
    error,
    lastSync,
    connect,
    disconnect,
    syncNow,
    scheduleSync,
  };
}
