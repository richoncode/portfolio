# Draft — LinkedIn post (Spatial F1 · race day audio)

**Status:** posted 2026-10-26 — https://lnkd.in/p/gCkPj24e  
**Accuracy:** MuddleAndMix briefing 2026-10-25 (+ PR #131 defaults)  
**Visual:** OBS ~20–40s — Chase into stands / under bridge; Max reverb up. Cover: under bridge with probes + wet bars.  
**Demo:** https://richoncode.github.io/webartests/explainers/spatial-f1/

---

## Post body (copy)

Race-day telemetry, with sound from the physics

US Grand Prix day at Circuit of the Americas. I put a car on that track in the browser using OpenF1 data from a prior Austin weekend on the same circuit — not today’s live feed — and asked what it should sound like when the surroundings change.

I’ve been trying different projects with different AIs to see how their effectiveness compares. This one came together over the weekend with a couple of movies on in the background.

Not a recording. A Web Audio engine locked to RPM and throttle, same idea as the Forza physics audio I’ve written about before. Ray probes look at walls and bridges and drive a continuous reverb — hard and close gets wetter; open air stays dry. Crowd, wind, and tire ride along.

Unofficial fan demo. Not affiliated with Formula 1. Links in the first comment.

---

## First comment (copy)

https://richoncode.github.io/webartests/explainers/spatial-f1/

https://richoncode.github.io/webartests/explainers/spatial-f1/engine-data-mapping.html

https://openf1.org/

https://www.linkedin.com/posts/richoncode_throwbackthursday-webgpu-threejs-activity-7513982778485448704-qLxd


---

## Accuracy lock (from MuddleAndMix)
- Cache: Austin 9888, not live 11396.
- Synth not recorded F1; Throaty V8 + Show on by default.
- Continuous hardness×rolloff wetness; don’t claim measured venue acoustics / Quintar / official F1.
