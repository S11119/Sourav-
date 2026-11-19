import { addDays, nextWeekday, todayISO, weekday } from '../date';
import type { Frequency, Lang } from '../types';
import { detectLang, normalize } from './lang';
import { rx } from './match';

export interface ParsedMessage {
  norm: string;
  lang: Lang;
  qty?: number;
  unit?: string;
  productSku?: string;
  frequency?: Frequency;
  startDate?: string;
  mentionsDate: boolean;
  pauseFrom?: string;
  pauseTo?: string;
  name?: string;
  address?: string;
  isBareNumber: boolean;
}

const PRODUCT_PATTERNS: Array<{ sku: string; re: RegExp }> = [
  { sku: 'BUFFALO', re: rx('buffalo|bhains|bhais|भैंस') },
  { sku: 'PANEER', re: rx('paneer|paner|पनीर') },
  { sku: 'GHEE', re: rx('ghee|घी') },
  { sku: 'CURD', re: rx('curd|dahi|dadhi|yogurt|yoghurt|दही') },
  { sku: 'CHAAS', re: rx('chaas|chas|buttermilk|lassi|mattha|छाछ') },
  { sku: 'COW', re: rx('cow|milk|doodh|dudh|दूध|गाय') },
];

const NUMBER_WORDS: Record<string, number> = {
  aadha: 0.5, aadhi: 0.5, ardh: 0.5, आधा: 0.5, आधी: 0.5,
  dedh: 1.5, डेढ़: 1.5, dedhi: 1.5,
  dhai: 2.5, ढाई: 2.5,
  ek: 1, एक: 1,
  do: 2, दो: 2,
  teen: 3, तीन: 3,
  char: 4, chaar: 4, चार: 4,
  paanch: 5, panch: 5, पांच: 5, पाँच: 5,
  chhe: 6, chah: 6, che: 6, छह: 6,
  saat: 7, सात: 7,
  aath: 8, आठ: 8,
  nau: 9, नौ: 9,
  das: 10, दस: 10,
  gyarah: 11, ग्यारह: 11,
  barah: 12, बारह: 12,
};

const WEEKDAYS: Record<string, number> = {
  sunday: 0, sun: 0, ravivar: 0, raviwar: 0, रविवार: 0, इतवार: 0,
  monday: 1, mon: 1, somvar: 1, somwar: 1, सोमवार: 1,
  tuesday: 2, tue: 2, tues: 2, mangalvar: 2, mangalwar: 2, मंगलवार: 2,
  wednesday: 3, wed: 3, budhvar: 3, budhwar: 3, बुधवार: 3,
  thursday: 4, thu: 4, thur: 4, thurs: 4, guruvar: 4, guruwar: 4, गुरुवार: 4,
  friday: 5, fri: 5, shukravar: 5, shukrawar: 5, शुक्रवार: 5,
  saturday: 6, sat: 6, shanivar: 6, shaniwar: 6, शनिवार: 6,
};

const MONTHS: Record<string, number> = {
  jan: 1, january: 1, feb: 2, february: 2, mar: 3, march: 3, apr: 4, april: 4,
  may: 5, jun: 6, june: 6, jul: 7, july: 7, aug: 8, august: 8, sep: 9, sept: 9,
  september: 9, oct: 10, october: 10, nov: 11, november: 11, dec: 12, december: 12,
};

function canonicalUnit(raw: string): string {
  if (/^(l|lt|ltr|lts|ltrs|litre|litres|liter|liters|लीटर)$/.test(raw)) return 'litre';
  if (/^(kg|kgs|kilo|kilos|किलो)$/.test(raw)) return 'kg';
  if (/^(g|gm|gms|gram|grams|ग्राम)$/.test(raw)) return 'g';
  if (/^(packet|packets|pkt|पैकेट)$/.test(raw)) return 'packet';
  return raw;
}

function parseQty(work: string): { qty?: number; unit?: string } {
  const unitRe =
    /(\d+(?:\.\d+)?)\s*(litres|litre|liters|liter|ltrs|ltr|lts|lt|l|kgs|kg|kilos|kilo|grams|gram|gms|gm|g|packets|packet|pkts|pkt|लीटर|किलो|ग्राम|पैकेट)(?![\p{L}\p{N}])/u;
  const m = work.match(unitRe);
  if (m) return { qty: Number.parseFloat(m[1]), unit: canonicalUnit(m[2]) };

  const wordRe =
    /\b(aadha|aadhi|ardh|dedh|dhai|ek|do|teen|char|chaar|paanch|panch|chhe|chah|che|saat|aath|nau|das|gyarah|barah|आधा|आधी|डेढ़|ढाई|एक|दो|तीन|चार|पांच|पाँच|छह|सात|आठ|नौ|दस)\s*(litres?|liters?|liter|ltrs?|kgs?|kilos?|kilo|packets?|pkt|लीटर|किलो|पैकेट)(?![\p{L}\p{N}])/u;
  const wm = work.match(wordRe);
  if (wm) {
    const qty = NUMBER_WORDS[wm[1]];
    if (qty !== undefined) return { qty, unit: canonicalUnit(wm[2]) };
  }

  const bare = work.match(/(?:^|\s)(\d+(?:\.\d+)?)(?=\s|$)/);
  if (bare) {
    const qty = Number.parseFloat(bare[1]);
    // Guard against phone numbers / house numbers.
    if (qty > 0 && qty <= 50) return { qty };
  }
  return {};
}

interface DateHit {
  date?: string;
  matched: string[];
}

export function parseDate(norm: string, today: string): DateHit {
  const matched: string[] = [];
  const take = (date: string, token: string): DateHit => {
    matched.push(token);
    return { date, matched };
  };

  if (rx('aaj|today|आज').test(norm)) return take(today, 'aaj');
  if (rx('kal|tomorrow|कल').test(norm)) return take(addDays(today, 1), 'kal');
  if (rx('parso|parson|day after tomorrow|परसों').test(norm)) return take(addDays(today, 2), 'parso');

  // 15/12, 15-12-2025
  const numeric = norm.match(/\b(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2,4}))?\b/);
  if (numeric) {
    const day = Number(numeric[1]);
    const month = Number(numeric[2]);
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      const year = numeric[3]
        ? Number(numeric[3].length === 2 ? `20${numeric[3]}` : numeric[3])
        : Number(today.slice(0, 4));
      let iso = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      if (iso < today && !numeric[3]) {
        iso = `${year + 1}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      }
      return take(iso, numeric[0]);
    }
  }

  // 15 tareekh / 15th / 15 ko
  const dayNum = norm.match(/\b(\d{1,2})\s*(tareekh|tarikh|tarik|th|ko|तारीख)\b/);
  if (dayNum) {
    const day = Number(dayNum[1]);
    if (day >= 1 && day <= 31) {
      const y = Number(today.slice(0, 4));
      const m = Number(today.slice(5, 7));
      let iso = `${y}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      if (iso < today) {
        const nm = m === 12 ? 1 : m + 1;
        const ny = m === 12 ? y + 1 : y;
        iso = `${ny}-${String(nm).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      }
      return take(iso, dayNum[0]);
    }
  }

  // 15 nov / 15 november
  const dayMonth = norm.match(/\b(\d{1,2})\s+(jan|january|feb|february|mar|march|apr|april|may|jun|june|jul|july|aug|august|sep|sept|september|oct|october|nov|november|dec|december)\b/);
  if (dayMonth) {
    const day = Number(dayMonth[1]);
    const month = MONTHS[dayMonth[2]];
    if (day >= 1 && day <= 31) {
      const y = Number(today.slice(0, 4));
      let iso = `${y}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      if (iso < today) iso = `${y + 1}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      return take(iso, dayMonth[0]);
    }
  }

  // Weekdays: "Monday se", "sunday ko"
  const words = norm.split(' ');
  for (const w of words) {
    const cleaned = w.replace(/[^a-z\u0900-\u097F]/g, '');
    if (cleaned in WEEKDAYS) {
      const target = WEEKDAYS[cleaned];
      const base = weekday(today) === target ? today : nextWeekday(today, target);
      return take(base, cleaned);
    }
  }

  return { matched };
}

function parseFrequency(norm: string, mentionsDate: boolean): Frequency | undefined {
  if (rx('alternate|ek din chhod|ek din chod|ek din chhode|2 din me ek|second day|every other day|एक दिन छोड़').test(norm)) {
    return 'alternate';
  }
  if (rx('weekly|har hafte|hafte me ek|hafta me ek|once a week|week me ek|हर हफ्ते|साप्ताहिक').test(norm)) {
    return 'weekly';
  }
  const onceWords = rx('sirf|only|ek baar|one time|single|ek din ke liye|aaj ke liye|kal ke liye|सिर्फ').test(norm);
  const repeatWords = rx('daily|roz|roj|regular|har din|every day|hamesha|monthly|mahine|रोज|रोज़|प्रतिदिन').test(norm);
  if (onceWords) return 'once';
  if (mentionsDate && !rx('se|from|से').test(norm) && !repeatWords) return 'once';
  if (repeatWords) return 'daily';
  return undefined;
}

function pauseWindow(
  norm: string,
  startDate: string | undefined,
  today: string
): { from: string; to: string } {
  const explicitTak = rx('tak|till|until|तक').test(norm);

  if (explicitTak && startDate) {
    return { from: today, to: startDate < today ? today : startDate };
  }

  let days = 1;
  const din = norm.match(/(\d+)\s*(din|days?|day|दिन)(?![\p{L}\p{N}])/u);
  const week = norm.match(/(\d+)\s*(hafte|haftey|hafta|hafto|weeks?|week|हफ्ते|हफ़्ते)(?![\p{L}\p{N}])/u);
  const month = norm.match(/(\d+)\s*(mahine|mahina|months?|month)(?![\p{L}\p{N}])/u);
  if (din) days = Number(din[1]);
  else if (week) days = Number(week[1]) * 7;
  else if (month) days = Number(month[1]) * 30;
  else if (rx('ek hafta|ek hafte|a week|one week').test(norm)) days = 7;
  else if (rx('agle hafte tak|next week').test(norm)) days = 7;
  if (days < 1) days = 1;
  if (days > 120) days = 120;

  const from = startDate ?? today;
  return { from, to: addDays(from, days - 1) };
}

function parseName(raw: string): string | undefined {
  const m = raw.match(
    /\b(?:mera naam|mera nam|my name is|naam)\s+([A-Za-z\u0900-\u097F][A-Za-z\u0900-\u097F.]*(?:\s+[A-Za-z\u0900-\u097F][A-Za-z\u0900-\u097F.]*){0,2})/i
  );
  if (!m) return undefined;
  const name = m[1]
    .replace(/\b(hai|hoon|hun|is|here)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
  return name.length >= 2 ? name.slice(0, 40) : undefined;
}

function parseAddress(raw: string): string | undefined {
  const m =
    raw.match(/\b(?:address|addres|pata)\s*(?:is|hai|h)?\s*[:\-]?\s*(.{5,140})/i) ??
    raw.match(/(?:घर का पता|पता)\s*(?:है)?\s*[:\-]?\s*(.{5,140})/);
  if (m) {
    const addr = m[1].replace(/\s+/g, ' ').trim();
    if (addr.length >= 5) return addr.slice(0, 140);
  }
  return undefined;
}

export function parseMessage(
  text: string,
  opts: { today?: string; fallbackLang?: Lang } = {}
): ParsedMessage {
  const today = opts.today ?? todayISO();
  const norm = normalize(text);
  const lang = detectLang(text, opts.fallbackLang ?? 'hinglish');

  let productSku: string | undefined;
  for (const p of PRODUCT_PATTERNS) {
    if (p.re.test(norm)) {
      productSku = p.sku;
      break;
    }
  }

  const dateHit = parseDate(norm, today);
  const mentionsDate = Boolean(dateHit.date);

  // Remove date tokens before looking for quantity ("15/12" must not become 15).
  let work = norm;
  for (const token of dateHit.matched) {
    work = work.split(token).join(' ');
  }
  // Also drop pause-duration tokens so "3 din band" does not read as qty 3.
  work = work.replace(/\b\d+\s*(din|days?|hafte|haftey|hafta|weeks?|week|mahine|months?)\b/g, ' ');
  work = work.replace(/\s+/g, ' ').trim();

  const { qty, unit } = parseQty(work);

  const frequency = parseFrequency(norm, mentionsDate);
  const pause = pauseWindow(norm, dateHit.date, today);

  return {
    norm,
    lang,
    qty,
    unit,
    productSku,
    frequency,
    startDate: dateHit.date,
    mentionsDate,
    pauseFrom: pause.from,
    pauseTo: pause.to,
    name: parseName(text),
    address: parseAddress(text),
    isBareNumber: /^[\d\s.,]+$/.test(norm),
  };
}
