import { defineConfig } from "wxt";

export default defineConfig({
  manifest: {
    name: "QR Reader",
    description: "Right-click an image to read its QR code and open the decoded URL in a new tab.",
    // chrome.action.openPopup() (used to show the read result) needs Chrome 127+.
    minimum_chrome_version: "127",
    permissions: ["contextMenus", "scripting", "activeTab", "storage"],
    action: {
      default_title: "QR Reader — last read",
    },
    icons: {
      16: "icon16.png",
      48: "icon48.png",
      128: "icon128.png",
    },
  },
});
