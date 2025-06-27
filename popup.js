const hrInput = document.getElementById('hours');
const minInput = document.getElementById('minutes');
const secInput = document.getElementById('seconds');

const hourInput = document.getElementById("hours");
const minuteInput = document.getElementById("minutes");
const secondInput = document.getElementById("seconds");

const startBtn = document.getElementById("initialStartBtn");
const pauseBtn = document.getElementById("pauseBtn");
const stopBtn = document.getElementById("stopBtn");
const sessionControls = document.getElementById("sessionControls");

let interval = null;
let isRunning = false;

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

function startCountdown(total) {
  interval = setInterval(() => {
    if (--total <= 0) {
      clearInterval(interval);
      chrome.storage.local.clear();
      startPauseBtn.textContent = "Start";
      isRunning = false;
      hrInput.disabled = minInput.disabled = secInput.disabled = false;
      return;
    }
    total--;
    updateInputsFromSeconds(total);
  }, 1000);
}

function updateUIState(state) {
  const startBtn = document.getElementById("initialStartBtn");
  const sessionControls = document.getElementById("sessionControls");

  if (state === "idle") {
    startBtn.style.display = "inline-block";
    sessionControls.style.display = "none";
    isRunning = false;
    hrInput.disabled = minInput.disabled = secInput.disabled = false;

    if (stopBtn) stopBtn.disabled = false;
  }

  if (state === "running") {
    startBtn.style.display = "none";
    sessionControls.style.display = "block";
    isRunning = true;
    hrInput.disabled = minInput.disabled = secInput.disabled = true;

    if (stopBtn) stopBtn.disabled = false;
  }

  if (state === "paused") {
    startBtn.style.display = "none";
    sessionControls.style.display = "block";
    isRunning = false;
    hrInput.disabled = minInput.disabled = secInput.disabled = true;

    if (stopBtn) stopBtn.disabled = true;
  }
}

function saveSession(session) {
  chrome.storage.local.set({ focusSession: session });
}

function getTimeLeft(session) {
  return Math.floor((session.endTime - Date.now()) / 1000);
}

function pauseSession(session, pauseBtn) {
  clearInterval(interval);
  const remaining = getTotalSeconds();

  session.status = "paused";
  session.remainingTime = remaining;
  delete session.endTime;

  pauseBtn.textContent = "▶ RESUME";
  pauseBtn.style.backgroundColor = "#d1d5db";
  updateUIState("paused");

  saveSession(session);
}

function handlePauseResume() {
  const pauseBtn = document.getElementById("pauseBtn");

  chrome.storage.local.get("focusSession", (data) => {
    const session = data.focusSession || {};

    if (session.status === "running") {
      pauseSession(session, pauseBtn);
    } else if (session.status === "paused") {
      const remaining = session.remainingTime;

      session.status = "running";
      session.endTime = Date.now() + remaining * 1000;
      delete session.remainingTime;

      pauseBtn.textContent = "⏸ PAUSE";
      pauseBtn.style.backgroundColor = "#facc15";
      startCountdown(remaining);
      updateUIState("running");

      saveSession(session);

      // Optional: Close visionboard when resuming
      chrome.tabs.query({}, (tabs) => {
        const vbTab = tabs.find(t => t.url && t.url.includes('visionboard.html'));
        if (vbTab) chrome.tabs.remove(vbTab.id);
      });
    }
  });
}

function handleStop() {
  const pauseBtn = document.getElementById("pauseBtn");
  const stopBtn = document.getElementById("stopBtn");

  chrome.storage.local.get("focusSession", (data) => {
    const session = data.focusSession || {};

    if (session.status === "running") {
      pauseSession(session, pauseBtn);
      if (stopBtn) stopBtn.disabled = true; // Disable STOP during impulse break
    }

    chrome.tabs.query({}, (tabs) => {
      const existing = tabs.find(
        (t) => t.url && t.url.startsWith(chrome.runtime.getURL("visionboard.html"))
      );
      if (existing) {
        chrome.tabs.update(existing.id, { active: true });
      } else {
        chrome.tabs.create({ url: chrome.runtime.getURL("visionboard.html") });
      }
    });
  });
}


function checkSession() {
  chrome.storage.local.get("focusSession", (data) => {
    const session = data.focusSession;
    if (!session || session.status === "idle") return;

    if (session.status === "paused" && session.remainingTime) {
      updateInputsFromSeconds(session.remainingTime);
      updateUIState("paused");

      const pauseBtn = document.getElementById("pauseBtn");
      pauseBtn.textContent = "▶ RESUME";
      pauseBtn.style.backgroundColor = "#d1d5db";
    } else if (session.status === "running" && session.endTime) {
      const timeLeft = getTimeLeft(session);
      if (timeLeft > 0) {
        updateInputsFromSeconds(timeLeft);
        startCountdown(timeLeft);
        updateUIState("running");
      } else {
        chrome.storage.local.clear();
        updateUIState("idle");
      }
    }
  });
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

document.addEventListener("DOMContentLoaded", () => {
  chrome.tabs.query({}, (tabs) => {
    const container = document.getElementById("tab-list");

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
        favicon.onerror = null;
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
  });

  checkSession();
});

[hourInput, minuteInput, secondInput].forEach((input) => {
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

startBtn.addEventListener("click", () => {
  const totalSeconds = getTotalSeconds();
  if (totalSeconds <= 0) return;

  const checkboxes = document.querySelectorAll("#tab-list input[type='checkbox']:checked");
  if (checkboxes.length === 0) {
    showFloatingWarning();
    return;
  }

  const whitelist = Array.from(checkboxes).map(cb => cb.value);

  const session = {
    status: "running",
    endTime: Date.now() + totalSeconds * 1000,
    originalTime: totalSeconds,
    whitelist: whitelist
  };

  saveSession(session);
  startCountdown(totalSeconds);
  updateUIState("running");
});

pauseBtn.addEventListener("click", handlePauseResume);
stopBtn.addEventListener("click", handleStop);
