// Print KJV text for passage strings, so descriptions can be grounded in the text.  Usage: node scripts/show.mjs "EXO 3:1-15" "ROM 5"
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const v = JSON.parse(readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', 'data/kjv.json'), 'utf8')).verses;
for (const s of process.argv.slice(2)) {
  const m = s.match(/^(\w{3}) (\d+)(?::(\d+)(?:-(\d+))?)?$/);
  if (!m) { console.error(`bad passage "${s}"`); process.exit(1); }
  const [, b, c, v1, v2] = m;
  console.log(`--- ${s}`);
  for (let n = +(v1 ?? 1); n <= +(v2 ?? v1 ?? 999); n++) { const t = v[`${b}.${c}.${n}`]; if (!t) break; console.log(`${c}:${n} ${t}`); }
}
