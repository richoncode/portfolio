# Draft — LinkedIn post (Spatial F1 · race day audio)

**Status:** draft for Richard review — do not post  
**Pending:** MuddleAndMix accuracy pass on audio/reverb claims  
**Visual:** OBS clip of Spatial F1 chase + audible engine/reverb (light LinkedIn UI)  
**Demo:** https://richoncode.github.io/webartests/explainers/spatial-f1/  
**Word count (body):** ~220

---

## Post body (copy)

Race-day telemetry, with sound that comes from the physics

It’s US Grand Prix day at Circuit of the Americas. I built a small browser demo that puts a car on that track using OpenF1 car data — real RPM, throttle, gear, and speed from a cached race window — and then asks a simple question: what should that car *sound* like?

Not a recording. A Web Audio engine voice dyno-locked to the telemetry: pitch follows RPM, load follows throttle, gear changes get a short accent. The voicing is configuration (V6 and a few other presets), not a sample library. Same physical-modeling habit I’ve used on other sims — synthesize from the state, don’t play a file.

Then the room. Side and overhead ray probes look at what’s around the car — walls, bridges, open sky — and drive an I3DL2-style reverb so the note changes when the surroundings change. You can toggle the reverb and the probe rays on the page.

Unofficial fan demo. Not affiliated with Formula 1. Link in the first comment.

What would you want to hear next from live-timing data?

---

## First comment (copy)

Spatial F1 (COTA / OpenF1): https://richoncode.github.io/webartests/explainers/spatial-f1/

How the car_data fields map into the engine view: https://richoncode.github.io/webartests/explainers/spatial-f1/engine-data-mapping.html

OpenF1: https://openf1.org/

(Engine Sim by Ange Yaghi is later work — this page uses an in-browser synth locked to the trace.)

---

## Notes for Richard
- Race session today: OpenF1 session_key 11396, Austin, 2026-10-25 20:00–22:00 UTC. Demo cache is still 2025 Austin (9888) — say “race data from COTA” / don’t claim today’s live feed unless MM swapped cache.
- Avoid Quintar / spatial-intelligence framing.
- Video: chase cam with reverb + probe viz on for ~20–40s; record with OBS tab audio.
