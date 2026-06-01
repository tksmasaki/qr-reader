import { isOpenableUrl } from "../lib/url";

const MENU_ID = "read-qr-code";

export default defineBackground(() => {
  chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.create({
      id: MENU_ID,
      title: "QRコードを読み取って開く",
      contexts: ["image"],
    });
  });

  chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId !== MENU_ID || !info.srcUrl || !tab?.id) return;

    chrome.tabs.sendMessage(
      tab.id,
      { type: "READ_QR", imageUrl: info.srcUrl },
      (response: { url: string } | { error: string } | undefined) => {
        if (chrome.runtime.lastError) {
          console.error("[QR Reader]", chrome.runtime.lastError.message);
          return;
        }
        if (!response) {
          console.error("[QR Reader] コンテンツスクリプトから応答がありません");
          return;
        }
        if ("error" in response) {
          console.error("[QR Reader]", response.error);
          return;
        }
        const { url } = response;
        if (isOpenableUrl(url)) {
          chrome.tabs.create({ url });
        } else {
          console.warn("[QR Reader] 安全でないスキームのURLのため開きません");
        }
      }
    );
  });
});
