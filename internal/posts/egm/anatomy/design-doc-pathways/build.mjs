// Design review on two surfaces, as one Anatomy bench. One elephant (the deep-context design session) stands on a
// plinth at the back and stamps one spec card on its press; a cash railway carries the same card to two lanes.
// Left lane: the card becomes a Markdown scroll on two rollers. Right lane: the same card becomes a rich HTML board
// whose diagram, mock and status panels open in place. In each lane the same reviewer (a wooden mannequin) and the
// same goldfish (a zero-context reader in its bowl) read the surface; every question rides a carrier back to the
// elephant and the answer rides back. A desk clock and a click counter run in each lane until it reads "ready".
// The turn counts are the story's, not a measurement.
//   node build.mjs            dark page        node build.mjs --light    light page
//   node build.mjs --video    the 1920 x 1080 video page (light), driven frame by frame by export.mjs
import { writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const SKILL = process.env.ANATOMY_KIT || join(homedir(), ".claude/skills/anatomy");
const k = await import(join(SKILL, "kit/iso-kit.mjs"));
const G = await import(join(SKILL, "kit/lathe.mjs"));
const { tubePieces, tubeSvg } = await import(join(SKILL, "kit/tube.mjs"));
const { kitScript } = await import(join(SKILL, "scripts/inline-kit.mjs"));

const HERE = dirname(fileURLToPath(import.meta.url));
const VIDEO = process.argv.includes("--video");
const theme = VIDEO || process.argv.includes("--light") ? "light" : "dark";

const WIDTH = 960;
const HEIGHT = 540;

// ---------- world ----------
const PLATE = { x: -262, y: -172, w: 524, d: 338, r: 10 };
const PLATE_H = 12;
const FOOT_H = 5;
const PLINTH = { x: -74, y: -166, w: 148, d: 72, r: 4 };
const PZ = 24; // plinth top
// the elephant is drawn in design units on a 16-high plinth and scaled about its own centre
const ES = 1.35, EY = -128;
const E3 = ([x, y, z]) => [x * ES, EY + (y - EY) * ES, PZ + (z - 16) * ES];
const LANE_X = [-128, 128]; // MD, HTML
const LECTERN_Y = 22; // front face of the document
const POST_LANE = [[-200, -72], [200, -72]];
const POST_HOME = [[-62, -140], [62, -140]];
const WIRE_Z = 96;
const CARRIER_DROP = 15; // carrier body hangs this far under the wire
const MAN = [[-212, 52], [212, 52]];
const BOWL = [[-66, 78], [66, 78]];
const BOWL_R = 13;
const BOWL_Z = 24;
const CONSOLE_Y = 112;

const P = k.fitProjection(
  [...k.boxCorners(PLATE, -PLATE_H - FOOT_H, 0), [0, -140, 100], ...POST_LANE.map(([x, y]) => [x, y, WIRE_Z + 6]), ...POST_HOME.map(([x, y]) => [x, y, WIRE_Z + 6])],
  WIDTH,
  HEIGHT - 66,
  { pad: 16, azimuth: 90, elevation: 30 },
);
const KS = G.scaleOf(P);
const V = G.viewOf(P);
const at = (point) => k.iso(point, P);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const D = (points, style) => k.dotsSvg(points, style);
const depth = (p) => G.dot3(p, V);
const r1 = (n) => Math.round(n * 100) / 100;
const pt = ([x, y]) => `${r1(x)},${r1(y)}`;

// ---------- small helpers ----------
const screwRing = (points, z, r = 2) => L(points.map(([x, y]) => k.ring(x, y, r, z, P, 14)).join(""), { tone: "lo" }) + D(points.map(([x, y]) => at([x, y, z])), { size: 0.45 });
function labelPlate(plan, z) {
  const out = [S(k.slabOf(plan, z, 0.8, P, 3), { tone: "lo", crease: "none" })];
  out.push(L(k.planOutline(k.insetPlan(plan, 1.4), z + 0.8, P, 3), { tone: "faint" }));
  const y0 = plan.y + plan.d / 2 - 2.4;
  [0.78, 0.55, 0.66].forEach((f, i) => out.push(L(k.lineOnTop([plan.x + 3, y0 + i * 2.4], [plan.x + 3 + (plan.w - 6) * f, y0 + i * 2.4], z + 0.8, P), { tone: "lo", free: true })));
  return out.join("");
}

// ---------- base ----------
function plate() {
  const out = [`<path class="iso-halo" d="${k.haloOf(PLATE, -PLATE_H - FOOT_H, PLATE_H, P)}"/>`];
  const feet = k.corners(PLATE, 26).sort((a, b) => depth([a[0], a[1], 0]) - depth([b[0], b[1], 0]));
  for (const [x, y] of feet) {
    out.push(S(k.cylinder(x, y, 8, -PLATE_H - FOOT_H, 1.8, P, 28), { tone: "lo" }));
    out.push(S(k.cylinder(x, y, 6, -PLATE_H - FOOT_H + 1.8, FOOT_H - 1.8, P, 28), { tone: "mid" }));
  }
  out.push(S(k.slabOf(PLATE, -PLATE_H, PLATE_H, P, 8, 1.6), { tone: "mid" }));
  out.push(L(k.planOutline(k.insetPlan(PLATE, 5), 0, P), { tone: "lo" }));
  out.push(screwRing(k.corners(PLATE, 11), 0, 2.2));
  // the centre seam between the two lanes: a shallow groove, one surface, two ways to read it
  out.push(L(k.planOutline({ x: -1.6, y: -86, w: 3.2, d: 246, r: 1.4 }, 0, P, 3), { tone: "faint" }));
  // front ruler strip with ticks hanging from its edge
  const strip = { x: -230, y: PLATE.y + PLATE.d - 16, w: 460, d: 7, r: 1 };
  out.push(S(k.slabOf(strip, 0, 0.6, P, 3), { tone: "lo", crease: "none" }));
  const ticks = k.topTicks(strip.x + 4, strip.x + strip.w - 4, 5, 5, strip.y + 0.8, 0.6, [2, 3.8], P);
  out.push(L(ticks.minor, { tone: "lo" }), L(ticks.major, { tone: "mid" }));
  out.push(D([at([strip.x + 2, strip.y + 3.5, 0.6]), at([strip.x + strip.w - 2, strip.y + 3.5, 0.6])], { size: 0.45 }));
  return out.join("");
}

// ---------- the elephant and its press ----------
const BODY_F = G.frameAlong([0, -152, 47], [0, 1, 0]);
const BODY_LEN = 42;
const bodyR = (s) => 12.6 * Math.sqrt(Math.max(0, 1 - ((s - BODY_LEN / 2) / (BODY_LEN / 2)) ** 2));
const bodySlope = (s) => {
  const u = (s - BODY_LEN / 2) / (BODY_LEN / 2);
  const q = Math.max(1e-4, 1 - u * u);
  return (-12.6 * u) / (Math.sqrt(q) * (BODY_LEN / 2));
};
function plinth() {
  const out = [];
  out.push(`<path class="iso-halo" d="${k.haloOf(PLINTH, 0, PZ, P)}" style="opacity:.5"/>`);
  out.push(S(k.slabOf(PLINTH, 0, PZ, P, 6, 1.2), { tone: "mid", inner: L(k.sideSeam(PLINTH, 5, P, 6), { tone: "faint" }) }));
  out.push(L(k.planOutline(k.insetPlan(PLINTH, 4), PZ, P, 6), { tone: "faint" }));
  out.push(screwRing(k.corners(PLINTH, 8), PZ, 1.8));
  out.push(labelPlate({ x: 26, y: PLINTH.y + PLINTH.d - 13, w: 34, d: 9, r: 1 }, PZ));
  return out.join("");
}
function elephant() {
  const out = [];
  const W = (p) => E3(p);
  const legs = [[-9, -142], [9, -142], [-9, -120], [9, -120]];
  const leg = ([lx, ly]) => {
    const [x, y] = W([lx, ly, 16]);
    return S(k.cylinder(x, y, 5.2 * ES, PZ, 1.6, P, 28), { tone: "lo" }) + S(k.cylinder(x, y, 4.4 * ES, PZ + 1.6, (38 - 16) * ES - 1.6, P, 28), { tone: "mid", inner: L(k.sideArc(x, y, 4.4 * ES, PZ + 5, P, 16), { tone: "faint" }) }) + D([-3, 0, 3].map((dx) => at([x + dx, y + 4.6 * ES, PZ + 0.9])), { size: 0.55, tone: "mid" });
  };
  legs.slice(0, 2).forEach((p) => out.push(leg(p)));
  const prof = [];
  for (let i = 0; i <= 24; i++) {
    const s = (i / 24) * BODY_LEN;
    prof.push([s * ES, Math.max(0.01, bodyR(s) * ES), 1]);
  }
  const BF = G.frameAlong(W([0, -152, 47]), [0, 1, 0]);
  const slope = (s) => bodySlope(s / ES);
  out.push(S(G.solidOf(prof, BF, P, { smooth: { slope } }), { tone: "hi", inner: L(G.arcOf(BF, 14 * ES, bodyR(14) * ES, P, { slope: bodySlope(14) }), { tone: "faint" }) }));
  legs.slice(2).forEach((p) => out.push(leg(p)));
  for (const x of [-13, 13]) {
    const F = G.frameAlong(W([x, -107, 61]), [0, 1, 0]);
    out.push(S(G.disc(-0.9, 0.9, 10.2 * ES, F, P), { tone: "mid", inner: L(G.circleOf(F, 0.9, 7.4 * ES, P, 56), { tone: "faint" }) }));
  }
  out.push(S(G.sphereOf(W([0, -104, 58.5]), 9.4 * ES, P), { tone: "hi" }));
  for (const x of [-4.2, 4.2]) out.push(...tube([W([x, -96.6, 53]), W([x * 1.2, -93, 50.5]), W([x * 1.3, -90.6, 47.5])], 1.1, "hi"));
  out.push(D([at(W([-5.4, -96.4, 61.2])), at(W([5.4, -96.4, 61.2]))], { size: 1.1, tone: "mid" }));
  return out.join("");
}
// the trunk comes down from the face and rests on the press's knob
const PRESS_Y = -79;
const PRESS_TOP = 40;
const TRUNK = G.fillet([E3([0, -96.6, 55]), E3([0, -92.4, 49]), [0, -84, PRESS_TOP + 9], [0, PRESS_Y, PRESS_TOP + 1.8]], 3.4, 7);
function trunk() {
  return tube(TRUNK, (t) => 4.2 - 2.2 * t, "hi", { maxLength: 8 }).join("");
}

function pressBack() {
  const out = [];
  const bed = { x: -24, y: PRESS_Y - 9, w: 48, d: 18, r: 2 };
  out.push(S(k.slabOf(bed, 0, 12, P, 4, 0.8), { tone: "mid", inner: L(k.sideSeam(bed, 6, P, 4), { tone: "faint" }) }));
  out.push(L(k.planOutline(k.insetPlan(bed, 2.6), 12, P, 4), { tone: "faint" }));
  out.push(D(k.corners(bed, 3).map(([x, y]) => at([x, y, 12])), { size: 0.45 }));
  for (const x of [-18, 18]) out.push(S(k.cylinder(x, PRESS_Y, 3, 12, 2, P, 20), { tone: "mid" }), S(k.cylinder(x, PRESS_Y, 1.9, 14, PRESS_TOP - 20, P, 18), { tone: "mid", crease: "none", inner: L(k.sideArc(x, PRESS_Y, 1.9, 30, P, 12), { tone: "faint" }) }));
  const head = { x: -22, y: PRESS_Y - 5, w: 44, d: 10, r: 2 };
  out.push(S(k.slabOf(head, PRESS_TOP - 6, 6, P, 4, 0.6), { tone: "mid" }));
  out.push(D([at([-18, PRESS_Y, PRESS_TOP]), at([18, PRESS_Y, PRESS_TOP])], { size: 0.5 }));
  return out.join("");
}
function pressKnob() {
  return S(k.cylinder(0, PRESS_Y, 4.2, PRESS_TOP, 1.4, P, 24), { tone: "lo" }) + S(k.cylinder(0, PRESS_Y, 3.2, PRESS_TOP + 1.4, 0.4, P, 24), { tone: "hi" });
}
function ram() {
  // the ram and platen are built at rest (up) and moved down along z when the elephant presses
  return S(k.cylinder(0, PRESS_Y, 2.4, 24, PRESS_TOP - 30, P, 18), { tone: "hi", crease: "none" }) + S(k.slabOf({ x: -14, y: PRESS_Y - 6, w: 28, d: 12, r: 1.4 }, 20, 4, P, 3, 0.5), { tone: "hi" });
}
const CARD = { w: 22, d: 12, h: 1 };
function card(cx, cy, z, tone = "hi") {
  const plan = { x: cx - CARD.w / 2, y: cy - CARD.d / 2, w: CARD.w, d: CARD.d, r: 0.6 };
  const lines = [0.7, 0.45, 0.6].map((f, i) => k.lineOnTop([plan.x + 2, plan.y + 2.2 + i * 2.2], [plan.x + 2 + (CARD.w - 4) * f, plan.y + 2.2 + i * 2.2], z + CARD.h, P)).join("");
  return S(k.slabOf(plan, z, CARD.h, P, 2), { tone, crease: "lo" }) + L(lines, { tone: "lo", free: true });
}

// ---------- railway posts, wires and carriers ----------
function post([x, y], z0, out = [], arm = 1) {
  out.push(S(k.cylinder(x, y, 4.6, z0, 2, P, 24), { tone: "lo" }));
  out.push(screwRing([[x + 3.2, y], [x - 3.2, y]].map(([a, b]) => [a, b]), z0 + 2, 0.7));
  out.push(S(k.cylinder(x, y, 2, z0 + 2, WIRE_Z - z0 + 2, P, 18), { tone: "mid", crease: "none", inner: L(k.sideArc(x, y, 2, z0 + 30, P, 12) + k.sideArc(x, y, 2, z0 + 60, P, 12), { tone: "faint" }) }));
  out.push(S(k.cylinder(x, y, 2.8, WIRE_Z + 4, 1.6, P, 18), { tone: "mid" }));
  // pulley wheel: a disc on a horizontal axis, edge on to the wire
  const F = G.frameAlong([x, y, WIRE_Z + 2.1], [0.92 * arm, 0.38, 0]);
  out.push(S(G.disc(-0.9, 0.9, 3.2, F, P), { tone: "hi", inner: L(G.circleOf(F, 0.9, 1.2, P, 20), { tone: "lo" }) }));
  return out;
}
const WIRES = [0, 1].map((i) => [[POST_HOME[i][0], POST_HOME[i][1], WIRE_Z], [POST_LANE[i][0], POST_LANE[i][1], WIRE_Z]]);
function wire(i) {
  const [a, b] = WIRES[i];
  return tube([a, b], 0.45, "mid", { maxLength: 400 }).join("");
}
// a cash carrier: two grooved wheels on the wire, a yoke and a small box that hangs under it; built at the home end
function carrier(i, load) {
  const [a, b] = WIRES[i];
  const dir = G.unit3(G.sub3(b, a));
  const side = G.unit3(G.cross3([0, 0, 1], dir));
  const out = [];
  const wheels = [-4.5, 4.5].map((s) => G.add3(a, G.mul3(dir, s)));
  for (const w of wheels) {
    const F = G.frameAlong(G.add3(w, [0, 0, 1.6]), side);
    out.push(S(G.disc(-1, 1, 2.8, F, P), { tone: "mid", inner: L(G.circleOf(F, 1, 1, P, 16), { tone: "lo" }) }));
  }
  const yoke = G.add3(a, [0, 0, -4]);
  out.push(...tube([G.add3(wheels[0], [0, 0, 1.6]), G.add3(wheels[0], [0, 0, -4]), G.add3(wheels[1], [0, 0, -4]), G.add3(wheels[1], [0, 0, 1.6])], 0.45, "mid", { maxLength: 400 }));
  const box = { x: yoke[0] - 7, y: yoke[1] - 4.5, w: 14, d: 9, r: 1.6 };
  out.push(S(k.slabOf(box, WIRE_Z - CARRIER_DROP, 9, P, 3, 0.6), { tone: "hi", lit: true, inner: L(k.sideSeam(box, WIRE_Z - CARRIER_DROP + 3.5, P, 3), { tone: "faint" }) }));
  out.push(...tube([G.add3(yoke, [0, 0, -1.2]), [yoke[0], yoke[1], WIRE_Z - CARRIER_DROP + 9]], 0.6, "mid", { maxLength: 400 }));
  if (load) out.push(`<g data-load>${card(yoke[0], yoke[1] + 1, WIRE_Z - CARRIER_DROP - 3.4)}</g>`);
  // the question tag hangs on the carrier's front face while it rides out
  const tm = k.sideMatrix([yoke[0] - 4, box.y + box.d], WIRE_Z - CARRIER_DROP + 7.6, P, "left");
  out.push(`<g data-tag transform="${tm}"><rect class="dp-tag" x="0" y="0" width="8" height="6.4" rx="0.8"/><text class="dp-tagtext" x="4" y="5.1" text-anchor="middle">?</text></g>`);
  return out.join("");
}

// ---------- the lane documents ----------
const LECT = (cx) => ({ base: { x: cx - 48, y: LECTERN_Y - 12, w: 96, d: 22, r: 3 }, face: { x0: cx - 41, x1: cx + 41, z0: 14, z1: 72 } });
function lecternBack(cx, kind) {
  const { base } = LECT(cx);
  const out = [];
  out.push(`<path class="iso-halo" d="${k.haloOf(base, 0, 8, P)}" style="opacity:.55"/>`);
  out.push(S(k.slabOf(base, 0, 8, P, 5, 0.9), { tone: "mid", inner: L(k.sideSeam(base, 4, P, 5), { tone: "faint" }) }));
  out.push(screwRing(k.corners(base, 5), 8, 1.4));
  // back board the document leans on
  const back = { x: cx - 42, y: LECTERN_Y - 6, w: 84, d: 3, r: 0.8 };
  out.push(S(k.slabOf(back, 8, 66, P, 2), { tone: kind === "md" ? "lo" : "mid" }));
  return out.join("");
}
function cheek(cx, x) {
  const plan = { x: x - 2.6, y: LECTERN_Y - 10, w: 5.2, d: 12, r: 1.2 };
  return S(k.slabOf(plan, 8, 70, P, 3, 0.5), { tone: "mid", inner: L(k.sideSeam(plan, 40, P, 3), { tone: "faint" }) }) + D([at([x, LECTERN_Y - 4, 78])], { size: 0.5 });
}
function roller(cx, z, r) {
  const F = G.frameAlong([cx - 43.4, LECTERN_Y + r - 1, z], [1, 0, 0]);
  return S(G.solidOf([[0, r * 0.7], [1.2, r * 0.7], [1.2, r], [85.6, r], [85.6, r * 0.7], [86.8, r * 0.7]], F, P), { tone: "hi", crease: "lo" });
}
function knurlRoller(cx, z, r) {
  const F = G.frameAlong([cx - 43.4, LECTERN_Y + r - 1, z], [1, 0, 0]);
  return k.fadedSvg(G.ribsOf(F, 1.2, 4.4, r, 22, P, { fade: [0.1, 0.55] }), { tone: "lo" });
}
// the face plane of a lectern: local (u, v) = (world x from x0, world z down from z1), at y = LECTERN_Y
const faceMatrix = (cx) => k.sideMatrix([cx - 41, LECTERN_Y], 72, P, "left");

// Markdown: one long column of text set as rule lines, headings, a table and a fenced block that describes a diagram
function mdContent() {
  const out = [];
  let v = 4;
  const line = (u0, u1, tone = "lo", w = 0.7) => out.push(`<path class="dp-ink" data-tone="${tone}" d="M${r1(u0)},${r1(v)}L${r1(u1)},${r1(v)}" style="stroke-width:${w}"/>`);
  const para = (n, seed) => {
    for (let i = 0; i < n; i++) {
      const f = i === n - 1 ? 0.35 + ((seed * 7 + i * 3) % 5) * 0.08 : 0.86 + ((seed + i) % 3) * 0.04;
      line(5, 5 + 70 * f, "mid", 0.6);
      v += 2.6;
    }
    v += 2.2;
  };
  const head = (w) => { line(5, 5 + w, "hi", 1.6); v += 4.2; };
  const table = (rows) => {
    const top = v - 1.4;
    for (let r = 0; r <= rows; r++) { out.push(`<path class="dp-ink" data-tone="faint" d="M5,${r1(top + r * 3.2)}L75,${r1(top + r * 3.2)}"/>`); }
    for (const u of [5, 26, 50, 75]) out.push(`<path class="dp-ink" data-tone="faint" d="M${u},${r1(top)}L${u},${r1(top + rows * 3.2)}"/>`);
    for (let r = 0; r < rows; r++) for (const [u, w] of [[7, 14], [28, 18], [52, 16]]) out.push(`<path class="dp-ink" data-tone="lo" d="M${u},${r1(top + r * 3.2 + 1.6)}L${u + w * (0.6 + ((r + u) % 4) * 0.1)},${r1(top + r * 3.2 + 1.6)}"/>`);
    v = top + rows * 3.2 + 4;
  };
  const fence = (n) => {
    const top = v - 1.6;
    out.push(`<path class="dp-ink" data-tone="faint" d="M4,${r1(top)}L76,${r1(top)}L76,${r1(top + n * 2.6 + 1.4)}L4,${r1(top + n * 2.6 + 1.4)}Z"/>`);
    for (let i = 0; i < n; i++) { const ind = [0, 4, 8, 4, 8, 0, 4][i % 7]; line(8 + ind, 8 + ind + 18 + ((i * 5) % 22), "lo", 0.6); v += 2.6; }
    v += 3.6;
  };
  for (let s = 0; s < 6; s++) {
    head(18 + (s % 3) * 8);
    para(4 + (s % 2), s);
    if (s % 3 === 1) table(4);
    if (s % 3 === 2) fence(6);
    para(3, s + 3);
  }
  return { svg: out.join(""), height: v };
}
const MD = mdContent();
// rich HTML: four panels in place; each opens over the board when the reviewer selects it
const TILES = [
  { key: "diagram", u: 4, v: 4, w: 35, h: 23 },
  { key: "mock", u: 43, v: 4, w: 35, h: 23 },
  { key: "status", u: 4, v: 31, w: 35, h: 23 },
  { key: "explain", u: 43, v: 31, w: 35, h: 23 },
];
function tileContent(key, w, h) {
  const box = (x, y, bw, bh, tone = "lo") => `<rect class="dp-box" data-tone="${tone}" x="${r1(x)}" y="${r1(y)}" width="${r1(bw)}" height="${r1(bh)}" rx="0.8"/>`;
  const ink = (d, tone = "lo", wd = 0.6) => `<path class="dp-ink" data-tone="${tone}" d="${d}" style="stroke-width:${wd}"/>`;
  if (key === "diagram") {
    return box(3, 8, 8, 6) + box(14, 4, 8, 6) + box(14, 13, 8, 6) + box(25, 8, 7, 6, "mid") + ink(`M11,11L14,7M11,11L14,16M22,7L25,11M22,16L25,11`) + ink(`M3,${h - 3}L${w - 3},${h - 3}`, "faint");
  }
  if (key === "mock") {
    return box(3, 3, w - 6, 4, "faint") + box(3, 9, 9, h - 12, "faint") + ink(`M15,10.5L${w - 5},10.5M15,13.5L${w - 9},13.5M15,16.5L${w - 7},16.5`) + box(w - 12, h - 7, 8, 3.6, "mid");
  }
  if (key === "status") {
    return [0, 1, 2].map((r) => `<circle class="dp-led" data-led="${r}" cx="5" cy="${r1(5 + r * 6)}" r="1.6"/>` + ink(`M9,${r1(5 + r * 6)}L${r1(9 + 16 + r * 3)},${r1(5 + r * 6)}`)).join("") + box(3, h - 5, w - 6, 2.4, "faint") + `<rect class="dp-bar" x="3" y="${h - 5}" width="${r1((w - 6) * 0.45)}" height="2.4" rx="0.8"/>`;
  }
  return ink(`M4,${h - 5}C10,${h - 16} 16,${h - 4} 22,${h - 13}S30,${h - 9} ${w - 4},${h - 15}`, "mid", 0.8) + ink(`M4,4L4,${h - 4}L${w - 4},${h - 4}`, "faint") + ink(`M7,5L19,5M7,8L15,8`);
}
function htmlBoard() {
  const tiles = TILES.map((t) => `<g data-tile="${t.key}" data-u="${t.u}" data-v="${t.v}" data-w="${t.w}" data-h="${t.h}"><rect class="dp-tile" x="${t.u}" y="${t.v}" width="${t.w}" height="${t.h}" rx="1.4"/><g transform="translate(${t.u} ${t.v})">${tileContent(t.key, t.w, t.h)}</g></g>`).join("");
  const cursor = `<path data-part="cursor" class="dp-cursor" d="M0,0L0,6.2L1.6,4.7L2.8,7.4L3.8,6.9L2.6,4.3L4.8,4.3Z"/>`;
  return `<rect class="dp-screen" x="0" y="0" width="82" height="58" rx="2"/><g data-part="tiles">${tiles}</g><rect data-part="dim" class="dp-dim" x="0" y="0" width="82" height="58" rx="2" opacity="0"/><g data-part="zoom"></g>${cursor}`;
}
function lecternFace(cx, kind) {
  const m = faceMatrix(cx);
  const id = `face-${kind}`;
  const clip = `<clipPath id="${id}"><rect x="0" y="0" width="82" height="58" rx="1"/></clipPath>`;
  if (kind === "md") {
    // the paper unrolls from the top roller; its text column scrolls under it
    return `<g transform="${m}">${clip}<clipPath id="unroll-md"><rect data-part="unroll" x="0" y="0" width="82" height="0"/></clipPath><g clip-path="url(#${id})"><g clip-path="url(#unroll-md)"><g data-part="paper-md"><rect class="dp-paper" x="0" y="0" width="82" height="58"/><g data-part="scroll"><g transform="translate(1 0)">${MD.svg}</g></g></g></g></g><rect class="dp-frame" x="0" y="0" width="82" height="58" rx="1"/></g>`;
  }
  return `<g transform="${m}">${clip}<g clip-path="url(#${id})"><g data-part="board" opacity="0">${htmlBoard()}</g></g><rect class="dp-frame" x="0" y="0" width="82" height="58" rx="2"/></g>`;
}

// ---------- the reviewer: a wooden artist's mannequin ----------
function mannequin([x, y], dirX) {
  const out = [];
  const f = (dx, dy, z) => [x + dx * dirX, y + dy, z];
  out.push(`<path class="iso-halo" d="${k.haloOf({ x: x - 11, y: y - 11, w: 22, d: 22, r: 11 }, 0, 0.1, P)}" style="opacity:.45;filter:blur(3px)"/>`);
  out.push(S(k.cylinder(x, y, 11, 0, 2.6, P, 40, 0.6), { tone: "mid" }));
  out.push(L(k.ring(x, y, 8.4, 2.6, P, 40), { tone: "faint" }));
  // far leg, then the far arm, the body, then the near leg and arm, so the near limbs sit in front
  const legPts = (side) => [f(0, side * 3.6, 39), f(1.8, side * 4, 22), f(0, side * 4.4, 4.4)];
  const leg = (side) => {
    const [hip, knee, ankle] = legPts(side);
    return [
      ...tube([hip, knee], 2.2, "hi"),
      S(G.sphereOf(knee, 2.5, P), { tone: "hi" }),
      ...tube([knee, ankle], 1.9, "hi"),
      S(k.slabOf({ x: ankle[0] - 3 + 2 * dirX, y: ankle[1] - 1.8, w: 6, d: 3.6, r: 1.4 }, 2.6, 2, P, 3), { tone: "hi" }),
    ].join("");
  };
  const armPts = (side, raised) => raised
    ? [f(0, side * 6.8, 61), f(6.8, side * 9.6, 53.5), f(15, side * 7.6, 59)]
    : [f(0, side * 6.8, 61), f(0.6, side * 8.4, 50), f(1.4, side * 8.6, 40.5)];
  const arm = (side, raised) => {
    const [sh, el, hand] = armPts(side, raised);
    return [S(G.sphereOf(sh, 2.3, P), { tone: "hi" }), ...tube([sh, el], 1.7, "hi"), S(G.sphereOf(el, 1.9, P), { tone: "hi" }), ...tube([el, hand], 1.5, "hi"), S(G.sphereOf(hand, 2, P), { tone: "hi" })].join("");
  };
  const near = 1; // +y faces the viewer
  out.push(leg(-near), arm(-near, false));
  out.push(S(G.sphereOf(f(0, 0, 40), 4.4, P), { tone: "hi" }));
  const TF = G.frameAlong(f(0, 0, 42), [0, 0, 1]);
  const torso = [[0, 4.4, 1], [3, 3.9, 1], [7, 3.5, 1], [11, 4.6, 1], [15, 6.2, 1], [18.6, 6.4, 1], [20.4, 5.2, 1], [21.6, 3]];
  out.push(S(G.solidOf(torso, TF, P), { tone: "hi", inner: L(G.arcOf(TF, 7, 3.5, P), { tone: "faint" }) }));
  out.push(...tube([f(0, 0, 63.4), f(0.3, 0, 67.4)], 1.5, "hi"));
  out.push(`<g data-part="head">${S(G.solidOf([[0, 0.01], [1.2, 3.2, 1], [4, 4.6, 1], [7.4, 4.8, 1], [10.6, 4, 1], [12.6, 2.2, 1], [13.4, 0.01]], G.frameAlong(f(0.6, 0, 66.2), [0.12 * dirX, 0, 1]), P), { tone: "hi" })}</g>`);
  out.push(leg(near), arm(near, true));
  return out.join("");
}

// ---------- the goldfish in its bowl ----------
function bowlStand([x, y]) {
  return S(k.cylinder(x, y, 9, 0, 2, P, 32, 0.5), { tone: "mid" }) + S(k.cylinder(x, y, 3.6, 2, 6, P, 20), { tone: "mid", crease: "none" }) + S(k.cylinder(x, y, 6.6, 8, 2, P, 28), { tone: "mid" });
}
function bowl([x, y], i, dirX) {
  const c = at([x, y, BOWL_Z]);
  const rad = BOWL_R * KS;
  const id = `bowl-${i}`;
  const waterZ = BOWL_Z + 5;
  const wr = Math.sqrt(BOWL_R ** 2 - 5 ** 2);
  const wc = at([x, y, waterZ]);
  const ell = k.ring(x, y, wr, waterZ, P, 48);
  const rimZ = BOWL_Z + 10.2;
  const rimR = Math.sqrt(BOWL_R ** 2 - 10.2 ** 2);
  // the fish swims in the plane of the bowl's centre, facing the document (local u along world x)
  const fm = k.sideMatrix([x, y], BOWL_Z, P, "left");
  const fish = `<g data-part="fish"><g transform="scale(${dirX} 1)"><path class="dp-fish" d="M-5.2,0C-3.2,-3 2,-3.2 4.2,-0.4C2.6,2.6 -2.8,3 -5.2,0Z"/><path class="dp-fin" d="M4,-0.4L7.6,-3.2L7,0L7.6,2.6Z"/><path class="dp-fin" d="M-0.8,-2.6L1.4,-4.4L2,-2.4Z"/><circle class="dp-eye" cx="-3.2" cy="-0.7" r="0.55"/></g></g>`;
  return [
    `<clipPath id="${id}"><circle cx="${r1(c[0])}" cy="${r1(c[1])}" r="${r1(rad - 0.3)}"/></clipPath>`,
    `<circle class="dp-glass" cx="${r1(c[0])}" cy="${r1(c[1])}" r="${r1(rad)}"/>`,
    `<g clip-path="url(#${id})"><path class="dp-water" d="${ell}"/><rect class="dp-water" x="${r1(c[0] - rad)}" y="${r1(wc[1])}" width="${r1(rad * 2)}" height="${r1(rad * 2)}"/>`,
    `<path class="dp-surface" d="${ell}"/>`,
    `<g transform="${fm}"><g data-part="swim">${fish}</g></g></g>`,
    L(k.ring(x, y, rimR, rimZ, P, 40), { tone: "mid" }),
    `<path class="dp-glint" d="${describeArc(c, rad - 2.4, 215, 255)}"/>`,
    `<circle class="dp-rim" cx="${r1(c[0])}" cy="${r1(c[1])}" r="${r1(rad)}"/>`,
  ].join("");
}
function describeArc([cx, cy], r, a0, a1) {
  const p = (a) => [cx + r * Math.cos((a * Math.PI) / 180), cy + r * Math.sin((a * Math.PI) / 180)];
  const [x0, y0] = p(a0), [x1, y1] = p(a1);
  return `M${r1(x0)},${r1(y0)}A${r1(r)},${r1(r)} 0 0 1 ${r1(x1)},${r1(y1)}`;
}

// ---------- the console: desk clock, click counter, ready lamp and the lane's name plate ----------
const CLOCK_R = 9.6;
const clockAt = (cx) => [cx - 24, CONSOLE_Y];
const CONSOLE_H = 12;
function consoleBody(cx, name) {
  const plan = { x: cx - 44, y: CONSOLE_Y - 11, w: 88, d: 22, r: 3 };
  const out = [`<path class="iso-halo" d="${k.haloOf(plan, 0, CONSOLE_H, P)}" style="opacity:.5"/>`];
  out.push(S(k.slabOf(plan, 0, CONSOLE_H, P, 5, 1), { tone: "mid" }));
  out.push(L(k.planOutline(k.insetPlan(plan, 2.4), CONSOLE_H, P, 5), { tone: "faint" }));
  // name plate engraved on the front face, and the counter window
  const fm = k.sideMatrix([cx - 40, CONSOLE_Y + 11], CONSOLE_H - 2.4, P, "left");
  out.push(`<g transform="${fm}"><rect class="dp-plate" x="0" y="0" width="38" height="7.2" rx="0.8"/><text class="dp-name" x="19" y="5.1" text-anchor="middle">${name}</text><rect class="dp-window" x="48" y="-0.4" width="18" height="8" rx="0.8"/><text data-part="count" class="dp-digits" x="57" y="5.9" text-anchor="middle">0</text><circle class="dp-screw" cx="71" cy="3.6" r="0.5"/><circle class="dp-screw" cx="44" cy="3.6" r="0.5"/></g>`);
  // clock puck
  const [x, y] = clockAt(cx);
  const top = CONSOLE_H + 4;
  out.push(S(k.cylinder(x, y, CLOCK_R, CONSOLE_H, 4, P, 56, 0.6), { tone: "hi", crease: "lo" }));
  out.push(L(k.sideArc(x, y, CLOCK_R, CONSOLE_H + 1.6, P, 32), { tone: "faint" }));
  out.push(L(k.ring(x, y, CLOCK_R - 1.6, top, P, 56), { tone: "lo" }));
  const ticks = k.radialTicks(x, y, CLOCK_R - 2.2, 60, 5, top, [1, 2.2], P);
  out.push(L(ticks.minor, { tone: "faint" }), L(ticks.major, { tone: "mid" }));
  out.push(L(k.ring(x, y, 1.1, top, P, 12), { tone: "mid" }));
  // the counter's reset key and the ready lamp
  out.push(S(k.slabOf({ x: cx + 4, y: CONSOLE_Y - 5, w: 6, d: 5, r: 1 }, CONSOLE_H, 1.6, P, 2, 0.3), { tone: "mid" }));
  out.push(S(k.cylinder(cx + 30, CONSOLE_Y, 4.2, CONSOLE_H, 1.2, P, 24), { tone: "lo" }));
  out.push(`<g data-part="lamp" class="dp-lamp">${S(k.cylinder(cx + 30, CONSOLE_Y, 3, CONSOLE_H + 1.2, 2.2, P, 24), { tone: "hi" })}</g>`);
  out.push(screwRing([[plan.x + 4, plan.y + 4], [plan.x + plan.w - 4, plan.y + 4]], CONSOLE_H, 1.1));
  return out.join("");
}
const needleAt = (cx, turn) => {
  const [x, y] = clockAt(cx);
  const a = turn * Math.PI * 2;
  return k.lineOnTop([x - Math.sin(a) * 2, y + Math.cos(a) * 2], [x + Math.sin(a) * (CLOCK_R - 3), y - Math.cos(a) * (CLOCK_R - 3)], CONSOLE_H + 4.2, P);
};

// ---------- the flag that rises on the lane post when the lane reads ready ----------
function flag([x, y]) {
  const plate = { x: x + 2, y: y - 0.6, w: 13, d: 1.2, r: 0.4 };
  return S(k.slabOf(plate, 8, 8, P, 2), { tone: "hi", crease: "lo" }) + S(k.cylinder(x, y, 2.6, 6.6, 10.8, P, 16), { tone: "mid" });
}

// ---------- tubes ----------
function tube(points, radius, tone, opts = {}) {
  return tubePieces(points, radius, P, { maxLength: 30, ...opts }).map((piece) => tubeSvg(piece, { tone }));
}

// ---------- assemble, back to front ----------
const items = [];
const put = (p, svg, bias = 0) => items.push({ key: depth(p) + bias, svg });
put([0, -130, 0], plinth(), -40);
put([0, -130, 30], elephant(), -20);
put([0, PRESS_Y, 20], pressBack(), -10);
put([0, PRESS_Y, 20], `<g data-part="ram">${ram()}</g>` + `<g data-part="spec">${card(0, PRESS_Y, 12)}</g>`, -9.9);
put([0, PRESS_Y, 50], `<g data-part="knob">${pressKnob()}</g>` + trunk(), -9.8);
[0, 1].forEach((i) => put([POST_HOME[i][0], POST_HOME[i][1], 0], post(POST_HOME[i], PZ, [], i ? 1 : -1).join(""), 0));
[0, 1].forEach((i) => {
  const cx = LANE_X[i];
  const kind = i ? "html" : "md";
  put([cx, LECTERN_Y - 6, 0], lecternBack(cx, kind), -6);
  put([cx, LECTERN_Y, 30], lecternFace(cx, kind) + (kind === "md" ? roller(cx, 73, 4.6) + knurlRoller(cx, 73, 4.6) + roller(cx, 14, 4.6) + knurlRoller(cx, 14, 4.6) : "") + cheek(cx, cx - 44) + cheek(cx, cx + 44), -5);
  put([POST_LANE[i][0], POST_LANE[i][1], 0], post(POST_LANE[i], 0, [], i ? 1 : -1).join("") + `<g data-part="flag-${i}">${flag(POST_LANE[i])}</g>`, 0);
  put([MAN[i][0], MAN[i][1], 0], mannequin(MAN[i], i ? -1 : 1), 0);
  put([BOWL[i][0], BOWL[i][1], 0], bowlStand(BOWL[i]) + bowl(BOWL[i], i, i ? 1 : -1), 0);
  put([cx, CONSOLE_Y, 0], consoleBody(cx, i ? "HTML" : "MARKDOWN") + `<path data-part="needle-${i}" class="iso-line" data-tone="lit" data-free="start" d="${needleAt(cx, 0)}" style="stroke-width:1"/>`, 0);
});
items.sort((a, b) => a.key - b.key);
// the railway rides over everything: wires, then carriers
const rail = [0, 1].map((i) => wire(i)).join("") + [0, 1].map((i) => `<g data-part="carrier-${i}">${carrier(i, true)}</g>`).join("");

const svg = k.figureSvg({
  width: WIDTH,
  height: HEIGHT,
  label:
    "One elephant on a plinth stamps one design card on a press. Overhead wires carry the same card to two lanes. Left, the card becomes a Markdown scroll on rollers; right, a rich HTML board whose diagram, mock and status panels open in place. In each lane the same wooden mannequin and the same goldfish in a bowl read the surface, each question rides a carrier back to the elephant, and a desk clock and click counter run until the lane's ready lamp lights.",
  body: [plate(), ...items.map((i) => i.svg), rail],
});

// ---------- timeline ----------
// All motion is a pure function of t in [0, T), so the page and the video export draw identical frames.
const T = 24;
const TL = {
  T,
  press: [0.2, 1.0], // hand-off stamp
  out: [1.0, 3.0], // carriers ride to the lanes with the card
  drop: [3.0, 3.6], // card lands, the surfaces come up
  reviewFrom: 3.6,
  // questions: [leave lane, reach elephant, leave elephant, back at lane]
  trips: [
    [[5.0, 6.1, 6.7, 7.8], [8.2, 9.3, 9.9, 11.0], [11.4, 12.5, 13.1, 14.2], [14.6, 15.7, 16.3, 17.4]],
    [[7.0, 8.1, 8.7, 9.8]],
  ],
  ready: [17.9, 10.3],
  tiles: [[4.0, 5.2, "diagram"], [5.5, 6.7, "mock"], [10.6, 11.6, "status"], [12.0, 13.0, "explain"]],
  payoff: [18.6, 22.0],
  end: [22.0, 24.0],
  beats: [
    [0, 3.6, "Hand-off", "One design-first spec, sent to both surfaces"],
    [3.6, 7.0, "Review", "Same reviewer, same goldfish, same design intent"],
    [7.0, 17.9, "Clarify", "Each question goes back to the design session, and the answer returns"],
    [17.9, 18.6, "Ready", "Both lanes reach a shared understanding"],
  ],
};

const live = `
const P = ${JSON.stringify(P)};
const TL = ${JSON.stringify(TL)};
const LANE_X = ${JSON.stringify(LANE_X)}, WIRES = ${JSON.stringify(WIRES)};
const CLOCK_R = ${CLOCK_R}, CONSOLE_H = ${CONSOLE_H}, CONSOLE_Y = ${CONSOLE_Y};
const MD_H = ${r1(MD.height)};
const PRESS_Y = ${PRESS_Y}, POST_HOME = ${JSON.stringify(POST_HOME)}, WIRE_Z = ${WIRE_Z}, CARRIER_DROP = ${CARRIER_DROP};
const LECTERN_Y = ${LECTERN_Y};
const VIDEO = ${VIDEO};
const root = document.querySelector(".dp-stage");
const svg = root.querySelector("svg");
const $ = (n) => svg.querySelector('[data-part="' + n + '"]');
const all = (sel) => [...svg.querySelectorAll(sel)];
const clockAt = (cx) => [cx - 24, CONSOLE_Y];
const needleAt = ${needleAt.toString().replace("k.lineOnTop", "lineOnTop")};
const carriers = [0, 1].map((i) => $("carrier-" + i));
const needles = [0, 1].map((i) => $("needle-" + i));
const flags = [0, 1].map((i) => $("flag-" + i));
const lamps = all('[data-part="lamp"]');
const counts = all('[data-part="count"]');
const swims = all('[data-part="swim"]');
const heads = all('[data-part="head"]');
const scroll = $("scroll"), paper = $("paper-md"), unrollEl = $("unroll"), board = $("board"), dim = $("dim"), zoom = $("zoom"), cursor = $("cursor");
const ram = $("ram"), knob = $("knob"), spec = $("spec");
const tiles = Object.fromEntries(all("[data-tile]").map((el) => [el.dataset.tile, el]));
const leds = all(".dp-led");
const bar = svg.querySelector(".dp-bar");
const readout = document.querySelector("[data-readout]");
const beatEl = document.querySelector("[data-beat]");
const beatHead = document.querySelector("[data-beat-head]");
const payoff = document.querySelector("[data-payoff]");
const endCard = document.querySelector("[data-end]");
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const ease = (x) => { x = clamp(x); return x * x * (3 - 2 * x); };
const span = (t, [a, b]) => ease((t - a) / (b - a));
const bump = (t, a, b) => Math.sin(Math.PI * clamp((t - a) / (b - a)));

function tripState(t, trip) {
  const [a, b, c, d] = trip;
  if (t < a || t >= d) return null;
  if (t < b) return { f: span(t, [a, b]), dir: "out" };
  if (t < c) return { f: 1, dir: "wait", w: (t - b) / (c - b) };
  return { f: 1 - span(t, [c, d]), dir: "back" };
}
// carrier position as a share of the wire from the home (elephant) end: 0 home, 1 lane
function carrierShare(t, lane) {
  if (t < TL.out[0]) return { s: 0, load: t > TL.press[1] - 0.15 };
  if (t < TL.out[1]) return { s: span(t, TL.out), load: true };
  if (t < TL.drop[1]) return { s: 1, load: t < TL.drop[0] + 0.15 };
  for (const trip of TL.trips[lane]) {
    const st = tripState(t, trip);
    if (st) return st.dir === "out" ? { s: 1 - st.f, load: false, q: true } : st.dir === "wait" ? { s: 0, load: st.w > 0.55 } : { s: 1 - st.f, load: true };
  }
  return { s: 1, load: false };
}
function count(t, lane) { return TL.trips[lane].filter((trip) => t >= trip[3]).length; }
function readyAt(lane) { return TL.ready[lane]; }
function reviewTime(t, lane) { return clamp(Math.min(t, readyAt(lane)) - TL.reviewFrom, 0, 99); }
// the elephant presses once at the hand-off and once for every answer
function pressShare(t) {
  let p = bump(t, TL.press[0], TL.press[1]);
  for (const lane of [0, 1]) for (const trip of TL.trips[lane]) p = Math.max(p, bump(t, trip[1] + 0.05, trip[2] - 0.05));
  return p;
}
let lastText = "";
function render(t) {
  t = ((t % TL.T) + TL.T) % TL.T;
  // press and knob
  const p = pressShare(t);
  ram.setAttribute("transform", translateAlong(P, [0, 0, -7.2 * p]));
  knob.setAttribute("transform", translateAlong(P, [0, 0, -1.2 * p]));
  spec.style.opacity = t < TL.press[0] + 0.5 ? 0 : t < TL.out[0] + 0.1 ? 1 : 0;
  // carriers along their wires
  for (const lane of [0, 1]) {
    const [a, b] = WIRES[lane];
    const st = carrierShare(t, lane);
    carriers[lane].setAttribute("transform", translateAlong(P, [(b[0] - a[0]) * st.s, (b[1] - a[1]) * st.s, 0]));
    carriers[lane].querySelector("[data-load]").style.opacity = st.load ? 1 : 0;
    carriers[lane].toggleAttribute("data-question", !!st.q);
  }
  // Markdown: paper unrolls, then the reader scrolls down a long column; every answer adds lines at the end
  const unroll = span(t, TL.drop);
  unrollEl.setAttribute("height", (58 * unroll).toFixed(2));
  const mdRead = reviewTime(t, 0) / (readyAt(0) - TL.reviewFrom);
  scroll.setAttribute("transform", "translate(0 " + (-(MD_H - 50) * mdRead).toFixed(2) + ")");
  // HTML: the board lights up, then each panel opens in place while the cursor selects it
  board.setAttribute("opacity", unroll.toFixed(3));
  let open = null, amt = 0;
  for (const [a, b, key] of TL.tiles) { const v = bump(t, a, b); if (v > amt) { amt = v; open = key; } }
  if (t >= TL.ready[1] + 0.6 && t < TL.tiles[2][0]) amt = 0;
  dim.setAttribute("opacity", (0.55 * amt).toFixed(3));
  for (const [key, el] of Object.entries(tiles)) {
    if (key === open && amt > 0.001) {
      const u = +el.dataset.u, v = +el.dataset.v, w = +el.dataset.w, h = +el.dataset.h;
      const sc = 1 + 1.05 * amt, cx = u + w / 2, cy = v + h / 2, tx = (41 - cx) * amt, ty = (29 - cy) * amt;
      el.setAttribute("transform", "translate(" + (cx + tx).toFixed(2) + " " + (cy + ty).toFixed(2) + ") scale(" + sc.toFixed(3) + ") translate(" + (-cx) + " " + (-cy) + ")");
      el.parentNode.appendChild(el);
      el.setAttribute("data-open", "");
    } else { el.removeAttribute("transform"); el.removeAttribute("data-open"); }
  }
  // cursor glides to the panel about to open
  const next = TL.tiles.find(([a, b]) => t < b) || TL.tiles[0];
  const tile = tiles[next[2]];
  const goal = [+tile.dataset.u + +tile.dataset.w * 0.6, +tile.dataset.v + +tile.dataset.h * 0.55];
  const glide = span(t, [next[0] - 0.8, next[0]]);
  const prev = TL.tiles[TL.tiles.indexOf(next) - 1];
  const from = prev ? (() => { const tl = tiles[prev[2]]; return [+tl.dataset.u + +tl.dataset.w * 0.6, +tl.dataset.v + +tl.dataset.h * 0.55]; })() : [70, 50];
  const cx = from[0] + (goal[0] - from[0]) * glide, cy = from[1] + (goal[1] - from[1]) * glide;
  cursor.setAttribute("transform", "translate(" + cx.toFixed(2) + " " + cy.toFixed(2) + ")");
  cursor.style.opacity = t > TL.drop[1] && t < TL.tiles[3][1] ? 1 : 0;
  // status LEDs: amber until the answer returns, then green; the progress bar fills as the review converges
  const htmlDone = t >= TL.trips[1][0][3];
  leds.forEach((el, i) => el.setAttribute("data-state", t < TL.drop[1] ? "off" : (htmlDone || i === 0) ? "ok" : "wait"));
  if (bar) bar.setAttribute("width", ((29 * (0.25 + 0.75 * clamp(reviewTime(t, 1) / (readyAt(1) - TL.reviewFrom))))).toFixed(2));
  // clocks, counters, lamps, flags
  for (const lane of [0, 1]) {
    needles[lane].setAttribute("d", needleAt(LANE_X[lane], reviewTime(t, lane) / 16));
    const n = String(count(t, lane));
    if (counts[lane].textContent !== n) counts[lane].textContent = n;
    const ready = t >= readyAt(lane);
    lamps[lane].toggleAttribute("data-on", ready);
    flags[lane].setAttribute("transform", translateAlong(P, [0, 0, 74 * span(t, [readyAt(lane), readyAt(lane) + 0.9])]));
    flags[lane].style.opacity = span(t, [readyAt(lane) - 0.05, readyAt(lane) + 0.25]).toFixed(3);
  }
  // the goldfish swims; the reviewer leans in a little while reading
  swims.forEach((el, i) => el.setAttribute("transform", "translate(" + (2.4 * Math.sin(t * 1.3 + i)).toFixed(2) + " " + (0.8 * Math.sin(t * 2.1 + i)).toFixed(2) + ")"));
  heads.forEach((el, i) => el.setAttribute("transform", translateAlong(P, [0, 0, -0.5 * Math.max(0, Math.sin(t * 1.7 + i * 2))])));
  // words
  const md = count(t, 0), ht = count(t, 1);
  const asking = (lane) => TL.trips[lane].some(([a, , , d]) => t >= a && t < d);
  const say = (lane) => (t < TL.drop[1] ? "waiting" : t >= readyAt(lane) ? "ready" : asking(lane) ? "clarifying" : "reading");
  const text = "Markdown: " + say(0) + " · HTML: " + say(1);
  if (readout && text !== lastText) { readout.textContent = text; lastText = text; }
  const beat = TL.beats.find(([a, b]) => t >= a && t < b);
  if (beatEl) { beatHead.textContent = beat ? beat[2] : ""; beatEl.textContent = beat ? beat[3] : ""; }
  const pay = Math.min(span(t, [TL.payoff[0], TL.payoff[0] + 0.6]), 1 - span(t, [TL.payoff[1] - 0.3, TL.payoff[1]]));
  if (payoff) payoff.style.opacity = pay.toFixed(3);
  if (endCard) endCard.style.opacity = Math.min(span(t, [TL.end[0], TL.end[0] + 0.5]), 1 - span(t, [TL.T - 0.45, TL.T])).toFixed(3);
  const cap = root.querySelector(".dp-caption");
  if (cap) cap.style.opacity = (1 - Math.max(pay, endCard ? +endCard.style.opacity : 0)).toFixed(3);
}
window.__render = render;
window.__T = TL.T;
const still = matchMedia("(prefers-reduced-motion: reduce)");
let frame = 0, start = 0, visible = !VIDEO;
function tick(now) {
  if (!start) start = now;
  render((now - start) / 1000);
  frame = visible && !still.matches ? requestAnimationFrame(tick) : 0;
}
const fixed = (location.hash.match(/t=([0-9.]+)/) || [])[1];
if (fixed !== undefined) render(+fixed);
else if (VIDEO) render(0);
else if (still.matches) render(12);
else {
  new IntersectionObserver((e) => { visible = e[e.length - 1].isIntersecting; if (visible && !frame) frame = requestAnimationFrame(tick); }, { rootMargin: "120px 0px" }).observe(root);
  render(0);
}
`;

const CSS = `
.dp-stage{position:relative}
.dp-stage svg{display:block;width:100%;height:auto}
.dp-paper{fill:var(--dp-sheet)}
.dp-screen{fill:var(--dp-screen)}
.dp-frame{fill:none;stroke:var(--anatomy-mid);stroke-width:.6}
.dp-ink{fill:none;stroke-width:.7;stroke-linecap:round}
.dp-ink[data-tone="mid"],.dp-box[data-tone="mid"]{stroke:var(--anatomy-mid)}
.dp-ink[data-tone="lo"],.dp-box[data-tone="lo"]{stroke:var(--anatomy-lo)}
.dp-ink[data-tone="faint"],.dp-box[data-tone="faint"]{stroke:var(--anatomy-faint)}
.dp-box{fill:var(--dp-sheet);stroke-width:.6}
.dp-tile{fill:var(--dp-sheet);stroke:var(--anatomy-lo);stroke-width:.6}
[data-open] .dp-tile{stroke:var(--anatomy-hi);stroke-width:.5}
.dp-dim{fill:var(--dp-screen)}
.dp-led{fill:var(--dp-sheet);stroke:var(--anatomy-lo);stroke-width:.5}
.dp-led[data-state="wait"]{fill:var(--dp-amber);stroke:none}
.dp-led[data-state="ok"]{fill:var(--dp-green);stroke:none}
.dp-bar{fill:var(--anatomy-mid)}
.dp-cursor{fill:var(--anatomy-hi);stroke:var(--dp-sheet);stroke-width:.4;stroke-linejoin:round}
.dp-glass{fill:var(--dp-glass)}
.dp-water{fill:var(--dp-water)}
.dp-surface{fill:none;stroke:var(--anatomy-lo);stroke-width:.5}
.dp-rim{fill:none;stroke:var(--anatomy-mid);stroke-width:.6}
.dp-glint{fill:none;stroke:var(--dp-glint);stroke-width:1.2;stroke-linecap:round}
.dp-fish{fill:var(--dp-gold);stroke:var(--dp-gold-edge);stroke-width:.35}
.dp-fin{fill:var(--dp-gold-fin);stroke:var(--dp-gold-edge);stroke-width:.3;stroke-linejoin:round}
.dp-eye{fill:var(--anatomy-hi)}
.dp-plate{fill:var(--anatomy-face);stroke:var(--anatomy-lo);stroke-width:.5}
.dp-name{font:600 3.6px/1 var(--anatomy-mono);letter-spacing:.12em;fill:var(--anatomy-mid)}
.dp-window{fill:var(--dp-window);stroke:var(--anatomy-lo);stroke-width:.5}
.dp-digits{font:600 5.6px/1 var(--anatomy-mono);fill:var(--dp-digit)}
.dp-screw{fill:var(--anatomy-mid)}
.dp-tag{fill:var(--dp-amber);stroke:var(--dp-gold-edge);stroke-width:.4}
.dp-tagtext{font:700 5.4px/1 ui-sans-serif,system-ui,sans-serif;fill:#fff}
[data-tag]{opacity:0;transition:none}
[data-question] [data-tag]{opacity:1}
.dp-lamp[data-on] path:not(.iso-edge){fill:var(--dp-green)!important}
[data-question] [data-load]{opacity:0}
.dp-caption{position:absolute;left:0;right:0;bottom:3.2%;display:flex;flex-direction:column;align-items:center;gap:.2em;pointer-events:none;text-align:center}
.dp-beat-head{font:600 clamp(11px,1.5vw,22px)/1.1 var(--anatomy-mono);letter-spacing:.14em;text-transform:uppercase;color:var(--anatomy-muted)}
.dp-beat{font:500 clamp(14px,2.2vw,34px)/1.2 ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif;color:var(--anatomy-strong)}
.dp-payoff,.dp-end{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;pointer-events:none;opacity:0;padding:0 6%}
.dp-payoff{background:linear-gradient(to bottom,transparent 0,var(--dp-veil) 30%,var(--dp-veil) 70%,transparent 100%)}
.dp-payoff b{font:600 clamp(18px,3vw,48px)/1.2 ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif;color:var(--anatomy-strong);max-width:22em}
.dp-payoff i{font:400 clamp(12px,1.6vw,24px)/1.3 ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif;font-style:normal;color:var(--anatomy-muted);margin-top:.9em}
.dp-end{background:var(--anatomy-card)}
.dp-end b{font:600 clamp(22px,3.6vw,58px)/1.15 ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif;color:var(--anatomy-strong);max-width:16em}
.iso{--dp-sheet:#1a1a1a;--dp-screen:#151515;--dp-glass:#ffffff0d;--dp-water:#6b9bff1f;--dp-glint:#ffffff59;--dp-gold:#d9963a;--dp-gold-fin:#b97a2a;--dp-gold-edge:#7a4f17;--dp-window:#0d0d0d;--dp-digit:#e6e6e6;--dp-green:#5cc48a;--dp-amber:#d9a21b;--dp-veil:#131313e6}
.iso[data-theme="light"]{--dp-sheet:#fbfbfa;--dp-screen:#efefed;--dp-glass:#00000008;--dp-water:#3d72d61c;--dp-glint:#ffffffd9;--dp-gold:#e39a3b;--dp-gold-fin:#c97f22;--dp-gold-edge:#8a5714;--dp-window:#2a2a2a;--dp-digit:#f3f3f1;--dp-green:#2f9e62;--dp-amber:#c98d10;--dp-veil:#ffffffeb}
${VIDEO ? `body{margin:0;background:var(--anatomy-card)}.iso-page{width:100vw;margin:0}.dp-stage{width:100vw;height:100vh;display:flex;align-items:center;justify-content:center;background:var(--anatomy-card)}.dp-stage svg{width:100vw;height:100vh}` : ""}
`;

const caption = `<div class="dp-caption"><span class="dp-beat-head" data-beat-head>Hand-off</span><span class="dp-beat" data-beat>One design-first spec, sent to both surfaces</span></div>`;
const payoffEl = `<div class="dp-payoff" data-payoff><b>Same design-first goal — richer surface, faster human&#8596;AI alignment.</b><i>Curious to try EGM-style Q&amp;A + Goldfish on both.</i></div>`;
const endEl = `<div class="dp-end" data-end><b>Design review on two surfaces</b></div>`;
const stage = `<div class="dp-stage" role="img" aria-label="Animated figure: one design session hands the same spec to a Markdown lane and a rich HTML lane; questions travel back and forth until each lane is ready.">${svg}${caption}${payoffEl}${endEl}</div>`;

const page = (body, width) => k.pageHtml({ title: "Design review on two surfaces", theme, body: `<style>${CSS}</style>${body}`, script: kitScript() + live, width });
if (VIDEO) {
  writeFileSync(join(HERE, "video.html"), page(stage, 1920));
  console.log("wrote video.html");
} else {
  const body = k.plateHtml({
    fig: "Fig 1",
    title: "Design review on two surfaces",
    hint: "Loops every 24 s",
    readout: "Markdown: waiting · HTML: waiting",
    keys: [
      { mark: "raised", label: "Elephant: the deep-context design session" },
      { mark: "flat", label: "Goldfish: a zero-context reader" },
      { mark: "dim", label: "Mannequin: the same human reviewer in both lanes" },
      { mark: "lit", label: "Carrier: one question out, one answer back" },
    ],
    caption: "The same spec goes to both lanes. The desk clock runs and the counter clicks for every question until the lane's lamp lights. Turn counts follow the story, not a measurement.",
    body: stage,
  });
  const name = theme === "light" ? "design-doc-pathways-light.html" : "design-doc-pathways.html";
  writeFileSync(join(HERE, name), page(body, 1100));
  console.log("wrote", name);
}
