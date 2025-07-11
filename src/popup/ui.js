function updateResumeButtonToPause(pauseBtn) {
  pauseBtn.textContent = "⏸ PAUSE";
  pauseBtn.style.backgroundColor = "#facc15";
}

function updatePauseButtonToResume(pauseBtn) {
  pauseBtn.textContent = "▶ RESUME";
  pauseBtn.style.backgroundColor = "#d1d5db";
}

function updateUIForPausedState(pauseBtn, sessionInputs) {
  updatePauseButtonToResume(pauseBtn);
  if (sessionInputs) {
    sessionInputs.forEach(input => input.disabled = true);
  }
}

function disableTimerInputs(disable, hrInput, minInput, secInput) {
  hrInput.disabled = minInput.disabled = secInput.disabled = disable;
}

function setTabTogglesVisible(visible) {
  const items = document.querySelectorAll(".item");
  items.forEach(item => {
    const checkbox = item.querySelector("input[type='checkbox']");
    if (checkbox) checkbox.style.display = visible ? "inline-block" : "none";
    item.classList.toggle("no-blur", !visible);
  });
}

function getTotalSeconds(hrInput, minInput, secInput) {
  return (
    parseInt(hrInput.value || 0) * 3600 +
    parseInt(minInput.value || 0) * 60 +
    parseInt(secInput.value || 0)
  );
}

function updateInputsFromSeconds(totalSeconds, hrInput, minInput, secInput) {
  const hrs = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;

  hrInput.value = hrs;
  minInput.value = mins;
  secInput.value = secs;
}

function showFloatingWarning(message = "Please select at least one tab before starting.") {
  const warning = document.getElementById("floating-warning");
  warning.textContent = message;
  warning.classList.add("show");

  const removeWarning = () => {
    warning.classList.remove("show");
    document.removeEventListener("click", removeWarning, true);
    document.removeEventListener("keydown", removeWarning, true);
  };

  // Remove on any interaction or after 300ms
  setTimeout(removeWarning, 2000);
  document.addEventListener("click", removeWarning, true);
  document.addEventListener("keydown", removeWarning, true);
}

function scheduleFocusSessionAlarm(totalSeconds) {
  chrome.alarms.clear("focusSessionEnd", () => {
    chrome.alarms.create("focusSessionEnd", {
      when: Date.now() + totalSeconds * 1000,
    });
  });
}

function clearFocusSessionAlarmAndBadge() {
  chrome.alarms.clear("focusSessionEnd");
  chrome.action.setBadgeText({ text: "" });
}

function setupInputValidation(hrInput, minInput, secInput) {
  if (!hrInput || !minInput || !secInput) return;

  [hrInput, minInput, secInput].forEach((input) => {
    input.addEventListener("input", () => {
      input.value = input.value.replace(/\D/g, "").slice(0, 2);
    });

    input.addEventListener("blur", () => {
      const max = input.id === "hours" ? 23 : 59;
      let val = parseInt(input.value);
      if (isNaN(val)) val = 0;
      val = Math.min(Math.max(val, 0), max);
      input.value = val < 10 ? "0" + val : "" + val;
    });
  });
}

function updateUIState(state, controller, timer) {
  if (state === "idle") {
    controller.startBtn.style.display = "inline-block";
    controller.sessionControls.style.display = "none";
    disableTimerInputs(false, timer.hrInput, timer.minInput, timer.secInput);
    setTabTogglesVisible(true);
    if (controller.stopBtn) controller.stopBtn.disabled = false;
  }

  if (state === "running") {
    controller.startBtn.style.display = "none";
    controller.sessionControls.style.display = "block";
    disableTimerInputs(true, timer.hrInput, timer.minInput, timer.secInput);
    setTabTogglesVisible(false);
    if (controller.stopBtn) controller.stopBtn.disabled = false;
  }

  if (state === "paused") {
    controller.startBtn.style.display = "none";
    controller.sessionControls.style.display = "block";
    disableTimerInputs(true, timer.hrInput, timer.minInput, timer.secInput);
    setTabTogglesVisible(false);
    if (controller.stopBtn) controller.stopBtn.disabled = true;
  }
}

function renderTabList(tabs) {
  const container = document.getElementById("tab-list");
  container.innerHTML = ""; // Clear previous content

  tabs.forEach((tab) => {
    const div = document.createElement("div");
    div.className = "item";

    const domain = new URL(tab.url).hostname;

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.value = domain;

    const labelContainer = document.createElement("div");
    labelContainer.className = "label-container";

    const favicon = document.createElement("img");
    favicon.className = "favicon";
    favicon.src = tab.favIconUrl || "";
    favicon.onerror = () => {
      favicon.onerror = () => {
        favicon.src = "/resources/icons/default_icon.png";
      };
      favicon.src = `https://www.google.com/s2/favicons?sz=64&domain=${domain}`;
    };

    const titleSpan = document.createElement("span");
    titleSpan.className = "title";
    const fullTitle = tab.title || tab.url;
    titleSpan.textContent = fullTitle;
    titleSpan.title = fullTitle;

    labelContainer.appendChild(favicon);
    labelContainer.appendChild(titleSpan);

    div.appendChild(labelContainer);
    div.appendChild(checkbox);

    container.appendChild(div);
  });
}

export {
  updateUIState,
  renderTabList,
  getTotalSeconds,
  disableTimerInputs,
  showFloatingWarning,
  setupInputValidation,
  setTabTogglesVisible,
  updateUIForPausedState,
  updateInputsFromSeconds,
  updatePauseButtonToResume,
  updateResumeButtonToPause,
  scheduleFocusSessionAlarm,
  clearFocusSessionAlarmAndBadge,
};