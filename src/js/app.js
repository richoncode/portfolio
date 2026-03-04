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
  'ml':            'ML / AI',
  // domains
  'spatial-computing': 'Spatial Computing',
  'visionos':          'VisionOS',
  'ar':                'AR',
  'vr':                'VR',
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
  'developer-tools':   'Dev Tools',
  'sports-tech':       'Sports Tech',
};

// ─── State ────────────────────────────────────────────────────────────────────

const state = {
  activeTypes:       new Set(),
  activeExperiences: new Set(),
  searchQuery:   '',
  metricsOnly:   false,
};

let resumeData = null;

// ─── Admin Edit State ─────────────────────────────────────────────────────────

const adminEdits = {};                         // { id: { years, months } }
let   currentAdminPrompt = '';
let   popState = { id: null, years: 0, months: 0 };

// ─── Init ─────────────────────────────────────────────────────────────────────

async function init() {
  try {
    const resp = await fetch('./src/data/resume.json');
    if (!resp.ok) throw new Error(resp.statusText);
    resumeData = await resp.json();
    renderProfile();
    renderIntro();
    renderFilters();
    renderTimeline();
    initTabs();
    initFilterToggle();
    initAdmin();
    initAdminPopout();
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

function renderIntro() {
  const paras = resumeData.profile.intro || [];
  document.getElementById('intro-content').innerHTML =
    paras.map(p => `<p class="intro-para">${escapeHtml(p)}</p>`).join('');
}

// ─── Filters ──────────────────────────────────────────────────────────────────

function renderFilters() {
  const { roles, experiences } = resumeData.filterTaxonomy;

  buildChips(document.getElementById('type-filters'),       roles,       'role',       ROLE_LABELS);
  buildChips(document.getElementById('experience-filters'), experiences, 'experience', EXPERIENCE_LABELS);

  document.getElementById('search-input').addEventListener('input', e => {
    state.searchQuery = e.target.value.toLowerCase().trim();
    renderTimeline();
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
    const haystack = [
      a.text,
      ...(technologies || []),
      ...(customers    || []),
      ...(type         || []),
      ...(domain       || []),
      impact?.metric || '',
      impact?.value  || '',
    ].join(' ').toLowerCase();

    if (!haystack.includes(state.searchQuery)) return false;
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

  resumeData.experiences.forEach(exp => {
    let rolesHtml  = '';
    let expVisible = false;

    exp.roles.forEach(role => {
      const visible = role.achievements.filter(achievementMatches);
      if (!visible.length) return;

      expVisible   = true;
      totalVisible += visible.length;

      const achHtml = visible.map(a => {
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
            <p class="achievement-text">${highlight(a.text)}</p>
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

function updateFilterCount() {
  const n = state.activeTypes.size + state.activeExperiences.size
    + (state.metricsOnly ? 1 : 0) + (state.searchQuery ? 1 : 0);
  const el = document.getElementById('filter-active-count');
  if (el) el.textContent = n > 0 ? String(n) : '';
}

// ─── Tabs ─────────────────────────────────────────────────────────────────────

function initTabs() {
  document.querySelectorAll('.tab').forEach(tab =>
    tab.addEventListener('click', () => switchTab(tab.dataset.tab))
  );
}

function switchTab(name) {
  document.querySelectorAll('.tab')
    .forEach(t => t.classList.toggle('tab--active', t.dataset.tab === name));
  document.querySelectorAll('.tab-pane')
    .forEach(p => p.classList.toggle('tab-pane--active', p.id === `pane-${name}`));
  if (name === 'timeline' && !document.getElementById('career-timeline').innerHTML)
    renderCareerTimeline();
  if (name === 'learning' && !document.getElementById('learning-content').innerHTML)
    renderLearning();
}

// ─── Career Timeline ──────────────────────────────────────────────────────────

function renderCareerTimeline() {
  const container = document.getElementById('career-timeline');

  const html = resumeData.experiences.map((exp, i) => {
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
        <div class="tl-card">
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

function renderLearning() {
  const { certifications, projects, volunteering } = resumeData.learning;

  const certsHtml = certifications.map(c => `
    <div class="learn-cert-row">
      <span class="learn-cert-title">${escapeHtml(c.title)}</span>
      <span class="learn-cert-meta">
        <span class="learn-issuer-badge">${escapeHtml(c.issuer)}</span>
        <span class="learn-date">${formatDate(c.date)}</span>
      </span>
    </div>`).join('');

  const projectsHtml = projects.map(p => {
    const dateStr = formatDate(p.startDate) + ' – ' + (p.current ? 'Present' : formatDate(p.endDate));
    return `
      <div class="learn-card">
        <div class="learn-card-header">
          <span class="learn-card-title">${escapeHtml(p.title)}</span>
          <span class="learn-date">${dateStr}</span>
        </div>
        ${p.description ? `<p class="learn-card-desc">${escapeHtml(p.description)}</p>` : ''}
      </div>`;
  }).join('');

  const volHtml = volunteering.map(v => {
    const dateStr = formatDate(v.startDate) + ' – ' + (v.current ? 'Present' : formatDate(v.endDate));
    return `
      <div class="learn-card">
        <div class="learn-card-header">
          <span class="learn-card-title">${escapeHtml(v.org)}</span>
          <span class="learn-date">${dateStr}</span>
        </div>
        <div class="learn-card-role">${escapeHtml(v.role)}</div>
        ${v.description ? `<p class="learn-card-desc">${escapeHtml(v.description)}</p>` : ''}
      </div>`;
  }).join('');

  document.getElementById('learning-content').innerHTML = `
    <div class="learn-section">
      <h2 class="learn-section-title">Certifications</h2>
      <div class="learn-cert-list">${certsHtml}</div>
    </div>
    <div class="learn-section">
      <h2 class="learn-section-title">Projects</h2>
      ${projectsHtml}
    </div>
    <div class="learn-section">
      <h2 class="learn-section-title">Volunteering &amp; Leadership</h2>
      ${volHtml}
    </div>`;
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
