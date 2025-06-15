chrome.runtime.onStartup.addListener(() => {
  chrome.storage.local.clear();
});

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.clear();
});

function isUrlWhitelisted(url, whitelist) {
  try {
    const hostname = new URL(url).hostname;
    return whitelist.includes(hostname);
  } catch (err) {
    console.warn("Invalid URL in checkTab:", url);
    return false;
  }
}

async function checkTab(tabId, changeInfo, tab) {
  const data = await chrome.storage.local.get("focusSession");
  const session = data.focusSession;

  if (!session || !session.active) return;

  const blockedPageUrl = chrome.runtime.getURL("blocked.html");

  if (tab.url.startsWith(blockedPageUrl)) return; // Prevent loop

  if (!isUrlWhitelisted(tab.url, session.whitelist)) {
    chrome.tabs.update(tab.id, { url: blockedPageUrl });
  }
}

chrome.tabs.onCreated.addListener(async (tab) => {
  const data = await chrome.storage.local.get("focusSession");
  const session = data.focusSession;

  if (!session || !session.active) return;

  const blockedPageUrl = chrome.runtime.getURL("blocked.html");
  const url = tab.pendingUrl || tab.url || "";

  if (!url || url.startsWith(blockedPageUrl)) return;

  try {
    const hostname = new URL(url).hostname;

    if (!session.whitelist.includes(hostname)) {
      // Close the new tab if not whitelisted
      chrome.tabs.remove(tab.id);
    }
  } catch (err) {
    console.warn("Invalid URL in onCreated tab handler:", url);
    chrome.tabs.remove(tab.id);
  }
});

chrome.tabs.onUpdated.addListener(checkTab);
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  const tab = await chrome.tabs.get(activeInfo.tabId);
  checkTab(tab.id, null, tab);
});
