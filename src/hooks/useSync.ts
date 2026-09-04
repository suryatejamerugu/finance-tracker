import { useCallback, useEffect, useRef, useState } from 'react';
import { buildSnapshot, mergeSnapshot } from '../lib/db';
import * as drive from '../sync/drive';
import {
  clearToken,
  isConfigured,
  loadToken,
  requestToken,
  signOut as revoke,
  type StoredToken,
} from '../sync/google';

export type SyncState = 'offline' | 'idle' | 'syncing' | 'error';

const LAST_SYNC_KEY = 'll.lastSync';
const PUSH_DEBOUNCE_MS = 2500;

export function useSync() {
  const [token, setToken] = useState<StoredToken | null>(() => loadToken());
  const [state, setState] = useState<SyncState>('offline');
  const [error, setError] = useState<string | null>(null);
  const [lastSync, setLastSync] = useState<number | null>(() => {
    const raw = localStorage.getItem(LAST_SYNC_KEY);
    return raw ? Number(raw) : null;
  });

  const timer = useRef<number | null>(null);
  const inFlight = useRef(false);

  const markSynced = useCallback(() => {
    const now = Date.now();
    localStorage.setItem(LAST_SYNC_KEY, String(now));
    setLastSync(now);
  }, []);

  const syncNow = useCallback(async () => {
    if (!loadToken() || inFlight.current) return;
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
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Sync failed.');
      setState('error');
    } finally {
      inFlight.current = false;
    }
  }, [markSynced]);

  /** Call after any write. Coalesces a burst of edits into one upload. */
  const scheduleSync = useCallback(() => {
    if (!loadToken()) return;
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

  // A dead token should not leave the UI claiming it is connected.
  useEffect(() => {
    const id = window.setInterval(() => {
      if (token && !loadToken()) {
        clearToken();
        setToken(null);
        setState('offline');
      }
    }, 60_000);
    return () => window.clearInterval(id);
  }, [token]);

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
