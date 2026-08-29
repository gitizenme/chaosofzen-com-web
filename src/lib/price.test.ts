import { describe, it, expect } from 'vitest';
import { parsePrice } from './price';

describe('parsePrice', () => {
  it('treats 0 as free', () => {
    expect(parsePrice('0')).toEqual({ kind: 'free' });
    expect(parsePrice('0.00')).toEqual({ kind: 'free' });
    expect(parsePrice('$0')).toEqual({ kind: 'free' });
  });

  it('treats an empty field as free rather than an error', () => {
    // Someone who clears the box and clicks download has expressed a
    // preference. Making them type a zero would be a dark pattern.
    expect(parsePrice('')).toEqual({ kind: 'free' });
    expect(parsePrice('   ')).toEqual({ kind: 'free' });
  });

  it('converts a dollar amount to integer cents', () => {
    expect(parsePrice('12')).toEqual({ kind: 'paid', cents: 1200 });
    expect(parsePrice('12.50')).toEqual({ kind: 'paid', cents: 1250 });
    expect(parsePrice('$7.99')).toEqual({ kind: 'paid', cents: 799 });
    expect(parsePrice('1,200')).toEqual({ kind: 'paid', cents: 120000 });
  });

  it('rounds half-cent inputs rather than truncating them', () => {
    expect(parsePrice('0.005')).toEqual({ kind: 'paid', cents: 1 });
  });

  it('rejects negatives and non-numbers', () => {
    expect(parsePrice('-5').kind).toBe('invalid');
    expect(parsePrice('free').kind).toBe('invalid');
    expect(parsePrice('12.34.56').kind).toBe('invalid');
  });

  it('rejects an absurd amount that is more likely a typo', () => {
    // Someone typing 100000 meant 1000.00. Catching it costs nothing and
    // a mistaken four-figure donation is a refund request and a bad day.
    expect(parsePrice('100000').kind).toBe('invalid');
  });
});
