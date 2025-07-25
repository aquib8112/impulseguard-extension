import {
  handleStop,
  saveSession,
  checkSession,
  startCountdown,
  createNewSession,
  togglePauseResume,
  getTimeLeft,
  pauseSession,
} from './session.js';

import { 
  updateUIState,
  renderTabList,
  getTotalSeconds,
  setupScrollBlur,
  showFloatingWarning,
  setupInputValidation,
  updateInputsFromSeconds,
  updateResumeButtonToPause,
  updatePauseButtonToResume,
  scheduleFocusSessionAlarm,
  clearFocusSessionAlarmAndBadge
} from './ui.js';

function onEnd(controller, timer) {
  updateUIState("idle", controller, timer);
}

document.addEventListener("DOMContentLoaded", () => {
  const hrInput = document.getElementById('hours');
  const minInput = document.getElementById('minutes');
  const secInput = document.getElementById('seconds');

  const startBtn = document.getElementById("initialStartBtn");
  const pauseBtn = document.getElementById("pauseBtn");
  const stopBtn = document.getElementById("stopBtn");
  const sessionControls = document.getElementById("sessionControls");
  const openSettingsBtn = document.getElementById("openSettingsBtn");
  
  const tabList = document.querySelector('.tab-list');
  const triggerMaskUpdate = setupScrollBlur(tabList);

  const controller = {startBtn, stopBtn, pauseBtn, sessionControls};
  const timer = {hrInput, minInput,secInput};

  setupInputValidation(hrInput, minInput, secInput);

  chrome.tabs.query({}, (tabs) => {
    renderTabList(tabs);
    triggerMaskUpdate();
  });

  checkSession(onEnd, getTimeLeft, updateUIState, startCountdown, updateInputsFromSeconds, updatePauseButtonToResume, clearFocusSessionAlarmAndBadge, controller, timer);

  startBtn.addEventListener("click", () => {
    const totalSeconds = getTotalSeconds(hrInput, minInput, secInput);
    if (totalSeconds <= 0) return;

    const checkboxes = document.querySelectorAll("#tab-list input[type='checkbox']:checked");
    if (checkboxes.length === 0) {
      showFloatingWarning();
      return;
    }

    const whitelist = Array.from(checkboxes).map(cb => cb.value);
    const session = createNewSession(totalSeconds, whitelist);

    saveSession(session);
    scheduleFocusSessionAlarm(totalSeconds);

    startCountdown(totalSeconds, onEnd, updateInputsFromSeconds, controller, timer);
    updateUIState("running",controller, timer);
  });

  pauseBtn.addEventListener("click", () => {
    
    const totalSeconds = getTotalSeconds(hrInput,minInput,secInput);
    togglePauseResume(
      totalSeconds, 
      onEnd, 
      saveSession, 
      pauseSession, 
      updateUIState, 
      startCountdown, 
      updateInputsFromSeconds, 
      updatePauseButtonToResume, 
      updateResumeButtonToPause, 
      scheduleFocusSessionAlarm,
      clearFocusSessionAlarmAndBadge, 
      controller, 
      timer
    );

  });

  stopBtn.addEventListener("click", () => {
    chrome.storage.local.get("focusSession", (data) => {
      
      const session = data.focusSession || {};
      const totalSeconds = getTotalSeconds(hrInput,minInput,secInput);
      handleStop(
        session, 
        totalSeconds, 
        saveSession,  
        pauseSession, 
        updateUIState, 
        updatePauseButtonToResume, 
        clearFocusSessionAlarmAndBadge, 
        controller, 
        timer
      );

    });
  });

  openSettingsBtn?.addEventListener("click", () => {
    chrome.runtime.openOptionsPage();
  });

});