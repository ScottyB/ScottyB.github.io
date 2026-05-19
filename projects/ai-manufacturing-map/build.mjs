// AI · Manufacturing Map build script.
//
// Reads index.html, style.css, app.js and data.csv from this folder and
// inlines everything into a single self-contained HTML at
// ../../static/projects/ai-manufacturing-map/index.html so Hugo can serve it.
//
// Dependencies: Node built-ins only. Run: `node build.mjs` (or `make projects`).

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const ROOT       = __dirname;
const INDEX_FILE = join(ROOT, 'index.html');
const STYLE_FILE = join(ROOT, 'style.css');
const APP_FILE   = join(ROOT, 'app.js');
const CSV_FILE   = join(ROOT, 'data.csv');
const OUT_FILE   = join(ROOT, '..', '..', 'static', 'projects', 'ai-manufacturing-map', 'index.html');

// ---------------------------------------------------------------------------
// Minimal CSV parser (handles quoted fields and the "" escape).
// ---------------------------------------------------------------------------
function parseCsv(text) {
  const rows = [];
  let row = [], field = '', inQ = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQ) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQ = false;
      } else field += c;
    } else {
      if (c === '"') inQ = true;
      else if (c === ',') { row.push(field); field = ''; }
      else if (c === '\r') { /* ignore */ }
      else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
      else field += c;
    }
  }
  if (field.length > 0 || row.length > 0) { row.push(field); rows.push(row); }
  return rows;
}

function rowsToObjects(rows) {
  if (rows.length === 0) return [];
  const header = rows[0];
  return rows.slice(1)
    .filter(r => r.length === header.length && r.some(v => v !== ''))
    .map(r => Object.fromEntries(header.map((h, i) => [h, r[i]])));
}

// ---------------------------------------------------------------------------
async function main() {
  const [indexHtml, styleCss, appJs, csvText] = await Promise.all([
    readFile(INDEX_FILE, 'utf-8'),
    readFile(STYLE_FILE, 'utf-8'),
    readFile(APP_FILE,   'utf-8'),
    readFile(CSV_FILE,   'utf-8'),
  ]);

  const records = rowsToObjects(parseCsv(csvText));

  // 1. Inline the CSS — replace the external stylesheet link with a <style> block.
  let html = indexHtml.replace(
    /<link\s+rel="stylesheet"\s+href="style\.css"\s*\/?>/,
    `<style>\n${styleCss}\n</style>`,
  );

  // 2. Inject pre-loaded data and inline the app script — replace <script src="app.js">.
  const dataScript = `<script>window.__AI_MAP_DATA__ = ${JSON.stringify(records)};</script>`;
  html = html.replace(
    /<script\s+src="app\.js"\s*><\/script>/,
    `${dataScript}\n<script>\n${appJs}\n</script>`,
  );

  await mkdir(dirname(OUT_FILE), { recursive: true });
  await writeFile(OUT_FILE, html, 'utf-8');

  console.log(`Built ${OUT_FILE}`);
  console.log(`  deployments: ${records.length}`);
  console.log(`  capabilities: ${new Set(records.map(r => r.Capability)).size}`);
  console.log(`  functions:    ${new Set(records.map(r => r.Function)).size}`);
}

main().catch(err => { console.error(err); process.exit(1); });
