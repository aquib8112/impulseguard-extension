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

function handlePause(){console.log("Pause clicked");}

function handleStop(){
  console.log("Stop clicked");

  clearInterval(interval);
  chrome.storage.local.clear();

  document.getElementById("initialStartBtn").style.display = "inline-block";
  document.getElementById("sessionControls").style.display = "none";

  isRunning = false;
  hrInput.disabled = minInput.disabled = secInput.disabled = false;
}

function checkSession() {
  chrome.storage.local.get("focusSession", (data) => {
    const session = data.focusSession;
    if (session && session.active) {
      const timeLeft = Math.floor((session.endTime - Date.now()) / 1000);
      if (timeLeft > 0) {
        updateInputsFromSeconds(timeLeft);
        startCountdown(timeLeft);

        document.getElementById("initialStartBtn").style.display = "none";
        document.getElementById("sessionControls").style.display = "block";

        isRunning = true;
        hrInput.disabled = minInput.disabled = secInput.disabled = true;
      } else {
        chrome.storage.local.clear();
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

      const favicon = document.createElement("img");
      favicon.src = tab.favIconUrl || "";
      favicon.style.width = "16px";
      favicon.style.height = "16px";
      favicon.style.verticalAlign = "middle";
      favicon.style.marginRight = "5px";

      favicon.onerror = () => {
        favicon.onerror = null;
        favicon.src = `https://www.google.com/s2/favicons?sz=64&domain=${domain}`;
      };

      const label = document.createElement("label");
      label.style.whiteSpace = "nowrap";
      label.style.overflow = "hidden";
      label.style.textOverflow = "ellipsis";
      label.style.display = "inline-block";
      label.style.maxWidth = "250px";
      label.style.marginLeft = "5px";

      const maxLen = 28;
      const fullTitle = tab.title || tab.url;
      const shortTitle = fullTitle.length > maxLen ? fullTitle.slice(0, maxLen - 1) + "…" : fullTitle;
      label.textContent = shortTitle;
      label.title = fullTitle;

      const innerLabel = document.createElement("label");
      innerLabel.className = "label";
      innerLabel.appendChild(favicon);
      innerLabel.appendChild(label);

      div.appendChild(innerLabel);
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

  chrome.storage.local.set({
    focusSession: {
      active: true,
      endTime: Date.now() + totalSeconds * 1000,
      whitelist: whitelist,
    }
  });

  startCountdown(totalSeconds);

  // Switch UI state
  startBtn.style.display = "none";
  sessionControls.style.display = "block";

  isRunning = true;
  hrInput.disabled = minInput.disabled = secInput.disabled = true;
});

pauseBtn.addEventListener("click", handlePause);
stopBtn.addEventListener("click", handleStop);
