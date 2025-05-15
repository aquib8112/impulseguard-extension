document.addEventListener("DOMContentLoaded", () => {
  chrome.tabs.query({}, (tabs) => {
    const container = document.getElementById("tab-list");

    tabs.forEach((tab) => {
      const url = new URL(tab.url);
      const domain = url.hostname;

      const div = document.createElement("div");

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.value = domain;

      const label = document.createElement("label");
      label.textContent = domain;
      label.style.marginLeft = "5px";

      div.appendChild(checkbox);
      div.appendChild(label);
      container.appendChild(div);
    });
  });
});


document.getElementById("start").addEventListener("click", () => {
  const checkboxes = document.querySelectorAll("#tab-list input[type='checkbox']:checked");
  const whitelist = Array.from(checkboxes).map(cb => cb.value);

  const duration = parseInt(document.getElementById("duration").value);

  chrome.storage.local.set({
    focusSession: {
      active: true,
      endTime: Date.now() + duration * 60 * 1000,
      whitelist: whitelist,
    }
  });

  window.close();
});
