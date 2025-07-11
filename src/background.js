function isUrlWhitelisted(url, whitelist) {
  try {
    const parsedUrl = new URL(url);

    if (parsedUrl.protocol === "chrome-extension:" && parsedUrl.pathname === "/src/visionboard/visionboard.html") {
      return true;
    }

    return whitelist.includes(parsedUrl.hostname);
  } catch (err) {
    console.warn("Invalid URL in checkTab:", url);
    return false;
  }
}

async function checkTab(tabId, changeInfo, tab) {
  const data = await chrome.storage.local.get("focusSession");
  const session = data.focusSession;

  if (!session || (session.status !== "running" && session.status !== "paused")) {
    return;
  }

  const blockedPageUrl = chrome.runtime.getURL("src/blocked.html");
  try {
    if (!tab.url) return;
    const parsed = new URL(tab.url);

    if (parsed.protocol === "chrome-extension:" && parsed.pathname === "/src/visionboard/visionboard.html") {
      return;
    }

    if (tab.url.startsWith(blockedPageUrl)) return;

    if (!isUrlWhitelisted(tab.url, session.whitelist)) {
      chrome.tabs.update(tab.id, { url: blockedPageUrl });
    }
  } catch (err) {
    console.warn("Invalid URL in checkTab:", tab.url);
    chrome.tabs.update(tab.id, { url: blockedPageUrl });
  }
}

chrome.runtime.onStartup.addListener(() => {
  chrome.storage.local.remove(["focusSession", "sessionStatus", "sessionStartTime"]);
});

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.remove(["focusSession", "sessionStatus", "sessionStartTime"]);
});

chrome.tabs.onCreated.addListener(async (tab) => {
  const data = await chrome.storage.local.get("focusSession");
  const session = data.focusSession;

  if (!session || (session.status !== "running" && session.status !== "paused")) {
    return;
  }

  const blockedPageUrl = chrome.runtime.getURL("src/blocked.html");
  const url = tab.pendingUrl || tab.url || "";

  if (!url || url.startsWith(blockedPageUrl) || url.startsWith("chrome-extension://")) {
    try {
      const parsed = new URL(url);
      if (parsed.pathname === "/src/visionboard/visionboard.html") return; 
    } catch (e) {
      return;
    }
    return;
  }

  try {
    const hostname = new URL(url).hostname;

    if (!session.whitelist.includes(hostname)) {
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

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "open-extension-settings") {
    chrome.tabs.create({ url: `chrome://extensions/?id=${chrome.runtime.id}` });
  }
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "focusSessionEnd") {
    chrome.storage.local.clear(() => {
      chrome.action.setBadgeText({ text: "Done" });
      chrome.action.setBadgeBackgroundColor({ color: "#10b981" }); // green
    });
  }
});