// Refuses to build a site whose checkout points at a product that does not
// exist. Run by `npm run build` before astro, so the failure arrives before
// anything is generated rather than after it is deployed.
//
// This mirrors the licence gate in the plugin's release script: the artefact
// cannot be produced while a value that would harm someone is unresolved.

import { pathToFileURL } from 'node:url';

// This script imports src/lib/products.ts directly -- there is no build step
// between this file and that one -- and relies on node's built-in TypeScript
// type-stripping to load it. That became unflagged (no
// --experimental-strip-types needed) only from node 22.18.0; package.json's
// "engines.node" requires that version for exactly this reason.
//
// Below that version, a *static* `import ... from '../src/lib/products.ts'`
// throws ERR_UNKNOWN_FILE_EXTENSION during module linking -- before any code
// in this file runs, a version check included, because ES module linking
// resolves the whole static-import graph before evaluation starts. So the
// check below has to run before a *dynamic* import() instead: dynamic
// import() is an ordinary expression evaluated in program order, which lets
// us fail with a sentence instead of a stack trace.
const MIN_NODE_FOR_TS_IMPORT = [22, 18, 0];

function nodeSupportsTsImport(versionString) {
  const have = versionString.split('.').map(Number);
  for (let i = 0; i < MIN_NODE_FOR_TS_IMPORT.length; i++) {
    const part = have[i] ?? 0;
    const need = MIN_NODE_FOR_TS_IMPORT[i];
    if (part > need) return true;
    if (part < need) return false;
  }
  return true;
}

if (!nodeSupportsTsImport(process.versions.node)) {
  console.error(
    `error: this build guard needs node >=${MIN_NODE_FOR_TS_IMPORT.join('.')}, found ${process.versions.node}.\n\n` +
    `  scripts/check-products.mjs imports src/lib/products.ts directly and\n` +
    `  relies on node's built-in TypeScript type-stripping, which is unflagged\n` +
    `  only from node 22.18.0 onward (see package.json's "engines.node").\n` +
    `  Upgrade node and try again.`
  );
  process.exit(1);
}

const { PRODUCTS, PLACEHOLDER_VARIANT_ID } = await import('../src/lib/products.ts');

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
