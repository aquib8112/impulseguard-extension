const urlParams = new URLSearchParams(window.location.search);
const source = urlParams.get("source");

if (source === "settings") {
  const timerContainer = document.getElementById("timer-container");
  const stopBtn = document.getElementById("stop-button");

  if (timerContainer) timerContainer.style.display = "none";
  if (stopBtn) stopBtn.style.display = "none";
} else {
  // Existing timer logic
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
}

chrome.storage.local.get("visionImage", (data) => {
  const img = document.querySelector(".vision-image");
  if (data.visionImage && img) {
    img.src = data.visionImage;
  } else {
    img.src = "/resources/images/image.png"; // fallback
  }
});
