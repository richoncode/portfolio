# Draft — LinkedIn post (Spatial F1 · race day audio)

**Status:** draft for Richard review — do not post  
**Accuracy:** MuddleAndMix briefing 2026-10-25  
**Visual:** OBS ~20–40s — unmute → play → Chase → into dual-sided stands then under bridge; Show on; Max reverb up; optional mute engine to hear crowd/wind. Cover: freeze under bridge with probe fan + wet bars.  
**Demo:** https://richoncode.github.io/webartests/explainers/spatial-f1/  
**Word count (body):** ~230

---

## Post body (copy)

Race-day telemetry, with sound that comes from the physics

US Grand Prix day at Circuit of the Americas. I put a car on that track in the browser with OpenF1 car data — RPM, throttle, gear, brake, speed from a prior Austin race weekend on this same circuit, not today’s live feed — and asked what it should *sound* like when the surroundings change.

Not a recording of a real F1 car. A Web Audio engine voice locked to the telemetry: pitch from RPM, load from throttle, a short accent on gear changes. Presets are configuration (Throaty V8 by default, plus a few others), not a sample library. Same thread as the Forza work I wrote about recently — engine sound from the car’s physics and state, not a canned loop — just in the browser against race telemetry this time.

Then the room. About a hundred ray probes look left, right, and up at what’s around the car — buildings, footbridges, open sky — and drive an I3DL2-style reverb. Hard surfaces and near hits push the wetness up continuously; open air falls back toward quiet. Nature rarely jumps, so the mapping stays continuous instead of flipping with hard conditionals. Crowd, wind, and tire cues ride along too. Probe hits and the wet meter are on the page (Show starts on).

Unofficial fan demo. Not affiliated with Formula 1. Link in the first comment.

What would you want to hear next from live-timing data?

---

## First comment (copy)

Spatial F1 (COTA / OpenF1): https://richoncode.github.io/webartests/explainers/spatial-f1/

How car_data maps into the engine view: https://richoncode.github.io/webartests/explainers/spatial-f1/engine-data-mapping.html

OpenF1: https://openf1.org/

Earlier thread (physics audio / Forza → FireSim): https://www.linkedin.com/posts/richoncode_throwbackthursday-webgpu-threejs-activity-7513982778485448704-qLxd

(In-browser synth locked to the trace — not recorded F1 engines. Fuller Engine Sim path is later work.)

---

## Accuracy lock (from MuddleAndMix)
- Cache: Austin race session 9888, driver 1 laps 52–53 (+ other cars). Do **not** claim today’s live 11396 feed.
- Engine: Web Audio synth; Throaty V8 default live (PR #131); Show probes on by default; not full physical engine sim / not Engine Sim WASM yet.
- Reverb: continuous hardness×rolloff wetness; Min/Max only; ~97 rays; material tables are design tables not measured venue acoustics.
- Also audible: crowd on grandstands, speed wind, tire from corner/brake g.
- Don’t: Quintar product, official F1/FIA audio, AI framing, Send/Wet/bridgeWeight, years fluff.
