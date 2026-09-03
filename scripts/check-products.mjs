// Refuses to build a site whose checkout points at a product that does not
// exist. Run by `npm run build` before astro, so the failure arrives before
// anything is generated rather than after it is deployed.
//
// This mirrors the licence gate in the plugin's release script: the artefact
// cannot be produced while a value that would harm someone is unresolved.

import { pathToFileURL } from 'node:url';
import { PRODUCTS, PLACEHOLDER_VARIANT_ID } from '../src/lib/products.ts';

export function checkProducts(products) {
  const problems = [];

  if (Object.keys(products).length === 0) {
    problems.push(
      'the product record is empty -- nothing would be checked, which is not the same as everything being fine'
    );
    return problems;
  }

  for (const [key, p] of Object.entries(products)) {
    if (p.variantId === PLACEHOLDER_VARIANT_ID) {
      problems.push(
        `${key}: variantId is still the placeholder.\n` +
        `  A checkout wired to a product that does not exist takes payment and\n` +
        `  delivers nothing. Create the Lemon Squeezy product\n` +
        `  (gitizenme/ekphrasis#28), then put its checkout UUID here.`
      );
    }
  }

  return problems;
}

// Only when run as a script. Without this guard the check would execute on
// IMPORT -- and scripts/check-products.test.ts imports checkProducts, so the
// module body would run against the real PRODUCTS, find the placeholder, and
// process.exit(1) before a single assertion ran. The suite would die looking
// like a crash rather than a finding.
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const problems = checkProducts(PRODUCTS);
  if (problems.length > 0) {
    console.error('error: the site is not shippable.\n');
    for (const p of problems) console.error(`  ${p}\n`);
    process.exit(1);
  }
}
