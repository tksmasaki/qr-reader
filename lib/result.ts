// The most recent QR read, shared from the background to the popup via
// chrome.storage.session.
export type LastResult =
  | { kind: "url"; url: string; openable: boolean; tabId: number }
  | { kind: "error"; message: string };

const KEY = "lastResult";

export async function setLastResult(result: LastResult): Promise<void> {
  await chrome.storage.session.set({ [KEY]: result });
}

export async function getLastResult(): Promise<LastResult | null> {
  const stored = await chrome.storage.session.get(KEY);
  return (stored[KEY] as LastResult | undefined) ?? null;
}
