import jsQR from "jsqr";
import { isAllowedImageScheme, isOpenableUrl } from "../lib/url";

const MENU_ID = "read-qr-code";
// Downscale the longer side to this so the message stays small while still
// being large enough to decode.
const MAX_DIMENSION = 2048;

type PixelResult =
  | { ok: true; data: number[]; width: number; height: number }
  | { ok: false; error: string };

function notify(message: string): void {
  chrome.notifications.create({
    type: "basic",
    iconUrl: chrome.runtime.getURL("icon128.png"),
    title: "QR Reader",
    message,
  });
}

// Injected into the active tab on demand. It is serialized and runs in the page
// context, so it cannot reference imports or module-scope values (only its
// arguments and browser APIs). The heavy jsQR is not injected; this only fetches
// the image and returns its pixels, and decoding happens in the background.
async function grabImagePixels(
  srcUrl: string,
  maxDim: number
): Promise<PixelResult> {
  try {
    const res = await fetch(srcUrl);
    if (!res.ok) {
      return { ok: false, error: `Failed to fetch the image: ${res.status}` };
    }
    const blob = await res.blob();
    const objectUrl = URL.createObjectURL(blob);
    try {
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const i = new Image();
        i.onload = () => resolve(i);
        i.onerror = () => reject(new Error("Failed to load the image"));
        i.src = objectUrl;
      });

      const w = img.naturalWidth;
      const h = img.naturalHeight;
      if (w === 0 || h === 0) {
        return { ok: false, error: "Could not load the image" };
      }

      // Downscale only when the longer side exceeds maxDim (never upscale).
      // Scaling on draw avoids allocating a full-size canvas.
      const scale = Math.min(1, maxDim / Math.max(w, h));
      const cw = Math.max(1, Math.round(w * scale));
      const ch = Math.max(1, Math.round(h * scale));

      const canvas = document.createElement("canvas");
      canvas.width = cw;
      canvas.height = ch;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        return { ok: false, error: "Could not get a canvas context" };
      }
      ctx.drawImage(img, 0, 0, cw, ch);
      const imageData = ctx.getImageData(0, 0, cw, ch);
      return { ok: true, data: Array.from(imageData.data), width: cw, height: ch };
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Unknown error" };
  }
}

export default defineBackground(() => {
  chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.create({
      id: MENU_ID,
      title: "Read QR code and open",
      contexts: ["image"],
    });
  });

  chrome.contextMenus.onClicked.addListener(async (info, tab) => {
    if (info.menuItemId !== MENU_ID || !info.srcUrl || !tab?.id) return;

    if (!isAllowedImageScheme(info.srcUrl)) {
      notify("Unsupported image URL; cannot read it");
      return;
    }

    // A right-click (context menu) is a user gesture, so activeTab lets us
    // inject into that tab temporarily without host_permissions.
    let results;
    try {
      results = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: grabImagePixels,
        args: [info.srcUrl, MAX_DIMENSION],
      });
    } catch (e) {
      console.error("[QR Reader]", e);
      notify("Cannot read a QR code on this page");
      return;
    }

    const px = results[0]?.result as PixelResult | undefined;
    if (!px || !px.ok) {
      const msg = px && !px.ok ? px.error : "Could not read the QR code";
      console.error("[QR Reader]", msg);
      notify(msg);
      return;
    }

    const code = jsQR(new Uint8ClampedArray(px.data), px.width, px.height);
    if (!code) {
      notify("No QR code found");
      return;
    }

    const url = code.data;
    if (isOpenableUrl(url)) {
      chrome.tabs.create({ url });
      // Show where the user is going (minimal quishing visibility).
      notify(`Opened the QR code:\n${url}`);
    } else {
      console.warn("[QR Reader] refusing to open an unsafe-scheme URL");
      notify(`Did not open an unsafe URL:\n${url}`);
    }
  });
});
