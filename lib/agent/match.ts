/**
 * Unicode-aware "word contains" regex.
 *
 * JavaScript's `\b` only understands ASCII word characters, so `\bबंद\b` never
 * matches Devanagari. This helper uses lookarounds over Unicode letters/numbers
 * so one pattern works for both Hinglish and Hindi.
 */
export function rx(body: string, flags = ''): RegExp {
  return new RegExp(
    `(?<![\\p{L}\\p{N}])(?:${body})(?![\\p{L}\\p{N}])`,
    flags.includes('u') ? flags : `${flags}u`
  );
}

/** Anchored-at-start variant, used for greetings. */
export function rxStart(body: string): RegExp {
  return new RegExp(`^(?:${body})(?![\\p{L}\\p{N}])`, 'u');
}
