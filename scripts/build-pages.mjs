// Assembles dist/, the self-contained site root uploaded to GitHub Pages.
//
//   npm run build:pages
//
// Layout: web/* promoted to the root (index.html, graph.json, <slug>/, lib/)
// plus data/kjv.json vendored at dist/data/kjv.json. The pages fetch verse
// text from data/kjv.json next to the site root first and fall back to the
// repo-root relative path, so both `dist/` (Pages) and `web/` (local dev at
// /web/) keep working.
//
// dist/ stays gitignored. Nothing here edits web/ or data/.
import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const webDir = join(root, 'web');
const distDir = join(root, 'dist');

if (!existsSync(join(webDir, 'graph.json'))) {
  console.error('missing web/graph.json: run npm run build:web first');
  process.exit(1);
}
const kjvSrc = join(root, 'data', 'kjv.json');
if (!existsSync(kjvSrc)) {
  console.error('missing data/kjv.json: verse text cannot be vendored');
  process.exit(1);
}

rmSync(distDir, { recursive: true, force: true });
mkdirSync(distDir, { recursive: true });
cpSync(webDir, distDir, { recursive: true });
mkdirSync(join(distDir, 'data'), { recursive: true });
cpSync(kjvSrc, join(distDir, 'data', 'kjv.json'));
writeFileSync(join(distDir, '.nojekyll'), '');

console.log('dist/ assembled from web/ + data/kjv.json');
