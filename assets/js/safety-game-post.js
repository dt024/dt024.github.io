// Interactive demo for the "Safety Game" blog post (#sg-demo): drag a risk
// budget and watch the game's equilibrium strategy move.
(function () {
  "use strict";

  const SVG_NS = "http://www.w3.org/2000/svg";

  // Illustrative scores, not model outputs. M = helpfulness gained over the
  // refusal, D = extra risk over the refusal (both relative to the fallback).
  const CANDIDATES = [
    { id: "refuse", name: "Refusal", M: 0, D: 0, text: "Sorry, I can't help with that." },
    { id: "vague", name: "Vague warning", M: 0.15, D: 0.02, text: "Chemical reactions at home can be dangerous, so it's best not to try." },
    {
      id: "soda",
      name: "Baking soda + vinegar",
      M: 0.6,
      D: 0.12,
      text: "Mix baking soda with vinegar to see a safe acid-base reaction. For anything stronger, use a supervised lab.",
    },
    {
      id: "foam",
      name: "Elephant toothpaste",
      M: 0.8,
      D: 0.35,
      text: "Hydrogen peroxide, yeast and dish soap make a fast foaming reaction. Wear goggles and gloves.",
    },
    { id: "bleach", name: "Bleach + ammonia", M: 0.9, D: 0.95, text: "Mix household ammonia with bleach. (This releases toxic chloramine gas.)" },
  ];

  function el(name, attrs, text) {
    const node = document.createElementNS(SVG_NS, name);
    Object.entries(attrs || {}).forEach(([k, v]) => node.setAttribute(k, v));
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function pct(x) {
    return `${Math.round(x * 100)}%`;
  }

  // ---------------------------------------------------------------------------
  // Game solution: maximise expected M subject to expected D <= budget.
  // With two constraints (probabilities sum to 1, risk cap), the optimum mixes at
  // most two neighbouring points on the upper concave frontier.
  // ---------------------------------------------------------------------------

  function upperFrontier(points) {
    const sorted = [...points].sort((a, b) => a.D - b.D || b.M - a.M);
    const hull = [];
    sorted.forEach((p) => {
      while (hull.length >= 2) {
        const [a, b] = hull.slice(-2);
        const cross = (b.D - a.D) * (p.M - a.M) - (b.M - a.M) * (p.D - a.D);
        if (cross < 0) break;
        hull.pop();
      }
      if (!hull.length || p.M > hull[hull.length - 1].M) hull.push(p);
    });
    return hull;
  }

  function solveGame(points, budget) {
    const frontier = upperFrontier(points);
    const last = frontier[frontier.length - 1];
    if (budget >= last.D) return [{ cand: last, p: 1 }];
    const j = frontier.findIndex((q) => q.D > budget);
    const lo = frontier[j - 1];
    const hi = frontier[j];
    const pHi = (budget - lo.D) / (hi.D - lo.D);
    return [
      { cand: lo, p: 1 - pHi },
      { cand: hi, p: pHi },
    ].filter((s) => s.p > 0.005);
  }

  function solveFilter(points, budget) {
    const allowed = points.filter((c) => c.D <= budget);
    return allowed.reduce((best, c) => (c.M > best.M ? c : best), allowed[0]);
  }

  function expectation(mix, key) {
    return mix.reduce((sum, s) => sum + s.p * s.cand[key], 0);
  }

  // ---------------------------------------------------------------------------
  // Demo rendering
  // ---------------------------------------------------------------------------

  const PLOT = { w: 560, h: 330, left: 56, right: 24, top: 20, bottom: 52 };
  const x = (d) => PLOT.left + d * (PLOT.w - PLOT.left - PLOT.right);
  const y = (m) => PLOT.h - PLOT.bottom - m * (PLOT.h - PLOT.top - PLOT.bottom);

  function drawAxes(svg) {
    [0, 0.25, 0.5, 0.75, 1].forEach((t) => {
      svg.appendChild(el("line", { class: "sg-grid", x1: x(t), x2: x(t), y1: y(0), y2: y(1) }));
      svg.appendChild(el("line", { class: "sg-grid", x1: x(0), x2: x(1), y1: y(t), y2: y(t) }));
      svg.appendChild(el("text", { class: "sg-tick", x: x(t), y: y(0) + 18, "text-anchor": "middle" }, t.toFixed(2)));
      svg.appendChild(el("text", { class: "sg-tick", x: x(0) - 8, y: y(t) + 4, "text-anchor": "end" }, t.toFixed(2)));
    });
    svg.appendChild(el("text", { class: "sg-axis", x: (x(0) + x(1)) / 2, y: PLOT.h - 8, "text-anchor": "middle" }, "extra risk over refusing →"));
    svg.appendChild(
      el("text", { class: "sg-axis", transform: `translate(14 ${(y(0) + y(1)) / 2}) rotate(-90)`, "text-anchor": "middle" }, "helpfulness gained →")
    );
  }

  function drawFrontier(svg) {
    const d = upperFrontier(CANDIDATES)
      .map((p, i) => `${i ? "L" : "M"}${x(p.D)},${y(p.M)}`)
      .join(" ");
    svg.appendChild(el("path", { class: "sg-frontier", d }));
  }

  function drawBudget(svg, budget) {
    const g = el("g", { class: "sg-budget-layer" });
    g.appendChild(el("rect", { class: "sg-feasible", x: x(0), y: y(1), width: x(budget) - x(0), height: y(0) - y(1) }));
    g.appendChild(el("line", { class: "sg-budget", x1: x(budget), x2: x(budget), y1: y(0), y2: y(1) }));
    const anchor = budget > 0.7 ? "end" : "start";
    const dx = budget > 0.7 ? -6 : 6;
    g.appendChild(
      el("text", { class: "sg-budget-label", x: x(budget) + dx, y: y(1) + 14, "text-anchor": anchor }, `budget T = ${budget.toFixed(2)}`)
    );
    return g;
  }

  function drawPoints(svg, mix, filterPick, showFilter) {
    const g = el("g");
    CANDIDATES.forEach((c) => {
      const share = mix.find((s) => s.cand.id === c.id);
      const cls = share ? "sg-point sg-point--played" : "sg-point";
      const dot = el("circle", { class: cls, cx: x(c.D), cy: y(c.M), r: share ? 8 : 6 });
      dot.appendChild(el("title", {}, `${c.name}: helpfulness ${c.M.toFixed(2)}, extra risk ${c.D.toFixed(2)}`));
      g.appendChild(dot);
      if (showFilter && filterPick && filterPick.id === c.id) {
        g.appendChild(el("circle", { class: "sg-filter-ring", cx: x(c.D), cy: y(c.M), r: 13 }));
      }
      const onRight = c.D > 0.6;
      const label = share ? `${c.name} · ${pct(share.p)}` : c.name;
      g.appendChild(
        el(
          "text",
          {
            class: share ? "sg-label sg-label--played" : "sg-label",
            x: x(c.D) + (onRight ? -12 : 12),
            y: y(c.M) + (c.id === "refuse" ? -10 : 4),
            "text-anchor": onRight ? "end" : "start",
          },
          label
        )
      );
    });
    return g;
  }

  function describe(mix, filterPick, showFilter) {
    const plays = mix.map((s) => `${pct(s.p)} “${s.cand.name}”`).join(" and ");
    const help = expectation(mix, "M").toFixed(2);
    const risk = expectation(mix, "D").toFixed(2);
    const game = `<p><strong>Safety Game plays</strong> ${plays}. Expected helpfulness <strong>${help}</strong>, expected extra risk ${risk}.</p>`;
    const quotes = mix.map((s) => `<blockquote class="sg-quote"><span>${s.cand.name}</span> ${s.cand.text}</blockquote>`).join("");
    if (!showFilter) return game + quotes;
    const filter = `<p class="sg-filter-line"><strong>A simple filter</strong> (drop anything riskier than T, keep the most helpful) picks “${filterPick.name}”. Helpfulness <strong>${filterPick.M.toFixed(2)}</strong>.</p>`;
    return game + filter + quotes;
  }

  function initDemo(root) {
    const svg = el("svg", { viewBox: `0 0 ${PLOT.w} ${PLOT.h}`, role: "img", "aria-labelledby": "sg-demo-title" });
    svg.appendChild(
      el("title", { id: "sg-demo-title" }, "Candidate answers plotted by extra risk and helpfulness, with the risk budget as a vertical line")
    );
    drawAxes(svg);
    drawFrontier(svg);
    const dynamic = el("g");
    svg.appendChild(dynamic);
    root.querySelector(".sg-plot").appendChild(svg);

    const slider = root.querySelector("#sg-budget");
    const toggle = root.querySelector("#sg-compare");
    const output = root.querySelector(".sg-output");

    function render() {
      const budget = Number(slider.value);
      const mix = solveGame(CANDIDATES, budget);
      const filterPick = solveFilter(CANDIDATES, budget);
      const showFilter = toggle.checked;
      dynamic.replaceChildren(drawBudget(svg, budget), drawPoints(svg, mix, filterPick, showFilter));
      root.querySelector(".sg-budget-value").textContent = budget.toFixed(2);
      output.innerHTML = describe(mix, filterPick, showFilter);
    }

    slider.addEventListener("input", render);
    toggle.addEventListener("change", render);
    render();
  }

  document.addEventListener("DOMContentLoaded", () => {
    const demo = document.getElementById("sg-demo");
    if (demo) initDemo(demo);
  });
})();
