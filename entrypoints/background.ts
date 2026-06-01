import jsQR from "jsqr";
import { isAllowedImageScheme, isOpenableUrl } from "../lib/url";

const MENU_ID = "read-qr-code";
// デコードに十分かつメッセージサイズを抑えるため、長辺をこの値まで縮小する。
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

// アクティブタブにオンデマンドで注入される関数。シリアライズされてページ
// コンテキストで実行されるため、import やモジュールスコープの値を参照できない
// （引数とブラウザ API のみ使用可）。重い jsQR は注入せず、ここでは画像を取得して
// ピクセルデータを返すだけにし、デコードは背景（service worker）側で行う。
async function grabImagePixels(
  srcUrl: string,
  maxDim: number
): Promise<PixelResult> {
  try {
    const res = await fetch(srcUrl);
    if (!res.ok) {
      return { ok: false, error: `画像の取得に失敗しました: ${res.status}` };
    }
    const blob = await res.blob();
    const objectUrl = URL.createObjectURL(blob);
    try {
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const i = new Image();
        i.onload = () => resolve(i);
        i.onerror = () => reject(new Error("画像の読み込みに失敗しました"));
        i.src = objectUrl;
      });

      const w = img.naturalWidth;
      const h = img.naturalHeight;
      if (w === 0 || h === 0) {
        return { ok: false, error: "画像を読み込めませんでした" };
      }

      // 長辺が maxDim を超える場合のみ縮小（拡大はしない）。描画時にスケールする
      // ので元サイズの巨大な canvas は確保しない。
      const scale = Math.min(1, maxDim / Math.max(w, h));
      const cw = Math.max(1, Math.round(w * scale));
      const ch = Math.max(1, Math.round(h * scale));

      const canvas = document.createElement("canvas");
      canvas.width = cw;
      canvas.height = ch;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        return { ok: false, error: "Canvas コンテキストの取得に失敗しました" };
      }
      ctx.drawImage(img, 0, 0, cw, ch);
      const imageData = ctx.getImageData(0, 0, cw, ch);
      return { ok: true, data: Array.from(imageData.data), width: cw, height: ch };
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "不明なエラー" };
  }
}

export default defineBackground(() => {
  chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.create({
      id: MENU_ID,
      title: "QRコードを読み取って開く",
      contexts: ["image"],
    });
  });

  chrome.contextMenus.onClicked.addListener(async (info, tab) => {
    if (info.menuItemId !== MENU_ID || !info.srcUrl || !tab?.id) return;

    if (!isAllowedImageScheme(info.srcUrl)) {
      notify("対応していない画像 URL のため読み取れません");
      return;
    }

    // 右クリック（コンテキストメニュー）はユーザージェスチャなので、activeTab により
    // host_permissions なしで当該タブへ一時的に注入できる。
    let results;
    try {
      results = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: grabImagePixels,
        args: [info.srcUrl, MAX_DIMENSION],
      });
    } catch (e) {
      console.error("[QR Reader]", e);
      notify("このページでは QR コードを読み取れませんでした");
      return;
    }

    const px = results[0]?.result as PixelResult | undefined;
    if (!px || !px.ok) {
      const msg = px && !px.ok ? px.error : "QR コードを読み取れませんでした";
      console.error("[QR Reader]", msg);
      notify(msg);
      return;
    }

    const code = jsQR(new Uint8ClampedArray(px.data), px.width, px.height);
    if (!code) {
      notify("QR コードが見つかりませんでした");
      return;
    }

    const url = code.data;
    if (isOpenableUrl(url)) {
      chrome.tabs.create({ url });
      // 開いた先をユーザーに見せる（quishing 対策の最低限の可視化）。
      notify(`QR コードを開きました:\n${url}`);
    } else {
      console.warn("[QR Reader] 安全でないスキームのURLのため開きません");
      notify(`安全でない URL のため開きませんでした:\n${url}`);
    }
  });
});
