import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function extractEnvTsKeys() {
  const src = readFileSync(resolve(root, "lib/env.ts"), "utf8");
  const keys = new Set();
  for (const blockName of ["server", "client"]) {
    const block = src.match(new RegExp(blockName + ":\\s*\\{([\\s\\S]*?)\\},"));
    if (!block) continue;
    const re = /^\s+([A-Za-z_][\w]*):/gm;
    let m;
    while ((m = re.exec(block[1])) !== null) {
      keys.add(m[1]);
    }
  }
  return keys;
}

function extractExampleKeys() {
  const src = readFileSync(resolve(root, ".env.example"), "utf8");
  const keys = new Set();
  const re = /^#?\s*([A-Z][A-Z0-9_]+)=/gm;
  let m;
  while ((m = re.exec(src)) !== null) {
    keys.add(m[1]);
  }
  return keys;
}

const tsKeys = extractEnvTsKeys();
const exampleKeys = extractExampleKeys();

const INTENTIONALLY_EXCLUDED_FROM_TS = new Set([]);

const INTENTIONALLY_EXCLUDED_FROM_EXAMPLE = new Set([
  "NODE_ENV",
]);

const missingInExample = [...tsKeys].filter(
  (k) => !exampleKeys.has(k) && !INTENTIONALLY_EXCLUDED_FROM_EXAMPLE.has(k),
);
const missingInTs = [...exampleKeys].filter(
  (k) => !tsKeys.has(k) && !INTENTIONALLY_EXCLUDED_FROM_TS.has(k),
);

let exitCode = 0;

if (missingInExample.length > 0) {
  console.error("Vars en lib/env.ts pero AUSENTES en .env.example:");
  for (const k of missingInExample) console.error("  -", k);
  exitCode = 1;
}

if (missingInTs.length > 0) {
  console.warn("Vars en .env.example pero AUSENTES en lib/env.ts (puede ser intencional):");
  for (const k of missingInTs) console.warn("  ?", k);
}

if (exitCode === 0 && missingInTs.length === 0) {
  console.log("env drift check OK — sin diferencias.");
}

process.exit(exitCode);
