# Agentic Evaluation — interactive field guide

A single-file static page that maps **201 practitioner problems** for
LLM-agent evaluation to **11 symptom themes**, each annotated with a
suggested action and a link back to one of **43 curated 2025–2026
sources**.

Click a theme petal → drop down that theme's problems. Click a card →
expand to the problem description, suggested action, and source citation.

## Layout

```
projects/agentic-evaluation/
  build.mjs         # Node build script (zero npm deps; uses fs/path only)
  template.html     # HTML shell with {{STYLE}} {{DATA}} {{APP}} placeholders
  actions-v2.csv    # the 201-row parsed action table
  src/
    style.css       # design tokens, layout, panel, tooltip
    app.js          # D3 v7 force simulation + interactions
  package.json
```

Output goes to `static/projects/agentic-evaluation/index.html`, which Hugo
serves at `/projects/agentic-evaluation/`.

## Build

From the repo root:

```bash
make projects        # runs every projects/*/build.mjs
```

or directly:

```bash
node projects/agentic-evaluation/build.mjs
```

The script:

1. Reads `actions-v2.csv` (the 201-row parsed action table)
2. Joins each row's `source_refs` field with the curated `SOURCES` map (43 entries) defined in `build.mjs`
3. Inlines the resulting JSON, the CSS, and the JS into `template.html`
4. Writes `static/projects/agentic-evaluation/index.html` — a self-contained file (only external dep is D3 v7 from a CDN)

## Updating

To change the underlying data, replace `actions-v2.csv` and re-run the
build. To change the source-ID → URL mapping, edit the `SOURCES` map at
the top of `build.mjs`.

## Browser support

Modern evergreen browsers (Chrome / Firefox / Safari / Edge). Uses ES
modules in the build script and ES2020+ in the page. No transpilation.

The page pulls D3 from jsDelivr and Inter from rsms.me at runtime. Both
can be self-hosted by replacing the two `<link>` / `<script>` tags in
`template.html` if needed.
