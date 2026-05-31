import { defineManifest } from "@crxjs/vite-plugin";
import pkg from "../package.json";

export default defineManifest({
  manifest_version: 3,
  name: "QR Reader",
  version: pkg.version,
  description: "画像を右クリックしてQRコードを読み取り、別タブで開く",
  permissions: ["contextMenus", "tabs"],
  host_permissions: ["<all_urls>"],
  background: {
    service_worker: "src/background.ts",
    type: "module",
  },
  content_scripts: [
    {
      matches: ["<all_urls>"],
      js: ["src/content.ts"],
      run_at: "document_idle",
    },
  ],
  icons: {
    16: "icon16.png",
    48: "icon48.png",
    128: "icon128.png",
  },
});
