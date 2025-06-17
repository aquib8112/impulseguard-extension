document.addEventListener("DOMContentLoaded", () => {
  chrome.tabs.query({}, (tabs) => {
    const container = document.getElementById("tab-list");

    tabs.forEach((tab) => {
      const div = document.createElement("div");

      const domain = new URL(tab.url).hostname;

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.value = domain;

      const favicon = document.createElement("img");
      favicon.src = tab.favIconUrl || "";  // Try original icon first
      favicon.style.width = "16px";
      favicon.style.height = "16px";
      favicon.style.verticalAlign = "middle";
      favicon.style.marginRight = "5px";

      favicon.onerror = () => {
        favicon.onerror = null;  // Avoid infinite loop
        favicon.src = `https://www.google.com/s2/favicons?sz=64&domain=${domain}`;
      };

      const label = document.createElement("label");

      // ✅ Truncate title and add tooltip
      const maxLen = 28;
      const fullTitle = tab.title || tab.url;
      const shortTitle = fullTitle.length > maxLen ? fullTitle.slice(0, maxLen - 1) + "…" : fullTitle;
      label.textContent = shortTitle;
      label.title = fullTitle;

      // ✅ Style for truncation
      label.style.whiteSpace = "nowrap";
      label.style.overflow = "hidden";
      label.style.textOverflow = "ellipsis";
      label.style.display = "inline-block";
      label.style.maxWidth = "250px";
      label.style.marginLeft = "5px";

      div.appendChild(checkbox);
      div.appendChild(favicon);
      div.appendChild(label);
      container.appendChild(div);
    });
  });

chrome.storage.local.get("focusSession", (data) => {
    const session = data.focusSession;
    if (session && session.active) {
      const timeLeft = Math.floor((session.endTime - Date.now()) / 1000);
      if (timeLeft > 0) {
        updateInputsFromSeconds(timeLeft);
        startCountdown(timeLeft);
        startPauseBtn.textContent = "Stop";
        isRunning = true;
        hrInput.disabled = minInput.disabled = secInput.disabled = true;
      } else {
        chrome.storage.local.clear();
      }
    }
  });

});

const hrInput = document.getElementById('hours');
const minInput = document.getElementById('minutes');
const secInput = document.getElementById('seconds');
const startPauseBtn = document.getElementById('startPauseBtn');

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

startPauseBtn.addEventListener("click", () => {
  const warningMsg = document.getElementById("warning-message");
  if (!isRunning) {
    const totalSeconds = getTotalSeconds();
    if (totalSeconds <= 0) return;

    const checkboxes = document.querySelectorAll("#tab-list input[type='checkbox']:checked");

    if (checkboxes.length === 0) {warningMsg.classList.add("show");
      setTimeout(() => {warningMsg.classList.remove("show");}, 3000); // fade after 3 seconds
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
    startPauseBtn.textContent = "Stop";
    isRunning = true;
    hrInput.disabled = minInput.disabled = secInput.disabled = true;
    window.close();

  } else {
    clearInterval(interval);
    chrome.storage.local.clear();
    startPauseBtn.textContent = "Start";
    isRunning = false;
    hrInput.disabled = minInput.disabled = secInput.disabled = false;
    window.close();

  }
});
