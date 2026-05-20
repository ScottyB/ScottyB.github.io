/* AI · Manufacturing Map — force-directed graph
   Toggle between AI Capability (13) and Manufacturing Function (8) parents.
   Click a parent → list deployments; click a deployment → full detail. */

const CAP_COLORS = {
  "Plan & Schedule":       "#6ca0c4",
  "Review":                "#f4a623",
  "Search & Rank":         "#88b8a0",
  "Generate":              "#d96b3a",
  "Recommend & Personalise": "#b890c2",
  "Classify & Group":      "#d3a847",
  "Orchestrate":           "#5e8aa8",
  "Forecast":              "#9bc6a0",
  "Transform & Structure": "#c89066",
  "Optimise":              "#7fb6c0",
  "Reason & Infer":        "#c4796b",
  "Code":                  "#a8a37e",
  "Simulate":              "#9ba8c4",
};

const FN_COLORS = {
  "Quality inspection & defect detection": "#f4a623",
  "Predictive maintenance & asset health": "#6ca0c4",
  "Planning, forecasting & supply chain":  "#9bc6a0",
  "Generative design & CAD":               "#d96b3a",
  "Knowledge access & decision support":   "#b890c2",
  "Automation engineering":                "#a8a37e",
  "Digital twin & simulation":             "#7fb6c0",
  "Process & energy optimization":         "#c89066",
};

let DATA = [];
let mode = "function"; // "capability" | "function"
let simulation;
let nodes = [];
let links = [];
let selectedId = null;

const svg = d3.select("#graph");
const tooltip = d3.select("body").append("div").attr("class", "tooltip").style("opacity", 0);

let width = 0, height = 0;
const root = svg.append("g").attr("class", "root");
const gLinks = root.append("g").attr("class", "links");
const gNodes = root.append("g").attr("class", "nodes");

function colorFor(name) {
  return (mode === "capability" ? CAP_COLORS : FN_COLORS)[name] || "#8893a0";
}

function buildModel() {
  const parentKey = mode === "capability" ? "Capability" : "Function";
  const parentNames = Array.from(new Set(DATA.map(d => d[parentKey])));

  // Preserve example node positions across mode toggles by reusing IDs.
  const exampleNodesById = new Map(nodes.filter(n => n.type === "example").map(n => [n.id, n]));

  const newNodes = [
    ...parentNames.map(name => {
      const existing = nodes.find(n => n.id === `p::${name}`);
      return existing
        ? Object.assign(existing, { type: "parent", name, group: name })
        : { id: `p::${name}`, type: "parent", name, group: name };
    }),
    ...DATA.map((d, i) => {
      const id = `e::${i}`;
      const reused = exampleNodesById.get(id);
      const base = reused || { id };
      return Object.assign(base, {
        type: "example",
        name: d.Company,
        group: d[parentKey],
        data: d,
      });
    })
  ];

  const newLinks = DATA.map((d, i) => ({
    source: `p::${d[parentKey]}`,
    target: `e::${i}`,
  }));

  nodes = newNodes;
  links = newLinks;
}

function render() {
  // Links
  const link = gLinks.selectAll("line").data(links, d =>
    (typeof d.source === "object" ? d.source.id : d.source) + "→" +
    (typeof d.target === "object" ? d.target.id : d.target)
  );
  link.exit().remove();
  link.enter().append("line").attr("class", "link");

  // Nodes (each group = <g> with circle + label)
  const node = gNodes.selectAll("g.node").data(nodes, d => d.id);
  node.exit().remove();

  const nodeEnter = node.enter()
    .append("g")
    .attr("class", d => `node node-${d.type}`)
    .call(drag(simulationProxy))
    .on("click", (event, d) => { event.stopPropagation(); select(d); })
    .on("mouseenter", (event, d) => { showTooltip(event, d); if (!selectedId) setHover(d); })
    .on("mousemove", moveTooltip)
    .on("mouseleave", () => { hideTooltip(); if (!selectedId) clearHover(); });

  nodeEnter.append("circle");
  nodeEnter.append("text").attr("class", d => `label label-${d.type}`);

  const nodeAll = nodeEnter.merge(node);

  nodeAll.attr("class", d => `node node-${d.type}` + (selectedId && d.id === selectedId ? " is-active" : ""));

  nodeAll.select("circle")
    .attr("r", d => d.type === "parent" ? parentRadius(d) : 6)
    .attr("fill", d => d.type === "parent" ? colorFor(d.group) : "transparent")
    .attr("stroke", d => d.type === "parent" ? d3.color(colorFor(d.group)).darker(0.8) : "#9aa0a8");

  nodeAll.select("text")
    .text(d => d.type === "parent" ? labelText(d.name) : d.name)
    .attr("text-anchor", "middle")
    .attr("dy", d => d.type === "parent" ? parentRadius(d) + 14 : 18);

  // Restart simulation with new model
  simulation.nodes(nodes);
  simulation.force("link").links(links);
  simulation.alpha(0.9).restart();
}

function parentRadius(d) {
  const n = links.filter(l => {
    const src = typeof l.source === "object" ? l.source.id : l.source;
    return src === d.id;
  }).length;
  return 18 + n * 2.4;
}

let simulationProxy = () => simulation;

function tick() {
  gLinks.selectAll("line")
    .attr("x1", d => d.source.x)
    .attr("y1", d => d.source.y)
    .attr("x2", d => d.target.x)
    .attr("y2", d => d.target.y);
  gNodes.selectAll("g.node")
    .attr("transform", d => `translate(${d.x},${d.y})`);
}

/* Viewport-aware spacing — phones get tighter clusters so labels and nodes fit. */
function scale() {
  if (width >= 900) return 1.0;     // desktop / large
  if (width >= 600) return 0.7;     // tablet
  return 0.5;                        // phone
}
function centerStrength() {
  return width < 600 ? 0.06 : 0.035;
}
function isMobile() { return width < 600; }

/* Abbreviate long category labels on phone — full name still in the panel. */
const SHORT_LABEL = {
  "Quality inspection & defect detection": "Quality",
  "Predictive maintenance & asset health": "Maintenance",
  "Planning, forecasting & supply chain":  "Planning",
  "Generative design & CAD":               "Design",
  "Knowledge access & decision support":   "Knowledge",
  "Automation engineering":                "Automation",
  "Digital twin & simulation":             "Digital twin",
  "Process & energy optimization":         "Optimisation",
  "Recommend & Personalise":               "Recommend",
  "Transform & Structure":                 "Transform",
};
function labelText(name) {
  return isMobile() ? (SHORT_LABEL[name] || name) : name;
}

function initSimulation() {
  const s = scale();
  simulation = d3.forceSimulation()
    .force("link", d3.forceLink().id(d => d.id).distance(d =>
      (d.target.type === "example" ? 78 : 110) * s
    ).strength(0.45))
    .force("charge", d3.forceManyBody().strength(d => (d.type === "parent" ? -420 : -110) * s))
    .force("center", d3.forceCenter(width / 2, height / 2))
    .force("collide", d3.forceCollide().radius(d => (d.type === "parent" ? parentRadius(d) + 14 : 18) * s))
    .force("x", d3.forceX(width / 2).strength(centerStrength()))
    .force("y", d3.forceY(height / 2).strength(centerStrength() + 0.005))
    .on("tick", tick);
}

function drag(simRef) {
  return d3.drag()
    .on("start", (event, d) => {
      if (!event.active) simRef().alphaTarget(0.3).restart();
      d.fx = d.x; d.fy = d.y;
    })
    .on("drag", (event, d) => { d.fx = event.x; d.fy = event.y; })
    .on("end", (event, d) => {
      if (!event.active) simRef().alphaTarget(0);
      d.fx = null; d.fy = null;
    });
}

/* ─── Selection / panel ─── */
const panelEl = document.getElementById("panel");

function select(d) {
  selectedId = d.id;
  highlight(d);
  if (d.type === "parent") renderCategoryPanel(d);
  else renderExamplePanel(d);
  panelEl.classList.add("is-open"); // bottom-sheet on mobile; no-op on desktop
}

function deselect() {
  selectedId = null;
  gNodes.selectAll("g.node")
    .classed("is-active", false)
    .classed("is-related", false)
    .classed("is-dim", false)
    .classed("is-hover-related", false);
  gLinks.selectAll("line").classed("is-related", false).classed("is-dim", false);
  renderEmptyPanel();
  panelEl.classList.remove("is-open");
}

function setHover(d) {
  const ids = new Set([d.id]);
  links.forEach(l => {
    const src = typeof l.source === "object" ? l.source.id : l.source;
    const tgt = typeof l.target === "object" ? l.target.id : l.target;
    if (d.type === "parent" && src === d.id) ids.add(tgt);
    if (d.type === "example" && tgt === d.id) ids.add(src);
  });
  gNodes.selectAll("g.node").classed("is-hover-related", n => ids.has(n.id));
}

function clearHover() {
  gNodes.selectAll("g.node").classed("is-hover-related", false);
}

function highlight(d) {
  const id = d.id;
  const relatedNodeIds = new Set([id]);
  const relatedLinks = new Set();

  if (d.type === "parent") {
    links.forEach(l => {
      const src = typeof l.source === "object" ? l.source.id : l.source;
      const tgt = typeof l.target === "object" ? l.target.id : l.target;
      if (src === id) {
        relatedNodeIds.add(tgt);
        relatedLinks.add(l);
      }
    });
  } else {
    // example node — find its parent
    links.forEach(l => {
      const src = typeof l.source === "object" ? l.source.id : l.source;
      const tgt = typeof l.target === "object" ? l.target.id : l.target;
      if (tgt === id) {
        relatedNodeIds.add(src);
        relatedLinks.add(l);
      }
    });
  }

  gNodes.selectAll("g.node")
    .classed("is-active", n => n.id === id)
    .classed("is-related", n => n.id !== id && relatedNodeIds.has(n.id))
    .classed("is-dim", n => !relatedNodeIds.has(n.id));
  gLinks.selectAll("line")
    .classed("is-related", l => relatedLinks.has(l))
    .classed("is-dim", l => !relatedLinks.has(l));
}

/* ─── Panel renderers ─── */
const panelTag = document.getElementById("panel-tag");
const panelBody = document.getElementById("panel-body");
const panelClose = document.getElementById("panel-close");

panelClose.addEventListener("click", deselect);

function renderEmptyPanel() {
  panelTag.textContent = "SELECT NODE";
  panelClose.hidden = true;
  panelBody.innerHTML = `
    <div class="empty-state">
      <p class="empty-instr">Click any <strong>category node</strong> to see its deployments, or click a <strong>deployment node</strong> for the full Problem / How / Benefit detail.</p>
      <p class="empty-instr">Toggle the top switch to regroup the same 34 deployments by <strong>AI capability</strong> or by <strong>manufacturing function</strong>.</p>
    </div>`;
}

function renderCategoryPanel(d) {
  panelTag.textContent = mode === "capability" ? "AI CAPABILITY" : "MANUFACTURING FUNCTION";
  panelClose.hidden = false;
  const items = DATA
    .map((row, i) => ({ row, i }))
    .filter(({ row }) => (mode === "capability" ? row.Capability : row.Function) === d.name);

  const li = items.map(({ row, i }, idx) => `
    <li class="cat-list-item" data-ex="${i}">
      <span class="lst-num">${String(idx + 1).padStart(2, "0")}</span>
      <span>
        <span class="lst-co">${escapeHtml(row.Company)}</span>
        <span class="lst-cap">${escapeHtml(mode === "capability" ? row.Function : row.Capability)}</span>
      </span>
    </li>`).join("");

  panelBody.innerHTML = `
    <div class="cat-head">
      <div class="cat-num">${mode === "capability" ? "CAPABILITY" : "FUNCTION"}</div>
      <h2 class="cat-name">${escapeHtml(d.name)}</h2>
      <div class="cat-count">${items.length} DEPLOYMENT${items.length === 1 ? "" : "S"}</div>
    </div>
    <ul class="cat-list">${li}</ul>`;

  panelBody.querySelectorAll(".cat-list-item").forEach(el => {
    el.addEventListener("click", () => {
      const idx = +el.dataset.ex;
      const node = nodes.find(n => n.id === `e::${idx}`);
      if (node) select(node);
    });
  });
}

function renderExamplePanel(d) {
  panelTag.textContent = "DEPLOYMENT DETAIL";
  panelClose.hidden = false;
  const r = d.data;
  panelBody.innerHTML = `
    <div class="detail">
      <h2 class="det-co">${escapeHtml(r.Company)}</h2>
      <a class="det-url" href="${escapeAttr(r.Url)}" target="_blank" rel="noopener">${escapeHtml(shortUrl(r.Url))}</a>
      <div class="det-tags">
        <span class="det-tag is-cap">CAP · ${escapeHtml(r.Capability)}</span>
        <span class="det-tag is-fn">FN · ${escapeHtml(r.Function)}</span>
      </div>
      <div class="det-block">
        <span class="det-key">PROBLEM</span>
        <div class="det-val">${escapeHtml(r.Problem)}</div>
      </div>
      <div class="det-block">
        <span class="det-key">HOW AI WAS USED</span>
        <div class="det-val">${escapeHtml(r["How I used"])}</div>
      </div>
      <div class="det-block">
        <span class="det-key">BENEFIT</span>
        <div class="det-val">${escapeHtml(r.Benefit)}</div>
      </div>
    </div>`;
}

/* ─── Tooltip ─── */
function showTooltip(event, d) {
  const txt = d.type === "parent"
    ? `${d.name.toUpperCase()} · ${linksCount(d)} DEPLOYMENTS`
    : `${d.data.Company} — ${(d.data["How I used"] || "").slice(0, 60)}…`;
  tooltip.html(escapeHtml(txt)).style("opacity", 1);
  moveTooltip(event);
}
function moveTooltip(event) {
  tooltip.style("left", (event.clientX + 14) + "px").style("top", (event.clientY + 14) + "px");
}
function hideTooltip() { tooltip.style("opacity", 0); }
function linksCount(d) {
  return links.filter(l => (typeof l.source === "object" ? l.source.id : l.source) === d.id).length;
}

/* ─── Helpers ─── */
function escapeHtml(s) {
  return String(s || "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
function escapeAttr(s) { return escapeHtml(s); }
function shortUrl(u) {
  try { return new URL(u).hostname.replace(/^www\./, ""); }
  catch { return u; }
}

/* ─── Mode switch ─── */
document.querySelectorAll(".mode-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    if (btn.classList.contains("is-active")) return;
    document.querySelectorAll(".mode-btn").forEach(b => {
      b.classList.toggle("is-active", b === btn);
      b.setAttribute("aria-selected", b === btn);
    });
    mode = btn.dataset.mode;
    document.getElementById("frame-label").textContent =
      mode === "function"
        ? "FIG. 01 · MANUFACTURING FUNCTION → DEPLOYMENT"
        : "FIG. 02 · AI CAPABILITY → DEPLOYMENT";
    selectedId = null;
    buildModel();
    render();
    renderEmptyPanel();
  });
});

/* ─── Background click to deselect ─── */
svg.on("click", () => { if (selectedId) deselect(); });

/* ─── Resize ─── */
function resize() {
  const rect = svg.node().getBoundingClientRect();
  width = rect.width; height = rect.height;
  if (simulation) {
    const s = scale();
    simulation.force("link").distance(d => (d.target.type === "example" ? 78 : 110) * s);
    simulation.force("charge").strength(d => (d.type === "parent" ? -420 : -110) * s);
    simulation.force("collide").radius(d => (d.type === "parent" ? parentRadius(d) + 14 : 18) * s);
    simulation.force("center", d3.forceCenter(width / 2, height / 2));
    simulation.force("x", d3.forceX(width / 2).strength(centerStrength()));
    simulation.force("y", d3.forceY(height / 2).strength(centerStrength() + 0.005));
    simulation.alpha(0.6).restart();
  }
}
window.addEventListener("resize", resize);

/* ─── Bootstrap ─── */
function init(rows) {
  DATA = rows;
  resize();
  initSimulation();
  buildModel();
  render();
}

if (typeof window.__AI_MAP_DATA__ !== "undefined") {
  // Production build: data is inlined into the bundled HTML by build.mjs
  init(window.__AI_MAP_DATA__);
} else {
  // Dev mode: fetch CSV from the same directory
  d3.csv("data.csv").then(init).catch(err => {
    console.error("Failed to load data.csv", err);
    panelBody.innerHTML = `<div class="empty-state"><p class="empty-instr">⚠ Could not load <code>data.csv</code>. Serve this folder over HTTP (eg. <code>python -m http.server</code>) rather than opening the file directly.</p></div>`;
  });
}
