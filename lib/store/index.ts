import path from 'node:path';
import { promises as fs } from 'node:fs';
import { LocalStore } from './local';
import { SupabaseStore } from './supabase';
import type { DataStore } from './types';

export type { DataStore } from './types';

declare global {
  // eslint-disable-next-line no-var
  var __dairyStore: DataStore | undefined;
}

export function supabaseConfigured(): boolean {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

function localDbPath(): string {
  return process.env.LOCAL_DB_PATH || path.join(process.cwd(), '.data', 'db.json');
}

/**
 * One store per process. Supabase when credentials exist, otherwise a local
 * JSON file so the app runs with zero setup.
 */
export function getStore(): DataStore {
  if (globalThis.__dairyStore) return globalThis.__dairyStore;

  let store: DataStore;
  if (supabaseConfigured()) {
    store = new SupabaseStore(
      process.env.SUPABASE_URL as string,
      process.env.SUPABASE_SERVICE_ROLE_KEY as string
    );
  } else {
    store = new LocalStore(localDbPath());
  }
  globalThis.__dairyStore = store;
  return store;
}

/** Wipes the local demo database so the seed data is recreated. */
export async function resetLocalStore(): Promise<boolean> {
  if (getStore().mode !== 'local') return false;
  globalThis.__dairyStore = undefined;
  try {
    await fs.unlink(localDbPath());
    return true;
  } catch {
    return false;
  }
}
