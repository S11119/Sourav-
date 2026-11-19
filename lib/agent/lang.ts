import type { Lang } from '../types';

const DEVANAGARI = /[\u0900-\u097F]/;
const DEV_DIGITS = '०१२३४५६७८९';

/** Lowercase, Devanagari digits → ASCII, punctuation → spaces. */
export function normalize(text: string): string {
  return text
    .replace(/[०-९]/g, (d) => String(DEV_DIGITS.indexOf(d)))
    .toLowerCase()
    .replace(/[’'`]/g, '')
    .replace(/[^\p{L}\p{M}\p{N}\s:/.-]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Roman-Hindi markers. Presence of one of these means the customer is writing
 * Hinglish, which is how most Mumbai milk customers actually type.
 */
const HINGLISH_MARKERS = new Set(
  `doodh dudh dahi chaas lassi paneer ghee bhains
   chahiye chaiye cahhiye chahie
   kal aaj parso abhi subah shaam
   band bandh roko chutti chhutti holiday
   karo kardo karde karna karni karo dedo de do dena dijiye bhej bhejo bhejna
   hai hain haan nahi na ji bhai bhaiya didi
   kitna kitne kitni rate batao bata do
   paisa paise payment due hisaab baaki bakaya
   roz roj regular hamesha
   ghar gharpe address pata
   se tak ko mein me mera meri mujhe
   aur bhi thoda zyada kam
   milega milegi hoga hogi karwa karwana
   badal badlo change
   namaste namaskar shukriya dhanyavad
   theek thik sahi
   wala wali wale
   bhejdo bhejdiya`.split(/\s+/).filter(Boolean)
);

const ENGLISH_HINTS = new Set(
  `the please want need send deliver delivery tomorrow today milk curd paneer ghee
   litres litre liter liters kg packet packets order start stop pause resume
   cancel price rate bill payment due address my is am are can you could
   morning evening thanks thank hello hi hey daily weekly monthly`
    .split(/\s+/)
    .filter(Boolean)
);

/** Words that only make sense in English (as opposed to Hinglish/units). */
const STRONG_ENGLISH = new Set(
  `the please want need send deliver delivery tomorrow today my is am are can you
   could thanks thank would like and for from of this that will should how what
   when where morning evening price rate bill payment due address daily weekly monthly`
    .split(/\s+/)
    .filter(Boolean)
);

/** Language-neutral tokens: numbers, units, product names, greetings, commands. */
const NEUTRAL = new Set(
  `litre litres liter liters ltr lts kg kgs kilo kilos packet packets pkt gm gms gram grams
   milk curd paneer ghee butter buttermilk chaas lassi doodh dudh
   hi hello hey namaste namaskar salaam hola yo
   start stop pause resume cancel order
   dedh dhai aadha aadhi ardh`.split(/\s+/).filter(Boolean)
);

export function detectLang(text: string, fallback: Lang = 'hinglish'): Lang {
  if (DEVANAGARI.test(text)) return 'hindi';
  const norm = normalize(text);
  if (!norm) return fallback;
  const tokens = norm.split(' ');

  // Bare numbers("2"), pure units ("1.5 litre") and greetings keep the saved language.
  const neutralOnly = tokens.every((w) => NEUTRAL.has(w) || /^\d+(?:\.\d+)?$/.test(w));
  if (neutralOnly) return fallback;

  const hinglishHits = tokens.filter((w) => HINGLISH_MARKERS.has(w)).length;
  const englishHits = tokens.filter((w) => ENGLISH_HINTS.has(w)).length;
  const strongEnglish = tokens.some((w) => STRONG_ENGLISH.has(w));

  if (hinglishHits > 0 && !strongEnglish) return 'hinglish';
  if (hinglishHits > 0 && hinglishHits >= englishHits) return 'hinglish';
  if (strongEnglish) return 'english';
  if (englishHits >= 2) return 'english';
  return fallback;
}

export function pick<T>(lang: Lang, options: { hinglish: T; hindi: T; english: T }): T {
  return options[lang];
}
