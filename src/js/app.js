'use strict';

// ─── Label Maps ───────────────────────────────────────────────────────────────

const ROLE_LABELS = {
  'ic':                   'Individual Contributor',
  'technical-management': 'Technical Management',
};

const EXPERIENCE_LABELS = {
  // experience types
  'architecture':  'Architecture',
  'performance':   'Performance',
  'product':       'Product',
  'prototyping':   'Prototyping',
  'api-design':    'API Design',
  'mentoring':     'Mentoring',
  'ml':            'AI',
  // domains
  'spatial-computing': 'Spatial',
  'visionos':          'VisionOS',
  'xr':                'XR',
  'ios':               'iOS',
  'android':           'Android',
  'cloud':             'Cloud',
  'gaming':            'Gaming',
  'automotive':        'Automotive',
  'industrial':        'Industrial',
  'web':               'Web',
  'audio':             'Audio',
  'video':             'Video',
  'mobile':            'Mobile',
  'desktop':           'Desktop',
  'embedded':          'Embedded',
  'hardware-software-codesign': 'Hardware/Software Codesign',
  'developer-tools':   'Dev Tools',
  'sports-tech':       'Sports Tech',
};

// ─── State ────────────────────────────────────────────────────────────────────

const state = {
  activeTypes:       new Set(),
  activeExperiences: new Set(),
  searchQuery:   '',
  metricsOnly:   false,
  showProjectTags: true,
  searchScores:  null
};

// Tabs whose content is chronological; each defaults to newest → oldest
const TIME_ORDERED_TABS = new Set(['experience', 'timeline', 'projects', 'research', 'learning']);
const tabSortNewestFirst = {
  experience: true,
  timeline:   true,
  projects:   true,
  research:   true,
  learning:   true,
};

let resumeData = null;

// ─── Hybrid Search Engine State ───────────────────────────────────────────────
let searchVectorsMeta = null;
let searchVectorsBin = null;
let searchPipeline = null;
let searchState = 'idle'; // 'idle', 'loading', 'thinking', 'ready', 'error'
let fuseSearch = null;
let isSearchLoadingStarted = false;

// ─── Admin Edit State ─────────────────────────────────────────────────────────

const adminEdits = {};                         // { id: { years, months } }
let   currentAdminPrompt = '';
let   popState = { id: null, years: 0, months: 0 };

// ─── Hybrid Search Implementation ─────────────────────────────────────────────

function setSemanticStatus(dataState) {
  const pill = document.getElementById('search-semantic-status');
  if (!pill) return;
  pill.dataset.state = dataState;
  if (dataState) {
    pill.style.display = 'inline-flex';
  } else {
    pill.style.display = 'none';
  }
  
  const label = pill.querySelector('.status-label');
  if (label) {
    if (dataState === 'loading') label.textContent = 'loading model...';
    else if (dataState === 'thinking') label.textContent = 'thinking...';
    else if (dataState === 'ready') label.textContent = 'vector search';
  }
}

async function startLoadingSearchEngine() {
  if (isSearchLoadingStarted) return;
  isSearchLoadingStarted = true;
  
  setSemanticStatus('loading');
  try {
    const [metaResp, binResp, transformersModule] = await Promise.all([
      fetch('./src/data/search-vectors-meta.json'),
      fetch('./src/data/search-vectors.bin'),
      import('https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.3.3')
    ]);
    
    if (!metaResp.ok || !binResp.ok) {
      throw new Error('Failed to load search indexes.');
    }
    
    searchVectorsMeta = await metaResp.json();
    const binBuffer = await binResp.arrayBuffer();
    searchVectorsBin = new Float32Array(binBuffer);
    
    const { pipeline, env } = transformersModule;
    env.allowLocalModels = false;
    
    // Disable multi-threading/SharedArrayBuffer & proxy workers to bypass 
    // cross-origin isolation blocks on standard static web hosts (GitHub Pages)
    env.backends.onnx.wasm.numThreads = 1;
    env.backends.onnx.wasm.proxy = false;
    
    searchPipeline = await pipeline('feature-extraction', searchVectorsMeta.model);
    searchState = 'ready';
    setSemanticStatus('ready');
    
    buildFuseIndex();
    
    if (state.searchQuery) {
      runHybridSearch();
    }
  } catch (err) {
    console.error('Failed to initialize hybrid search:', err);
    searchState = 'error';
    setSemanticStatus('');
  }
}

function buildFuseIndex() {
  const corpus = [];
  resumeData.experiences.forEach(exp => {
    exp.roles.forEach(role => {
      role.achievements.forEach(a => {
        corpus.push({
          id: a.id,
          text: a.text,
          technologies: a.tags.technologies || [],
          customers: a.tags.customers || [],
          type: a.tags.type || [],
          domain: a.tags.domain || []
        });
      });
    });
  });
  
  fuseSearch = new Fuse(corpus, {
    keys: [
      { name: 'text', weight: 0.5 },
      { name: 'technologies', weight: 0.2 },
      { name: 'customers', weight: 0.1 },
      { name: 'domain', weight: 0.1 },
      { name: 'type', weight: 0.1 }
    ],
    threshold: 0.35
  });
}

let currentQueryId = 0;

async function runHybridSearch() {
  if (!searchPipeline || !searchVectorsBin) return;
  
  const query = state.searchQuery;
  if (!query) {
    state.searchScores = null;
    renderTimeline();
    return;
  }
  
  const queryId = ++currentQueryId;
  setSemanticStatus('thinking');
  
  try {
    const out = await searchPipeline(['query: ' + query], { pooling: 'mean', normalize: true });
    
    if (queryId !== currentQueryId) return;
    
    const queryVector = out.data;
    
    const similarities = {};
    const scoreList = [];
    
    searchVectorsMeta.achievements.forEach(ach => {
      const start = ach.index * 384;
      const docVector = searchVectorsBin.subarray(start, start + 384);
      
      let dot = 0;
      for (let i = 0; i < 384; i++) {
        dot += queryVector[i] * docVector[i];
      }
      
      similarities[ach.id] = dot;
      scoreList.push({ id: ach.id, score: dot });
    });
    
    scoreList.sort((a, b) => b.score - a.score);
    const vectorRanks = {};
    scoreList.forEach((item, idx) => {
      vectorRanks[item.id] = idx + 1;
    });
    
    const fuseResults = fuseSearch.search(query);
    const fuseRanks = {};
    fuseResults.forEach((result, idx) => {
      fuseRanks[result.item.id] = idx + 1;
    });
    
    const rrfScores = {};
    const k = 60;
    
    searchVectorsMeta.achievements.forEach(ach => {
      const rankV = vectorRanks[ach.id] || 9999;
      const rankF = fuseRanks[ach.id] || 9999;
      
      const scoreV = rankV !== 9999 ? 1 / (k + rankV) : 0;
      const scoreF = rankF !== 9999 ? 1 / (k + rankF) : 0;
      
      rrfScores[ach.id] = scoreV + scoreF;
    });
    
    state.searchScores = {
      similarities,
      rrfScores
    };
    
    setSemanticStatus('ready');
    renderTimeline();
  } catch (err) {
    console.error('Failed executing semantic search:', err);
    setSemanticStatus('ready');
  }
}

// ─── Init ─────────────────────────────────────────────────────────────────────

async function init() {
  try {
    // no-cache: always revalidate so data edits show without a hard refresh
    const resp = await fetch('./src/data/resume.json', { cache: 'no-cache' });
    if (!resp.ok) throw new Error(resp.statusText);
    resumeData = await resp.json();
    renderProfile();
    renderIntro();
    renderOldIntro();
    renderFilters();
    renderTimeline();
    initTabs();
    const initialTab = window.location.hash.slice(1);
    if (initialTab) switchTab(initialTab, false);
    window.addEventListener('popstate', () => {
      const tab = window.location.hash.slice(1);
      switchTab(tab || 'intro', false);
    });
    initFilterToggle();
    initProjectTagsToggle();
    initAdmin();
    initAdminPopout();
    initTooltip();
    syncStickyTop();
    window.addEventListener('resize', syncStickyTop);
  } catch (err) {
    document.getElementById('timeline').innerHTML =
      `<div class="no-results">Failed to load resume data: ${err.message}</div>`;
  }
}

// ─── Profile ──────────────────────────────────────────────────────────────────

function renderProfile() {
  const p = resumeData.profile;
  document.title = `${p.name} – Portfolio`;
  document.getElementById('profile-name').textContent = p.name;
  document.getElementById('profile-title').textContent = p.title;
  document.getElementById('profile-contact').innerHTML = `
    <span>${p.location}</span>
    <span class="sep">·</span>
    <a href="mailto:${p.email}">${p.email}</a>
    <span class="sep">·</span>
    <a href="https://${p.linkedin}" target="_blank" rel="noopener">${p.linkedin}</a>
    ${p.version ? `<span class="profile-version">v${escapeHtml(p.version)}</span>` : ''}
  `;
}

// ─── Intro ────────────────────────────────────────────────────────────────────

const INTRO_FILTERS = [
  { id: 'zero-to-one',  label: '0-to-1' },
  { id: 'engineering',  label: 'Engineering' },
  { id: 'management',   label: 'Management' },
  { id: 'ai',           label: 'AI' },
  { id: 'spatial',      label: 'Spatial' },
  { id: 'apple',        label: 'Apple' },
  { id: 'culture',      label: 'Culture' },
];

let introActiveFilters = new Set();
let currentIntroRole = 'spatial-ai';

function renderIntro() {
  const container = document.getElementById('intro-content');
  if (!container) return;

  const expertiseSummary = "Proven leader shipping 20+ products, bridging AI research with robust systems engineering across spatial computing, IoT, and cloud infrastructure.";

  const roles = [
    { id: 'spatial-ai', label: 'Spatial AI' },
    { id: 'ai-builder', label: 'AI Builder' },
    { id: 'ai-arch',    label: '[AI Systems Architect]' },
    { id: 'eng-dir',    label: '[Engineering Director]' },
    { id: 'prod-tech',  label: '[Product Technologist]' },
  ];

  const roleButtons = roles.map(r => `
    <button class="learn-filter-chip intro-role-chip${currentIntroRole === r.id ? ' learn-filter-chip--active' : ''}"
            data-role="${r.id}">${escapeHtml(r.label)}</button>
  `).join('');

  let letterHtml = '';
  if (currentIntroRole === 'spatial-ai') {
    const launchesList = "Xbox, XBox Forza Motorsports (Turn10 Studios), Kinect, Xbox One, Home Consumer Digital Banking Screen Phone, Daqri XR Smart Helmet, Sony Pictures AR Billboard – Times Square, Magic Leap XR Spatial Applications, Niantic Lightship ARDK (iOS/Android; Unity), Quintar – Spatial Sports Platform (visionOS XR & VR)";
    letterHtml = `
      <div class="intro-letter">
        <p><strong>[Goal: Establish immediate credibility through high-stakes experience and the rarity of zero-to-one hardware success.]</strong></p>
        <p>I have shipped <span class="hover-tip" data-summary="${escapeHtml(launchesList)}">8 zero-to-one spatial AI launches</span>. I work to deeply understand experience goals and translate that into architecture and code that considers the brutal constraints of processors, memory, battery, network, and heat. My zero-to-one methodology is built on the ability to debug and optimize the entire system, from cloud infrastructure down to the firmware.</p>

        <p><strong>[Goal: Define the unique value proposition: the ability to translate academic AI research into production-grade systems.]</strong></p>
        <p>I accelerate Spatial AI projects by turning leading research into rapid demos, blending the first principles of core research with product objectives while optimizing features to adapt to hardware capabilities. I leverage deep experience with human biomechanics, auditory, and vision systems to guide spatial features and avoid common pitfalls of bias, fatigue, and confusion. By working across all staffing levels and roles, I level up and align knowledge and perceptions across the entire team.</p>

        <p><strong>[Goal: Emphasize technical rigor and the focus on user-centric reliability.]</strong></p>
        <p>Combining deep technical knowledge with a continuous curiosity about innovation, I dig in to understand exactly how implementations are working and how they can improve. My perseverance allows me to get to the root of a problem, understand the first principles affecting an outcome, and devise effective solutions. As a technical leader, I ensure the product ships by putting viable options on the table. Spatial AI often demands trade-offs between human needs and the limits of the current generation of technology; a rich product roadmap must account for these shifts as the tech evolves.</p>

        <p><strong>[Goal: Direct and professional invitation for high-level technical partnership.]</strong></p>
        <p>If you are building the future of spatial computing and need a leader who has repeatedly crossed the finish line from prototype to product, let's talk.</p>
      </div>
    `;
  } else {
    const roleLabel = roles.find(r => r.id === currentIntroRole).label;
    letterHtml = `<div class="intro-letter"><p>Content for ${escapeHtml(roleLabel)} coming soon...</p></div>`;
  }

  container.innerHTML = `
    <div class="intro-expertise-summary">
      <p>${escapeHtml(expertiseSummary)}</p>
    </div>
    <div class="intro-role-selector">
      <div class="learn-filter-bar">${roleButtons}</div>
    </div>
    ${letterHtml}
  `;

  container.querySelectorAll('.intro-role-chip').forEach(btn => {
    btn.addEventListener('click', () => {
      currentIntroRole = btn.dataset.role;
      renderIntro();
    });
  });
}

function renderOldIntro() {
  const paras = resumeData.profile.intro || [];
  const container = document.getElementById('old-intro-content');

  // Attach delegated listener once
  if (!container._introListenerAttached) {
    container.addEventListener('click', e => {
      const btn = e.target.closest('.intro-filter-chip');
      if (!btn) return;
      const tag = btn.dataset.tag;
      if (introActiveFilters.has(tag)) introActiveFilters.delete(tag);
      else introActiveFilters.add(tag);
      renderIntro();
    });
    container._introListenerAttached = true;
  }

  const getText = p => typeof p === 'string' ? p : p.text;

  const chips = INTRO_FILTERS.map(f => `
    <button class="learn-filter-chip intro-filter-chip${introActiveFilters.has(f.id) ? ' learn-filter-chip--active' : ''}"
            data-tag="${f.id}">${escapeHtml(f.label)}</button>`).join('');

  const activeTags = Array.from(introActiveFilters);
  const filtered = activeTags.length === 0
    ? paras
    : paras.filter(p => p.tags && p.tags.some(t => activeTags.includes(t)));

  const countLabel = activeTags.length > 0
    ? `<span class="learn-cert-count">${filtered.length} of ${paras.length}</span>` : '';

  const tagLabel = tag => INTRO_FILTERS.find(f => f.id === tag)?.label || tag;

  container.innerHTML = `
    <div class="learn-filter-bar intro-filter-bar">${chips}${countLabel}</div>
    ${filtered.map(p => {
      const tags = (typeof p === 'string' ? [] : p.tags || []);
      const tagBadges = tags.map(t => `<span class="intro-tag-badge">${escapeHtml(tagLabel(t))}</span>`).join('');
      return `<div class="intro-para-block">
        <p class="intro-para">${escapeHtml(getText(p))}</p>
        ${tagBadges ? `<div class="intro-tag-row">${tagBadges}</div>` : ''}
      </div>`;
    }).join('')}`;
}

// ─── Filters ──────────────────────────────────────────────────────────────────

function renderFilters() {
  const { roles, experiences } = resumeData.filterTaxonomy;

  buildChips(document.getElementById('type-filters'),       roles,       'role',       ROLE_LABELS);
  buildChips(document.getElementById('experience-filters'), experiences, 'experience', EXPERIENCE_LABELS);

  const searchInput = document.getElementById('search-input');
  searchInput.addEventListener('focus', startLoadingSearchEngine);
  searchInput.addEventListener('click', startLoadingSearchEngine);
  searchInput.addEventListener('keydown', startLoadingSearchEngine);

  let debounceTimeout = null;
  searchInput.addEventListener('input', e => {
    state.searchQuery = e.target.value.trim();

    if (debounceTimeout) clearTimeout(debounceTimeout);

    if (searchPipeline && state.searchQuery) {
      debounceTimeout = setTimeout(() => {
        runHybridSearch();
      }, 250);
    } else {
      if (!state.searchQuery) {
        state.searchScores = null;
      }
      renderTimeline();
    }
  });

  document.getElementById('metrics-toggle').addEventListener('change', e => {
    state.metricsOnly = e.target.checked;
    renderTimeline();
  });

  document.getElementById('clear-btn').addEventListener('click', clearFilters);
}

function buildChips(container, values, category, labelMap) {
  values.forEach(value => {
    const btn = document.createElement('button');
    btn.className = `chip chip--${category}`;
    btn.textContent = labelMap[value] || value;
    btn.dataset.value = value;
    btn.addEventListener('click', () => toggleFilter(category, value, btn));
    container.appendChild(btn);
  });
}

function toggleFilter(category, value, chipEl) {
  const set = category === 'role' ? state.activeTypes : state.activeExperiences;
  if (set.has(value)) {
    set.delete(value);
    chipEl.classList.remove('chip--active');
  } else {
    set.add(value);
    chipEl.classList.add('chip--active');
  }
  renderTimeline();
}

function clearFilters() {
  state.activeTypes.clear();
  state.activeExperiences.clear();
  state.searchQuery   = '';
  state.metricsOnly   = false;
  state.searchScores  = null;
  document.getElementById('search-input').value      = '';
  document.getElementById('metrics-toggle').checked  = false;
  document.querySelectorAll('.chip--active').forEach(c => c.classList.remove('chip--active'));
  renderTimeline();
}

// ─── Matching ─────────────────────────────────────────────────────────────────

function achievementMatches(a) {
  const { type, domain, technologies, customers, hasMetric, impact } = a.tags;

  if (state.metricsOnly && !hasMetric) return false;

  if (state.activeTypes.size > 0 && !type?.some(t => state.activeTypes.has(t))) return false;
  if (state.activeExperiences.size > 0 && !domain?.some(d => state.activeExperiences.has(d))) return false;

  if (state.searchQuery) {
    const qLower = state.searchQuery.toLowerCase();
    const haystack = [
      a.text,
      ...(technologies || []),
      ...(customers    || []),
      ...(type         || []),
      ...(domain       || []),
      impact?.metric || '',
      impact?.value  || '',
    ].join(' ').toLowerCase();

    const isSubmatch = haystack.includes(qLower);
    const isSemanticMatch = state.searchScores && state.searchScores.similarities && state.searchScores.similarities[a.id] >= 0.75;

    if (!isSubmatch && !isSemanticMatch) return false;
  }

  return true;
}

// ─── Highlight ────────────────────────────────────────────────────────────────

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function highlight(text) {
  const safe = escapeHtml(text);
  if (!state.searchQuery) return safe;
  const q = state.searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return safe.replace(new RegExp(`(${q})`, 'gi'), '<mark>$1</mark>');
}

// ─── Render ───────────────────────────────────────────────────────────────────

function renderTimeline() {
  const timeline = document.getElementById('timeline');
  let html = '';
  let totalVisible = 0;

  sortByDate(resumeData.experiences, e => e.startDate, tabSortNewestFirst.experience).forEach(exp => {
    let rolesHtml  = '';
    let expVisible = false;

    exp.roles.forEach(role => {
      const visible = role.achievements.filter(achievementMatches);
      
      // Sort visible achievements by combined RRF search score if search is active
      if (state.searchScores && state.searchScores.rrfScores) {
        visible.sort((x, y) => {
          const scoreX = state.searchScores.rrfScores[x.id] || 0;
          const scoreY = state.searchScores.rrfScores[y.id] || 0;
          return scoreY - scoreX;
        });
      }
      
      if (!visible.length) return;

      expVisible   = true;
      totalVisible += visible.length;

      const achHtml = visible.map(a => {
        const sim = state.searchScores && state.searchScores.similarities ? state.searchScores.similarities[a.id] : null;
        let matchBadge = '';
        if (sim && sim >= 0.75) {
          const displayPercent = Math.round(50 + ((sim - 0.75) / (0.85 - 0.75)) * 50);
          const humanScore = Math.max(50, Math.min(100, displayPercent));
          matchBadge = `<span class="badge badge--match">✦ ${humanScore}% match</span>`;
        }

        const techBadges = (a.tags.technologies || [])
          .slice(0, 6)
          .map(t => `<span class="badge badge--tech">${escapeHtml(t)}</span>`)
          .join('');

        const custBadges = (a.tags.customers || [])
          .map(c => `<span class="badge badge--customer">${escapeHtml(c)}</span>`)
          .join('');

        const roleBadges = (a.tags.type || [])
          .map(t => `<span class="badge badge--role badge--${t}">${ROLE_LABELS[t] || t}</span>`)
          .join('');

        const metricHtml = a.tags.impact
          ? `<div class="achievement-metric">▲ ${escapeHtml(a.tags.impact.metric)}: <strong>${escapeHtml(a.tags.impact.value)}</strong></div>`
          : '';

        const hasFooter = techBadges || custBadges || roleBadges;

        const domainTags = (a.tags.domain || []).join(', ');
        const adminAch = `<div class="admin-field">id: ${escapeHtml(a.id)}${domainTags ? ' · domain: ' + escapeHtml(domainTags) : ''}${a.tags.hasMetric ? ' · hasMetric' : ''}</div>`;

        const durEdit  = adminEdits[a.id];
        const durLabel = durEdit ? fmtDur(durEdit.years * 12 + durEdit.months) : '+ duration';
        const durSet   = !!durEdit;
        const adminDurBtn = `<button class="admin-dur-btn${durSet ? ' admin-dur-btn--set' : ''}" data-id="${escapeHtml(a.id)}">${escapeHtml(durLabel)}</button>`;

        return `
          <li class="achievement">
            ${adminAch}
            ${adminDurBtn}
            <p class="achievement-text">${highlight(a.text)}${matchBadge}</p>
            ${metricHtml}
            ${hasFooter ? `
            <div class="achievement-footer">
              <div class="achievement-badges">${techBadges}${custBadges}</div>
              <div class="achievement-roles">${roleBadges}</div>
            </div>` : ''}
          </li>`;
      }).join('');

      const roleTypeBadges = role.roleTypes
        .map(t => `<span class="badge badge--role badge--${t}">${ROLE_LABELS[t] || t}</span>`)
        .join('');

      rolesHtml += `
        <div class="role">
          <h3 class="role-title">${escapeHtml(role.title)} ${roleTypeBadges}</h3>
          <div class="admin-field">id: ${escapeHtml(role.id)}</div>
          <ul class="achievement-list">${achHtml}</ul>
        </div>`;
    });

    if (!expVisible) return;

    const dateStr = formatDate(exp.startDate) + ' – ' + (exp.current ? 'Present' : formatDate(exp.endDate));
    const location = exp.location ? `<span class="experience-meta">${escapeHtml(exp.location)}</span>` : '';

    html += `
      <div class="experience-card">
        <div class="experience-header">
          <div>
            <h2 class="company-name">${escapeHtml(exp.company)}</h2>
            ${location}
            <div class="admin-field">id: ${escapeHtml(exp.id)} · ${escapeHtml(exp.startDate)} → ${escapeHtml(exp.endDate || 'present')}</div>
          </div>
          <span class="experience-dates">${dateStr}</span>
        </div>
        <div class="experience-roles">${rolesHtml}</div>
      </div>`;
  });

  if (!html) {
    html = '<div class="no-results">No achievements match the current filters.</div>';
  }

  timeline.innerHTML = html;
  renderExperienceChart();
  updateFilterCount();

  document.getElementById('result-count').textContent =
    `${totalVisible} achievement${totalVisible !== 1 ? 's' : ''}`;
}

// ─── Experience Chart ─────────────────────────────────────────────────────────

function renderExperienceChart() {
  const container = document.getElementById('experience-chart');
  if (!container) return;

  if (state.activeExperiences.size === 0) {
    container.innerHTML = '';
    return;
  }

  const months = {};
  state.activeExperiences.forEach(exp => { months[exp] = 0; });

  resumeData.experiences.forEach(exp => {
    const dur = expDurationMonths(exp);
    state.activeExperiences.forEach(filterExp => {
      const present = exp.roles.some(role =>
        role.achievements.some(a => (a.tags.domain || []).includes(filterExp))
      );
      if (present) months[filterExp] += dur;
    });
  });

  const maxMonths = Math.max(...Object.values(months), 1);

  container.innerHTML = [...state.activeExperiences].map(exp => {
    const m = months[exp];
    const pct = Math.round(m / maxMonths * 100);
    const label = EXPERIENCE_LABELS[exp] || exp;
    return `
      <div class="exp-bar-row">
        <span class="exp-bar-label">${escapeHtml(label)}</span>
        <span class="exp-bar-value">${fmtDur(m)}</span>
        <div class="exp-bar-track"><div class="exp-bar-fill" style="width:${pct}%"></div></div>
      </div>`;
  }).join('');
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function expDurationMonths(exp) {
  const start = new Date(exp.startDate + '-01');
  const end   = exp.current ? new Date() : new Date(exp.endDate + '-01');
  return Math.max(0, (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth()));
}

function fmtDur(months) {
  const y = Math.floor(months / 12);
  const m = months % 12;
  if (y === 0) return `${m}m`;
  if (m === 0) return `${y}y`;
  return `${y}y ${m}m`;
}

function sortByDate(arr, getDate, newestFirst) {
  return [...arr].sort((a, b) => {
    const da = getDate(a) || '';
    const db = getDate(b) || '';
    if (!da && !db) return 0;
    if (!da) return 1;   // undated items always sink to the bottom
    if (!db) return -1;
    return newestFirst ? db.localeCompare(da) : da.localeCompare(db);
  });
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const [year, month] = dateStr.split('-');
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${months[parseInt(month, 10) - 1]} ${year}`;
}

// ─── Filter Toggle ────────────────────────────────────────────────────────────

function initFilterToggle() {
  document.getElementById('filter-toggle').addEventListener('click', () => {
    document.querySelector('.filter-panel').classList.toggle('filter-panel--open');
    syncStickyTop();
  });
}

function initProjectTagsToggle() {
  const container = document.getElementById('projects-content');
  if (!container) return;
  container.addEventListener('change', e => {
    if (e.target.id === 'project-tags-toggle') {
      state.showProjectTags = e.target.checked;
      renderProjects();
    }
  });
}

function updateFilterCount() {
  const n = state.activeTypes.size + state.activeExperiences.size
    + (state.metricsOnly ? 1 : 0) + (state.searchQuery ? 1 : 0);
  const el = document.getElementById('filter-active-count');
  if (el) el.textContent = n > 0 ? String(n) : '';
}

// ─── Tabs ─────────────────────────────────────────────────────────────────────

function initTooltip() {
  const tip = document.createElement('div');
  tip.className = 'proj-tooltip';
  document.body.appendChild(tip);

  let active = false;

  document.addEventListener('mouseover', e => {
    const el = e.target.closest('[data-summary]');
    if (!el) return;
    // **term** marks emphasis — render as <strong> after escaping
    tip.innerHTML = escapeHtml(el.dataset.summary).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    active = true;
    tip.classList.add('proj-tooltip--visible');
    position(e);
  });

  document.addEventListener('mousemove', e => {
    if (active) position(e);
  });

  document.addEventListener('mouseout', e => {
    const el = e.target.closest('[data-summary]');
    // only hide when truly leaving the element, not when moving between its children
    if (el && !el.contains(e.relatedTarget)) { active = false; tip.classList.remove('proj-tooltip--visible'); }
  });

  function position(e) {
    const pad = 14, tw = tip.offsetWidth, th = tip.offsetHeight;
    const x = e.clientX + pad + tw > window.innerWidth  ? e.clientX - tw - pad : e.clientX + pad;
    const y = e.clientY + pad + th > window.innerHeight ? e.clientY - th - pad : e.clientY + pad;
    tip.style.left = x + 'px';
    tip.style.top  = y + 'px';
  }
}

function initTabs() {
  document.querySelectorAll('.tab').forEach(tab => {
    const name = tab.dataset.tab;
    if (TIME_ORDERED_TABS.has(name)) {
      const ind = document.createElement('span');
      ind.className = 'tab-sort';
      tab.appendChild(ind);
    }
    tab.addEventListener('click', () => {
      if (TIME_ORDERED_TABS.has(name) && tab.classList.contains('tab--active')) {
        toggleTabSort(name);
      } else {
        switchTab(name);
      }
    });
  });
  updateSortIndicators();
}

function toggleTabSort(name) {
  tabSortNewestFirst[name] = !tabSortNewestFirst[name];
  updateSortIndicators();
  if (name === 'experience') renderTimeline();
  if (name === 'timeline')   renderCareerTimeline();
  if (name === 'projects')   renderProjects();
  if (name === 'research')   renderResearch();
  if (name === 'learning')   renderLearning();
}

function updateSortIndicators() {
  document.querySelectorAll('.tab .tab-sort').forEach(ind => {
    const newest = tabSortNewestFirst[ind.parentElement.dataset.tab];
    ind.textContent = newest ? '↓' : '↑';
    ind.title = newest
      ? 'Sorted newest → oldest — click to reverse'
      : 'Sorted oldest → newest — click to reverse';
  });
}

const VALID_TABS = new Set(['intro','old-intro','experience','timeline','projects','patents','research','learning','skills']);

function switchTab(name, pushState = true) {
  if (!VALID_TABS.has(name)) name = 'intro';
  document.querySelectorAll('.tab')
    .forEach(t => t.classList.toggle('tab--active', t.dataset.tab === name));
  document.querySelectorAll('.tab-pane')
    .forEach(p => p.classList.toggle('tab-pane--active', p.id === `pane-${name}`));
  if (pushState) history.pushState(null, '', `#${name}`);
  if (name === 'intro' && !document.getElementById('intro-content').innerHTML)
    renderIntro();
  if (name === 'old-intro' && !document.getElementById('old-intro-content').innerHTML)
    renderOldIntro();
  if (name === 'timeline' && !document.getElementById('career-timeline').innerHTML)
    renderCareerTimeline();
  if (name === 'projects' && !document.getElementById('projects-content').innerHTML)
    renderProjects();
  if (name === 'learning' && !document.getElementById('learning-content').innerHTML)
    renderLearning();
  if (name === 'skills' && !document.getElementById('skills-content').innerHTML)
    renderSkills();
  if (name === 'patents' && !document.getElementById('patents-content').innerHTML)
    renderPatents();
  if (name === 'research' && !document.getElementById('research-content').innerHTML)
    renderResearch();
}

// ─── Career Timeline ──────────────────────────────────────────────────────────

function renderCareerTimeline() {
  const container = document.getElementById('career-timeline');

  const html = sortByDate(resumeData.experiences, e => e.startDate, tabSortNewestFirst.timeline).map(exp => {
    const allAchievements = exp.roles.flatMap(r => r.achievements);

    // Top tech chips
    const techFreq = {};
    allAchievements.forEach(a => {
      (a.tags.technologies || []).forEach(t => {
        techFreq[t] = (techFreq[t] || 0) + 1;
      });
    });
    const topTech = Object.entries(techFreq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([t]) => t);

    // IC vs TM split
    let icCount = 0;
    let tmCount = 0;
    allAchievements.forEach(a => {
      const types = a.tags.type || [];
      if (types.includes('ic')) icCount++;
      if (types.includes('technical-management')) tmCount++;
    });
    const total = icCount + tmCount;
    const icPct = total > 0 ? Math.round(icCount / total * 100) : 0;
    const tmPct = total > 0 ? 100 - icPct : 0;

    // Role type badges
    const roleTypes = [...new Set(exp.roles.flatMap(r => r.roleTypes))];
    const roleTypeBadges = roleTypes
      .map(t => `<span class="badge badge--role badge--${t}">${ROLE_LABELS[t] || t}</span>`)
      .join('');

    // Role titles
    const roleTitles = exp.roles
      .map(r => `<div class="tl-role-title">${escapeHtml(r.title)}</div>`)
      .join('');

    // Dates
    const dateStr = formatDate(exp.startDate) + ' – ' + (exp.current ? 'Present' : formatDate(exp.endDate));

    // Location
    const locationHtml = exp.location
      ? `<div class="tl-location">${escapeHtml(exp.location)}</div>`
      : '';

    // Split bar
    let splitBarHtml = '';
    if (total > 0) {
      const icLabel  = icPct  >= 15 ? `IC&nbsp;&nbsp;${icPct}%`  : '';
      const tmLabel  = tmPct  >= 15 ? `TM&nbsp;&nbsp;${tmPct}%`  : '';
      splitBarHtml = `
        <div class="tl-split">
          <div class="tl-split-bar">
            <div class="tl-split-ic" style="flex:${icPct}">${icLabel}</div>
            <div class="tl-split-tm" style="flex:${tmPct}">${tmLabel}</div>
          </div>
        </div>`;
    }

    // Tech chips
    const techChips = topTech.length
      ? `<div class="tl-tech">${topTech.map(t => `<span class="tl-tech-chip">${escapeHtml(t)}</span>`).join('')}</div>`
      : '';

    const dotClass = exp.current ? 'tl-dot tl-dot--current' : 'tl-dot';

    return `
      <div class="tl-entry">
        <div class="tl-marker">
          <div class="${dotClass}"></div>
        </div>
        <div class="tl-card"${exp.summary ? ` data-summary="${escapeHtml(exp.summary)}"` : ''}>
          <div class="tl-header">
            <div>
              <div class="tl-company">${escapeHtml(exp.company)}</div>
              ${locationHtml}
            </div>
            <div class="tl-header-right">
              <div class="tl-dates">${dateStr}</div>
              <div class="tl-badges">${roleTypeBadges}</div>
            </div>
          </div>
          <div class="tl-roles">${roleTitles}</div>
          ${splitBarHtml}
          ${techChips}
        </div>
      </div>`;
  }).join('');

  container.innerHTML = `<div class="career-timeline">${html}</div>`;
}

// ─── Learning ─────────────────────────────────────────────────────────────────

function renderProjects() {
  const { sections } = resumeData.learning.projects;
  const container = document.getElementById('projects-content');
  if (!container) return;

  container.innerHTML = sections.map((section, i) => {
    const borderStyle = i === 0 ? 'border-top:none; padding-top:32px' : '';

    if (section.categories) {
      const titleHtml = section.url
        ? `<a href="${section.url}" target="_blank" rel="noopener" class="proj-section-link">${escapeHtml(section.title)} ↗</a>`
        : escapeHtml(section.title);
      return `
        <div class="learn-section" style="${borderStyle}">
          <div class="proj-section-header">
            <div class="proj-section-title">${titleHtml}</div>
          </div>
          <div class="proj-outline">
            ${section.categories.map(cat => renderProjCategory(cat)).join('')}
          </div>
        </div>`;
    }

    const itemsHtml = sortByDate(section.items, p => p.startDate || p.date, tabSortNewestFirst.projects).map(p => {
      const dateStr = formatDate(p.startDate) + ' – ' + (p.current ? 'Present' : formatDate(p.endDate));
      
      const tagHtml = (state.showProjectTags && p.tags) 
        ? `<div class="tags-container" style="margin-top: 0.5rem; display: flex; flex-wrap: wrap; gap: 0.4rem;">
             ${p.tags.map(t => `<span class="badge badge--tech" style="font-size: 0.7rem; padding: 0.1rem 0.4rem;">${escapeHtml(t)}</span>`).join('')}
           </div>`
        : '';

      return `
        <div class="learn-card">
          <div class="learn-card-header">
            <span class="learn-card-title">${escapeHtml(p.title)}</span>
            <span class="learn-date">${dateStr}</span>
          </div>
          ${p.description ? `<p class="learn-card-desc">${escapeHtml(p.description)}</p>` : ''}
          ${tagHtml}
        </div>`;
    }).join('');

    const toggleHtml = section.id === 'products' ? `
      <label class="toggle-label" style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer; font-size: 0.8rem; color: #888; font-weight: normal; text-transform: none; letter-spacing: normal;">
        <input type="checkbox" id="project-tags-toggle" ${state.showProjectTags ? 'checked' : ''} style="cursor: pointer;">
        <span>Show Technical Tags</span>
      </label>` : '';

    return `
      <div class="learn-section" style="${borderStyle}">
        <div class="proj-section-header">
          <div class="proj-section-title">${escapeHtml(section.title)}</div>
          ${toggleHtml}
        </div>
        ${itemsHtml}
      </div>`;
  }).join('');
}

function renderProjCategory(cat) {
  let innerHtml = '';
  if (cat.series) {
    innerHtml = cat.series.map(s => {
      const titleEl = s.url
        ? `<a href="${s.url}" target="_blank" rel="noopener" class="proj-series-title">${escapeHtml(s.title)} <span aria-hidden="true">↗</span></a>`
        : `<span class="proj-series-title">${escapeHtml(s.title)}</span>`;
      const lessonsHtml = s.sections
        ? s.sections.map(sec => `
            <div class="proj-sec-label">${escapeHtml(sec.title)}</div>
            ${sec.lessons.map(l => renderProjLesson(l)).join('')}`).join('')
        : (s.lessons || []).map(l => renderProjLesson(l)).join('');
      return `
        <div class="proj-series-block">
          ${titleEl}
          ${s.subtitle ? `<div class="proj-series-subtitle">${escapeHtml(s.subtitle)}</div>` : ''}
          ${lessonsHtml}
        </div>`;
    }).join('');
  } else if (cat.items) {
    innerHtml = `<div class="proj-exp-chips">
      ${cat.items.map(item => item.url
        ? `<a href="${item.url}" target="_blank" rel="noopener" class="proj-exp-chip proj-exp-chip--link"${item.summary ? ` data-summary="${escapeHtml(item.summary)}"` : ''}>${escapeHtml(item.title)}</a>`
        : `<span class="proj-exp-chip">${escapeHtml(item.title)}</span>`
      ).join('')}
    </div>`;
  }
  return `
    <div class="proj-cat-block">
      <div class="proj-cat-header">${escapeHtml(cat.title)}</div>
      ${innerHtml}
    </div>`;
}

function renderProjLesson(l) {
  const linkEl = l.url
    ? `<a href="${l.url}" target="_blank" rel="noopener" class="proj-lesson-link"${l.summary ? ` data-summary="${escapeHtml(l.summary)}"` : ''}>${escapeHtml(l.title)}</a>`
    : `<span class="proj-lesson-link">${escapeHtml(l.title)}</span>`;
  return `
    <div class="proj-lesson">
      ${l.num !== undefined ? `<span class="proj-lesson-num">${escapeHtml(l.num)}</span>` : ''}
      ${linkEl}
    </div>`;
}

const LEARN_FILTERS = [
  { id: 'management',   label: 'Management' },
  { id: 'engineering',  label: 'Engineering' },
  { id: 'ai',           label: 'AI & Related' },
  { id: 'performance',  label: 'Performance & Multiprocessor' },
  { id: 'communication', label: 'Communication' },
];

let learnActiveFilters = new Set();

function renderLearning() {
  const container = document.getElementById('learning-content');
  const { certifications, volunteering } = resumeData.learning;

  const filterChips = LEARN_FILTERS.map(f => `
    <button class="learn-filter-chip${learnActiveFilters.has(f.id) ? ' learn-filter-chip--active' : ''}"
            data-tag="${f.id}">${escapeHtml(f.label)}</button>`).join('');

  const filtered = learnActiveFilters.size === 0
    ? certifications
    : certifications.filter(c => c.tags && c.tags.some(t => learnActiveFilters.has(t)));

  const certsHtml = sortByDate(filtered, c => c.completedDate || c.date, tabSortNewestFirst.learning).map(c => {
    const titleEl = c.url
      ? `<a class="learn-cert-title" href="${c.url}" target="_blank" rel="noopener">${escapeHtml(c.title)}</a>`
      : `<span class="learn-cert-title">${escapeHtml(c.title)}</span>`;
    const metaParts = [];
    if (c.author) metaParts.push(`<span class="learn-cert-author">${escapeHtml(c.author)}</span>`);
    if (c.duration) metaParts.push(`<span class="learn-cert-dur">${escapeHtml(c.duration)}</span>`);
    const issuerEl = c.url
      ? `<a class="learn-issuer-badge" href="${c.url}" target="_blank" rel="noopener">${escapeHtml(c.issuer)}</a>`
      : `<span class="learn-issuer-badge">${escapeHtml(c.issuer)}</span>`;
    metaParts.push(issuerEl);
    metaParts.push(`<span class="learn-date">${formatDate(c.completedDate || c.date)}</span>`);
    return `
      <div class="learn-cert-row">
        ${titleEl}
        <span class="learn-cert-meta">${metaParts.join('')}</span>
      </div>`;
  }).join('');

  const countLabel = learnActiveFilters.size > 0
    ? `<span class="learn-cert-count">${filtered.length} of ${certifications.length}</span>` : '';

  const volHtml = sortByDate(volunteering, v => v.startDate || v.date, tabSortNewestFirst.learning).map(v => {
    const end = v.current ? 'Present' : formatDate(v.endDate);
    const dateStr = v.startDate
      ? (end ? `${formatDate(v.startDate)} – ${end}` : formatDate(v.startDate))
      : formatDate(v.date);
    return `
      <div class="learn-card">
        <div class="learn-card-header">
          <span class="learn-card-title">${escapeHtml(v.organization || v.org || '')}</span>
          <span class="learn-date">${dateStr}</span>
        </div>
        <div class="learn-card-role">${escapeHtml(v.role)}</div>
        ${v.description ? `<p class="learn-card-desc">${escapeHtml(v.description)}</p>` : ''}
      </div>`;
  }).join('');

  container.innerHTML = `
    <div class="learn-section">
      <h2 class="learn-section-title">Continuous Learning</h2>
      <div class="learn-filter-bar">${filterChips}${countLabel}</div>
      <div class="learn-cert-list">${certsHtml}</div>
    </div>
    <div class="learn-section">
      <h2 class="learn-section-title">Volunteering &amp; Leadership</h2>
      ${volHtml}
    </div>`;

  container.querySelectorAll('.learn-filter-chip').forEach(btn => {
    btn.addEventListener('click', () => {
      const tag = btn.dataset.tag;
      if (learnActiveFilters.has(tag)) learnActiveFilters.delete(tag);
      else learnActiveFilters.add(tag);
      renderLearning();
    });
  });
}

// ─── Patents ──────────────────────────────────────────────────────────────────

function renderPatents() {
  const container = document.getElementById('patents-content');
  const groups = resumeData.patents || [];

  const total = groups.reduce((n, g) => n + g.inventions.length, 0);

  const html = groups.map(g => `
    <div class="patent-group">
      <h2 class="patent-group-title">${escapeHtml(g.group)}</h2>
      ${g.inventions.map(p => {
        const nums = p.numbers.map(n => `<span class="patent-num">${escapeHtml(n)}</span>`).join('');
        return `
        <div class="patent-card" data-id="${p.id}">
          <div class="patent-header">
            <div class="patent-title-row">
              <a class="patent-title" href="${p.url}" target="_blank" rel="noopener">${escapeHtml(p.title)}</a>
              <button class="patent-toggle" data-id="${p.id}" aria-expanded="false">Summary ▸</button>
            </div>
            <div class="patent-nums">${nums}</div>
          </div>
          <div class="patent-summary" id="summary-${p.id}" hidden>${escapeHtml(p.summary)}</div>
        </div>`;
      }).join('')}
    </div>`).join('');

  container.innerHTML = `
    <div class="patent-meta">
      <span class="patent-total">${total} inventions across ${groups.length} technical domains</span>
      <button class="patent-expand-all" id="patent-expand-all">Expand all summaries</button>
    </div>
    ${html}`;

  let allExpanded = false;
  container.addEventListener('click', e => {
    const toggleBtn = e.target.closest('.patent-toggle');
    const expandAll  = e.target.closest('#patent-expand-all');

    if (toggleBtn) {
      const id = toggleBtn.dataset.id;
      const summary = document.getElementById(`summary-${id}`);
      const open = summary.hidden;
      summary.hidden = !open;
      toggleBtn.textContent = open ? 'Summary ▾' : 'Summary ▸';
      toggleBtn.setAttribute('aria-expanded', String(open));
    }

    if (expandAll) {
      allExpanded = !allExpanded;
      container.querySelectorAll('.patent-summary').forEach(s => { s.hidden = !allExpanded; });
      container.querySelectorAll('.patent-toggle').forEach(b => {
        b.textContent = allExpanded ? 'Summary ▾' : 'Summary ▸';
        b.setAttribute('aria-expanded', String(allExpanded));
      });
      expandAll.textContent = allExpanded ? 'Collapse all summaries' : 'Expand all summaries';
    }
  });
}

// ─── Research ─────────────────────────────────────────────────────────────────

let researchGroupBySubject = false;
let researchAllExpanded = false;

function renderResearch() {
  const container = document.getElementById('research-content');
  const items = (resumeData.research || []).filter(r => !r.hidden);
  const sorted = sortByDate(items, r => r.date, tabSortNewestFirst.research);
  researchAllExpanded = false;

  const card = r => {
    const tagPills = r.tags
      ? r.tags.split(' · ').map(t => `<span class="patent-num">${escapeHtml(t)}</span>`).join('')
      : '';
    return `
      <div class="patent-card" data-id="${escapeHtml(r.id)}" data-summary="${escapeHtml(r.summary)}">
        <div class="patent-header">
          <div class="patent-title-row">
            <a class="patent-title" href="${r.url}" target="_blank" rel="noopener">${escapeHtml(r.title)}</a>
            <button class="patent-toggle" data-id="${escapeHtml(r.id)}" aria-expanded="false">Summary ▸</button>
          </div>
          <div class="patent-nums"><span class="learn-date">${formatDate(r.date)}</span>${tagPills}</div>
        </div>
        <div class="patent-summary" id="rsummary-${escapeHtml(r.id)}" hidden>${escapeHtml(r.summary)}</div>
      </div>`;
  };

  let listHtml;
  if (researchGroupBySubject) {
    const groups = {};
    sorted.forEach(r => (groups[r.subject] = groups[r.subject] || []).push(r));
    listHtml = Object.keys(groups).sort().map(s => `
      <div class="patent-group">
        <h2 class="patent-group-title">${escapeHtml(s)}</h2>
        ${groups[s].map(card).join('')}
      </div>`).join('');
  } else {
    listHtml = `<div class="patent-group">${sorted.map(card).join('')}</div>`;
  }

  const subjectCount = new Set(items.map(r => r.subject)).size;

  container.innerHTML = `
    <div class="research-header">
      <div class="learn-filter-bar research-mode-bar">
        <button class="learn-filter-chip${!researchGroupBySubject ? ' learn-filter-chip--active' : ''}" data-mode="date">By Date</button>
        <button class="learn-filter-chip${researchGroupBySubject ? ' learn-filter-chip--active' : ''}" data-mode="subject">By Subject</button>
      </div>
      <div class="patent-meta research-meta">
        <span class="patent-total">${items.length} research pages across ${subjectCount} subjects</span>
        <button class="patent-expand-all" id="research-expand-all">Expand all summaries</button>
      </div>
    </div>
    ${listHtml}`;

  if (!container._researchListenerAttached) {
    container._researchListenerAttached = true;
    container.addEventListener('click', e => {
      const modeBtn = e.target.closest('[data-mode]');
      if (modeBtn) {
        researchGroupBySubject = modeBtn.dataset.mode === 'subject';
        renderResearch();
        return;
      }

      const toggleBtn = e.target.closest('.patent-toggle');
      if (toggleBtn) {
        const summary = document.getElementById(`rsummary-${toggleBtn.dataset.id}`);
        const open = summary.hidden;
        summary.hidden = !open;
        toggleBtn.textContent = open ? 'Summary ▾' : 'Summary ▸';
        toggleBtn.setAttribute('aria-expanded', String(open));
      }

      const expandAll = e.target.closest('#research-expand-all');
      if (expandAll) {
        researchAllExpanded = !researchAllExpanded;
        container.querySelectorAll('.patent-summary').forEach(s => { s.hidden = !researchAllExpanded; });
        container.querySelectorAll('.patent-toggle').forEach(b => {
          b.textContent = researchAllExpanded ? 'Summary ▾' : 'Summary ▸';
          b.setAttribute('aria-expanded', String(researchAllExpanded));
        });
        expandAll.textContent = researchAllExpanded ? 'Collapse all summaries' : 'Expand all summaries';
      }
    });
  }
}

// ─── Skills & Publications ────────────────────────────────────────────────────

function renderSkills() {
  const { skills = [], publications = [] } = resumeData;

  const skillsHtml = skills.map(group => `
    <div class="skill-group">
      <h3 class="skill-group-title">${escapeHtml(group.category)}</h3>
      <div class="skill-chips">
        ${group.items.map(s => `<span class="skill-chip">${escapeHtml(s)}</span>`).join('')}
      </div>
    </div>`).join('');

  const pubHtml = publications.length ? publications.map(p => `
    <div class="pub-card">
      <div class="pub-title">${p.url ? `<a href="${p.url}" target="_blank" rel="noopener">${escapeHtml(p.title)}</a>` : escapeHtml(p.title)}</div>
      ${p.venue ? `<div class="pub-venue">${escapeHtml(p.venue)}</div>` : ''}
      ${p.date ? `<div class="pub-date">${formatDate(p.date)}</div>` : ''}
    </div>`).join('') : '';

  document.getElementById('skills-content').innerHTML = `
    <div class="skills-section">
      ${skillsHtml}
    </div>
    ${publications.length ? `
    <div class="skills-section skills-section--pubs">
      <h2 class="learn-section-title">Publications</h2>
      ${pubHtml}
    </div>` : ''}`;
}

// ─── Admin Mode ───────────────────────────────────────────────────────────────

function initAdmin() {
  let taps = 0;
  let timer = null;
  document.getElementById('profile-name').addEventListener('click', () => {
    taps++;
    clearTimeout(timer);
    timer = setTimeout(() => { taps = 0; }, 3000);
    if (taps >= 10) {
      taps = 0;
      document.body.classList.toggle('admin-mode');
    }
  });
}

function initAdminPopout() {
  // Duration button clicks (delegated — timeline re-renders on filter changes)
  document.getElementById('timeline').addEventListener('click', e => {
    const btn = e.target.closest('.admin-dur-btn');
    if (!btn) return;
    e.stopPropagation();
    showPopout(btn.dataset.id, btn);
  });

  // Popout interactions
  const popout = document.getElementById('admin-popout');
  popout.addEventListener('click', e => {
    const yrBtn = e.target.closest('[data-yr]');
    const moBtn = e.target.closest('[data-mo]');
    if (yrBtn) {
      const v = parseInt(yrBtn.dataset.yr);
      popState.years = popState.years === v ? 0 : v;
      renderPopout();
    } else if (moBtn) {
      const v = parseInt(moBtn.dataset.mo);
      popState.months = popState.months === v ? 0 : v;
      renderPopout();
    } else if (e.target.id === 'pop-clear') {
      popState.years = 0;
      popState.months = 0;
      renderPopout();
    } else if (e.target.id === 'pop-done') {
      commitPopout();
    }
  });

  // Close on outside click
  document.addEventListener('click', e => {
    if (!popout.contains(e.target) && !e.target.closest('.admin-dur-btn'))
      popout.classList.remove('admin-popout--open');
  });
}

function showPopout(id, anchorEl) {
  const current = adminEdits[id] || { years: 0, months: 0 };
  popState = { id, years: current.years, months: current.months };
  renderPopout();

  const popout = document.getElementById('admin-popout');
  popout.classList.add('admin-popout--open');

  const rect  = anchorEl.getBoundingClientRect();
  const popW  = popout.offsetWidth || 220;
  let   left  = rect.left;
  if (left + popW > window.innerWidth - 8) left = window.innerWidth - popW - 8;
  popout.style.top  = `${rect.bottom + 4}px`;
  popout.style.left = `${Math.max(8, left)}px`;
}

function renderPopout() {
  const yrBtns = [1, 2, 3].map(v =>
    `<button class="pop-btn${popState.years === v ? ' pop-btn--on' : ''}" data-yr="${v}">${v}yr</button>`
  ).join('');

  const moBtns = Array.from({ length: 12 }, (_, i) => i + 1).map(v =>
    `<button class="pop-btn${popState.months === v ? ' pop-btn--on' : ''}" data-mo="${v}">${v}</button>`
  ).join('');

  document.getElementById('admin-popout').innerHTML = `
    <div class="pop-row">${yrBtns}</div>
    <div class="pop-divider"></div>
    <div class="pop-grid">${moBtns}</div>
    <div class="pop-footer">
      <button id="pop-clear" class="pop-action">Clear</button>
      <button id="pop-done"  class="pop-action pop-action--primary">Done</button>
    </div>`;
}

function commitPopout() {
  const { id, years, months } = popState;

  if (years === 0 && months === 0) {
    delete adminEdits[id];
  } else {
    adminEdits[id] = { years, months };
  }

  // Update button in-place without re-rendering the whole timeline
  const btn = document.querySelector(`.admin-dur-btn[data-id="${id}"]`);
  if (btn) {
    const hasDur = years > 0 || months > 0;
    btn.textContent = hasDur ? fmtDur(years * 12 + months) : '+ duration';
    btn.classList.toggle('admin-dur-btn--set', hasDur);
  }

  document.getElementById('admin-popout').classList.remove('admin-popout--open');
  updateAdminPrompt();
}

function syncStickyTop() {
  const h = document.querySelector('.site-header').offsetHeight;
  document.querySelector('.filter-panel').style.top = h + 'px';
  document.documentElement.style.setProperty('--sticky-top', h + 'px');
}

function updateAdminPrompt() {
  const banner  = document.getElementById('admin-prompt-banner');
  const entries = Object.entries(adminEdits).filter(([, e]) => e.years > 0 || e.months > 0);

  if (entries.length === 0) {
    banner.innerHTML = '';
    currentAdminPrompt = '';
    syncStickyTop();
    return;
  }

  const sentences = entries.map(([id, e]) =>
    `Set achievement "${id}" tags.duration to "${fmtDur(e.years * 12 + e.months)}".`
  ).join(' ');

  currentAdminPrompt = `Please update resume.json. Add a duration field inside tags for the following achievements: ${sentences}`;

  banner.innerHTML = `
    <div class="admin-prompt-inner">
      <span class="admin-prompt-text">${escapeHtml(currentAdminPrompt)}</span>
      <button class="admin-prompt-copy" onclick="copyAdminPrompt()">Copy Prompt</button>
    </div>`;

  syncStickyTop();
}

function copyAdminPrompt() {
  navigator.clipboard.writeText(currentAdminPrompt).then(() => {
    const btn = document.querySelector('.admin-prompt-copy');
    if (!btn) return;
    btn.textContent = 'Copied!';
    setTimeout(() => { btn.textContent = 'Copy Prompt'; }, 1500);
  });
}

// ─── Boot ─────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', init);
