# QR Reader

Chrome extension that reads a QR code from a right-clicked image and opens the
decoded URL in a new tab.

Read QR codes embedded in a page on the spot — no screenshots or separate apps.

## Usage

1. **Right-click** a QR code image on the page.
2. Choose **"Read QR code and open"** from the context menu.
3. The decoded URL opens in a new tab.

URLs with a scheme other than `http://` / `https://` are not opened, for safety.

## Options

Open the extension's options page (from `chrome://extensions` → QR Reader →
"Extension options") to choose what happens with a decoded URL:

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

- **Service worker** ([entrypoints/background.ts](entrypoints/background.ts)) — registers the `image` context menu. On click it injects a pixel-grabbing function into the active tab with `chrome.scripting.executeScript`, then decodes the returned pixels with [jsQR](https://github.com/cozmo/jsQR). If the result is an `http(s)` URL it opens a new tab. Feedback is shown as an in-page toast injected the same way. jsQR is loaded once in the background and is never injected into pages.
- **Injected functions** — one fetches the image, draws it to a canvas, and returns the pixel data (downscaled so the longer side is ≤ 2048px); another renders a small toast in a Shadow DOM. Both are self-contained with no `import`s and run in the page context, so `blob:` / `data:` images can be read.

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
- `scripting` + `activeTab` — inject code temporarily into the right-clicked tab only, triggered by that action (no persistent all-sites access). Used both for reading the image and for showing the result toast.
- `storage` — persist the options-page setting (how to open the decoded URL).

## Safety

- **Least privilege** — no `<all_urls>` / `host_permissions`; `activeTab` grants access to the target tab only on a user action.
- **Image URL scheme check** — before injecting, reject image URLs whose scheme is not `http` / `https` / `data` / `blob`.
- **Opened URL scheme check** — only open the decoded result when it is `http://` / `https://` (`javascript:` / `data:` / `file:` etc. are rejected).
- **Opened URL visibility** — show the decoded URL in an in-page toast when opening a tab, and never fail silently (privileged pages like `chrome://` can't show a toast; those only log to the console).
- **Memory release** — the image's Object URL is always freed with `revokeObjectURL` after processing.

## License

MIT
