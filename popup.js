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

document.getElementById("stop").addEventListener("click", () => {
  chrome.storage.local.clear(() => {
    window.close();
  });
});
