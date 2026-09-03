import { describe, it, expect } from 'vitest';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { checkProducts } from './check-products.mjs';
import { PRODUCTS, PLACEHOLDER_VARIANT_ID } from '../src/lib/products';

const REPO_ROOT = fileURLToPath(new URL('..', import.meta.url));

const real = {
  downloadUrl: 'https://dl.chaosofzen.dev/x/X-latest.dmg',
  manifestUrl: 'https://dl.chaosofzen.dev/x/latest.json',
  variantId: 'b6654c01-a0a8-473b-a260-bbb84d08b9ba',
  suggestedPriceCents: 1200,
};

describe('checkProducts', () => {
  it('accepts a product with a real variant id', () => {
    expect(checkProducts({ x: real })).toEqual([]);
  });

  it('refuses a placeholder variant id', () => {
    const out = checkProducts({ x: { ...real, variantId: PLACEHOLDER_VARIANT_ID } });
    expect(out).toHaveLength(1);
    expect(out[0]).toContain('x');
  });

  // The message is what an operator acts on. A guard that says only "invalid"
  // costs a search at exactly the wrong moment.
  it('names the issue that creates the product', () => {
    const out = checkProducts({ x: { ...real, variantId: PLACEHOLDER_VARIANT_ID } });
    expect(out[0]).toContain('#28');
  });

  it('reports every offending product, not just the first', () => {
    const bad = { ...real, variantId: PLACEHOLDER_VARIANT_ID };
    expect(checkProducts({ a: bad, b: bad })).toHaveLength(2);
  });

  // An empty record must not read as "everything is fine" -- that is the
  // failure mode where a refactor drops the record and the build goes green.
  it('refuses an empty record', () => {
    expect(checkProducts({})).toHaveLength(1);
  });

  // Everything above runs against fixtures, so all of it stays green while the
  // guard is quietly exempted from the record it exists to guard -- e.g. an
  // `if (key === 'ekphrasis') continue;` at the top of the loop. This binds it
  // to the REAL record.
  //
  // It is expected to FAIL the day gitizenme/ekphrasis#28 lands and the
  // placeholder is replaced by a real checkout UUID. That is the point: the
  // person filling in that UUID must consciously come here, exactly as they
  // must for products.test.ts's placeholder assertion.
  it('refuses the real PRODUCTS record, which still carries the placeholder', () => {
    expect(checkProducts(PRODUCTS)).not.toEqual([]);
  });
});

// checkProducts() being correct is not the same as `npm run build` refusing.
// The script's entry-point block is what connects the two, and deleting it
// leaves every assertion above green while the build ships a checkout wired to
// a product that does not exist. Nothing but running the script covers that, so
// this test runs the script -- the same command `npm run build` runs.
describe('the script npm run build actually runs', () => {
  it('exits non-zero and names the issue that would fix it', () => {
    let status: number | null = null;
    let stderr = '';
    try {
      execFileSync('node', ['scripts/check-products.mjs'], {
        cwd: REPO_ROOT,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
      });
      status = 0;
    } catch (err) {
      const e = err as { status?: number | null; stderr?: string };
      status = e.status ?? null;
      stderr = e.stderr ?? '';
    }

    expect(status).not.toBe(0);
    expect(stderr).toContain('#28');
  });
});
