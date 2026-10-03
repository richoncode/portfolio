(function () {
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
})();
