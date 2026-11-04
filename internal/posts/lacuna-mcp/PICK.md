# #MCPMonday pick for Monday Nov 9: Lacuna Research MCP (status: draft, awaiting Richard's yes)

## Verified 2026-11-04
- Endpoint: https://lacuna.tiptreesystems.com/api/mcp (remote streamable HTTP, no auth; initialize 200, read-only).
- Docs: https://lacuna.tiptreesystems.com/mcp and https://github.com/tiptreesystems/lacuna-research-mcp
- 13 tools: search_lacuna, get_hypothesis, get_direction, get_direction_papers, get_paper, get_resource, get_author_papers, get_author_directions, get_author_context, get_author_neighbors, get_venue_context, get_institution_context, get_institution_authors.
- Live check: search_lacuna (hypotheses) for "spatial audio head-related transfer function" returned "A Thousand Simulated Heads: MRI-Derived Population Priors for Sparse HRTF Personalization" (https://lacuna.tiptreesystems.com/hypothesis/a-thousand-simulated-heads-mri-derived-population-priors-for-sparse-hrtf-c512e7362c4d9e69).
- Not on the hub (hub: earthdata, huggingface, mapbox, scenario). Cloudflare (Nov 2 draft) was never built or posted; it stays available as a backup.

## Demo concept: mcpmondays/lacuna/ "The idea that isn't a paper yet"
- Full-viewport light constellation. On load, real research directions fade in as solid nodes with their paper counts, then within ~2 s one glowing node lights up between two of them: a Lacuna-generated proposal bridging those clusters. Its card slides in with title and a 3-4 sentence abstract.
- Seed chips: Spatial audio (HRTF), AR depth and occlusion, Sim-to-real acoustics, Robot hearing. Switching a chip replays the reveal. A thin tool-chip strip shows the real call path: search_lacuna, get_direction, get_direction_papers, get_hypothesis.
- Click a direction for its paper orbit and one-line summary; click the glow for the proposal card with a link to the Lacuna page.
- Honest label on the hero: "Visualizes Lacuna MCP results. Solid nodes are clusters of published papers; the glowing card is a Lacuna-generated proposal, not a published paper. Snapshot of real MCP calls."
- "Download 1200x1200 post image" renders the current constellation and card (light theme).
- Below the fold: connect snippet (the URL above, no key), three prompts to try.
- Data: baked JSON from live MCP calls at build time. No account needed, so nothing blocks the build.
- Seeds already verified: direction 8752 (depth perception ambiguity in AR), 10339 (HRTF personalization), 28194 (acoustic sim-to-real gap, 531 papers), the HRTF hypothesis above, robot-hearing hypotheses from the 10/29 check.
