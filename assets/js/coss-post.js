// Interactive figures for the CoSS blog post.
// 1. #coss-formula: any formula of the two separate scores ties answers A and B.
// 2. #coss-repeat: repeating a step fools an equal share per checklist item,
//    but not a score that counts each idea once.
// 3. #coss-caution, #coss-picks, #coss-padding: result charts, each with a
//    table view built from the same data.
(function () {
  "use strict";

  function node(tag, className, text) {
    const n = document.createElement(tag);
    if (className) n.className = className;
    if (text !== undefined) n.textContent = text;
    return n;
  }

  // One labelled bar: label, track with a fill scaled to the value, number.
  function barRow(label, fillClass) {
    const row = node("div", "cs-row");
    const track = node("div", "cs-track");
    const fill = node("div", `cs-fill ${fillClass || ""}`.trim());
    const value = node("span", "cs-value");
    track.appendChild(fill);
    row.append(node("span", "cs-label", label), track, value);
    return {
      node: row,
      set(v) {
        fill.style.transform = `scaleX(${Math.max(0, Math.min(1, v)).toFixed(3)})`;
        value.textContent = v.toFixed(2);
      },
    };
  }

  function setPressed(buttons, isPressed) {
    buttons.forEach((b) => b.setAttribute("aria-pressed", String(isPressed(b))));
  }

  // ---------------------------------------------------------------------------
  // Formula demo. Both answers pass both checks, so they share the same two
  // scores (illustrative values); every formula of those scores ties them.
  // ---------------------------------------------------------------------------

  const SHARED_SCORES = { helpfulness: 0.8, safety: 0.9 };

  const FORMULAS = {
    average: (h, s, w) => w * h + (1 - w) * s,
    product: (h, s, w) => Math.pow(h, w) * Math.pow(s, 1 - w),
    min: (h, s) => Math.min(h, s),
  };

  function initFormula(root) {
    let formula = "average";
    let weight = 0.5;

    const buttons = [...root.querySelectorAll("[data-formula]")];
    const slider = root.querySelector('input[type="range"]');
    const sliderLabel = root.querySelector(".cs-slider");
    const output = root.querySelector(".cs-slider output");
    const readout = root.querySelector(".cs-readout");
    const rows = [barRow("Answer A", "cs-fill--coss"), barRow("Answer B", "cs-fill--coss")];
    rows.forEach((r) => root.querySelector(".cs-plot").appendChild(r.node));

    function render() {
      const { helpfulness, safety } = SHARED_SCORES;
      const score = FORMULAS[formula](helpfulness, safety, weight);
      rows.forEach((r) => r.set(score));
      setPressed(buttons, (b) => b.dataset.formula === formula);
      const usesWeight = formula !== "min";
      slider.disabled = !usesWeight;
      sliderLabel.classList.toggle("is-disabled", !usesWeight);
      output.textContent = `${Math.round(weight * 100)}%`;
      readout.textContent = `A scores ${score.toFixed(2)} and B scores ${score.toFixed(2)}. Same inputs, same score: this rule can't tell them apart.`;
    }

    buttons.forEach((b) =>
      b.addEventListener("click", () => {
        formula = b.dataset.formula;
        render();
      })
    );
    slider.addEventListener("input", () => {
      weight = Number(slider.value) / 100;
      render();
    });
    render();
  }

  // ---------------------------------------------------------------------------
  // Repetition demo (illustrative). The checklist has three phrasings of the
  // backup step and one restore check. An equal share pays 0.25 per item met;
  // counting each idea once pays 0.5 for the backup idea and 0.5 for the check,
  // however many phrasings of the backup the answer contains.
  // ---------------------------------------------------------------------------

  const BACKUP_PHRASINGS = ["Make a backup.", "Save a copy.", "Make sure a copy has been saved."];
  const ITEM_SHARE = 1 / 4;
  const IDEA_VALUE = 0.5;
  const COMPLETE = { phrasings: 1, restoreCheck: true };

  function equalShare(answer) {
    return ITEM_SHARE * (answer.phrasings + (answer.restoreCheck ? 1 : 0));
  }

  function eachIdeaOnce(answer) {
    return IDEA_VALUE * ((answer.phrasings > 0 ? 1 : 0) + (answer.restoreCheck ? 1 : 0));
  }

  function verdict(complete, padded) {
    if (Math.abs(complete - padded) < 1e-9) return { text: "Tie: can't choose", good: false };
    return complete > padded ? { text: "Picks the complete answer ✓", good: true } : { text: "Picks the padded answer ✗", good: false };
  }

  function scoreGroup(title, rule, fillClass) {
    const group = node("div", "cs-group");
    const rows = { complete: barRow("Complete", fillClass), padded: barRow("Padded", fillClass) };
    const pick = node("p", "cs-pick");
    group.append(node("p", "cs-group-title", title), rows.complete.node, rows.padded.node, pick);
    return {
      node: group,
      update(padded) {
        const c = rule(COMPLETE);
        const p = rule(padded);
        rows.complete.set(c);
        rows.padded.set(p);
        const v = verdict(c, p);
        pick.textContent = v.text;
        pick.className = `cs-pick ${v.good ? "cs-pick--good" : "cs-pick--bad"}`;
        return v.text;
      },
    };
  }

  function initRepeat(root) {
    let phrasings = 3;

    const buttons = [...root.querySelectorAll("[data-repeat]")];
    const paddedText = root.querySelector(".cs-padded-text");
    const plot = root.querySelector(".cs-plot");
    const groups = [
      scoreGroup("Equal share per checklist item", equalShare, ""),
      scoreGroup("Each idea counted once, as in CoSS", eachIdeaOnce, "cs-fill--coss"),
    ];
    groups.forEach((g) => plot.appendChild(g.node));
    const live = node("p", "cs-sr");
    live.setAttribute("aria-live", "polite");
    plot.appendChild(live);

    function render() {
      const padded = { phrasings, restoreCheck: false };
      paddedText.textContent = BACKUP_PHRASINGS.slice(0, phrasings).join(" ");
      setPressed(buttons, (b) => Number(b.dataset.repeat) === phrasings);
      const [equal, coss] = groups.map((g) => g.update(padded));
      live.textContent = `Equal share: ${equal}. Each idea once: ${coss}.`;
    }

    buttons.forEach((b) =>
      b.addEventListener("click", () => {
        phrasings = Number(b.dataset.repeat);
        render();
      })
    );
    render();
  }

  // ---------------------------------------------------------------------------
  // Result charts. Values are percentages from the paper's results files:
  // formal_judge (summary.matched_pairs.disclaimer; rows for the judge's
  // picks), pick_recipes (best-of-eight picks), repetition_test
  // (relational, padded3).
  // ---------------------------------------------------------------------------

  const STACKS = {
    "coss-caution": {
      keys: ["higher", "same", "lower"],
      labels: { higher: "Scored higher with the caution", same: "Same score", lower: "Scored lower" },
      tones: { higher: "bad", same: "good", lower: "mid" },
      rows: [{ label: "Judge (Qwen3-8B)", note: "500 pairs", values: { higher: 36.2, same: 61.2, lower: 2.6 } }],
    },
    "coss-picks": {
      keys: ["pass", "unattached", "missing", "other"],
      labels: { pass: "Passing answer", unattached: "Unattached answer", missing: "Missing a condition", other: "Other failures" },
      tones: { pass: "good", unattached: "bad", missing: "mid", other: "low" },
      rows: [
        { label: "Separate scores", note: "500 tasks", values: { pass: 56.2, unattached: 29.8, missing: 10.8, other: 3.2 } },
        { label: "CoSS, nearness", note: "500 tasks", values: { pass: 59.8, unattached: 33.2, missing: 6.8, other: 0.2 } },
        { label: "CoSS, exact pair checks", note: "500 tasks", values: { pass: 100, unattached: 0, missing: 0, other: 0 }, isKey: true },
        { label: "AI judge (Qwen3-8B)", note: "first 200 tasks", values: { pass: 79.5, unattached: 13.0, missing: 6.5, other: 1.0 } },
      ],
    },
  };

  const BARS = {
    "coss-padding": {
      label: "Preferred the padded answer",
      tone: "bad",
      rows: [
        { label: "Equal share per pair", value: 100 },
        { label: "Weighted sum, random orders", value: 73.5 },
        { label: "Weighted sum, original order", value: 0 },
        { label: "Separate scores", value: 0 },
        { label: "CoSS, original and random orders", value: 0, isKey: true },
      ],
    },
  };

  const LABEL_PADDING = 8;

  function percent(v, digits) {
    return `${v.toFixed(digits)}%`;
  }

  function rowLabel(row) {
    const label = node("div", "cs-chart-label", row.label);
    if (row.note) label.appendChild(node("small", "", row.note));
    return label;
  }

  function legend(spec) {
    const list = node("ul", "cs-legend-row");
    spec.keys.forEach((k) => {
      const item = node("li");
      const key = node("span", `cs-key cs-tone--${spec.tones[k]}`);
      key.setAttribute("aria-hidden", "true");
      item.append(key, document.createTextNode(spec.labels[k]));
      list.appendChild(item);
    });
    return list;
  }

  // The accessible twin of every chart: the same numbers as a table.
  function tableView(columns, rows) {
    const details = node("details");
    const wrap = node("div", "cs-table-wrap");
    const table = node("table", "cs-table");
    const headRow = node("tr");
    ["", ...columns].forEach((c) => headRow.appendChild(node("th", "", c)));
    table.appendChild(node("thead")).appendChild(headRow);
    const body = table.appendChild(node("tbody"));
    rows.forEach((cells) => {
      const tr = node("tr");
      cells.forEach((c, i) => tr.appendChild(node(i === 0 ? "th" : "td", "", c)));
      body.appendChild(tr);
    });
    wrap.appendChild(table);
    details.append(node("summary", "", "Show the numbers as a table"), wrap);
    return details;
  }

  // One tooltip per chart, positioned above the hovered or focused segment.
  function attachTooltip(root) {
    const tip = node("div", "cs-tip");
    tip.hidden = true;
    root.appendChild(tip);
    function show(seg) {
      tip.replaceChildren(node("strong", "", seg.dataset.value), document.createTextNode(seg.dataset.label));
      tip.hidden = false;
      const box = root.getBoundingClientRect();
      const mark = seg.getBoundingClientRect();
      const half = tip.offsetWidth / 2;
      const center = mark.left + mark.width / 2 - box.left;
      tip.style.left = `${Math.min(Math.max(center, half), box.width - half)}px`;
      tip.style.top = `${mark.top - box.top - 6}px`;
    }
    const hide = () => {
      tip.hidden = true;
    };
    root.querySelectorAll(".cs-seg").forEach((seg) => {
      seg.addEventListener("pointerenter", () => show(seg));
      seg.addEventListener("focus", () => show(seg));
      seg.addEventListener("pointerleave", hide);
      seg.addEventListener("blur", hide);
    });
  }

  // Show a segment's number only where it fits with padding on both sides.
  function fitLabels(root) {
    root.querySelectorAll(".cs-seg").forEach((seg) => {
      const text = seg.querySelector(".cs-seg-label");
      text.classList.toggle("is-hidden", text.scrollWidth + 2 * LABEL_PADDING > seg.clientWidth);
    });
  }

  function initStack(root, spec) {
    const mount = root.querySelector(".cs-chart-mount");
    mount.appendChild(legend(spec));
    spec.rows.forEach((row) => {
      const line = node("div", `cs-chart-row${row.isKey ? " is-key" : ""}`);
      const stack = node("div", "cs-stack");
      spec.keys
        .filter((k) => row.values[k] > 0)
        .forEach((k) => {
          const v = row.values[k];
          const seg = node("span", `cs-seg cs-tone--${spec.tones[k]}`);
          seg.style.flexGrow = String(v);
          seg.tabIndex = 0;
          seg.setAttribute("role", "img");
          seg.setAttribute("aria-label", `${row.label}: ${spec.labels[k]}, ${percent(v, 1)}`);
          seg.dataset.label = spec.labels[k];
          seg.dataset.value = percent(v, 1);
          seg.appendChild(node("span", "cs-seg-label", percent(v, 0)));
          stack.appendChild(seg);
        });
      line.append(rowLabel(row), stack);
      mount.appendChild(line);
    });
    const columns = spec.keys.map((k) => spec.labels[k]);
    const rows = spec.rows.map((row) => [row.label, ...spec.keys.map((k) => percent(row.values[k], 1))]);
    mount.appendChild(tableView(columns, rows));
    attachTooltip(root);
    fitLabels(root);
    new ResizeObserver(() => fitLabels(root)).observe(mount);
  }

  function initBars(root, spec) {
    const mount = root.querySelector(".cs-chart-mount");
    spec.rows.forEach((row) => {
      const line = node("div", `cs-chart-row${row.isKey ? " is-key" : ""}`);
      const area = node("div", "cs-bar-area");
      const bar = node("span", `cs-bar cs-tone--${spec.tone}`);
      bar.style.width = `calc((100% - 3.5rem) * ${row.value / 100})`;
      area.append(bar, node("span", "cs-bar-value", percent(row.value, row.value % 1 ? 1 : 0)));
      line.append(rowLabel(row), area);
      mount.appendChild(line);
    });
    const rows = spec.rows.map((row) => [row.label, percent(row.value, 1)]);
    mount.appendChild(tableView([spec.label], rows));
  }

  document.addEventListener("DOMContentLoaded", () => {
    const formula = document.getElementById("coss-formula");
    const repeat = document.getElementById("coss-repeat");
    if (formula) initFormula(formula);
    if (repeat) initRepeat(repeat);
    Object.entries(STACKS).forEach(([id, spec]) => {
      const root = document.getElementById(id);
      if (root) initStack(root, spec);
    });
    Object.entries(BARS).forEach(([id, spec]) => {
      const root = document.getElementById(id);
      if (root) initBars(root, spec);
    });
  });
})();
