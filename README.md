# Tab Suspender Pro

A Chrome extension that automatically suspends inactive tabs to save memory. Built with Manifest V3 — no frameworks, no external dependencies, no tracking.

## Features

- **Auto-Suspend** — Automatically suspends tabs that have been inactive past a configurable timeout
- **Configurable Timeout** — Choose 5, 15, 30, or 60 minutes of inactivity before suspension
- **Site Whitelist** — Prevent specific sites from being suspended
- **Manual Controls** — Suspend all eligible tabs now, or unsuspend all at once
- **Memory Savings** — Tracks estimated memory saved by suspended tabs
- **Dark UI** — Clean, dark-themed popup interface
- **Privacy First** — 100% local. No data collection, no external servers, no analytics.

## Installation

### From Chrome Web Store (recommended)

1. Visit the [Chrome Web Store listing](#) (coming soon)
2. Click **Add to Chrome**

### Manual Installation (Developer Mode)

1. Download or clone this repository
2. Open Chrome and navigate to `chrome://extensions`
3. Enable **Developer mode** (toggle in top-right corner)
4. Click **Load unpacked**
5. Select the `tab-suspender-pro` folder
6. The extension is now installed

## Usage

### Popup Controls

Click the extension icon in the toolbar to open the popup:

| Control | Description |
|---------|-------------|
| **Auto-Suspend toggle** | Enable/disable automatic tab suspension |
| **Timeout selector** | Set inactivity timeout (5/15/30/60 minutes) |
| **Whitelist Current Site** | Add the current tab's site to the whitelist |
| **Stats** | View suspended tab count and estimated memory saved |
| **Suspend Now** | Immediately suspend all eligible tabs |
| **Unsuspend All** | Restore all suspended tabs |

### Suspended Tab Page

When a tab is suspended, it shows:
- A "Tab Suspended" message
- The original URL
- A **Restore Tab** button (click anywhere on the page to restore)

### Whitelist Management

- Add sites via the popup's **Whitelist Current Site** button
- Remove sites by clicking the ✕ button next to each entry
- Whitelisted sites will never be auto-suspended

## How It Works

1. The background service worker runs a periodic check (every 60 seconds)
2. It queries all open tabs and checks their activity status
3. Tabs inactive longer than the configured timeout are suspended
4. Suspended tabs are replaced with a lightweight local page showing the original URL
5. Clicking anywhere on the suspended page restores the original URL

### What Tabs Are Skipped

- Pinned tabs
- Tabs playing audio
- Chrome internal pages (`chrome://`, `chrome-extension://`)
- Whitelisted sites
- The active tab in the focused window

## Permissions

| Permission | Why It's Needed |
|------------|-----------------|
| `storage` | Save settings, whitelist, and stats locally |
| `tabs` | Query and update tab URLs for suspension/restoration |
| `alarms` | Run periodic checks to find inactive tabs |

No `host_permissions` are required — the extension only interacts with its own local pages.

## Development

### File Structure

```
tab-suspender-pro/
├── manifest.json        # Extension manifest (MV3)
├── popup.html           # Popup UI
├── popup.css            # Popup styles (dark theme)
├── popup.js             # Popup logic and settings management
├── background.js        # Service worker (inactivity checks, suspension)
├── suspended.html       # Suspended tab page
├── suspended.css        # Suspended page styles
├── suspended.js         # Restore tab logic
├── README.md            # This file
├── PRIVACY.md           # Privacy policy
└── LICENSE              # MIT license
```

### Building

No build step required. The extension is pure vanilla JS.

### Testing

1. Load the extension in developer mode (see Installation)
2. Open multiple tabs and wait for the timeout to trigger
3. Check the popup for stats
4. Test whitelist functionality
5. Test manual suspend/unsuspend

## License

MIT — see [LICENSE](LICENSE) for details.
