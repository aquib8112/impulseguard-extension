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

function startCountdown(totalSeconds, onEnd, updateInputsFromSeconds, controller, timer) {
  let remaining = totalSeconds;

  interval = setInterval(() => {
    remaining--;

    if (remaining <= 0) {
      clearInterval(interval);
      chrome.storage.local.clear();
      onEnd(controller, timer); // Handle what happens when timer ends
      return;
    }

    updateInputsFromSeconds(remaining, timer.hrInput, timer.minInput, timer.secInput); // Handle UI updates every second
  }, 1000);
}

function pauseSession(session, totalSeconds, updateUIState, controller, timer) {
  clearInterval(interval);

  session.status = "paused";
  session.remainingTime = totalSeconds;
  delete session.endTime;

  updatePauseButtonToResume(controller.pauseBtn);
  updateUIState("paused", controller, timer);

  saveSession(session);
}

function checkSession(onEnd, updateUIState, updateInputsFromSeconds, controller, timer) {
  chrome.storage.local.get("focusSession", (data) => {
    const session = data.focusSession;
    if (!session || session.status === "idle") return;

    if (session.status === "paused" && session.remainingTime) {
      updateInputsFromSeconds(session.remainingTime, timer.hrInput, timer.minInput, timer.secInput);
      updateUIState("paused", controller, timer);
      updatePauseButtonToResume(controller.pauseBtn);

    } else if (session.status === "running" && session.endTime) {
      const timeLeft = getTimeLeft(session);
      
      if (timeLeft > 0) {
        updateInputsFromSeconds(timeLeft, timer.hrInput, timer.minInput, timer.secInput);
        startCountdown(timeLeft, onEnd, updateInputsFromSeconds, controller, timer);
        updateUIState("running", controller, timer);
      } else {
        chrome.storage.local.clear();
        updateUIState("idle", controller, timer);
      }
    }
  });
}

function togglePauseResume(totalSeconds, onEnd, updateUIState, updateInputsFromSeconds, controller, timer) {
  chrome.storage.local.get("focusSession", (data) => {
    const session = data.focusSession || {};

    if (session.status === "running") {
      pauseSession(session, totalSeconds, updateUIState, controller, timer);
    } else if (session.status === "paused") {
      const remaining = session.remainingTime;

      session.status = "running";
      session.endTime = Date.now() + remaining * 1000;
      delete session.remainingTime;

      updateResumeButtonToPause(controller.pauseBtn);

      startCountdown(remaining, onEnd, updateInputsFromSeconds, controller, timer);
      updateUIState("running", controller, timer);

      saveSession(session);

      // Optional: Close visionboard if open
      chrome.tabs.query({}, (tabs) => {
        const vbTab = tabs.find(t => t.url && t.url.includes('visionboard/visionboard.html'));
        if (vbTab) chrome.tabs.remove(vbTab.id);
      });
    }
  });
}

function handleStop(session, totalSeconds, updateUIState, controller, timer) {
  if (session.status === "running") {
    pauseSession(session, totalSeconds, updateUIState, controller, timer);
    if (controller.stopBtn) controller.stopBtn.disabled = true; // Disable STOP during impulse break
    updateUIState("paused", controller, timer);
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
  handleStop,
  getTimeLeft,
  saveSession,
  checkSession,
  startCountdown,
  createNewSession,
  togglePauseResume
};