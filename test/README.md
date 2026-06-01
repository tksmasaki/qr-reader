# Manual QA

QR decoding depends on the browser DOM / Chrome APIs and can't be verified in
CI (the pure logic, such as scheme validation, is covered by
[`lib/url.test.ts`](../lib/url.ts)). This directory holds **manual QA fixtures**
for eyeballing the extension's behavior in a real browser.

## `manual-qa.html`

A page that lays out one QR image per case. Right-click each image, run
"Read QR code and open", and check the in-page toast and the tab that opens.

| # | Case | Expected |
|---|------|----------|
| 1 | `data:` QR | opens a tab + toast |
| 2 | `blob:` QR (the key case) | opens a tab + toast |
| 3 | cross-origin (CDN) remote QR | opens (CORS-dependent; needs network) |
| 4 | non-QR image | "No QR code found" toast |
| 5 | unsafe scheme (`WIFI:`) | "Did not open an unsafe URL" toast |
| 6 | unsafe scheme (`javascript:`) | same (not executed) |

### Usage

```sh
npm run build   # build .output/chrome-mv3/ and load it via chrome://extensions
python3 -m http.server   # run from the repo root
# open http://localhost:8000/test/manual-qa.html
```

When opening via `file://`, enable "Allow access to file URLs" for this
extension in `chrome://extensions`. Privileged pages like `chrome://` cannot be
read because `activeTab` injection is not allowed there (by design).

### Regenerating the QR fixtures

The embedded QR images are `data:` URIs pre-generated with
[`qrcode-generator`](https://www.npmjs.com/package/qrcode-generator). To change
the contents, regenerate like this:

```sh
npm i qrcode-generator
node -e '
  const qrcode = require("qrcode-generator");
  const gen = (d) => { const q = qrcode(0, "M"); q.addData(d); q.make(); return q.createDataURL(6, 16); };
  console.log(gen("https://example.com/from-qr"));
'
```

Paste the resulting `data:image/gif;base64,...` into the matching `<img src>` in
`manual-qa.html`.
