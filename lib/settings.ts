// How a decoded URL is opened after reading a QR code.
export type OpenMode = "new-tab" | "new-tab-background" | "current-tab";

export type Settings = {
  openMode: OpenMode;
};

export const DEFAULT_SETTINGS: Settings = {
  openMode: "new-tab",
};

const KEY = "settings";

export async function loadSettings(): Promise<Settings> {
  const stored = await chrome.storage.sync.get(KEY);
  return { ...DEFAULT_SETTINGS, ...(stored[KEY] ?? {}) };
}

export async function saveSettings(patch: Partial<Settings>): Promise<Settings> {
  const current = await loadSettings();
  const next = { ...current, ...patch };
  await chrome.storage.sync.set({ [KEY]: next });
  return next;
}
