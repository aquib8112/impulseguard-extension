import {updateUIState, getTotalSeconds, updateInputsFromSeconds} from './popup.js';
import { updatePauseButtonToResume, updateResumeButtonToPause } from './ui.js';

let interval = null;

function saveSession(session) {
  chrome.storage.local.set({ focusSession: session });
}

function getTimeLeft(session) {
  return Math.floor((session.endTime - Date.now()) / 1000);
}

function createNewSession(totalSeconds, whitelist) {
  return {
    status: "running",
    endTime: Date.now() + totalSeconds * 1000,
    originalTime: totalSeconds,
    whitelist
  };
}

function startCountdown(totalSeconds, onEnd) {
  let remaining = totalSeconds;

  interval = setInterval(() => {
    remaining--;

    if (remaining <= 0) {
      clearInterval(interval);
      chrome.storage.local.clear();
      onEnd(); // Handle what happens when timer ends
      return;
    }

    updateInputsFromSeconds(remaining); // Handle UI updates every second
  }, 1000);
}

function pauseSession(session, pauseBtn) {
  clearInterval(interval);
  const remaining = getTotalSeconds();

  session.status = "paused";
  session.remainingTime = remaining;
  delete session.endTime;

  updatePauseButtonToResume(pauseBtn);
  updateUIState("paused");

  saveSession(session);
}

function checkSession(pauseBtn, onEnd) {
  chrome.storage.local.get("focusSession", (data) => {
    const session = data.focusSession;
    if (!session || session.status === "idle") return;

    if (session.status === "paused" && session.remainingTime) {
      updateInputsFromSeconds(session.remainingTime);
      updateUIState("paused");
      updatePauseButtonToResume(pauseBtn);

    } else if (session.status === "running" && session.endTime) {
      const timeLeft = getTimeLeft(session);
      if (timeLeft > 0) {
        updateInputsFromSeconds(timeLeft);
        startCountdown(timeLeft, updateInputsFromSeconds, onEnd);
        updateUIState("running");
      } else {
        chrome.storage.local.clear();
        updateUIState("idle");
      }
    }
  });
}

function togglePauseResume({ pauseBtn, onEnd }) {
  chrome.storage.local.get("focusSession", (data) => {
    const session = data.focusSession || {};

    if (session.status === "running") {
      pauseSession(session, pauseBtn);
    } else if (session.status === "paused") {
      const remaining = session.remainingTime;

      session.status = "running";
      session.endTime = Date.now() + remaining * 1000;
      delete session.remainingTime;

      updateResumeButtonToPause(pauseBtn);

      startCountdown(remaining, updateInputsFromSeconds, onEnd);
      updateUIState("running");

      saveSession(session);

      // Optional: Close visionboard if open
      chrome.tabs.query({}, (tabs) => {
        const vbTab = tabs.find(t => t.url && t.url.includes('visionboard/visionboard.html'));
        if (vbTab) chrome.tabs.remove(vbTab.id);
      });
    }
  });
}

function handleStop(session, pauseBtn, stopBtn) {
  if (session.status === "running") {
    pauseSession(session, pauseBtn);
    if (stopBtn) stopBtn.disabled = true; // Disable STOP during impulse break
    updateUIState("paused");
  }

  chrome.tabs.query({}, (tabs) => {
    const visionboardUrl = chrome.runtime.getURL("visionboard/visionboard.html");
    const existing = tabs.find(
      (t) => t.url && t.url.startsWith(visionboardUrl)
    );
    if (existing) {
      chrome.tabs.update(existing.id, { active: true });
    } else {
      chrome.tabs.create({ url: visionboardUrl });
    }
  });
}


export {
  getTimeLeft,
  startCountdown,
  saveSession,
  pauseSession,
  checkSession,
  handleStop,
  togglePauseResume,
  createNewSession
};