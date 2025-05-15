document.getElementById("start").addEventListener("click", () => {
  const duration = parseInt(document.getElementById("duration").value);
  const whitelist = document.getElementById("whitelist").value
    .split(",")
    .map(url => url.trim());

  chrome.storage.local.set({
    focusSession: {
      active: true,
      endTime: Date.now() + duration * 60 * 1000,
      whitelist: whitelist,
    }
  });

  window.close(); // Optional: close popup after starting
});

document.getElementById("stop").addEventListener("click", () => {
  chrome.storage.local.set({
    focusSession: { active: false }
  });

  window.close();
});
