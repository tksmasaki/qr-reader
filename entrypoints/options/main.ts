import { loadSettings, saveSettings, type OpenMode } from "../../lib/settings";

const radios = document.querySelectorAll<HTMLInputElement>(
  'input[name="openMode"]'
);
const status = document.querySelector<HTMLElement>("#status")!;

let statusTimer: ReturnType<typeof setTimeout> | null = null;
function flash(message: string): void {
  status.textContent = message;
  if (statusTimer) clearTimeout(statusTimer);
  statusTimer = setTimeout(() => {
    status.textContent = "";
  }, 2000);
}

async function init(): Promise<void> {
  const { openMode } = await loadSettings();
  for (const radio of radios) {
    radio.checked = radio.value === openMode;
    radio.addEventListener("change", async () => {
      if (!radio.checked) return;
      await saveSettings({ openMode: radio.value as OpenMode });
      flash("Saved.");
    });
  }
}

void init();
