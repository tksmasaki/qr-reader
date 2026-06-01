# QR Reader

Chrome extension that reads a QR code from a right-clicked image and shows the
decoded URL in the toolbar popup, where you can open it.

Read QR codes embedded in a page on the spot — no screenshots or separate apps.

## Usage

1. **Right-click** a QR code image on the page.
2. Choose **"Read QR code"** from the context menu.
3. The toolbar popup opens and shows the decoded URL. Click **Open** to visit it.

Showing the URL in the popup first means you always see where you're going, and
non-web content (e.g. a Wi-Fi or plain-text QR) is shown as text without an Open
button. URLs with a scheme other than `http://` / `https://` are never opened.

## Options

Open the extension's options page (from `chrome://extensions` → QR Reader →
"Extension options") to choose what the **Open** button does:

- **Open in a new tab** (default) — open in a new foreground tab.
- **Open in a background tab** — open in a new tab without switching focus.
- **Open in the current tab** — navigate the current tab to the URL.

## Install (unpacked)

Requires Node.js 20+.

```bash
git clone https://github.com/tksmasaki/qr-reader.git
cd qr-reader
npm install
npm run build
```

1. Open `chrome://extensions/` in Chrome.
2. Enable **Developer mode**.
3. Click **Load unpacked** and select the `.output/chrome-mv3/` directory.

## Development

```bash
npm run dev            # dev server (HMR, auto-opens the browser)
npm run build          # production build -> .output/chrome-mv3/
npm run zip            # build a distributable zip
npm run typecheck      # type check
npm test               # unit tests
npm run generate-icons # regenerate icons (SVG -> PNG via sharp)
```

## Architecture

There is no always-on content script; code is injected into the current tab via
`activeTab` only on a right-click.

- **Service worker** ([entrypoints/background.ts](entrypoints/background.ts)) — registers the `image` context menu. On click it injects a pixel-grabbing function into the active tab with `chrome.scripting.executeScript`, decodes the returned pixels with [jsQR](https://github.com/cozmo/jsQR), stores the result in `chrome.storage.session`, and opens the toolbar popup (`chrome.action.openPopup()`). jsQR is loaded once in the background and is never injected into pages.
- **Injected function** — fetches the image, draws it to a canvas, and returns the pixel data (downscaled so the longer side is ≤ 2048px). It is self-contained with no `import`s and runs in the page context, so `blob:` / `data:` images can be read.
- **Popup** ([entrypoints/popup/](entrypoints/popup/)) — reads the stored result and shows the decoded URL with an **Open** button (or an error / non-openable note). The Open button opens the URL per the options-page setting.

### Why no `<all_urls>`

The previous setup injected a content script containing the QR decoding library
(~135KB) into every page and required `host_permissions: ["<all_urls>"]`. Since
it is only needed at the moment of a right-click, it was switched to `activeTab`
+ on-demand injection, removing the persistent all-sites access.

## Tech stack

- TypeScript
- [WXT](https://wxt.dev/) (Vite-based extension framework)
- [jsQR](https://github.com/cozmo/jsQR) (QR decoding)
- Manifest V3

## Permissions

- `contextMenus` — add the right-click menu on images.
- `scripting` + `activeTab` — inject the pixel-grabbing function temporarily into the right-clicked tab only, triggered by that action (no persistent all-sites access).
- `storage` — persist the options-page setting and pass the read result to the popup (`storage.session`).

## Safety

- **Least privilege** — no `<all_urls>` / `host_permissions`; `activeTab` grants access to the target tab only on a user action.
- **Image URL scheme check** — before injecting, reject image URLs whose scheme is not `http` / `https` / `data` / `blob`.
- **Opened URL scheme check** — the Open button only appears for `http://` / `https://` results (`javascript:` / `data:` / `file:` etc. are shown as text but not openable).
- **Opened URL visibility** — the decoded URL is always shown in the popup before you open it (no silent auto-navigation), which also helps against quishing.
- **Memory release** — the image's Object URL is always freed with `revokeObjectURL` after processing.

## License

MIT
