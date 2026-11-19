import { addDays, dateRange, diffDays } from './date';
import type { Order, Pause, Frequency } from './types';

export function shouldDeliverOn(
  order: Pick<Order, 'frequency' | 'start_date'>,
  iso: string
): boolean {
  if (iso < order.start_date) return false;
  const diff = diffDays(iso, order.start_date);
  switch (order.frequency) {
    case 'once':
      return diff === 0;
    case 'daily':
      return true;
    case 'alternate':
      return diff % 2 === 0;
    case 'weekly':
      return diff % 7 === 0;
    default:
      return false;
  }
}

export function frequencyLabel(frequency: Frequency, lang: 'hinglish' | 'hindi' | 'english'): string {
  const map = {
    daily: { hinglish: 'roz', hindi: 'रोज़', english: 'daily' },
    alternate: { hinglish: 'ek din chhod ke', hindi: 'एक दिन छोड़कर', english: 'alternate days' },
    weekly: { hinglish: 'hafte me ek baar', hindi: 'हफ़्ते में एक बार', english: 'weekly' },
    once: { hinglish: 'sirf ek baar', hindi: 'सिर्फ़ एक बार', english: 'one time' },
  } as const;
  return map[frequency][lang];
}

/** Dates an order delivers between two inclusive ISO dates. */
export function deliveryDates(
  order: Pick<Order, 'frequency' | 'start_date'>,
  from: string,
  to: string
): string[] {
  if (order.frequency === 'once') {
    return order.start_date >= from && order.start_date <= to ? [order.start_date] : [];
  }
  return dateRange(from, to).filter((d) => shouldDeliverOn(order, d));
}

export function isPausedOn(pauses: Pause[], iso: string): boolean {
  return pauses.some((p) => p.start_date <= iso && iso <= p.end_date);
}

/** First date >= from that is not inside a pause window. */
export function nextActiveDate(pauses: Pause[], from: string): string {
  let cur = from;
  for (let i = 0; i < 120; i += 1) {
    const active = pauses.find((p) => p.start_date <= cur && cur <= p.end_date);
    if (!active) return cur;
    cur = addDays(active.end_date, 1);
  }
  return cur;
}
