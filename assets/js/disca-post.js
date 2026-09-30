// Interactive figures for the DISCA blog post.
// 1. #disca-panel: drag four personas and watch consensus + disagreement steer the answer.
// 2. #disca-heatmap: where DISCA moved each model closer to each country (paper, Table 7).
(function () {
  "use strict";

  const SVG_NS = "http://www.w3.org/2000/svg";

  function el(name, attrs, text) {
    const node = document.createElementNS(SVG_NS, name);
    Object.entries(attrs || {}).forEach(([k, v]) => node.setAttribute(k, v));
    if (text !== undefined) node.textContent = text;
    return node;
  }

  // ---------------------------------------------------------------------------
  // Panel maths (illustrative). Constants follow the paper's defaults where they
  // exist (alpha, kappa, sigma, lambda, eta); GATE_SCALE is chosen for this axis.
  // ---------------------------------------------------------------------------

  const PT_ALPHA = 0.88;
  const PT_KAPPA = 2.25;
  const SIGMA = 0.3;
  const LAMBDA_COOP = 0.7;
  const ETA = 0.5;
  const GATE_SCALE = 0.25;
  const DOMAIN = [-2, 2];
  const MODEL_DEFAULT = 1.5;

  const PERSONAS = [
    { id: "young", name: "Young adults" },
    { id: "middle", name: "Middle-aged" },
    { id: "older", name: "Older adults" },
    { id: "country", name: "Country-wide" },
  ];

  const PRESETS = {
    start: [0.9, 0.6, 0.2, 0.55],
    agree: [0.7, 0.6, 0.5, 0.6],
    split: [1.4, 0.9, -0.9, 0.3],
  };

  function lossAverse(z) {
    return z >= 0 ? Math.pow(z, PT_ALPHA) : -PT_KAPPA * Math.pow(-z, PT_ALPHA);
  }

  function mean(xs) {
    return xs.reduce((a, b) => a + b, 0) / xs.length;
  }

  function spread(xs) {
    const c = mean(xs);
    return xs.reduce((a, x) => a + (x - c) ** 2, 0) / (xs.length - 1);
  }

  // Loss-averse fine adjustment around the consensus: every candidate step is
  // scored by how much closer it brings each persona than the model's default,
  // with losses weighted more than gains; steps are averaged by softmax weight.
  function fineAdjustment(positions, consensus) {
    let weightSum = 0;
    let stepSum = 0;
    for (let step = -0.9; step <= 0.9001; step += 0.01) {
      const x = consensus + step;
      const personaGain = mean(positions.map((p) => lossAverse((Math.abs(MODEL_DEFAULT - p) - Math.abs(x - p)) / SIGMA)));
      const panelGain = lossAverse((Math.abs(MODEL_DEFAULT - consensus) - Math.abs(x - consensus)) / SIGMA);
      const w = Math.exp(((1 - LAMBDA_COOP) * personaGain + LAMBDA_COOP * panelGain) / ETA);
      weightSum += w;
      stepSum += w * step;
    }
    return stepSum / weightSum;
  }

  function solvePanel(positions) {
    const consensus = mean(positions);
    const trust = Math.exp(-spread(positions) / GATE_SCALE);
    const final = consensus + trust * fineAdjustment(positions, consensus);
    return { consensus, trust, final };
  }

  function describeSpread(trust) {
    if (trust > 0.8) return "low: the panel largely agrees";
    if (trust > 0.35) return "moderate";
    return "high: the panel is split";
  }

  // ---------------------------------------------------------------------------
  // Panel rendering
  // ---------------------------------------------------------------------------

  const P = { w: 600, left: 118, right: 24, rowH: 34, top: 18 };
  const ROWS = { default: 0, personas: 1, final: 5 };
  const P_H = P.top + 6 * P.rowH + 44;
  const px = (v) => P.left + ((v - DOMAIN[0]) / (DOMAIN[1] - DOMAIN[0])) * (P.w - P.left - P.right);
  const rowY = (r) => P.top + r * P.rowH + P.rowH / 2;
  const toValue = (x) => {
    const v = DOMAIN[0] + ((x - P.left) / (P.w - P.left - P.right)) * (DOMAIN[1] - DOMAIN[0]);
    return Math.max(DOMAIN[0], Math.min(DOMAIN[1], v));
  };

  function drawPanelFrame(svg) {
    const axisY = rowY(5) + P.rowH / 2 + 6;
    [-2, -1, 0, 1, 2].forEach((t) => {
      svg.appendChild(el("line", { class: t === 0 ? "dc-zero" : "dc-grid", x1: px(t), x2: px(t), y1: P.top, y2: axisY }));
    });
    svg.appendChild(el("line", { class: "dc-axis-line", x1: px(-2), x2: px(2), y1: axisY, y2: axisY }));
    svg.appendChild(el("text", { class: "dc-axis", x: px(-2), y: axisY + 18 }, "← spare the older group"));
    svg.appendChild(el("text", { class: "dc-axis", x: px(2), y: axisY + 18, "text-anchor": "end" }, "spare the younger group →"));
    const labels = ["Model default", ...PERSONAS.map((p) => p.name), "DISCA answer"];
    labels.forEach((label, r) => {
      const cls = r === ROWS.final ? "dc-row dc-row--strong" : "dc-row";
      svg.appendChild(el("text", { class: cls, x: P.left - 12, y: rowY(r) + 4, "text-anchor": "end" }, label));
    });
    const d = el("path", { class: "dc-default", d: diamond(px(MODEL_DEFAULT), rowY(ROWS.default), 8) });
    d.appendChild(el("title", {}, "The model's default preference, before any steering"));
    svg.appendChild(d);
  }

  function diamond(cx, cy, r) {
    return `M${cx},${cy - r} L${cx + r},${cy} L${cx},${cy + r} L${cx - r},${cy} Z`;
  }

  function drawPanelState(layer, result) {
    const top = rowY(1) - P.rowH / 2 + 4;
    const bottom = rowY(4) + P.rowH / 2 - 4;
    layer.appendChild(el("line", { class: "dc-consensus", x1: px(result.consensus), x2: px(result.consensus), y1: top, y2: rowY(ROWS.final) }));
    layer.appendChild(el("text", { class: "dc-consensus-label", x: px(result.consensus) + 6, y: bottom + 4 }, "consensus"));
    const fy = rowY(ROWS.final);
    layer.appendChild(
      el("line", {
        class: "dc-move",
        x1: px(MODEL_DEFAULT),
        x2: px(result.final) + (result.final < MODEL_DEFAULT ? 9 : -9),
        y1: fy,
        y2: fy,
        "marker-end": "url(#dc-arrow)",
      })
    );
    layer.appendChild(el("circle", { class: "dc-final", cx: px(result.final), cy: fy, r: 9 }));
    layer.appendChild(el("path", { class: "dc-default dc-default--ghost", d: diamond(px(MODEL_DEFAULT), fy, 7) }));
  }

  function makeHandle(svg, index, getPositions, onChange) {
    const persona = PERSONAS[index];
    const g = el("g", {
      class: "dc-handle",
      tabindex: "0",
      role: "slider",
      "aria-label": `${persona.name} persona`,
      "aria-valuemin": "-2",
      "aria-valuemax": "2",
    });
    const dot = el("circle", { class: `dc-persona dc-persona--${persona.id}`, r: 11 });
    const hit = el("circle", { class: "dc-hit", r: 20 });
    g.append(hit, dot);

    function place() {
      const positions = getPositions();
      const x = px(positions[index]);
      [dot, hit].forEach((c) => {
        c.setAttribute("cx", x);
        c.setAttribute("cy", rowY(ROWS.personas + index));
      });
      g.setAttribute("aria-valuenow", positions[index].toFixed(2));
    }

    function pointerToValue(evt) {
      const pt = svg.createSVGPoint();
      pt.x = evt.clientX;
      pt.y = evt.clientY;
      return toValue(pt.matrixTransform(svg.getScreenCTM().inverse()).x);
    }

    g.addEventListener("pointerdown", (evt) => {
      g.setPointerCapture(evt.pointerId);
      g.classList.add("is-dragging");
    });
    g.addEventListener("pointermove", (evt) => {
      if (!g.hasPointerCapture(evt.pointerId)) return;
      onChange(index, pointerToValue(evt));
    });
    g.addEventListener("pointerup", (evt) => {
      g.releasePointerCapture(evt.pointerId);
      g.classList.remove("is-dragging");
    });
    g.addEventListener("keydown", (evt) => {
      const step = { ArrowLeft: -0.05, ArrowDown: -0.05, ArrowRight: 0.05, ArrowUp: 0.05 }[evt.key];
      if (step === undefined) return;
      evt.preventDefault();
      onChange(index, Math.max(DOMAIN[0], Math.min(DOMAIN[1], getPositions()[index] + step)));
    });
    return { node: g, place };
  }

  function initPanel(root) {
    let positions = [...PRESETS.start];
    const svg = el("svg", { viewBox: `0 0 ${P.w} ${P_H}`, role: "group", "aria-labelledby": "dc-panel-title" });
    svg.appendChild(el("title", { id: "dc-panel-title" }, "Four draggable personas, their consensus, and the steered answer"));
    const defs = el("defs");
    const marker = el("marker", {
      id: "dc-arrow",
      viewBox: "0 0 10 10",
      refX: "8",
      refY: "5",
      markerWidth: "7",
      markerHeight: "7",
      orient: "auto-start-reverse",
    });
    marker.appendChild(el("path", { class: "dc-arrowhead", d: "M0,0 L10,5 L0,10 Z" }));
    defs.appendChild(marker);
    svg.appendChild(defs);
    drawPanelFrame(svg);
    const stateLayer = el("g");
    svg.appendChild(stateLayer);

    const handles = PERSONAS.map((_, i) => makeHandle(svg, i, () => positions, update));
    handles.forEach((h) => svg.appendChild(h.node));
    root.querySelector(".dc-plot").appendChild(svg);

    const meter = root.querySelector(".dc-meter-fill");
    const spreadText = root.querySelector(".dc-spread");
    const keptText = root.querySelector(".dc-kept");

    function render() {
      const result = solvePanel(positions);
      stateLayer.replaceChildren();
      drawPanelState(stateLayer, result);
      handles.forEach((h) => h.place());
      meter.style.transform = `scaleX(${result.trust.toFixed(3)})`;
      spreadText.textContent = describeSpread(result.trust);
      keptText.textContent = `${Math.round(result.trust * 100)}%`;
    }

    function update(index, value) {
      positions = positions.map((p, i) => (i === index ? value : p));
      render();
    }

    root.querySelectorAll("[data-preset]").forEach((btn) => {
      btn.addEventListener("click", () => {
        positions = [...PRESETS[btn.dataset.preset]];
        render();
      });
    });

    render();
  }

  // ---------------------------------------------------------------------------
  // Heatmap: relative change in distance to each country's measured moral
  // preferences (%, positive = closer). Paper, Appendix A3, Table 7.
  // ---------------------------------------------------------------------------

  const MODELS = [
    ["Llama 3.3", "70B"],
    ["Magistral", "24B"],
    ["Phi-4", "14B"],
    ["Qwen3-VL", "8B"],
    ["Qwen2.5", "7B"],
    ["Phi-3.5", "mini"],
    ["Gemma 4", "2B"],
  ];

  const COUNTRIES = [
    { region: "Americas", name: "Argentina", v: [12.2, 6.0, 16.1, 35.0, 19.7, 16.1, -2.4] },
    { region: "Americas", name: "Brazil", v: [12.2, 22.5, -9.3, 29.1, 29.1, -22.1, 2.9] },
    { region: "Americas", name: "Colombia", v: [10.5, 10.7, 10.1, 30.1, 17.8, 14.0, 0.9] },
    { region: "Americas", name: "Mexico", v: [12.3, 4.6, 13.4, 32.3, 17.0, 15.4, -5.9] },
    { region: "Americas", name: "United States", v: [33.8, 16.5, 51.2, 28.0, 20.8, 10.2, 5.3] },
    { region: "Europe", name: "Germany", v: [10.1, -30.3, 15.6, 3.7, -34.6, 2.5, 17.8] },
    { region: "Europe", name: "United Kingdom", v: [31.4, 13.2, 36.6, 22.6, 17.4, 10.1, 9.8] },
    { region: "Europe", name: "Romania", v: [30.3, 18.7, 23.5, 18.8, 25.2, 14.0, 11.8] },
    { region: "Europe", name: "Serbia", v: [29.9, 19.8, 22.9, 16.2, 33.1, 11.1, 8.4] },
    { region: "East Asia", name: "China", v: [16.9, 20.2, 47.4, 27.0, 18.6, 24.3, 21.5] },
    { region: "East Asia", name: "Japan", v: [9.5, 22.3, 50.6, 22.4, -20.1, -0.3, -4.0] },
    { region: "Southeast Asia", name: "Indonesia", v: [19.0, -21.5, 40.3, 1.5, 16.1, 1.6, -6.2] },
    { region: "Southeast Asia", name: "Myanmar", v: [25.2, 26.5, 25.9, 18.9, 34.3, 13.8, 1.4] },
    { region: "Southeast Asia", name: "Malaysia", v: [29.9, 29.4, 28.5, 23.1, 38.5, 15.1, 11.2] },
    { region: "Southeast Asia", name: "Thailand", v: [29.2, 27.3, 31.4, 22.5, 46.6, 16.1, 7.2] },
    { region: "Southeast Asia", name: "Vietnam", v: [12.4, -7.2, 17.3, 5.5, 6.6, -5.4, -16.1] },
    { region: "South Asia", name: "Bangladesh", v: [27.3, 19.6, 24.7, 12.9, 38.3, 15.3, 4.4] },
    { region: "Central Asia", name: "Kyrgyzstan", v: [31.1, 23.2, 21.1, 13.1, 43.8, 13.3, 8.7] },
    { region: "West Asia", name: "Iran", v: [17.9, 6.1, -33.5, 0.2, -25.1, 12.9, -22.6] },
    { region: "Africa", name: "Ethiopia", v: [22.7, -2.0, 21.2, 5.4, 21.6, 10.0, 5.0] },
  ];

  const SCALE_MAX = 50;

  function cellFill(value) {
    const share = Math.round(Math.min(Math.abs(value) / SCALE_MAX, 1) * 100);
    const pole = value >= 0 ? "var(--dc-closer)" : "var(--dc-further)";
    return `color-mix(in oklab, ${pole} ${share}%, var(--dc-neutral))`;
  }

  function cellTitle(country, model, value) {
    const who = `${country.name} · ${model[0]} ${model[1]}`;
    if (Math.abs(value) < 0.5) return `${who}: about the same`;
    return value > 0 ? `${who}: ${value.toFixed(1)}% closer to people's preferences` : `${who}: ${Math.abs(value).toFixed(1)}% further away`;
  }

  function initHeatmap(root) {
    const H = { left: 214, top: 52, cellW: 52, cellH: 20, gap: 2, regionGap: 8 };
    let y = H.top;
    const rows = COUNTRIES.map((c, i) => {
      if (i > 0 && c.region !== COUNTRIES[i - 1].region) y += H.regionGap;
      const row = { ...c, y };
      y += H.cellH;
      return row;
    });
    const W = H.left + MODELS.length * H.cellW + 8;
    const svg = el("svg", { viewBox: `0 0 ${W} ${y + 8}`, role: "img", "aria-labelledby": "dc-heat-title" });
    svg.appendChild(
      el(
        "title",
        { id: "dc-heat-title" },
        "Heatmap of 20 countries by 7 models: blue where DISCA moved the model closer to the country's measured moral preferences, orange where it moved further"
      )
    );

    MODELS.forEach(([name, size], j) => {
      const cx = H.left + j * H.cellW + H.cellW / 2;
      svg.appendChild(el("text", { class: "dc-col", x: cx, y: H.top - 24, "text-anchor": "middle" }, name));
      svg.appendChild(el("text", { class: "dc-col dc-col--size", x: cx, y: H.top - 9, "text-anchor": "middle" }, size));
    });

    rows.forEach((row, i) => {
      const firstInRegion = i === 0 || row.region !== rows[i - 1].region;
      if (firstInRegion) svg.appendChild(el("text", { class: "dc-region", x: 0, y: row.y + 14 }, row.region));
      svg.appendChild(el("text", { class: "dc-country", x: H.left - 10, y: row.y + 14, "text-anchor": "end" }, row.name));
      row.v.forEach((value, j) => {
        const cell = el("rect", {
          class: "dc-cell",
          x: H.left + j * H.cellW + H.gap / 2,
          y: row.y + H.gap / 2,
          width: H.cellW - H.gap,
          height: H.cellH - H.gap,
          rx: 3,
          style: `fill: ${cellFill(value)}`,
        });
        cell.appendChild(el("title", {}, cellTitle(row, MODELS[j], value)));
        svg.appendChild(cell);
      });
    });
    root.querySelector(".dc-plot").appendChild(svg);
  }

  document.addEventListener("DOMContentLoaded", () => {
    const panel = document.getElementById("disca-panel");
    const heatmap = document.getElementById("disca-heatmap");
    if (panel) initPanel(panel);
    if (heatmap) initHeatmap(heatmap);
  });
})();
