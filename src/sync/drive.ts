import { isSnapshot } from '../lib/db';
import type { Snapshot } from '../types';
import { getAccessToken } from './google';

const FILE_NAME = 'ledgerlight.json';
const FILES = 'https://www.googleapis.com/drive/v3/files';
const UPLOAD = 'https://www.googleapis.com/upload/drive/v3/files';

const CACHED_ID_KEY = 'll.fileId';

async function authHeaders(): Promise<HeadersInit> {
  const token = await getAccessToken();
  return { Authorization: `Bearer ${token}` };
}

async function ok(res: Response, what: string): Promise<Response> {
  if (res.ok) return res;
  const body = await res.text().catch(() => '');
  if (res.status === 401 || res.status === 403) {
    throw new Error(`Google turned down the request while ${what}. Sign in again to reconnect.`);
  }
  throw new Error(`Drive failed while ${what} (${res.status}). ${body.slice(0, 160)}`);
}

/** Find the snapshot file inside the hidden app folder, if it exists yet. */
export async function findFileId(): Promise<string | null> {
  const cached = localStorage.getItem(CACHED_ID_KEY);
  if (cached) return cached;

  const params = new URLSearchParams({
    spaces: 'appDataFolder',
    q: `name = '${FILE_NAME}' and trashed = false`,
    fields: 'files(id, modifiedTime)',
    pageSize: '1',
  });
  const res = await ok(await fetch(`${FILES}?${params}`, { headers: await authHeaders() }), 'looking for your data');
  const data = (await res.json()) as { files?: Array<{ id: string }> };
  const id = data.files?.[0]?.id ?? null;
  if (id) localStorage.setItem(CACHED_ID_KEY, id);
  return id;
}

export async function pull(): Promise<Snapshot | null> {
  const id = await findFileId();
  if (!id) return null;

  const res = await fetch(`${FILES}/${id}?alt=media`, { headers: await authHeaders() });
  if (res.status === 404) {
    localStorage.removeItem(CACHED_ID_KEY);
    return null;
  }
  await ok(res, 'downloading your data');

  const parsed: unknown = await res.json();
  if (!isSnapshot(parsed)) {
    throw new Error('The backup in Drive is not readable. Nothing on this device was changed.');
  }
  return parsed;
}

export async function push(snapshot: Snapshot): Promise<void> {
  const id = await findFileId();
  const body = JSON.stringify(snapshot);

  if (id) {
    await ok(
      await fetch(`${UPLOAD}/${id}?uploadType=media`, {
        method: 'PATCH',
        headers: { ...(await authHeaders()), 'Content-Type': 'application/json' },
        body,
      }),
      'saving your data',
    );
    return;
  }

  // First save: multipart create, so metadata and content go up together.
  const boundary = `ll${Math.random().toString(36).slice(2)}`;
  const metadata = { name: FILE_NAME, parents: ['appDataFolder'], mimeType: 'application/json' };
  const multipart =
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n` +
    `--${boundary}\r\nContent-Type: application/json\r\n\r\n${body}\r\n` +
    `--${boundary}--`;

  const res = await ok(
    await fetch(`${UPLOAD}?uploadType=multipart&fields=id`, {
      method: 'POST',
      headers: { ...(await authHeaders()), 'Content-Type': `multipart/related; boundary=${boundary}` },
      body: multipart,
    }),
    'creating your backup',
  );
  const created = (await res.json()) as { id: string };
  localStorage.setItem(CACHED_ID_KEY, created.id);
}

export function forgetFileId() {
  localStorage.removeItem(CACHED_ID_KEY);
}
