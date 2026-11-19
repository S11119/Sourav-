/**
 * Date helpers. All business dates are plain `YYYY-MM-DD` strings in the
 * dairy's local timezone (default Asia/Kolkata, override with BUSINESS_TZ).
 */

export const BUSINESS_TZ = process.env.BUSINESS_TZ || 'Asia/Kolkata';

/** Today's date in the business timezone. */
export function todayISO(tz: string = BUSINESS_TZ): string {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return fmt.format(new Date());
}

/** Current hour (0-23) in the business timezone. */
export function hourNow(tz: string = BUSINESS_TZ): number {
  const h = new Intl.DateTimeFormat('en-GB', {
    timeZone: tz,
    hour: '2-digit',
    hour12: false,
  }).format(new Date());
  return Number.parseInt(h, 10);
}

export function toDate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, (m || 1) - 1, d || 1));
}

export function fromDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function addDays(iso: string, days: number): string {
  const d = toDate(iso);
  d.setUTCDate(d.getUTCDate() + days);
  return fromDate(d);
}

/** Inclusive list of dates between two ISO dates. */
export function dateRange(from: string, to: string): string[] {
  const out: string[] = [];
  let cur = from;
  let guard = 0;
  while (cur <= to && guard < 400) {
    out.push(cur);
    cur = addDays(cur, 1);
    guard += 1;
  }
  return out;
}

export function diffDays(a: string, b: string): number {
  return Math.round((toDate(a).getTime() - toDate(b).getTime()) / 86_400_000);
}

/** 0 = Sunday … 6 = Saturday */
export function weekday(iso: string): number {
  return toDate(iso).getUTCDay();
}

/**
 * Next occurrence of a weekday (0-6). If today is that weekday, returns today.
 */
export function nextWeekday(today: string, target: number): string {
  const delta = (target - weekday(today) + 7) % 7;
  return addDays(today, delta);
}

export function isValidISO(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(toDate(s).getTime());
}

/** Human date, e.g. "Tue, 18 Nov" or "मंगल, 18 नवं". */
export function formatDate(iso: string, lang: 'hinglish' | 'hindi' | 'english' = 'hinglish'): string {
  const locale = lang === 'hindi' ? 'hi-IN' : 'en-IN';
  try {
    return new Intl.DateTimeFormat(locale, {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      timeZone: 'UTC',
    }).format(toDate(iso));
  } catch {
    return iso;
  }
}

export function formatMoney(amount: number): string {
  const rounded = Math.round(amount * 100) / 100;
  const str = Number.isInteger(rounded)
    ? String(rounded)
    : rounded.toFixed(2).replace(/0$/, '');
  return `₹${str}`;
}

/** Cut-off after which a "today" order starts tomorrow. */
export const ORDER_CUTOFF_HOUR = 21;
