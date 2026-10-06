# Portfolio Project — Claude Code Guidelines

## Style Guide
Live reference: **https://richoncode.github.io/portfolio/styleguide.html**
Source: `styleguide.html` (re-uses `src/css/main.css`)

Before writing or modifying any UI code, consult the style guide to ensure
consistency. Validate new components against it after implementation.

---

## Stack
- Static HTML + vanilla JS + CSS — no build step, no framework
- Single data source: `src/data/resume.json`
- Devices tab: `src/data/devices.json` (facts taken from the resume; do not invent)
- Served via GitHub Pages at `https://richoncode.github.io/portfolio`
- Cache-bust assets via `?v=N` query strings on CSS/JS in `index.html`
  — **bump version on every CSS or JS change**

---

## Design Tokens (CSS Variables)

| Token | Value | Use |
|---|---|---|
| `--bg` | `#0d1117` | Page background |
| `--bg-card` | `#161b22` | Card / input background |
| `--border` | `#30363d` | Default borders |
| `--border-hover` | `#48535e` | Hover borders |
| `--text` | `#e6edf3` | Primary text |
| `--text-2` | `#8b949e` | Secondary / meta text |
| `--accent` | `#58a6ff` | Links, active states, focus rings |
| `--accent-2` | `#79c0ff` | Role titles, softer accent |
| `--green` | `#3fb950` | Positive indicators |
| `--orange` | `#d29922` | Warnings / dates |
| `--purple` | `#bc8cff` | Technical Management badge |
| `--red` | `#f85149` | Errors |
| `--font` | system-ui stack | Body typeface |
| `--mono` | SF Mono / Fira Code | Dates, codes, version |
| `--radius` | `8px` | Cards, inputs |

**Never use raw hex values** — always reference a token.

---

## Typography Rules

| Use | Size | Weight | Class |
|---|---|---|---|
| Profile name | 1.9rem | 700 | gradient `h1` |
| Section label | 0.7rem | 700 | uppercase, 0.1em spacing |
| Card title | 0.88–0.92rem | 500–600 | `.patent-title`, `.learn-card-title` |
| Body / intro | 1rem | 400 | `.intro-para`, line-height 1.85 |
| Cert row title | 0.85rem | 400 | `.learn-cert-title` |
| Meta / author | 0.72rem | 400 | `var(--text-2)` |
| Mono date | 0.72rem | 400 | `var(--mono)`, `white-space:nowrap` |
| Version | 0.6rem | 400 | `var(--mono)`, opacity 0.4 |

---

## Component Patterns

### Buttons
- **Tabs**: `.tab` / `.tab--active` — border-bottom accent underline
- **Filter toggle**: `.filter-toggle-btn` — ghost border, accent on hover
- **Filter chips**: `.learn-filter-chip` / `.learn-filter-chip--active` — pill, accent fill active
- **Patent toggle**: `.patent-toggle` — tiny pill, accent on hover
- **Clear**: `.clear-btn`

### Badges & Chips
- **Issuer badge**: `.learn-issuer-badge` — accent pill; link to course URL when available
- **Patent number**: `.patent-num` — mono bordered pill, `var(--text-2)`
- **Skill chip**: `.skill-chip` — bg-card bordered pill
- **Intro tag**: `.intro-tag-badge` — tiny uppercase category label
- **Role badge**: `.badge--ic` (blue) / `.badge--technical-management` (purple)
- **Reading status**: `.read-status--in-progress` (orange) / `.read-status--queued` / `.read-status--finished` (green)
- **Active count**: `.filter-active-count` — accent dot badge

### Cards
- **Content card**: `.learn-card` — bg-card, border, radius, hover border brightens
- **Device card**: `.device-card` — photo or “Photo needed” placeholder on top; `.device-name`; company in `--accent-2`; years in `--mono`; then `.device-block` labels Management / Hands-on technical. Thin copy uses `.device-block--confirm` and the text “Confirm with Richard”
- **Patent card**: `.patent-card` — minimal, hover bg, `.patent-summary` left-border accent
- **Timeline card**: `.tl-card` — bg-card border radius

### Sections
- Section title: `.learn-section-title` / `.skill-group-title` / `.patent-group-title`
  — 0.7rem, 700, uppercase, 0.1em letter-spacing, `var(--text-2)`
- Section dividers: `border-top: 1px solid var(--border)`; first child has no border

### Filter Bars
- `.learn-filter-bar` — flex wrap, 6px gap, aligns chips + count label
- Filter state held in module-level `Set`; use **event delegation** (single
  listener on container, attached once via `container._xyzListenerAttached` guard)
- Re-render entire section HTML on filter change; count label shows `N of total`

### Form Controls
- `#search-input` — bg-card, border, accent focus ring, `var(--text-2)` placeholder
- `.toggle-label` — checkbox + inline label

---

## Spacing Scale

| px | Usage |
|---|---|
| 4px | chip gap (tight) |
| 6px | filter chip gap |
| 8px | card inner gap |
| 12px | row gap |
| 16px | section gap |
| 24px | container padding |
| 28px | section top padding |

---

## Data Shape (`resume.json`)

```
profile.intro[]          {text, tags[]}
profile.name/title/…     string
learning.certifications[]{id, title, issuer, completedDate, url, duration, author, tags[]}
learning.volunteering[]  {id, organization, role, startDate?, endDate?, date?, current?, description?, url?}
experiences[]            {company, summary, roles[{title, roleTypes[], startDate, endDate, achievements[]}]}
                         — summary shows as a hover tooltip on Timeline cards;
                         **term** marks recruiting keywords rendered as <strong>
skills[]                 {category, items[]}
patents[]                {group, inventions[{id, title, numbers[], url, summary}]}
research[]               {id, title, url, date, subject, summary, tags, parent?, hidden?}
                         — flat index of ../webartests pages (excludes bryto reports/, scratch/);
                         sub-pages are their own entries with parent:<id> and a
                         "Parent · Sub" title; url is relative (../webartests/...);
                         tags is a ' · '-joined string; hidden:true keeps a
                         not-yet-public item out of the rendered list
publications[]           {title, venue, date, url}
reading[]                {title, authors[], publication, url, datePublished,
                          status, dateStarted, dateFinished, note?, tags[]?,
                          issue?, lastUpdated?}
                         — status: in-progress | queued | finished
                         (In progress, then Queued, then Finished);
                         datePublished is a calendar date (YYYY-MM-DD) when the
                         page states one, otherwise "";
                         issue is the publication issue line when that is all
                         the page gives (e.g. "2026 - September/October");
                         lastUpdated is the page's "Last updated" date when present.
                         Add the next entry by appending one object to reading[].
filterTaxonomy           {roles[], experiences[]}
```

### Devices tab (`src/data/devices.json`)

```
devices[]  {id, name, company, role, startDate, endDate, yearsLabel,
            image, imagePath, imageNote?, silhouette,
            links?[{label, url}],
            management{confirm, bullets[]}, handsOn{confirm, bullets[]},
            reference?{label, url, drawingsLabel, drawingsUrl, note}}
```

`image` is a repo path, or a URL the site already shows (for example a Videos-tab thumbnail). Otherwise leave it empty and set `imagePath` to `assets/devices/<id>.jpg`. A bullet may be a string or `{text, confirm:true}`. `confirm:true` on a section with no bullets renders “Confirm with Richard”. Keep anything on the cover-letter redact list out of this file.


Cert tags: `management` | `engineering` | `ai` | `performance` | `communication`
Intro tags: `engineering` | `management` | `ai` | `spatial` | `apple` | `culture`
Experience tags: see `filterTaxonomy.experiences` (use `xr` not `ar`/`vr`)

---

## Validation Checklist (run before every commit)

- [ ] CSS/JS asset `?v=N` bumped in `index.html`
- [ ] Only CSS tokens used (no raw hex)
- [ ] New buttons/chips follow existing class patterns
- [ ] New sections use `.learn-section-title` or equivalent label style
- [ ] Cards use `var(--bg-card)`, `var(--border)`, `var(--radius)`
- [ ] Hover states use `var(--border-hover)` or `var(--accent)`
- [ ] Links use `var(--accent)`, `text-decoration:none`, underline on hover
- [ ] Dates use `var(--mono)`, `white-space:nowrap`, `var(--text-2)`
- [ ] Filter bars use event delegation pattern (not per-button re-attach)
- [ ] New data fields documented in the Data Shape table above
- [ ] `styleguide.html` updated if new components are added
