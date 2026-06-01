import { isOpenableUrl } from "../lib/url";

const MENU_ID = "read-qr-code";

function notify(message: string): void {
  chrome.notifications.create({
    type: "basic",
    iconUrl: chrome.runtime.getURL("icon128.png"),
    title: "QR Reader",
    message,
  });
}

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
          notify("このページでは QR コードを読み取れませんでした");
          return;
        }
        if (!response) {
          console.error("[QR Reader] コンテンツスクリプトから応答がありません");
          notify("QR コードを読み取れませんでした");
          return;
        }
        if ("error" in response) {
          console.error("[QR Reader]", response.error);
          notify(response.error);
          return;
        }
        const { url } = response;
        if (isOpenableUrl(url)) {
          chrome.tabs.create({ url });
          // 開いた先をユーザーに見せる（quishing 対策の最低限の可視化）。
          notify(`QR コードを開きました:\n${url}`);
        } else {
          console.warn("[QR Reader] 安全でないスキームのURLのため開きません");
          notify(`安全でない URL のため開きませんでした:\n${url}`);
        }
      }
    );
  });
});
