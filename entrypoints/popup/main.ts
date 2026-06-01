import { getLastResult } from "../../lib/result";
import { loadSettings } from "../../lib/settings";

function el(id: string): HTMLElement {
  const node = document.getElementById(id);
  if (!node) throw new Error(`[QR Reader] missing #${id}`);
  return node;
}

async function openUrl(url: string, tabId: number): Promise<void> {
  const { openMode } = await loadSettings();
  if (openMode === "current-tab") {
    try {
      await chrome.tabs.update(tabId, { url });
      return;
    } catch {
      // The source tab may be gone; fall back to a new tab.
    }
  }
  await chrome.tabs.create({ url, active: openMode !== "new-tab-background" });
}

async function render(): Promise<void> {
  // Clear the fallback badge shown when openPopup() was unavailable.
  void chrome.action.setBadgeText({ text: "" });

  const result = await getLastResult();
  if (!result) {
    el("empty").hidden = false;
    return;
  }

  if (result.kind === "error") {
    const error = el("error");
    error.textContent = result.message;
    error.hidden = false;
    return;
  }

  el("result").hidden = false;
  el("url-text").textContent = result.url;

  if (result.openable) {
    const button = el("open") as HTMLButtonElement;
    button.hidden = false;
    button.addEventListener("click", async () => {
      button.disabled = true;
      await openUrl(result.url, result.tabId);
      window.close();
    });
  } else {
    el("result-label").textContent = "Decoded text";
    el("not-openable").hidden = false;
  }
}

void render();
