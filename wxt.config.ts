import { defineConfig } from "wxt";

export default defineConfig({
  manifest: {
    name: "QR Reader",
    description: "Right-click an image to read its QR code and open the decoded URL in a new tab.",
    permissions: ["contextMenus", "scripting", "activeTab", "notifications"],
    icons: {
      16: "icon16.png",
      48: "icon48.png",
      128: "icon128.png",
    },
  },
});
