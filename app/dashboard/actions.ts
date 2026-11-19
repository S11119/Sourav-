'use server';

import { revalidatePath } from 'next/cache';
import { getStore, resetLocalStore } from '@/lib/store';
import { todayISO } from '@/lib/date';

function idFrom(formData: FormData): string | null {
  const id = formData.get('id');
  return typeof id === 'string' && id.length > 0 ? id : null;
}

export async function markDelivered(formData: FormData): Promise<void> {
  const id = idFrom(formData);
  if (!id) return;
  await getStore().updateDelivery(id, { status: 'delivered' });
  revalidatePath('/dashboard');
}

export async function undoDelivered(formData: FormData): Promise<void> {
  const id = idFrom(formData);
  if (!id) return;
  await getStore().updateDelivery(id, { status: 'scheduled' });
  revalidatePath('/dashboard');
}

export async function togglePaid(formData: FormData): Promise<void> {
  const id = idFrom(formData);
  if (!id) return;
  const store = getStore();
  const rows = await store.listDeliveries();
  const current = rows.find((d) => d.id === id);
  if (!current) return;
  await store.updateDelivery(id, { paid: !current.paid });
  revalidatePath('/dashboard');
}

export async function pauseToday(formData: FormData): Promise<void> {
  const customerId = formData.get('customerId');
  if (typeof customerId !== 'string') return;
  const today = todayISO();
  await getStore().updateDeliveriesWhere(
    { customerId, date: today, status: 'scheduled' },
    { status: 'paused' }
  );
  revalidatePath('/dashboard');
}

export async function resolveComplaint(formData: FormData): Promise<void> {
  const id = idFrom(formData);
  if (!id) return;
  await getStore().updateComplaint(id, { status: 'resolved' });
  revalidatePath('/dashboard');
}

export async function resetDemo(): Promise<void> {
  await resetLocalStore();
  revalidatePath('/dashboard');
}
