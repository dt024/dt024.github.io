---
layout: post
title: "Safety Game: teaching a black-box LLM when to say more, and when to say less"
date: 2026-09-30
description: How an idea from poker-playing AI lets us make any LLM safer at inference time, with no retraining and no access to its weights.
tags: llm-safety game-theory alignment
categories: research
related_posts: false
related_publications: true
_styles: |
  .sg-figure { margin: 2rem 0; }
  .sg-figure svg { display: block; width: 100%; height: auto; }
  .sg-figure figcaption { margin-top: 0.5rem; font-size: 0.9rem; color: var(--global-text-color-light); }
  .sg-grid { stroke: var(--global-divider-color); stroke-width: 1; }
  .sg-tick { fill: var(--global-text-color-light); font-size: 12px; }
  .sg-axis { fill: var(--global-text-color-light); font-size: 13px; }
  .sg-frontier { fill: none; stroke: var(--global-text-color-light); stroke-width: 1.5; stroke-dasharray: 4 4; }
  .sg-feasible { fill: var(--global-theme-color); opacity: 0.08; }
  .sg-budget { stroke: var(--global-theme-color); stroke-width: 2; }
  .sg-budget-label { fill: var(--global-theme-color); font-size: 13px; font-weight: 600; }
  .sg-point { fill: var(--global-text-color-light); stroke: var(--global-bg-color); stroke-width: 2; }
  .sg-point--played { fill: var(--global-theme-color); }
  .sg-filter-ring { fill: none; stroke: var(--global-text-color); stroke-width: 1.5; stroke-dasharray: 3 3; }
  .sg-label { fill: var(--global-text-color-light); font-size: 13px; }
  .sg-label--played { fill: var(--global-text-color); font-weight: 600; }
  .sg-controls { display: flex; flex-wrap: wrap; align-items: center; gap: 0.75rem 1.5rem; margin: 1rem 0; }
  .sg-controls label { margin: 0; }
  .sg-controls input[type="range"] { width: min(100%, 320px); accent-color: var(--global-theme-color); vertical-align: middle; }
  .sg-controls input[type="checkbox"] { accent-color: var(--global-theme-color); margin-right: 0.35rem; }
  .sg-budget-value { font-variant-numeric: tabular-nums; font-weight: 600; color: var(--global-theme-color); }
  .sg-output { min-height: 9rem; }
  .sg-output p { margin-bottom: 0.5rem; }
  .sg-filter-line { color: var(--global-text-color-light); }
  .sg-quote { margin: 0.5rem 0; padding: 0.4rem 0.9rem; border-left: 3px solid var(--global-theme-color); font-size: 0.95rem; }
  .sg-quote span { display: block; font-weight: 600; font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.04em; color: var(--global-text-color-light); }
  .sg-note { font-size: 0.9rem; color: var(--global-text-color-light); }
  .sg-map { width: 100%; margin: 1.5rem 0; border-collapse: collapse; }
  .sg-map th, .sg-map td { padding: 0.55rem 0.75rem; border-bottom: 1px solid var(--global-divider-color); vertical-align: top; }
  .sg-map thead th { font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--global-text-color-light); }
  .sg-map td:last-child { color: var(--global-theme-color); font-weight: 600; }
  .sg-node { fill: var(--global-bg-color); stroke: var(--global-text-color); stroke-width: 1.5; }
  .sg-player { fill: var(--global-theme-color); }
  .sg-infoset { fill: none; stroke: var(--global-theme-color); stroke-width: 1.5; stroke-dasharray: 6 5; }
  .sg-edge { stroke: var(--global-text-color-light); stroke-width: 1.5; }
  .sg-tree-text { fill: var(--global-text-color); font-size: 14px; }
  .sg-tree-muted { fill: var(--global-text-color-light); font-size: 13px; }
  .sg-tree-strong { fill: var(--global-text-color); font-size: 14px; font-weight: 600; }
  .sg-tree-accent { fill: var(--global-theme-color); font-size: 13px; font-weight: 600; }
  .sg-tree-onplayer { fill: var(--global-bg-color); font-size: 12px; font-weight: 700; }
---

Ask an AI assistant: _"How do I create a strong chemical reaction at home?"_ It could answer in (at least) three ways:

- **Helpful but risky:** "Mix household ammonia with bleach." That is a real reaction, and it releases toxic chloramine gas.
- **Safe but useless:** "You shouldn't do chemistry at home, it's dangerous."
- **Helpful _and_ safe:** "Try baking soda and vinegar for a safe acid-base reaction. For anything stronger, use a supervised lab."

We obviously want the third one. The hard part is that the assistant has no idea **who is asking**. The same question comes from a curious twelve-year-old, a science teacher, and occasionally someone who wants to hurt people. An answer that is perfect for one of them is dangerous for another.

Our ICML 2026 paper {% cite nguyen2026safety %} treats that uncertainty as what it really is: **a game against an opponent whose intentions you can't see.** Taking the game seriously turns out to tell us exactly how an assistant should pick its answer.

## The fix has to live outside the model

The usual way to make a model safer is to retrain it (fine-tuning, RLHF). That works, but it is expensive, and it has to be repeated whenever the safety rules change, whether because of new regulation, a new product, or a new market.

Most organisations can't do this at all. A small company, a hospital or a public body typically reaches an LLM through an API: text goes in, text comes out, and the weights are locked away. Newer "inference-time" safety methods avoid retraining, but most still need to reach inside the model, for example to steer its hidden activations.

So we set ourselves a stricter goal: **a safety layer that treats the LLM as a black box.** It works with any model, needs no training, and can be switched to new rules on the day they change.

## The spark: safe exploitation in poker

Poker-playing AI has faced a version of this problem for years. A strong poker bot starts from a solid **baseline strategy** that no opponent can beat by much. Against a weak opponent it could win more by _adapting_, e.g. bluffing more against someone who folds too often. But adapting is dangerous: the "weak" opponent might be setting a trap, and the adapted strategy might be much easier to exploit than the baseline.

Game theorists have a precise answer to this, known as **safe exploitation** or **adaptation safety** ([Brown & Sandholm, 2017](https://arxiv.org/abs/1705.02955); [Ge et al., 2024](https://proceedings.mlr.press/v235/ge24b.html)). _Adapt all you like, as long as the adapted strategy is never more exploitable than your baseline._ This line of work helped the Libratus bot beat top professionals at heads-up no-limit poker.

Our key observation is that an AI assistant is in the same position. Being more helpful than a flat refusal is a form of adapting to the user, and a user with bad intentions is exactly the kind of opponent who exploits it. So we carried the idea over one piece at a time:

<table class="sg-map">
  <thead>
    <tr><th>In a poker game</th><th>In the Safety Game</th></tr>
  </thead>
  <tbody>
    <tr><td>The opponent's hidden cards</td><td>The user's hidden intent</td></tr>
    <tr><td>A safe baseline strategy</td><td>A safe refusal</td></tr>
    <tr><td>The adapted strategy</td><td>A mix of more helpful candidate answers</td></tr>
    <tr><td>"No more exploitable than the baseline"</td><td>"No more than T extra risk compared with refusing"</td></tr>
  </tbody>
</table>

## The Safety Game

Here is the game. The LLM is one player and the user is the other. Before anything happens, _chance_ decides what kind of user this is, and the LLM never gets to see the result:

- **Benign user.** All that matters is how helpful the answer is. The LLM scores the helpfulness it gained over simply refusing.
- **Adversarial user**, which happens with a probability set by a knob $$\beta$$. What matters is risk. If the answer's expected extra risk goes above a budget $$T$$, the LLM pays a penalty.

Because the LLM cannot tell the two situations apart, it has to commit to **one** strategy that holds up in both. That is the defining feature of an imperfect-information game, and it is why the solution looks the way it does.

<figure class="sg-figure">
<svg viewBox="0 0 640 330" role="img" aria-labelledby="sg-tree-title">
<title id="sg-tree-title">Game tree: chance picks a benign or adversarial user; the LLM cannot tell which and plays one strategy in both branches</title>
<circle class="sg-node" cx="320" cy="40" r="22"></circle>
<text class="sg-tree-strong" x="320" y="45" text-anchor="middle">?</text>
<text class="sg-tree-muted" x="352" y="36">chance picks the user's</text>
<text class="sg-tree-muted" x="352" y="53">intent, hidden from the LLM</text>
<line class="sg-edge" x1="304" y1="56" x2="186" y2="134"></line>
<line class="sg-edge" x1="336" y1="56" x2="454" y2="134"></line>
<text class="sg-tree-text" x="238" y="92" text-anchor="end">benign user</text>
<text class="sg-tree-muted" x="238" y="110" text-anchor="end">probability 1/(β+1)</text>
<text class="sg-tree-text" x="402" y="92">adversarial user</text>
<text class="sg-tree-muted" x="402" y="110">probability β/(β+1)</text>
<rect class="sg-infoset" x="120" y="122" width="400" height="52" rx="26"></rect>
<circle class="sg-player" cx="170" cy="148" r="18"></circle>
<text class="sg-tree-onplayer" x="170" y="152" text-anchor="middle">LLM</text>
<circle class="sg-player" cx="470" cy="148" r="18"></circle>
<text class="sg-tree-onplayer" x="470" y="152" text-anchor="middle">LLM</text>
<text class="sg-tree-accent" x="320" y="146" text-anchor="middle">looks identical to the LLM,</text>
<text class="sg-tree-accent" x="320" y="163" text-anchor="middle">so it plays one strategy π</text>
<line class="sg-edge" x1="170" y1="166" x2="170" y2="224"></line>
<line class="sg-edge" x1="470" y1="166" x2="470" y2="224"></line>
<rect class="sg-node" x="50" y="224" width="240" height="84" rx="8"></rect>
<text class="sg-tree-strong" x="170" y="252" text-anchor="middle">Helpfulness mode</text>
<text class="sg-tree-text" x="170" y="274" text-anchor="middle">payoff: helpfulness gained</text>
<text class="sg-tree-text" x="170" y="294" text-anchor="middle">over refusing</text>
<rect class="sg-node" x="350" y="224" width="240" height="84" rx="8"></rect>
<text class="sg-tree-strong" x="470" y="252" text-anchor="middle">Safety mode</text>
<text class="sg-tree-text" x="470" y="274" text-anchor="middle">payoff: a penalty if expected</text>
<text class="sg-tree-text" x="470" y="294" text-anchor="middle">extra risk exceeds budget T</text>
</svg>
<figcaption>The Safety Game. The dashed outline groups the two situations the LLM can't tell apart, so it has to play a single strategy π across both.</figcaption>
</figure>

A **strategy** here means a probability distribution over a handful of candidate answers, with the refusal always among them. Just as a good poker player mixes bluffs with honest bets, the best strategy may be a **mix**, e.g. "give answer A 65% of the time and answer B 35% of the time". Mixing lets the LLM hit the risk budget exactly, rather than falling back to the safest single answer below it.

To play, the LLM needs two numbers for each candidate: how helpful it is and how risky it is. In our experiments we simply **ask the same model**: _"Does this answer the question well?"_ and _"Is this potentially harmful?"_, and read off how confident it is in yes vs. no. Models are often better at judging answers than at writing the perfect one from scratch, and any other scorer, such as a dedicated safety classifier, can be swapped in.

## Play it yourself

Below are five candidate answers to the chemistry question, placed by **how much extra risk** they carry and **how much more helpful** they are than refusing. Drag the budget $$T$$ to decide how much more exploitable than a refusal the assistant may be, and watch the game's equilibrium strategy move.

<div id="sg-demo" class="sg-figure">
  <div class="sg-controls">
    <label for="sg-budget">Risk budget T: <span class="sg-budget-value">0.20</span></label>
    <input id="sg-budget" type="range" min="0" max="1" step="0.01" value="0.2">
    <label><input id="sg-compare" type="checkbox">Compare with a simple filter</label>
  </div>
  <div class="sg-plot"></div>
  <div class="sg-output" aria-live="polite"></div>
  <p class="sg-note">The scores are illustrative, chosen to show the mechanics; they aren't measurements from a model. The dashed line is the best any strategy can do at each level of risk. A very loose budget lets even the bleach answer into the mix, which is exactly why T is the safety dial and is set conservatively in practice.</p>
</div>

Try setting $$T = 0.20$$ and ticking the comparison. A simple filter ("drop every answer riskier than $$T$$, keep the most helpful") is stuck with the baking-soda answer. The game can do better: it mixes baking soda with the slightly riskier elephant-toothpaste demo so that the **average** risk sits exactly at the budget. That freedom comes directly from the game's rule, which bounds the risk of the whole strategy, as safe exploitation bounds the exploitability of a whole strategy, rather than judging each answer in isolation.

## From a game to a tiny optimisation problem

Normally, solving a game is expensive. This one collapses into something very small: its equilibrium is the solution of **a single linear program per prompt**, with just a few variables. We solve it with an ordinary off-the-shelf solver that runs _outside_ the LLM, so we never rely on the model's own (unknown, possibly unreliable) reasoning to get the maths right. If no candidate beats refusing within the budget, the assistant refuses.

<details markdown="1">
<summary><strong>For the curious: the maths</strong></summary>

Let the candidates be $$r_1, \dots, r_m$$ plus a safe refusal $$r_s$$. For each candidate, $$M_i$$ is its helpfulness gain over the refusal and $$\Delta_i$$ its extra risk over the refusal, so $$M_s = \Delta_s = 0$$. With a strategy $$\pi$$ over the candidates and the LLM's penalty control $$\lambda \in [0, 1]$$, the value of the Safety Game is

$$
\max_{\pi} \min_{\lambda} \;
\underbrace{\frac{1}{\beta+1} \sum_i \pi_i M_i}_{\text{benign user}}
\; - \;
\underbrace{\frac{\beta}{\beta+1} \, \lambda \Big( \sum_i \pi_i \Delta_i - T \Big)}_{\text{adversarial user}} .
$$

For large enough $$\beta$$ the inner minimisation simply enforces the budget, and the game reduces to the linear program

$$
\max_{\pi \in \Delta^m} \; \sum_i \pi_i M_i
\quad \text{subject to} \quad
\sum_i \pi_i \Delta_i \le T .
$$

The paper also proves the rule stays safe when the scores are noisy: if every risk score is off by at most $$\varepsilon$$, tightening the budget to $$T - 2\varepsilon$$ guarantees the true risk stays within $$T$$.

</details>

## Why the game matters

It would be easy to read the game as decoration on top of a reranking trick. It isn't. The game is what tells us _which_ rule to use, and each of the rule's two key choices comes straight from safe exploitation:

- **Measure everything relative to refusing.** In poker, you judge an adapted strategy by how much it gains, and how much more exploitable it gets, compared with the baseline. Here, every answer is scored by how much more helpful and how much riskier it is than a refusal, so the refusal is always the safe fallback.
- **Bound the risk of the whole strategy, not of each answer.** Exploitability is a property of a whole strategy. In the same way, the budget limits the _overall_ risk of the assistant's mix of answers.

The second choice is what the obvious alternative, a simple filter that blocks every answer above a risk cutoff, can't do. A borderline answer that the safety scorer is unsure about gets thrown away by a filter at any cutoff. The game can still use it, mixed with safer answers so that the overall risk stays within budget. In our experiments, these borderline answers were often ones that human reviewers judged safe, and recovering them is where the game's advantage over filtering came from.

## Limits, and the next game

Safety Game is only as good as its scores. When a model is too small to judge its own answers reliably, the game is playing with bad information; plugging in a stronger external scorer fixes this, because measuring and deciding are separate jobs. The budget $$T$$ is currently tuned on a small development set for each task, and the game covers single question-answer exchanges, not whole conversations.

The game-theoretic view also points to what comes next:

- **Multi-turn games.** Real conversations are sequential, and a careful adversary can spread a harmful request over several turns.
- **Multi-player Safety Games.** A user, a developer and a regulator all have a stake in what the model says, and their goals differ. The same machinery can balance several players rather than one safety budget.

## Read more

The full paper, with the proofs and experiments, is on [arXiv](https://arxiv.org/abs/2510.09330) and was published at [ICML 2026](https://icml.cc/Conferences/2026) in Seoul. The citation entry, with a BibTeX button, is below. This is joint work with [Long Tran-Thanh](https://warwick.ac.uk/fac/sci/dcs/people/long_tran-thanh/) at the University of Warwick.

<script src="{{ '/assets/js/safety-game-post.js' | relative_url }}" defer></script>
