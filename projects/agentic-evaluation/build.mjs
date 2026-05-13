// Agentic Evaluation build script.
//
// Reads actions-v2.csv (the action table with theme_description and
// problem_description columns) and inlines it into the output HTML
// alongside the CSS and JS as a single self-contained file.
//
// Dependencies: Node built-ins only. Run: `node build.mjs`.

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const CSV_FILE      = join(__dirname, 'actions-v2.csv');
const TEMPLATE_FILE = join(__dirname, 'template.html');
const STYLE_FILE    = join(__dirname, 'src', 'style.css');
const APP_FILE      = join(__dirname, 'src', 'app.js');
const OUT_FILE      = join(__dirname, '..', '..', 'static', 'projects', 'agentic-evaluation', 'index.html');

// ---------------------------------------------------------------------------
// Source map (id → {name, url})
// ---------------------------------------------------------------------------
const SOURCES = {
   1: { name: 'Anthropic — Demystifying Evals',     url: 'https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents' },
   2: { name: 'OpenAI — Testing Agent Skills',      url: 'https://developers.openai.com/blog/eval-skills' },
   3: { name: 'Galileo — Agent Eval Framework',     url: 'https://galileo.ai/blog/agent-evaluation-framework-metrics-rubrics-benchmarks' },
   4: { name: 'Hamel & Shreya — Evals FAQ',         url: 'https://hamel.dev/blog/posts/evals-faq/' },
   5: { name: 'LangChain — State of Agent Eng.',    url: 'https://www.langchain.com/state-of-agent-engineering' },
   6: { name: 'Datadog — State of AI Eng. 2026',    url: 'https://www.datadoghq.com/state-of-ai-engineering/' },
   7: { name: 'MAESTRO',                            url: 'https://arxiv.org/abs/2601.00481' },
   8: { name: 'Judge Reliability Harness',          url: 'https://arxiv.org/abs/2603.05399' },
   9: { name: 'ProdCodeBench',                      url: 'https://arxiv.org/abs/2604.01527' },
  10: { name: 'Zhihu — Agent 评测',                  url: 'https://zhuanlan.zhihu.com/p/2024968196612997551' },
  11: { name: 'Cognition — Multi-Agents Working',   url: 'https://cognition.ai/blog/multi-agents-working' },
  12: { name: 'Cognition — Cloud Agents',           url: 'https://cognition.ai/blog/what-we-learned-building-cloud-agents' },
  13: { name: 'Anthropic — Coding Trends 2026',     url: 'https://resources.anthropic.com/hubfs/2026%20Agentic%20Coding%20Trends%20Report.pdf' },
  14: { name: 'Han Lee — Agent Runtime',            url: 'https://leehanchung.github.io/blogs/2026/04/24/hidden-technical-debt-agent-runtime/' },
  15: { name: 'Simon Willison — Pragmatic Summit',  url: 'https://simonwillison.net/2026/Mar/14/pragmatic-summit/' },
  16: { name: 'EvalEval — Eval Cost Bottleneck',    url: 'https://huggingface.co/blog/evaleval/eval-costs-bottleneck' },
  17: { name: 'Karpathy — Sequoia AI Ascent 2026',  url: 'https://karpathy.bearblog.dev/sequoia-ascent-2026/' },
  18: { name: 'Anthropic — Multi-Agent Research',   url: 'https://www.anthropic.com/engineering/multi-agent-research-system' },
  19: { name: 'Cognition — Don’t Build Multi-Agents', url: 'https://cognition.ai/blog/dont-build-multi-agents' },
  20: { name: 'LangChain — How and When Multi-Agent', url: 'https://blog.langchain.com/how-and-when-to-build-multi-agent-systems/' },
  21: { name: 'Cognition — Devin 2025 Review',      url: 'https://cognition.ai/blog/devin-annual-performance-review-2025' },
  22: { name: 'Hamel Husain — Field Guide',         url: 'https://hamel.dev/blog/posts/field-guide/' },
  23: { name: 'Chip Huyen — Agents',                url: 'https://huyenchip.com/2025/01/07/agents.html' },
  24: { name: 'Eugene Yan — Eval Process',          url: 'https://eugeneyan.com/writing/eval-process/' },
  25: { name: 'LinkedIn Eng — GenAI Stack',         url: 'https://www.linkedin.com/blog/engineering/generative-ai/behind-the-platform-the-journey-to-create-the-linkedin-genai-application-tech-stack' },
  26: { name: 'Kapoor & Narayanan — NormalTech',    url: 'https://www.normaltech.ai/' },
  27: { name: 'Lilian Weng — LLM Agents',           url: 'https://lilianweng.github.io/posts/2023-06-23-agent/' },
  28: { name: 'Hamel — Your AI Product Needs Evals', url: 'https://hamel.dev/blog/posts/evals/' },
  29: { name: 'Kapoor et al. — AI Agents That Matter', url: 'https://arxiv.org/abs/2407.01502' },
  30: { name: 'Anthropic — Building Effective Agents', url: 'https://www.anthropic.com/research/building-effective-agents' },
  31: { name: 'CAICT + Huawei — Agent Report 2025', url: 'https://finance.sina.com.cn/roll/2025-06-25/doc-infchqmp4576786.shtml' },
  32: { name: 'Ant Group — agentUniverse',          url: 'https://zhuanlan.zhihu.com/p/720618962' },
  33: { name: 'InfoQ China — Alibaba Cloud Agent',  url: 'https://www.infoq.cn/article/ya6zml7irki6ph3c56hr' },
  34: { name: 'Ant Digital — Trustworthy Agent',    url: 'https://www.infoq.cn/article/t6pcyk37mio6afe3gesq' },
  35: { name: 'Harvey — Legal Agent Benchmark',     url: 'https://www.harvey.ai/blog/introducing-harveys-legal-agent-benchmark' },
  36: { name: 'Evident Insights — Banks Go Agentic', url: 'https://evidentinsights.com/bankingbrief/banks-go-agentic/' },
  37: { name: 'Yu et al. — LLMs in Healthcare',     url: 'https://mednexus.org/doi/10.1016/j.imed.2025.03.002' },
  38: { name: 'Tian Pan — Shadow/Canary/AB',        url: 'https://tianpan.co/blog/2026-04-09-llm-gradual-rollout-shadow-canary-ab-testing' },
  39: { name: 'Anthropic — Error Bars (Miller)',    url: 'https://www.anthropic.com/research/statistical-approach-to-model-evals' },
  40: { name: 'Cameron Wolfe — Stats for LLM Evals', url: 'https://cameronrwolfe.substack.com/p/stats-llm-evals' },
  41: { name: 'Ian Arawjo — Stats for LLM Evals',   url: 'https://statsforevals.com/' },
  42: { name: 'OWASP — Agentic Top 10 (2026)',      url: 'https://genai.owasp.org/resource/owasp-top-10-for-agentic-applications-for-2026/' },
  43: { name: 'CSA — NIST AI Agent Red-Teaming',    url: 'https://labs.cloudsecurityalliance.org/research/csa-research-note-nist-ai-agent-red-teaming-standards-202603/' },
};

// ---------------------------------------------------------------------------
// Theme display metadata: short labels for petals + custom SVG glyphs.
// Glyphs are 24×24-ish path data; they're rendered at translate(-12,-22)
// so the visual centre sits above the name labels.
// ---------------------------------------------------------------------------
// shortLabel: text on the petal (kept short for the hex).
// heading:    section heading in the right panel — starts with the same text as the petal,
//             then a colon and a fuller phrasing of the same pain.
const THEME_META = {
  T1:  { shortLabel: 'Start here',         heading: "Start here — I don't know where to start",                       glyphPath: 'M2 12 L18 12 M12 6 L18 12 L12 18' },
  T2:  { shortLabel: 'Trust scores',       heading: 'Trust scores — variance, bias, calibration',                     glyphPath: 'M12 4 L12 20 M5 9 L19 9 M3 9 L7 17 L11 9 M13 9 L17 17 L21 9 M3 17 L11 17 M13 17 L21 17' },
  T3:  { shortLabel: 'Observability',      heading: 'Observability — can I see what happened?',                       glyphPath: 'M2 12 C 6 5 18 5 22 12 C 18 19 6 19 2 12 Z M12 8 A 4 4 0 1 0 12 16 A 4 4 0 1 0 12 8 Z M12 10 A 2 2 0 1 0 12 14 A 2 2 0 1 0 12 10 Z' },
  T4:  { shortLabel: 'Offline → prod',     heading: 'Offline → prod — eval passes, prod regresses',                   glyphPath: 'M3 17 L9 17 L9 12 L3 12 Z M11 12 L17 12 L17 7 L11 7 Z M15 21 L21 17 L15 13 Z' },
  T5:  { shortLabel: 'Cost & capacity',    heading: 'Cost & capacity — token bloat, scaffold spread, idle compute',   glyphPath: 'M12 4 V 20 M16 8 C 16 6 14 5 12 5 C 10 5 8 6 8 8 C 8 10 10 11 12 11 C 14 11 16 12 16 14 C 16 16 14 17 12 17 C 10 17 8 16 8 14' },
  T6:  { shortLabel: 'Multi-agent',        heading: 'Multi-agent — orchestration, coordination, context',             glyphPath: 'M5 6 A 2 2 0 1 0 5 10 A 2 2 0 1 0 5 6 Z M19 6 A 2 2 0 1 0 19 10 A 2 2 0 1 0 19 6 Z M12 14 A 2 2 0 1 0 12 18 A 2 2 0 1 0 12 14 Z M6.5 9 L11 14 M17.5 9 L13 14 M7 8 L17 8' },
  T7:  { shortLabel: 'Metric mismatch',    heading: "Metric mismatch — high scores that don't predict outcomes",      glyphPath: 'M12 2 A 10 10 0 1 0 12 22 A 10 10 0 1 0 12 2 M12 6 A 6 6 0 1 0 12 18 A 6 6 0 1 0 12 6 M16 6 L20 2' },
  T8:  { shortLabel: 'Dataset rot',        heading: 'Dataset rot — saturation, contamination, coverage',              glyphPath: 'M5 6 L19 6 L19 9 L5 9 Z M5 11 L19 11 L19 14 L5 14 Z M5 16 L19 16 L19 19 L5 19 Z' },
  T9:  { shortLabel: 'Security',           heading: 'Security — adversaries, privilege, exfiltration',                glyphPath: 'M12 2 L20 5 L20 12 C 20 16 16 20 12 22 C 8 20 4 16 4 12 L4 5 Z M9 12 L11 14 L15 10' },
  T10: { shortLabel: 'Human review',       heading: 'Human review — annotation, sampling, error taxonomy',            glyphPath: 'M12 4 A 3 3 0 1 0 12 10 A 3 3 0 1 0 12 4 M6 20 C 6 15 8 12 12 12 C 16 12 18 15 18 20 Z' },
  T11: { shortLabel: 'Scale & reuse',      heading: 'Scale & reuse — every team rebuilds, the 80→95 plateau',         glyphPath: 'M4 4 L10 4 L10 10 L4 10 Z M14 4 L20 4 L20 10 L14 10 Z M4 14 L10 14 L10 20 L4 20 Z M14 14 L20 14 L20 20 L14 20 Z' },
};

// ---------------------------------------------------------------------------
// CSV reader
// ---------------------------------------------------------------------------
function parseCsv(text) {
  const rows = [];
  let row = [], field = '', inQ = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQ) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') inQ = false;
      else field += c;
    } else {
      if (c === '"') inQ = true;
      else if (c === ',') { row.push(field); field = ''; }
      else if (c === '\r') {}
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

function parseSourceRefs(field) {
  const ids = [];
  for (const part of field.split('/')) {
    const m = part.trim().match(/^(\d+)\s*[—-]/);
    if (m) ids.push(Number(m[1]));
  }
  return ids;
}

// ---------------------------------------------------------------------------
async function main() {
  const [csvText, templateHtml, styleCss, appJs] = await Promise.all([
    readFile(CSV_FILE,      'utf-8'),
    readFile(TEMPLATE_FILE, 'utf-8'),
    readFile(STYLE_FILE,    'utf-8'),
    readFile(APP_FILE,      'utf-8'),
  ]);

  const records = rowsToObjects(parseCsv(csvText));

  // Build action list and resolve sources
  const actions = records.map(r => {
    const sourceIds = parseSourceRefs(r.source_refs || '');
    const sources = sourceIds.map(id => SOURCES[id]
      ? { id, name: SOURCES[id].name, url: SOURCES[id].url }
      : { id, name: (r.source_refs || '').trim(), url: null });
    return {
      id:           Number(r.id),
      themeId:      r.theme_id,
      problem:      r.problem,
      description:  r.problem_description || '',
      action:       r.action,
      category:     r.category,
      constraint:   r.constraint,
      sources,
    };
  });

  // Build theme list with metadata, counts, and descriptions
  const themeOrder = Object.keys(THEME_META);
  const counts = Object.fromEntries(themeOrder.map(id => [id, 0]));
  for (const a of actions) if (counts[a.themeId] != null) counts[a.themeId]++;

  // Pull the full theme name and the rich description from any row with that theme
  const sampleFor = id => records.find(r => r.theme_id === id) || {};
  const themes = themeOrder.map(id => {
    const s = sampleFor(id);
    return {
      id,
      name:        s.theme || THEME_META[id].shortLabel,
      heading:     THEME_META[id].heading,
      shortLabel:  THEME_META[id].shortLabel,
      description: s.theme_description || '',
      count:       counts[id],
      glyphPath:   THEME_META[id].glyphPath,
    };
  });

  const data = {
    hub:    { title: 'Agentic Engineering', sub: `${actions.length} actions across ${themes.length} themes` },
    themes,
    actions,
  };

  const html = templateHtml
    .replace('/* {{STYLE}} */', styleCss)
    .replace('/* {{DATA}} */', `const DATA = ${JSON.stringify(data)};`)
    .replace('/* {{APP}} */', appJs);

  await mkdir(dirname(OUT_FILE), { recursive: true });
  await writeFile(OUT_FILE, html, 'utf-8');

  console.log(`Built ${OUT_FILE}`);
  console.log(`  actions: ${actions.length}`);
  console.log(`  themes:  ${themes.length}`);
  console.log(`  sources resolved: ${actions.reduce((n, a) => n + a.sources.filter(s => s.url).length, 0)} / ${actions.reduce((n, a) => n + a.sources.length, 0)}`);
}

main().catch(err => { console.error(err); process.exit(1); });
