chrome.runtime.onInstalled.addListener(async () => {
  const defaults = {
    enabled: true,
    mode: "E1", // E1 or E2
    element1: null,
    element2: null,
    finalXPath: ""
  };
  const current = await chrome.storage.local.get(Object.keys(defaults));
  const toSet = {};
  for (const k of Object.keys(defaults)) {
    if (current[k] === undefined) toSet[k] = defaults[k];
  }
  if (Object.keys(toSet).length) await chrome.storage.local.set(toSet);
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  // Mostly a passthrough. Content script writes to storage directly.
  // This is here if you want future routing/logging/badge updates.
  if (msg?.type === "PING") {
    sendResponse({ ok: true });
    return true;
  }
});
