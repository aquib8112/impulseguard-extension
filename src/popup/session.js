let interval = null;
/**  @param {Object} session - The current focus session object. */
function saveSession(session) {
  chrome.storage.local.set({ focusSession: session });
}

/**  @param {Object} session - The current focus session object. */
function getTimeLeft(session) {
  return Math.floor((session.endTime - Date.now()) / 1000);
}


/**
 * @param {number} totalSeconds - Total session time in seconds.
 * @param {string[]} whitelist - Array of whitelisted tab URLs.
 * @returns {Object} session - A newly created focus session object.
 */
function createNewSession(totalSeconds, whitelist) {
  return {
    status: "running",
    endTime: Date.now() + totalSeconds * 1000,
    originalTime: totalSeconds,
    whitelist
  };
}


/**
 * @param {number} totalSeconds - Total countdown time in seconds.
 * @param {function} onEnd - Function to call when timer ends.
 * @param {function} updateInputsFromSeconds - Function to update timer input fields from seconds.
 * @param {Object} controller - UI controller elements (startBtn, stopBtn, pauseBtn, sessionControls).
 * @param {Object} timer - Timer inputs (hrInput, minInput, secInput).
 */
function startCountdown(
  totalSeconds, 
  onEnd, 
  updateInputsFromSeconds, 
  controller, 
  timer
) {
  let remaining = totalSeconds;

  interval = setInterval(() => {
    updateInputsFromSeconds(remaining, timer.hrInput, timer.minInput, timer.secInput);

    if (remaining <= 0) {
      clearInterval(interval);
      chrome.storage.local.clear();
      onEnd(controller, timer); // Handle what happens when timer ends
      return;
    }

    remaining--;
  }, 1000);
}

/**
 * @param {Object} session - The current focus session object.
 * @param {number} totalSeconds - Total time in seconds remaining.
 * @param {function} saveSession - Function to persist session to storage.
 * @param {function} updateUIState - Function to update UI state.
 * @param {function} updatePauseButtonToResume - Function to update pause button to resume state.
 * @param {Object} controller - UI controller elements (startBtn, stopBtn, pauseBtn, sessionControls).
 * @param {Object} timer - Timer inputs (hrInput, minInput, secInput).
 */
function pauseSession(
  session, 
  totalSeconds,
  saveSession,
  updateUIState,
  updatePauseButtonToResume,
  controller, 
  timer
) {
  clearInterval(interval);

  session.status = "paused";
  session.remainingTime = totalSeconds;
  delete session.endTime;

  updatePauseButtonToResume(controller.pauseBtn);
  updateUIState("paused", controller, timer);

  saveSession(session);
}

/**
 * @param {function} onEnd - Function to call when timer ends.
 * @param {function} getTimeLeft - Function to calculate remaining session time.
 * @param {function} updateUIState - Function to update UI state.
 * @param {function} startCountdown - Function to start countdown timer.
 * @param {function} updateInputsFromSeconds - Function to sync timer inputs from seconds.
 * @param {function} updatePauseButtonToResume - Function to update pause button to resume state.
 * @param {Object} controller - UI controller elements (startBtn, stopBtn, pauseBtn, sessionControls).
 * @param {Object} timer - Timer inputs (hrInput, minInput, secInput).
 */
function checkSession(
  onEnd,
  getTimeLeft,
  updateUIState, 
  startCountdown,
  updateInputsFromSeconds,
  updatePauseButtonToResume,
  controller, 
  timer
) {
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


/**
 * @param {number} totalSeconds - Total time in seconds remaining.
 * @param {function} onEnd - Function to call when timer ends.
 * @param {function} saveSession - Function to persist session to storage.
 * @param {function} pauseSession - Function to pause the session.
 * @param {function} updateUIState - Function to update UI state.
 * @param {function} startCountdown - Function to start countdown timer.
 * @param {function} updateInputsFromSeconds - Function to sync timer inputs from seconds.
 * @param {function} updateResumeButtonToPause - Function to update resume button to pause state.
 * @param {Object} controller - UI controller elements (startBtn, stopBtn, pauseBtn, sessionControls).
 * @param {Object} timer - Timer inputs (hrInput, minInput, secInput).
 */
function togglePauseResume(
  totalSeconds, 
  onEnd, 
  saveSession,
  pauseSession,
  updateUIState, 
  startCountdown,
  updateInputsFromSeconds, 
  updatePauseButtonToResume,
  updateResumeButtonToPause,
  controller, 
  timer
) {
  chrome.storage.local.get("focusSession", (data) => {
    const session = data.focusSession || {};

    if (session.status === "running") {
      pauseSession(session, totalSeconds, saveSession, updateUIState, updatePauseButtonToResume, controller, timer);
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


/**
 * @param {Object} session - The current focus session object.
 * @param {number} totalSeconds - Total time in seconds remaining.
 * @param {function} pauseSession - Function to pause the session.
 * @param {function} updateUIState - Function to update UI state.
 * @param {function} updateInputsFromSeconds - Function to sync timer inputs from seconds.
 * @param {Object} controller - UI controller elements (startBtn, stopBtn, pauseBtn, sessionControls).
 * @param {Object} timer - Timer inputs (hrInput, minInput, secInput).
 */

function handleStop(
  session,
  totalSeconds, 
  saveSession,
  pauseSession,
  updateUIState,
  updatePauseButtonToResume, 
  controller, 
  timer
){
  if (session.status === "running") {
    pauseSession(session, totalSeconds, saveSession, updateUIState, updatePauseButtonToResume, controller, timer);
    if (controller.stopBtn) controller.stopBtn.disabled = true; // Disable STOP during impulse break
    updateUIState("paused", controller, timer);
  }

  chrome.tabs.query({}, (tabs) => {
    const visionboardUrl = chrome.runtime.getURL("src/visionboard/visionboard.html");
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
  pauseSession,
  checkSession,
  startCountdown,
  createNewSession,
  togglePauseResume
};