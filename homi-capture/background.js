// background.js (MV3 service worker)
const DEFAULTS = {
    endpoint: "http://127.0.0.1:5681/webhook/agents/discover",
    limit: 30
  };
  
  chrome.runtime.onInstalled.addListener(async () => {
    const cur = await chrome.storage.local.get(["endpoint", "limit"]);
    await chrome.storage.local.set({
      endpoint: cur.endpoint || DEFAULTS.endpoint,
      limit: Number.isFinite(cur.limit) ? cur.limit : DEFAULTS.limit,
    });
  });
  
  // Click the extension icon to run on the current tab
  chrome.action.onClicked.addListener(async (tab) => {
    if (!tab.id) return;
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ["content.js"],
    });
  });
  
  // Optional hotkey
  chrome.commands.onCommand.addListener(async (command) => {
    if (command !== "homi-start") return;
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) return;
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ["content.js"],
    });
  });