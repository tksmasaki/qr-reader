import jsQR from "jsqr";
import { isAllowedImageScheme, isOpenableUrl } from "../lib/url";

const MENU_ID = "read-qr-code";
// Downscale the longer side to this so the message stays small while still
// being large enough to decode.
const MAX_DIMENSION = 2048;

type PixelResult =
  | { ok: true; data: number[]; width: number; height: number }
  | { ok: false; error: string };

type ToastKind = "success" | "error";

// Injected into the tab to render a self-dismissing toast. Serialized and run
// in the page context, so it must be self-contained (args + browser APIs only).
// Uses a Shadow DOM host to stay isolated from the page's styles, and sets the
// message via textContent to avoid any HTML injection.
function renderToast(message: string, kind: string): void {
  const HOST_ID = "__qr-reader-toast__";
  let host = document.getElementById(HOST_ID);
  if (!host) {
    host = document.createElement("div");
    host.id = HOST_ID;
    host.style.cssText =
      "position:fixed;top:16px;right:16px;z-index:2147483647;pointer-events:none;";
    (document.body || document.documentElement).appendChild(host);
  }
  const shadow = host.shadowRoot ?? host.attachShadow({ mode: "open" });
  const box = document.createElement("div");
  box.style.cssText =
    "font:13px/1.5 -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;" +
    "max-width:340px;padding:10px 14px;border-radius:8px;color:#fff;" +
    "box-shadow:0 4px 12px rgba(0,0,0,.3);white-space:pre-wrap;word-break:break-all;" +
    "background:" + (kind === "success" ? "#2e7d32" : "#c62828") + ";";
  box.textContent = message;
  shadow.replaceChildren(box);
  clearTimeout(Number(host.dataset.qrToastTimer));
  host.dataset.qrToastTimer = String(setTimeout(() => host.remove(), 4000));
}

// Show an in-page toast in the given tab. Best-effort: on pages where injection
// is not allowed (e.g. chrome://) it just logs.
async function showToast(
  tabId: number,
  message: string,
  kind: ToastKind
): Promise<void> {
  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      func: renderToast,
      args: [message, kind],
    });
  } catch (e) {
    console.error("[QR Reader] toast failed:", e);
  }
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
    const tabId = tab.id;

    if (!isAllowedImageScheme(info.srcUrl)) {
      await showToast(tabId, "Unsupported image URL; cannot read it", "error");
      return;
    }

    // A right-click (context menu) is a user gesture, so activeTab lets us
    // inject into that tab temporarily without host_permissions.
    let results;
    try {
      results = await chrome.scripting.executeScript({
        target: { tabId },
        func: grabImagePixels,
        args: [info.srcUrl, MAX_DIMENSION],
      });
    } catch (e) {
      console.error("[QR Reader]", e);
      await showToast(tabId, "Cannot read a QR code on this page", "error");
      return;
    }

    const px = results[0]?.result as PixelResult | undefined;
    if (!px || !px.ok) {
      const msg = px && !px.ok ? px.error : "Could not read the QR code";
      console.error("[QR Reader]", msg);
      await showToast(tabId, msg, "error");
      return;
    }

    const code = jsQR(new Uint8ClampedArray(px.data), px.width, px.height);
    if (!code) {
      await showToast(tabId, "No QR code found", "error");
      return;
    }

    const url = code.data;
    if (isOpenableUrl(url)) {
      // Toast the source tab first (it shows where we're going — minimal
      // quishing visibility), then open the decoded URL in a new tab.
      await showToast(tabId, `Opened the QR code:\n${url}`, "success");
      chrome.tabs.create({ url });
    } else {
      console.warn("[QR Reader] refusing to open an unsafe-scheme URL");
      await showToast(tabId, `Did not open an unsafe URL:\n${url}`, "error");
    }
  });
});
