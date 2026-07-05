(function () {
  'use strict';

  const DEFAULT_SETTINGS = {
    autoSuspend: true,
    timeoutMinutes: 15,
    whitelist: []
  };

  const STORAGE_KEYS = {
    settings: 'settings',
    stats: 'stats',
    suspendedTabs: 'suspendedTabs'
  };

  const ALARM_NAME = 'tab-suspender-check';
  const SUSPENDED_PAGE = 'suspended.html';
  const MEMORY_PER_TAB_MB = 50; // conservative estimate per tab

  // ── Get extension ID for constructing suspended page URL ────────
  const EXTENSION_ID = chrome.runtime.id;

  // ── Load settings with defaults ─────────────────────────────────
  async function getSettings() {
    const result = await chrome.storage.local.get(STORAGE_KEYS.settings);
    return result.settings || { ...DEFAULT_SETTINGS };
  }

  // ── Load stats ──────────────────────────────────────────────────
  async function getStats() {
    const result = await chrome.storage.local.get(STORAGE_KEYS.stats);
    return result.stats || { suspendedCount: 0, memorySavedMB: 0 };
  }

  // ── Save stats ──────────────────────────────────────────────────
  async function saveStats(stats) {
    await chrome.storage.local.set({ [STORAGE_KEYS.stats]: stats });
  }

  // ── Load suspended tabs set ─────────────────────────────────────
  async function getSuspendedTabs() {
    const result = await chrome.storage.local.get(STORAGE_KEYS.suspendedTabs);
    return result.suspendedTabs || {};
  }

  // ── Save suspended tabs set ─────────────────────────────────────
  async function saveSuspendedTabs(suspended) {
    await chrome.storage.local.set({ [STORAGE_KEYS.suspendedTabs]: suspended });
  }

  // ── Check if a URL is whitelisted ───────────────────────────────
  function isWhitelisted(url, whitelist) {
    if (!url || !whitelist || whitelist.length === 0) return false;
    try {
      const hostname = new URL(url).hostname;
      return whitelist.indexOf(hostname) !== -1;
    } catch (_) {
      return false;
    }
  }

  // ── Check if a tab should be skipped ────────────────────────────
  function shouldSkipTab(tab) {
    // Skip chrome://, chrome-extension://, about:, devtools, etc.
    if (!tab.url || !tab.url.startsWith('http')) return true;
    // Skip pinned tabs
    if (tab.pinned) return true;
    // Skip audible tabs
    if (tab.audible) return true;
    // Skip tabs that are already suspended (our own page)
    if (tab.url.startsWith('chrome-extension://' + EXTENSION_ID)) return true;
    return false;
  }

  // ── Suspend a single tab ─────────────────────────────────────────
  async function suspendTab(tabId, originalUrl) {
    const suspendedUrl = chrome.runtime.getURL(
      SUSPENDED_PAGE + '?url=' + encodeURIComponent(originalUrl)
    );

    // Store the mapping
    const suspended = await getSuspendedTabs();
    suspended[String(tabId)] = originalUrl;
    await saveSuspendedTabs(suspended);

    // Update the tab
    try {
      await chrome.tabs.update(tabId, { url: suspendedUrl });
    } catch (_) {
      // Tab may have been closed
      delete suspended[String(tabId)];
      await saveSuspendedTabs(suspended);
    }
  }

  // ── Unsuspend a single tab ──────────────────────────────────────
  async function unsuspendTab(tabId) {
    const suspended = await getSuspendedTabs();
    const originalUrl = suspended[String(tabId)];
    if (!originalUrl) return;

    delete suspended[String(tabId)];
    await saveSuspendedTabs(suspended);

    try {
      await chrome.tabs.update(tabId, { url: originalUrl });
    } catch (_) {
      // Tab may have been closed
    }
  }

  // ── Unsuspend all tabs ──────────────────────────────────────────
  async function unsuspendAll() {
    const suspended = await getSuspendedTabs();
    const tabIds = Object.keys(suspended);
    for (const tabId of tabIds) {
      await unsuspendTab(parseInt(tabId, 10));
    }
  }

  // ── Suspend all eligible tabs now ───────────────────────────────
  async function suspendAllEligible() {
    const settings = await getSettings();
    const whitelist = settings.whitelist || [];

    const tabs = await chrome.tabs.query({});
    let suspendedCount = 0;

    for (const tab of tabs) {
      if (shouldSkipTab(tab)) continue;
      if (isWhitelisted(tab.url, whitelist)) continue;

      // Check if already suspended
      const suspended = await getSuspendedTabs();
      if (suspended[String(tab.id)]) continue;

      await suspendTab(tab.id, tab.url);
      suspendedCount++;
    }

    if (suspendedCount > 0) {
      await updateStats();
    }
  }

  // ── Check and suspend inactive tabs ──────────────────────────────
  async function checkInactiveTabs() {
    const settings = await getSettings();
    if (!settings.autoSuspend) return;

    const timeoutMs = (settings.timeoutMinutes || 15) * 60 * 1000;
    const whitelist = settings.whitelist || [];
    const now = Date.now();

    const tabs = await chrome.tabs.query({});
    let suspendedCount = 0;

    for (const tab of tabs) {
      if (shouldSkipTab(tab)) continue;
      if (isWhitelisted(tab.url, whitelist)) continue;

      // Check if already suspended
      const suspended = await getSuspendedTabs();
      if (suspended[String(tab.id)]) continue;

      // Check inactivity: tabs don't expose lastAccessed directly in MV3
      // We use a heuristic: if the tab is not active and not audible, it's likely inactive.
      // For a more accurate approach, we track last activity ourselves.
      const lastActive = await getTabLastActive(tab.id);
      if (lastActive && (now - lastActive) < timeoutMs) continue;

      // If we have no lastActive record, check if tab is in an inactive window
      try {
        const window = await chrome.windows.get(tab.windowId);
        if (window.focused && tab.active) continue; // active tab in focused window
      } catch (_) {
        // Window may have been closed
      }

      await suspendTab(tab.id, tab.url);
      suspendedCount++;
    }

    if (suspendedCount > 0) {
      await updateStats();
    }
  }

  // ── Tab activity tracking ──────────────────────────────────────
  // We track when tabs become active so we know when they went inactive
  const TAB_ACTIVITY_KEY = 'tabActivity';

  async function getTabLastActive(tabId) {
    const result = await chrome.storage.local.get(TAB_ACTIVITY_KEY);
    const activity = result[TAB_ACTIVITY_KEY] || {};
    return activity[String(tabId)] || null;
  }

  async function markTabActive(tabId) {
    const result = await chrome.storage.local.get(TAB_ACTIVITY_KEY);
    const activity = result[TAB_ACTIVITY_KEY] || {};
    activity[String(tabId)] = Date.now();
    await chrome.storage.local.set({ [TAB_ACTIVITY_KEY]: activity });
  }

  async function removeTabActivity(tabId) {
    const result = await chrome.storage.local.get(TAB_ACTIVITY_KEY);
    const activity = result[TAB_ACTIVITY_KEY] || {};
    delete activity[String(tabId)];
    await chrome.storage.local.set({ [TAB_ACTIVITY_KEY]: activity });
  }

  // ── Update stats ────────────────────────────────────────────────
  async function updateStats() {
    const suspended = await getSuspendedTabs();
    const count = Object.keys(suspended).length;
    const memoryMB = count * MEMORY_PER_TAB_MB;
    const stats = { suspendedCount: count, memorySavedMB: memoryMB };
    await saveStats(stats);

    // Notify popup if open
    try {
      await chrome.runtime.sendMessage({ type: 'statsUpdated', stats: stats });
    } catch (_) {
      // No popup open
    }
  }

  // ── Alarm handler ───────────────────────────────────────────────
  async function onAlarm(alarm) {
    if (alarm.name === ALARM_NAME) {
      await checkInactiveTabs();
    }
  }

  // ── Create/update the periodic alarm ───────────────────────────
  async function setupAlarm() {
    // Check every minute
    await chrome.alarms.create(ALARM_NAME, { periodInMinutes: 1 });
  }

  // ── Handle tab activation ───────────────────────────────────────
  function onTabActivated(activeInfo) {
    markTabActive(activeInfo.tabId);
  }

  // ── Handle tab updates (navigation, etc.) ──────────────────────
  function onTabUpdated(tabId, changeInfo, tab) {
    // If tab navigated to a non-suspended page, mark it active
    if (changeInfo.status === 'complete' && tab.url) {
      if (!tab.url.startsWith('chrome-extension://' + EXTENSION_ID)) {
        markTabActive(tabId);
      }
    }
  }

  // ── Handle tab removal ──────────────────────────────────────────
  function onTabRemoved(tabId) {
    removeTabActivity(tabId);

    // Clean up from suspended tabs
    getSuspendedTabs().then(function (suspended) {
      if (suspended[String(tabId)]) {
        delete suspended[String(tabId)];
        saveSuspendedTabs(suspended);
        updateStats();
      }
    });
  }

  // ── Handle messages from popup ──────────────────────────────────
  function onMessage(message, sender, sendResponse) {
    switch (message.type) {
      case 'settingsUpdated':
        // Alarm already running, next check will use new settings
        break;
      case 'suspendNow':
        suspendAllEligible().then(function () {
          updateStats();
        });
        break;
      case 'unsuspendAll':
        unsuspendAll().then(function () {
          updateStats();
        });
        break;
    }
  }

  // ── Init ─────────────────────────────────────────────────────────
  async function init() {
    // Set up alarm
    await setupAlarm();

    // Register listeners
    chrome.alarms.onAlarm.addListener(onAlarm);
    chrome.tabs.onActivated.addListener(onTabActivated);
    chrome.tabs.onUpdated.addListener(onTabUpdated);
    chrome.tabs.onRemoved.addListener(onTabRemoved);
    chrome.runtime.onMessage.addListener(onMessage);

    // Mark currently active tabs
    const tabs = await chrome.tabs.query({ active: true });
    for (const tab of tabs) {
      await markTabActive(tab.id);
    }

    // Initial stats update
    await updateStats();
  }

  // Handle service worker restart — re-init
  chrome.runtime.onStartup.addListener(function () {
    init();
  });

  // Also init immediately when loaded
  init();
})();
