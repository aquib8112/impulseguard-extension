let interval;
let isRunning = false;

const hrInput = document.getElementById('hours');
const minInput = document.getElementById('minutes');
const secInput = document.getElementById('seconds');
const startPauseBtn = document.getElementById('startPauseBtn');

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

function startCountdown() {
  let total = getTotalSeconds();

  if (total <= 0) return;

  interval = setInterval(() => {
    if (total <= 0) {
      clearInterval(interval);
      startPauseBtn.textContent = "Start";
      isRunning = false;
      hrInput.disabled = minInput.disabled = secInput.disabled = false;
      return;
    }
    total--;
    updateInputsFromSeconds(total);
  }, 1000);
}

startPauseBtn.addEventListener('click', () => {
  if (!isRunning) {
    startCountdown();
    startPauseBtn.textContent = "STOP";
    isRunning = true;
    hrInput.disabled = minInput.disabled = secInput.disabled = true;
  } else {
    clearInterval(interval);
    startPauseBtn.textContent = "START";
    isRunning = false;
    hrInput.disabled = minInput.disabled = secInput.disabled = false;
  }
});
