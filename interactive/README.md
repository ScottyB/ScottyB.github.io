# Practitioner Actions × Physics of AI — interactive force graph

A single-file static page that visualises **201 practitioner actions** for
LLM-agent evaluation, mapped to the **9 structural constraints** of the
Physics of AI framework and linked back to the **43 underlying sources**.

Click a constraint → focus its cluster. Click an action → side panel with
the problem it addresses, the action, the source citation, and a link to
the original.

## Layout

```
interactive/
  build.mjs         # Node build script (zero npm deps; uses fs/path only)
  template.html     # HTML shell with {{STYLE}} {{DATA}} {{APP}} placeholders
  src/
    style.css       # design tokens, layout, panel, tooltip
    app.js          # D3 v7 force simulation + interactions
  dist/
    index.html      # generated — embeddable single file
  package.json
```

## Build

```bash
node build.mjs
# or:
npm run build
```

The script:

1. Reads `../actions.csv` (the 201-row parsed action table; regenerate with `../build-actions-csv.mjs` if upstream markdown changes)
2. Joins each row's `source_refs` field with the curated `SOURCES` map (43 entries) defined in `build.mjs`
3. Inlines the resulting JSON, the CSS, and the JS into `template.html`
4. Writes `dist/index.html` — a self-contained file (only external dep is D3 v7 from a CDN)

If any action ends up with `constraint: 'unknown'`, the build prints the
count to stderr — that means the source markdown changed in a way the
parser didn't catch.

## Embed on a GitHub Pages / Hugo / Astro site

The built `dist/index.html` works as either:

- A standalone page hosted at any path (it sets its own viewport and fills
  the container)
- An iframe embed, e.g.

  ```html
  <iframe
    src="/interactive/index.html"
    style="width:100%;height:720px;border:1px solid #e4e4e7;border-radius:8px"
    loading="lazy"
    title="Practitioner Actions × Physics of AI"></iframe>
  ```

The only external network dependencies are D3 (from jsDelivr) and the
Inter font (from rsms.me). Both can be self-hosted by replacing the two
`<link>` / `<script>` tags in `template.html` if your deployment needs to
be fully offline.

## Updating

To change the underlying data, edit `../actions.csv` directly (or edit the
upstream markdown in `../../agent-evaluation-2026-*.md` and re-run
`node ../build-actions-csv.mjs` to regenerate the CSV), then re-run
`node build.mjs`. To change the source-ID → URL mapping, edit the
`SOURCES` map at the top of `build.mjs`.

## Browser support

Modern evergreen browsers (Chrome / Firefox / Safari / Edge). Uses ES
modules in the build script and ES2020+ in the page. No transpilation.
