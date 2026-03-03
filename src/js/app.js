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
  'embedded':          'Embedded',
  'developer-tools':   'Dev Tools',
  'sports-tech':       'Sports Tech',
};

// ─── State ────────────────────────────────────────────────────────────────────

const state = {
  activeTypes:   new Set(),
  activeDomains: new Set(),
  searchQuery:   '',
  metricsOnly:   false,
};

let resumeData = null;

// ─── Init ─────────────────────────────────────────────────────────────────────

async function init() {
  try {
    const resp = await fetch('./src/data/resume.json');
    if (!resp.ok) throw new Error(resp.statusText);
    resumeData = await resp.json();
    renderProfile();
    renderFilters();
    renderTimeline();
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
  `;
}

// ─── Filters ──────────────────────────────────────────────────────────────────

function renderFilters() {
  const { roles, experiences } = resumeData.filterTaxonomy;

  buildChips(document.getElementById('type-filters'),   roles,       'role',       ROLE_LABELS);
  buildChips(document.getElementById('domain-filters'), experiences, 'experience', EXPERIENCE_LABELS);

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
  const set = category === 'role' ? state.activeTypes : state.activeDomains;
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
  state.activeDomains.clear();
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
  if (state.activeDomains.size > 0 && !domain?.some(d => state.activeDomains.has(d))) return false;

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

        const metricHtml = a.tags.impact
          ? `<div class="achievement-metric">▲ ${escapeHtml(a.tags.impact.metric)}: <strong>${escapeHtml(a.tags.impact.value)}</strong></div>`
          : '';

        const hasBadges = techBadges || custBadges;

        return `
          <li class="achievement">
            <p class="achievement-text">${highlight(a.text)}</p>
            ${metricHtml}
            ${hasBadges ? `<div class="achievement-badges">${techBadges}${custBadges}</div>` : ''}
          </li>`;
      }).join('');

      const roleTypeBadges = role.roleTypes
        .map(t => `<span class="badge badge--role badge--${t}">${ROLE_LABELS[t] || t}</span>`)
        .join('');

      rolesHtml += `
        <div class="role">
          <h3 class="role-title">${escapeHtml(role.title)} ${roleTypeBadges}</h3>
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

  document.getElementById('result-count').textContent =
    `${totalVisible} achievement${totalVisible !== 1 ? 's' : ''}`;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(dateStr) {
  if (!dateStr) return '';
  const [year, month] = dateStr.split('-');
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${months[parseInt(month, 10) - 1]} ${year}`;
}

// ─── Boot ─────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', init);
