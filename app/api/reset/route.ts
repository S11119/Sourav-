import { NextResponse } from 'next/server';
import { resetLocalStore } from '@/lib/store';

export const dynamic = 'force-dynamic';

/** Re-seeds the local demo database. No-op on Supabase. */
export async function POST() {
  const reset = await resetLocalStore();
  return NextResponse.json({ reset, mode: reset ? 'local' : 'supabase' });
}
