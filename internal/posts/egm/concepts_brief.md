# LinkedIn post: engaging Google’s Elephant-Goldfish Model

* **Author:** Richard Bailey (Career Brand / Elephant session)
* **Date:** 2026-10-25
* **Status:** Brainstorm — thesis refined after Goldfish; unused ideas parked below

## Overview

A short LinkedIn post that joins the conversation around Google’s open-source Elephant-Goldfish Model (EGM, announced 2026-10-22 by Brian Suchy and Dave Rensin).

**Locked thesis (Richard, 2026-10-25):** EGM’s idea of rich, highly complete design documentation *before* construction can be taken further when those design docs are **rich HTML** — using the best visual and text tools for each aspect of the design (diagrams, mocks, sims, status, explainers). Commonality with EGM: design-first, complete specs before kicking off build. Richard’s lived friction: markdown often bottlenecked AI→human communication of complex concepts.

**Tone:** advanced, collaborative, not boastful; engage SOTA; “yes, and” not “EGM is wrong.” Curious to try useful EGM practices (clarifying Q&A, isolated Goldfish) and see how they perform — no invented metrics, no “SOTA” label, no HTML-vs-md format war framing (HTML as enhancement of the same design-first goal).

**Reader:** practitioners building with agents.

## Analysis

Prior Goldfish consensus still stands on craft: one thesis, one payoff, ≤2 in-body details, claim-language guardrails, sources in first comment. The thesis cut above resolves Blockers 1–3. All pre-draft opens now resolved: CTA, visual (Anatomy animation → video), first-comment links (all four), planning HTML (brief + beats storyboard).

## Beats storyboard (~220 words)

| # | Beat | Frame | Line |
| --- | --- | --- | --- |
| 1 | **Pain** | Wall of plain text between AI and human | Complex designs don’t travel well in thin text-only docs (AI ↔ human). |
| 2 | **EGM** | Elephant drafts → Goldfish reviews cold | Complete design before construction; Elephant plans, Goldfish review. |
| 3 | **Yes, and** | Same doc as rich HTML panels | Those design docs as rich HTML — diagram / mock / sim / status where each fits. |
| 4 | **Close** | Optional try-line → question | “Have rich docs changed how you review agent work?” |

## Goals vs. Non-Goals

* **In-Scope Goals:**
  * One thesis: design-first (EGM) × rich HTML collaboration docs.
  * Brief plain EGM one-liner (Elephant deep-context design; Goldfish fresh review).
  * Optional light “I’ll try Q&A / isolated Goldfish and see how they perform.”
  * ~200–300 words; keyword first line; links in first comment; no hashtags.

* **Out-of-Scope Non-Goals (this post):**
  * Arguing formats as rivals or correcting EGM evidence.
  * Full hub / ID scheme / embedded-JSON tutorial.
  * Measured Goldfish advantages.
  * MCP sandbox deep-dive; crow/wind Spatial F1 (other agent).

## Key Decisions & Staging for Next Steps

| Decision | Status |
| --- | --- |
| Thesis spine | **Locked:** rich complete design docs (EGM) further enhanced as rich HTML with best tool per aspect |
| EGM role | Design-first cousin; not ranked as SOTA |
| Author detail in-body | HTML as visual+text collaboration surface; md as past bottleneck (one line) |
| Claim language | “EGM describes…”, “I’ll be trying…”, “I’m curious…” — no proof numbers |
| Close | **Locked:** “Have rich docs changed how you review agent work?” |
| Visual | **Locked:** Anatomy-style animation → video (MD vs HTML dual pathways, same human; prompt drafted for Anatomy machine) |
| First-comment links | **Locked:** all four — Google Open Source blog, egm.dev, GitHub repo, Dave Rensin Medium essay |
| Planning HTML | **Locked:** brief + beats storyboard |
| Series | Unused concepts logged below for future posts |

**Recommended beats (~220 words):**
1. Pain: complex designs don’t travel well in thin text-only docs (AI↔human).
2. EGM: complete design before construction; Elephant plans, Goldfish review.
3. Yes, and: those design docs as rich HTML — diagram / mock / sim / status where each fits.
4. Optional try-line + closing question.

## Backlog — unused points for future posts

* Readable plan IDs (D1.APP, D1.MCP.P1.2) and sequential multi-doc plans
* Embedded JSON deps + orchestrator unblock; snapshot-shareable HTML
* Hub mirrored into project `docs/`
* Isolation: leaky casual sandboxes vs hard MCP-only sandboxes
* Same-context “built features before asked” anecdote
* Token / quality instrumentation of Goldfish (when tried)
* “Human judgment is the artifact” quote angle (credit Rensin/blog)
* Planning HTML as living demo of the thesis (meta)

## Sources (first comment)

* https://opensource.googleblog.com/2026/10/introducing-elephant-goldfish-model-plugin.html
* https://egm.dev/
* https://github.com/google/elephant-goldfish-model
* https://drensin.medium.com/elephants-goldfish-and-the-new-golden-age-of-software-engineering-c33641a48874

## Goldfish run notes

* Six-lens BRAINSTORM 2026-10-25; synthesizer nesting N/A — parallel dispatch.
* Working folder: `/workspace/egm-post/`
