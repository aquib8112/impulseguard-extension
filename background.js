chrome.runtime.onStartup.addListener(() => {
  chrome.storage.local.clear();
});

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.clear();
});

function isUrlWhitelisted(url, whitelist) {
  return whitelist.some(domain => url.includes(domain));
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

chrome.tabs.onUpdated.addListener(checkTab);
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  const tab = await chrome.tabs.get(activeInfo.tabId);
  checkTab(tab.id, null, tab);
});
