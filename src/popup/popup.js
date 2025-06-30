import {
  handleStop,
  saveSession,
  checkSession,
  startCountdown,
  createNewSession,
  togglePauseResume,
  
} from './session.js';

import { 
  showFloatingWarning,
  renderTabList,
  disableTimerInputs,
  setTabTogglesVisible
} from './ui.js';

let isRunning = false;
const hrInput = document.getElementById('hours');
const minInput = document.getElementById('minutes');
const secInput = document.getElementById('seconds');

const startBtn = document.getElementById("initialStartBtn");
const pauseBtn = document.getElementById("pauseBtn");
const stopBtn = document.getElementById("stopBtn");
const sessionControls = document.getElementById("sessionControls");

[hrInput, minInput, secInput].forEach((input) => {
  input.addEventListener("input", () => {
    input.value = input.value.replace(/\D/g, "").slice(0, 2); // digits only, max 2
  });

  input.addEventListener("blur", () => {
    const max = input.id === "hours" ? 23 : 59;
    let val = parseInt(input.value);
    if (isNaN(val)) val = 0;
    val = Math.min(Math.max(val, 0), max);
    input.value = val < 10 ? "0" + val : "" + val;
  });
});

function onEnd() {
  hrInput.disabled = false;
  minInput.disabled = false;
  secInput.disabled = false;
  updateUIState("idle");
}

function getTotalSeconds() {
  return (
    parseInt(hrInput.value || 0) * 3600 +
    parseInt(minInput.value || 0) * 60 +
    parseInt(secInput.value || 0)
  );
}

function updateInputsFromSeconds(totalSeconds) {
  const hrs = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;

  hrInput.value = hrs;
  minInput.value = mins;
  secInput.value = secs;
}

function updateUIState(state){
  if (state === "idle") {
    startBtn.style.display = "inline-block";
    sessionControls.style.display = "none";
    isRunning = false;
    disableTimerInputs(false, hrInput, minInput, secInput);
    setTabTogglesVisible(true);
    if (stopBtn) stopBtn.disabled = false;
  }

  if (state === "running") {
    startBtn.style.display = "none";
    sessionControls.style.display = "block";
    isRunning = true;
    disableTimerInputs(true, hrInput, minInput, secInput);
    setTabTogglesVisible(false);
    if (stopBtn) stopBtn.disabled = false;
  }

  if (state === "paused") {
    startBtn.style.display = "none";
    sessionControls.style.display = "block";
    isRunning = false;
    disableTimerInputs(true, hrInput, minInput, secInput);
    setTabTogglesVisible(false);
    if (stopBtn) stopBtn.disabled = true;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  chrome.tabs.query({}, (tabs) => {
    renderTabList(tabs);
  });

  checkSession(pauseBtn, onEnd);
});

startBtn.addEventListener("click", () => {
  const totalSeconds = getTotalSeconds();
  if (totalSeconds <= 0) return;

  const checkboxes = document.querySelectorAll("#tab-list input[type='checkbox']:checked");
  if (checkboxes.length === 0) {
    showFloatingWarning();
    return;
  }

  const whitelist = Array.from(checkboxes).map(cb => cb.value);
  const session = createNewSession(totalSeconds, whitelist);

  saveSession(session);
  startCountdown(totalSeconds, onEnd);
  updateUIState("running");
});

pauseBtn.addEventListener("click", () => {
  togglePauseResume({pauseBtn,onEnd});
});

stopBtn.addEventListener("click", () => {
  chrome.storage.local.get("focusSession", (data) => {
    const session = data.focusSession || {};
    handleStop(session, pauseBtn, stopBtn);
  });
});

export{
  updateUIState,
  updateInputsFromSeconds,
  getTotalSeconds,
};