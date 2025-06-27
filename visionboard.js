let time = 90;
const fullDash = 251.2;
const progress = document.getElementById('progress');
const timerText = document.getElementById('timer-text');
const stopButton = document.getElementById('stop-button');

const interval = setInterval(() => {
    time--;
    const offset = (1 - time / 90) * fullDash;
    progress.style.strokeDashoffset = offset;
    timerText.textContent = time;

    if (time <= 0) {
        clearInterval(interval);
        stopButton.disabled = false;
      }
}, 1000);

stopButton.addEventListener("click", () => {
    chrome.storage.local.get("focusSession", (data) => {
      const session = data.focusSession;
      if (!session || !session.originalTime) return;

      chrome.storage.local.clear(() => {
        window.close();
      });
    });
});