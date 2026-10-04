(function () {
  var REDACT_URL = 'redact.json?v=1';
  var REDACT_HISTORY_URL = 'redact-history.json?v=1';
  var SCAN_SOURCES = [
    { id: 'cv-text', label: 'CV text' },
    { id: 'outreach-text', label: 'outreach note' },
    { id: 'stories', label: 'interview stories' }
  ];

  function textOf(id) {
    var el = document.getElementById(id);
    if (!el) return '';
    return el.textContent.replace(/\s+$/, '');
  }

  function flash(statusEl, message, ok) {
    if (!statusEl) return;
    statusEl.textContent = message;
    statusEl.style.color = ok ? 'var(--green)' : 'var(--red)';
    window.setTimeout(function () {
      if (statusEl.textContent === message) statusEl.textContent = '';
    }, 2500);
  }

  function fallbackCopy(text) {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.top = '0';
    ta.style.left = '0';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    ta.setSelectionRange(0, text.length);
    var ok = false;
    try {
      ok = document.execCommand('copy');
    } catch (err) {
      ok = false;
    }
    document.body.removeChild(ta);
    if (!ok) throw new Error('copy failed');
  }

  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text).catch(function () {
        fallbackCopy(text);
      });
    }
    fallbackCopy(text);
    return Promise.resolve();
  }

  function bindCopy(buttonId, sourceId, statusId) {
    var button = document.getElementById(buttonId);
    var status = document.getElementById(statusId);
    if (!button) return;
    button.addEventListener('click', function () {
      copyText(textOf(sourceId)).then(function () {
        flash(status, 'Copied', true);
      }).catch(function () {
        flash(status, 'Copy failed — select the text manually', false);
      });
    });
  }

  bindCopy('copy-cv', 'cv-text', 'copy-cv-status');
  bindCopy('copy-outreach', 'outreach-text', 'copy-outreach-status');
  bindCopy('copy-redact-source', 'redact-source', 'copy-redact-source-status');

  var download = document.getElementById('download-cv');
  if (download) {
    download.addEventListener('click', function () {
      var text = textOf('cv-text') + '\n';
      var blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
      var url = URL.createObjectURL(blob);
      var link = document.createElement('a');
      link.href = url;
      var source = document.getElementById('cv-text');
      link.download = (source && source.getAttribute('data-filename')) || 'Richard-Bailey-CV.txt';
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    });
  }

  var printBtn = document.getElementById('print-cv');
  if (printBtn) {
    printBtn.addEventListener('click', function () {
      window.print();
    });
  }

  function escapeRegExp(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function aliasIsCaseSensitive(alias) {
    return /[A-Z]/.test(alias) && !/[a-z]/.test(alias);
  }

  function aliasRegex(alias) {
    var flags = aliasIsCaseSensitive(alias) ? '' : 'i';
    return new RegExp('(?:^|[^A-Za-z0-9])' + escapeRegExp(alias) + '(?=[^A-Za-z0-9]|$)', flags);
  }

  function loadRedactList() {
    return fetch(REDACT_URL, { cache: 'no-store' }).then(function (response) {
      if (!response.ok) throw new Error('redact.json ' + response.status);
      return response.json();
    });
  }

  function cell(label, text) {
    var td = document.createElement('td');
    td.setAttribute('data-label', label);
    td.textContent = text;
    return td;
  }

  function renderRedactTable(entries, cleared) {
    var table = document.createElement('table');
    table.className = 'cv-table cv-table--wide';
    var head = document.createElement('thead');
    var headRow = document.createElement('tr');
    ['Term', 'Also catches', 'Reason', 'Use instead', 'Added'].forEach(function (label) {
      var th = document.createElement('th');
      th.scope = 'col';
      th.textContent = label;
      headRow.appendChild(th);
    });
    head.appendChild(headRow);
    table.appendChild(head);
    var body = document.createElement('tbody');
    entries.forEach(function (entry) {
      var tr = document.createElement('tr');
      if (cleared) tr.className = 'cv-row--cleared';
      var also = (entry.aliases || []).filter(function (alias) {
        return alias !== entry.term;
      });
      tr.appendChild(cell('Term', entry.term || ''));
      tr.appendChild(cell('Also catches', also.length ? also.join(', ') : '—'));
      tr.appendChild(cell('Reason', entry.reason || ''));
      tr.appendChild(cell('Use instead', entry.use_instead || ''));
      var added = cell('Added', entry.added || '');
      added.className = 'cv-date';
      tr.appendChild(added);
      body.appendChild(tr);
    });
    table.appendChild(body);
    var wrap = document.createElement('div');
    wrap.className = 'cv-table-wrap';
    wrap.appendChild(table);
    return wrap;
  }

  function bootRedactList() {
    var activeMount = document.getElementById('redact-active');
    var clearedMount = document.getElementById('redact-cleared-body');
    var clearedSummary = document.getElementById('redact-cleared-summary');
    if (!activeMount) return;
    loadRedactList().then(function (entries) {
      if (!Array.isArray(entries)) throw new Error('redact.json must be an array');
      var active = entries.filter(function (entry) { return entry.status === 'active'; });
      var cleared = entries.filter(function (entry) { return entry.status === 'cleared'; });
      activeMount.textContent = '';
      if (active.length) {
        activeMount.appendChild(renderRedactTable(active, false));
      } else {
        var empty = document.createElement('p');
        empty.className = 'cv-note';
        empty.textContent = 'No active names.';
        activeMount.appendChild(empty);
      }
      if (clearedSummary) {
        clearedSummary.textContent = cleared.length ? 'Cleared (' + cleared.length + ')' : 'Cleared';
      }
      if (clearedMount) {
        clearedMount.textContent = '';
        if (cleared.length) {
          clearedMount.appendChild(renderRedactTable(cleared, true));
        } else {
          var none = document.createElement('p');
          none.className = 'cv-note';
          none.textContent = 'None yet. Set status to cleared and the name stays here.';
          clearedMount.appendChild(none);
        }
      }
    }).catch(function () {
      activeMount.textContent = '';
      var error = document.createElement('p');
      error.className = 'cv-note cv-load-error';
      error.textContent = 'Could not load redact.json.';
      activeMount.appendChild(error);
    });
  }

  function sectionText(id) {
    var el = document.getElementById(id);
    return el ? el.textContent : '';
  }

  function scanTexts(entries, textsByLabel) {
    var hits = [];
    entries.forEach(function (entry) {
      if (!entry || entry.status !== 'active') return;
      var places = [];
      SCAN_SOURCES.forEach(function (source) {
        var text = textsByLabel[source.label] || '';
        var matched = [];
        (entry.aliases || []).forEach(function (alias) {
          if (!alias) return;
          if (aliasRegex(alias).test(text) && matched.indexOf(alias) === -1) matched.push(alias);
        });
        if (matched.length) places.push({ label: source.label, aliases: matched });
      });
      if (places.length) hits.push({ entry: entry, places: places });
    });
    return hits;
  }

  function scanRedact(entries) {
    var texts = {};
    SCAN_SOURCES.forEach(function (source) {
      texts[source.label] = sectionText(source.id);
    });
    return scanTexts(entries, texts);
  }

  function textsFromHtml(html) {
    var doc = new DOMParser().parseFromString(html, 'text/html');
    var texts = {};
    var found = false;
    SCAN_SOURCES.forEach(function (source) {
      var el = doc.getElementById(source.id);
      texts[source.label] = el ? el.textContent : '';
      if (el) found = true;
    });
    return { texts: texts, found: found };
  }

  function formatChecked(date) {
    return date.toISOString().slice(0, 16).replace('T', ' ') + ' UTC';
  }

  function simpleTable(headers, rows, rowClass) {
    var table = document.createElement('table');
    table.className = 'cv-table cv-table--wide';
    var head = document.createElement('thead');
    var headRow = document.createElement('tr');
    headers.forEach(function (label) {
      var th = document.createElement('th');
      th.scope = 'col';
      th.textContent = label;
      headRow.appendChild(th);
    });
    head.appendChild(headRow);
    table.appendChild(head);
    var body = document.createElement('tbody');
    rows.forEach(function (row) {
      var tr = document.createElement('tr');
      if (rowClass) tr.className = rowClass;
      row.forEach(function (item) {
        if (item.nodeType) tr.appendChild(item);
        else tr.appendChild(item);
      });
      body.appendChild(tr);
    });
    table.appendChild(body);
    var wrap = document.createElement('div');
    wrap.className = 'cv-table-wrap';
    wrap.appendChild(table);
    return wrap;
  }

  function roleLinksFromDocument(doc) {
    return Array.prototype.map.call(doc.querySelectorAll('#role-list a[href]'), function (anchor) {
      return {
        href: anchor.getAttribute('href'),
        text: (anchor.textContent || '').replace(/\s+/g, ' ').trim()
      };
    }).filter(function (link) {
      return link.href && link.href.indexOf('://') === -1 && link.href.charAt(0) !== '#';
    });
  }

  function loadRolePageLinks() {
    var local = roleLinksFromDocument(document);
    if (local.length) return Promise.resolve(local);
    return fetch('index.html', { cache: 'no-store' }).then(function (response) {
      if (!response.ok) throw new Error('index.html');
      return response.text();
    }).then(function (html) {
      return roleLinksFromDocument(new DOMParser().parseFromString(html, 'text/html'));
    });
  }

  function bootRedactAudit() {
    var source = document.getElementById('redact-source');
    var historyMount = document.getElementById('redact-history');
    var coverageMount = document.getElementById('redact-coverage');
    if (!source && !historyMount && !coverageMount) return;

    loadRedactList().then(function (entries) {
      if (source) source.textContent = JSON.stringify(entries, null, 2) + '\n';
      return entries;
    }).catch(function () {
      if (source) source.textContent = 'Could not load redact.json.';
      if (coverageMount) {
        coverageMount.textContent = '';
        var error = document.createElement('p');
        error.className = 'cv-note cv-load-error';
        error.textContent = 'Could not load redact.json, so role pages were not scanned.';
        coverageMount.appendChild(error);
      }
      return null;
    }).then(function (entries) {
      if (!entries || !coverageMount) return;
      var stamp = formatChecked(new Date());
      return loadRolePageLinks().then(function (links) {
      if (!links.length) {
        coverageMount.textContent = '';
        var empty = document.createElement('p');
        empty.className = 'cv-note';
        empty.textContent = 'No role pages in the list.';
        coverageMount.appendChild(empty);
        return;
      }
      coverageMount.textContent = '';
      var pending = document.createElement('p');
      pending.className = 'cv-note';
      pending.textContent = 'Checking role pages…';
      coverageMount.appendChild(pending);
      return Promise.all(links.map(function (link) {
        var href = link.href;
        return fetch(href, { cache: 'no-store' }).then(function (response) {
          if (!response.ok) throw new Error(String(response.status));
          return response.text();
        }).then(function (html) {
          var parsed = textsFromHtml(html);
          if (!parsed.found) {
            return { link: link, href: href, stamp: stamp, clear: false, text: 'No CV, outreach, or story block on this page.' };
          }
          var hits = scanTexts(entries, parsed.texts);
          if (!hits.length) return { link: link, href: href, stamp: stamp, clear: true, text: 'clear' };
          var text = hits.map(function (hit) {
            var places = hit.places.map(function (place) { return place.label; }).join(', ');
            return hit.entry.term + ' (' + places + ')';
          }).join('; ');
          return { link: link, href: href, stamp: stamp, clear: false, text: text };
        }).catch(function () {
          return { link: link, href: href, stamp: stamp, clear: false, text: 'Could not load this page.' };
        });
      })).then(function (results) {
        var rows = results.map(function (result) {
          var page = document.createElement('td');
          page.setAttribute('data-label', 'Page');
          var anchor = document.createElement('a');
          anchor.href = result.href;
          anchor.textContent = result.link.text || result.href;
          page.appendChild(anchor);
          var checked = cell('Last checked', result.stamp);
          checked.className = 'cv-date';
          var outcome = cell('Result', result.text);
          outcome.className = result.clear ? 'cv-result--clear' : 'cv-result--hit';
          return [page, checked, outcome];
        });
        coverageMount.textContent = '';
        coverageMount.appendChild(simpleTable(['Page', 'Last checked', 'Result'], rows));
      });
      }).catch(function () {
        coverageMount.textContent = '';
        var error = document.createElement('p');
        error.className = 'cv-note cv-load-error';
        error.textContent = 'Could not read the CV list, so role pages were not scanned.';
        coverageMount.appendChild(error);
      });
    });

    if (historyMount) {
      fetch(REDACT_HISTORY_URL, { cache: 'no-store' }).then(function (response) {
        if (!response.ok) throw new Error(String(response.status));
        return response.json();
      }).then(function (rows) {
        historyMount.textContent = '';
        if (!Array.isArray(rows) || !rows.length) {
          var empty = document.createElement('p');
          empty.className = 'cv-note';
          empty.textContent = 'No change-log rows yet.';
          historyMount.appendChild(empty);
          return;
        }
        var rendered = rows.map(function (row) {
          var date = cell('Date', row.date || '');
          date.className = 'cv-date';
          return [
            date,
            cell('Action', row.action || ''),
            cell('Term', row.term || ''),
            cell('Note', row.note || '')
          ];
        });
        historyMount.appendChild(simpleTable(['Date', 'Action', 'Term', 'Note'], rendered));
      }).catch(function () {
        historyMount.textContent = '';
        var error = document.createElement('p');
        error.className = 'cv-note cv-load-error';
        error.textContent = 'Could not load redact-history.json.';
        historyMount.appendChild(error);
      });
    }
  }

  function renderRedactCheck(banner, hits) {
    banner.textContent = '';
    banner.classList.remove('cv-redact-check--clear', 'cv-redact-check--hit');
    if (!hits.length) {
      banner.classList.add('cv-redact-check--clear');
      banner.textContent = 'Redact check: clear';
      return;
    }
    banner.classList.add('cv-redact-check--hit');
    var title = document.createElement('strong');
    title.textContent = 'Redact check: do not mention';
    banner.appendChild(title);
    var list = document.createElement('ul');
    hits.forEach(function (hit) {
      var item = document.createElement('li');
      var where = hit.places.map(function (place) {
        return place.label + ' (“' + place.aliases.join('”, “') + '”)';
      }).join('; ');
      item.textContent = hit.entry.term + ' — ' + where + '. Use instead: ' + (hit.entry.use_instead || '');
      list.appendChild(item);
    });
    banner.appendChild(list);
  }

  function bootRedactCheck() {
    var banner = document.getElementById('redact-check');
    if (!banner) return;
    var entries = [];
    function run() {
      renderRedactCheck(banner, scanRedact(entries));
    }
    loadRedactList().then(function (data) {
      entries = Array.isArray(data) ? data : [];
      run();
    }).catch(function () {
      banner.classList.remove('cv-redact-check--clear');
      banner.classList.add('cv-redact-check--hit');
      banner.textContent = 'Redact check: could not load redact.json.';
    });
    var timer = null;
    document.addEventListener('input', function (event) {
      var target = event.target;
      if (!target || !target.closest) return;
      if (!target.closest('#cv-text, #outreach-text, #stories')) return;
      window.clearTimeout(timer);
      timer = window.setTimeout(run, 60);
    });
  }

  bootRedactList();
  bootRedactCheck();
  bootRedactAudit();
})();
