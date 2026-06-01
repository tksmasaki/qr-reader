import jsQR from "jsqr";
import { isAllowedImageScheme, isOpenableUrl } from "../lib/url";
import { setLastResult, type LastResult } from "../lib/result";

const MENU_ID = "read-qr-code";
// Downscale the longer side to this so the message stays small while still
// being large enough to decode.
const MAX_DIMENSION = 2048;

type PixelResult =
  | { ok: true; data: number[]; width: number; height: number }
  | { ok: false; error: string };

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

// Store the result and open the toolbar popup to show it. openPopup() needs
// Chrome 127+ and a target window (without windowId it throws "Could not find
// an active browser window" from a service worker). If it fails, fall back to a
// badge so the user can click the toolbar icon to see the (already stored)
// result.
async function presentResult(
  result: LastResult,
  windowId: number
): Promise<void> {
  await setLastResult(result);
  try {
    await chrome.action.openPopup({ windowId });
  } catch (e) {
    console.error("[QR Reader] openPopup failed:", e);
    await chrome.action.setBadgeText({ text: "!" });
    await chrome.action.setBadgeBackgroundColor({ color: "#1565c0" });
  }
}

export default defineBackground(() => {
  chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.create({
      id: MENU_ID,
      title: "Read QR code",
      contexts: ["image"],
    });
  });

  chrome.contextMenus.onClicked.addListener(async (info, tab) => {
    if (info.menuItemId !== MENU_ID || !info.srcUrl || !tab?.id) return;
    const tabId = tab.id;
    const windowId = tab.windowId;

    if (!isAllowedImageScheme(info.srcUrl)) {
      await presentResult(
        { kind: "error", message: "Unsupported image URL; cannot read it" },
        windowId
      );
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
      await presentResult(
        { kind: "error", message: "Cannot read a QR code on this page" },
        windowId
      );
      return;
    }

    const px = results[0]?.result as PixelResult | undefined;
    if (!px || !px.ok) {
      const msg = px && !px.ok ? px.error : "Could not read the QR code";
      console.error("[QR Reader]", msg);
      await presentResult({ kind: "error", message: msg }, windowId);
      return;
    }

    const code = jsQR(new Uint8ClampedArray(px.data), px.width, px.height);
    if (!code) {
      await presentResult({ kind: "error", message: "No QR code found" }, windowId);
      return;
    }

    const text = code.data;
    await presentResult(
      { kind: "url", url: text, openable: isOpenableUrl(text), tabId },
      windowId
    );
  });
});
