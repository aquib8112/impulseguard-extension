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

  if (!session || (session.status !== "running" && session.status !== "paused")) return;

  const blockedPageUrl = chrome.runtime.getURL("src/blocked/blocked.html");

  if (!tab.url) return;
  try {
    const parsed = new URL(tab.url);

    if (
      parsed.protocol === "chrome-extension:" &&
      (parsed.pathname === "/src/visionboard/visionboard.html" || parsed.pathname === "/src/popup/popup.html")
    ) return;

    if (tab.url.startsWith(blockedPageUrl)) return;

    if (!isUrlWhitelisted(tab.url, session.whitelist)) {
      try {
        await chrome.tabs.update(tab.id, { url: blockedPageUrl });
      } catch (err) {
        console.warn(`Failed to update tab ${tab.id}. It may have been closed.`, err);
      }
    }
  } catch (err) {
    console.warn("Invalid URL in checkTab:", tab.url, err);
    try {
      await chrome.tabs.update(tab.id, { url: blockedPageUrl });
    } catch (e) {
      console.warn(`Failed to update invalid tab ${tab.id}.`, e);
    }
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

  if (!session || (session.status !== "running" && session.status !== "paused")) return;

  const blockedPageUrl = chrome.runtime.getURL("src/blocked/blocked.html");
  const url = tab.pendingUrl || tab.url || "";

  if (!url || url.startsWith(blockedPageUrl)) return;

  try {
    const parsed = new URL(url);

    if (
      parsed.protocol === "chrome-extension:" &&
      (parsed.pathname === "/src/visionboard/visionboard.html" || parsed.pathname === "/src/popup/popup.html")
    ) return;

    const hostname = parsed.hostname;
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
  try {
    const tab = await chrome.tabs.get(activeInfo.tabId);
    if (tab && tab.id) {
      try {
        await checkTab(tab.id, null, tab);
      } catch (err) {
        console.warn(`checkTab failed for tab ${tab.id}`, err);
      }
    }
  } catch (err) {
    console.warn(`Tab with id ${activeInfo.tabId} no longer exists.`, err);
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "open-extension-settings") {
    chrome.tabs.create({ url: `chrome://extensions/?id=${chrome.runtime.id}` });
  }

  if (message.type === "scheduleFocusSessionAlarm") {
    chrome.alarms.clear("focusSessionEnd", () => {
      chrome.alarms.create("focusSessionEnd", {
        when: Date.now() + message.totalSeconds * 1000,
      });
      console.log("[Alarm Scheduled by Background] Will fire in", message.totalSeconds, "seconds");
    });
  }

  if (message.type === "clearFocusSessionAlarmAndBadge") {
    chrome.alarms.clear("focusSessionEnd");
    chrome.action.setBadgeText({ text: "" });
    console.log("[Alarm Cleared by Background]");
  }
});


chrome.alarms.onAlarm.addListener((alarm) => {
  console.log("[Alarm Triggered]", alarm.name);
  if (alarm.name === "focusSessionEnd") {
    chrome.storage.local.remove(["focusSession", "sessionStatus", "sessionStartTime"], () => {
      chrome.action.setBadgeText({ text: "Done" });
      chrome.action.setBadgeBackgroundColor({ color: "#10b981" });
    });
  }
});

