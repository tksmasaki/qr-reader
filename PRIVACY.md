# Privacy Policy for QR Reader

QR Reader does not collect, store, or transmit any personal data to any external server.

The extension stores only the following data **locally in your browser**:

- Your settings (how the **Open** button opens a decoded URL)
- The most recent read result, passed from the background to the toolbar popup (`storage.session`, cleared when the browser session ends)

This data is stored using Chrome's `storage` API. It never leaves your device and is removed when you uninstall the extension.

QR code images are decoded entirely on your device. The image you right-click is read only at that moment to decode its QR code; neither the image nor the decoded result is sent anywhere.

QR Reader does not use analytics, tracking, advertising, or remote code of any kind.

## Permissions

| Permission | Purpose |
| --- | --- |
| `contextMenus` | Add the "Read QR code" item to the right-click menu on images. |
| `scripting` + `activeTab` | Temporarily inject a pixel-grabbing function into the right-clicked tab, only on that user action. No persistent all-sites access; the extension reads no other page content and sends no data. |
| `storage` | Persist the user's setting and pass the read result to the popup, locally in the browser. |

## Contact

For questions or concerns, open an issue at the project repository.
