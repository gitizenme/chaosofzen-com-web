export type PriceResult =
  | { kind: 'free' }
  | { kind: 'paid'; cents: number }
  | { kind: 'invalid'; reason: string };

const MAX_CENTS = 100_000_00; // $100,000 -- a ceiling on typos, not on generosity.

export function parsePrice(input: string): PriceResult {
  const cleaned = input.trim().replace(/^\$/, '').replace(/,/g, '');
  if (cleaned === '') return { kind: 'free' };
  if (!/^\d*\.?\d*$/.test(cleaned) || cleaned === '.') {
    return { kind: 'invalid', reason: 'Enter an amount, or 0 to download free.' };
  }
  const dollars = Number(cleaned);
  if (!Number.isFinite(dollars) || dollars < 0) {
    return { kind: 'invalid', reason: 'Enter an amount, or 0 to download free.' };
  }
  const cents = Math.round(dollars * 100);
  if (cents === 0) return { kind: 'free' };
  if (cents >= MAX_CENTS) {
    return { kind: 'invalid', reason: 'That looks like a typo — please check the amount.' };
  }
  return { kind: 'paid', cents };
}
