# Privacy Policy

**Last updated:** July 5, 2026

## Our Commitment

Tab Suspender Pro is designed with your privacy as a top priority. We believe in complete transparency about how the extension operates.

## Data Collection

**Tab Suspender Pro collects NO data.** Period.

- No personal information is collected
- No browsing history is collected
- No usage data is collected
- No analytics or tracking scripts are included
- No external servers are contacted
- No cookies are used
- No user profiling of any kind

## How the Extension Works

All processing happens entirely on your local machine:

1. **Settings** (auto-suspend toggle, timeout, whitelist) are stored locally using `chrome.storage.local`
2. **Tab activity tracking** is stored locally using `chrome.storage.local`
3. **Suspended tab mappings** are stored locally using `chrome.storage.local`
4. **Stats** (suspended count, memory estimate) are calculated locally and stored using `chrome.storage.local`

No data ever leaves your browser.

## Permissions

The extension requests the minimum permissions needed to function:

| Permission | Purpose | Data Access |
|------------|---------|-------------|
| `storage` | Save settings and state locally | Local only — no data transmitted |
| `tabs` | Query and update tab URLs for suspension | Used only to read tab URLs and update them to the suspended page |
| `alarms` | Run periodic checks for inactive tabs | No data access — purely scheduling |

## Third Parties

- No third-party code is loaded
- No external APIs are called
- No CDN resources are fetched
- The extension is fully self-contained

## Changes to This Policy

If this policy changes, the version date at the top will be updated. Given the extension's architecture, meaningful data collection would require a manifest update that would be visible in the Chrome Web Store review process.

## Contact

For questions about this privacy policy, please open an issue on the extension's GitHub repository.

---

**TL;DR:** Everything stays on your computer. Nothing is sent anywhere. Ever.
