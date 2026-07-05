(function () {
  'use strict';

  const DEFAULT_SETTINGS = {
    autoSuspend: true,
    timeoutMinutes: 15,
    whitelist: []
  };

  const STORAGE_KEYS = {
    settings: 'settings',
    stats: 'stats'
  };

  // DOM refs
  const autoToggle = document.getElementById('autoToggle');
  const timeoutSelect = document.getElementById('timeoutSelect');
  const whitelistCurrentBtn = document.getElementById('whitelistCurrentBtn');
  const whitelistList = document.getElementById('whitelistList');
  const whitelistEmpty = document.getElementById('whitelistEmpty');
  const suspendedCount = document.getElementById('suspendedCount');
  const memorySaved = document.getElementById('memorySaved');
  const suspendNowBtn = document.getElementById('suspendNowBtn');
  const unsuspendAllBtn = document.getElementById('unsuspendAllBtn');

  // ── Load settings ──────────────────────────────────────────────
  async function loadSettings() {
    const result = await chrome.storage.local.get(STORAGE_KEYS.settings);
    const settings = result.settings || { ...DEFAULT_SETTINGS };
    autoToggle.checked = settings.autoSuspend;
    timeoutSelect.value = String(settings.timeoutMinutes);
    return settings;
  }

  // ── Save settings ──────────────────────────────────────────────
  async function saveSettings(settings) {
    await chrome.storage.local.set({ [STORAGE_KEYS.settings]: settings });
  }

  // ── Load stats ──────────────────────────────────────────────────
  async function loadStats() {
    const result = await chrome.storage.local.get(STORAGE_KEYS.stats);
    const stats = result.stats || { suspendedCount: 0, memorySavedMB: 0 };
    suspendedCount.textContent = String(stats.suspendedCount);
    memorySaved.textContent = stats.memorySavedMB + ' MB';
    return stats;
  }

  // ── Render whitelist ───────────────────────────────────────────
  function renderWhitelist(whitelist) {
    whitelistList.innerHTML = '';
    if (!whitelist || whitelist.length === 0) {
      whitelistEmpty.style.display = 'block';
      return;
    }
    whitelistEmpty.style.display = 'none';
    whitelist.forEach(function (site) {
      const li = document.createElement('li');
      const span = document.createElement('span');
      span.textContent = site;
      const removeBtn = document.createElement('button');
      removeBtn.className = 'remove-whitelist-btn';
      removeBtn.textContent = '✕';
      removeBtn.setAttribute('aria-label', 'Remove ' + site);
      removeBtn.addEventListener('click', async function () {
        const s = await loadSettings();
        s.whitelist = s.whitelist.filter(function (w) { return w !== site; });
        await saveSettings(s);
        renderWhitelist(s.whitelist);
      });
      li.appendChild(span);
      li.appendChild(removeBtn);
      whitelistList.appendChild(li);
    });
  }

  // ── Get current tab hostname ────────────────────────────────────
  async function getCurrentTabHostname() {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tabs || tabs.length === 0) return null;
    const url = tabs[0].url;
    if (!url || !url.startsWith('http')) return null;
    try {
      return new URL(url).hostname;
    } catch (_) {
      return null;
    }
  }

  // ── Event: auto-suspend toggle ──────────────────────────────────
  autoToggle.addEventListener('change', async function () {
    const settings = await loadSettings();
    settings.autoSuspend = autoToggle.checked;
    await saveSettings(settings);
    await chrome.runtime.sendMessage({ type: 'settingsUpdated' }).catch(function () {});
  });

  // ── Event: timeout change ───────────────────────────────────────
  timeoutSelect.addEventListener('change', async function () {
    const settings = await loadSettings();
    settings.timeoutMinutes = parseInt(timeoutSelect.value, 10);
    await saveSettings(settings);
    await chrome.runtime.sendMessage({ type: 'settingsUpdated' }).catch(function () {});
  });

  // ── Event: whitelist current site ───────────────────────────────
  whitelistCurrentBtn.addEventListener('click', async function () {
    const hostname = await getCurrentTabHostname();
    if (!hostname) return;
    const settings = await loadSettings();
    if (settings.whitelist.indexOf(hostname) !== -1) return;
    settings.whitelist.push(hostname);
    await saveSettings(settings);
    renderWhitelist(settings.whitelist);
  });

  // ── Event: suspend now ──────────────────────────────────────────
  suspendNowBtn.addEventListener('click', async function () {
    await chrome.runtime.sendMessage({ type: 'suspendNow' }).catch(function () {});
    window.close();
  });

  // ── Event: unsuspend all ────────────────────────────────────────
  unsuspendAllBtn.addEventListener('click', async function () {
    await chrome.runtime.sendMessage({ type: 'unsuspendAll' }).catch(function () {});
    window.close();
  });

  // ── Init ─────────────────────────────────────────────────────────
  async function init() {
    const settings = await loadSettings();
    renderWhitelist(settings.whitelist);
    await loadStats();
  }

  // Listen for stats updates from background
  chrome.runtime.onMessage.addListener(function (message) {
    if (message.type === 'statsUpdated') {
      suspendedCount.textContent = String(message.stats.suspendedCount);
      memorySaved.textContent = message.stats.memorySavedMB + ' MB';
    }
  });

  document.addEventListener('DOMContentLoaded', init);
})();
