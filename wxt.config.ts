import { defineConfig } from "wxt";

export default defineConfig({
  manifest: {
    name: "QR Reader",
    description: "画像を右クリックしてQRコードを読み取り、別タブで開く",
    permissions: ["contextMenus", "scripting", "activeTab", "notifications"],
    icons: {
      16: "icon16.png",
      48: "icon48.png",
      128: "icon128.png",
    },
  },
});
