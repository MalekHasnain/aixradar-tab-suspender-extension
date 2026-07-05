(function () {
  'use strict';

  // ── Get original URL from query params ──────────────────────────
  const params = new URLSearchParams(window.location.search);
  const originalUrl = params.get('url');

  const urlDisplay = document.getElementById('originalUrl');
  const restoreBtn = document.getElementById('restoreBtn');

  if (originalUrl) {
    urlDisplay.textContent = originalUrl;
    urlDisplay.title = originalUrl;
  } else {
    urlDisplay.textContent = 'No original URL found';
  }

  // ── Restore tab ─────────────────────────────────────────────────
  restoreBtn.addEventListener('click', function () {
    if (originalUrl) {
      window.location.href = originalUrl;
    }
  });

  // ── Also restore on click anywhere on the page ──────────────────
  document.body.addEventListener('click', function () {
    if (originalUrl) {
      window.location.href = originalUrl;
    }
  });
})();
