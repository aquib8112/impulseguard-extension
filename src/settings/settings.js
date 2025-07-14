function showFeedback(type) {
    if (type === "success") {
    uploadSuccess.style.display = "flex";
    setTimeout(() => {
        uploadSuccess.style.display = "none";
    }, 3000);
    } else if (type === "error") {
    uploadError.style.display = "flex";
    setTimeout(() => {
        uploadError.style.display = "none";
    }, 3000);
    }
}

function handleVisionUpload(file) {
  if (!file) return;

  uploadError.style.display = "none";
  uploadSuccess.style.display = "none";

  if (file.size > 5 * 1024 * 1024) {
    showFeedback("error");
    return;
  }

  const reader = new FileReader();
  reader.onload = function (e) {
    const base64Image = e.target.result;
    chrome.storage.local.set({ visionImage: base64Image }, () => {
      showFeedback("success");
    });
  };
  reader.readAsDataURL(file);
}


document.addEventListener("DOMContentLoaded", () => {
    const dropZone = document.querySelector('.drop-zone');
    const viewVisionBtn = document.getElementById("viewVisionBtn");
    const visionInput = document.getElementById("visionInput");
    const uploadTrigger = document.getElementById("uploadTrigger");
    const uploadError = document.getElementById("uploadError");
    const uploadSuccess = document.getElementById("uploadSuccess");
    const incognitoGuideBtn = document.getElementById('incognitoGuideBtn');
    const incognitoModal = document.getElementById('incognitoModal');
    const cancelGuide = document.getElementById('cancelGuide');
    const openExtSettings = document.getElementById('openExtSettings');
    const modalOverlay = document.querySelector('.modal-overlay');
    const modalContent = document.querySelector('.modal-content');

    incognitoGuideBtn?.addEventListener('click', () => {
        incognitoModal.style.display = 'flex';
    });

    cancelGuide?.addEventListener('click', () => {
        incognitoModal.style.display = 'none';
    });

    openExtSettings?.addEventListener('click', () => {
        chrome.runtime.sendMessage({ action: "open-extension-settings" });
    });

    uploadTrigger.addEventListener("click", () => {
    visionInput.click();
    });

    visionInput.addEventListener("change", () => {
        handleVisionUpload(visionInput.files[0]);
    });

    dropZone.addEventListener("click", () => {
        visionInput.click();
    });

    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('active');
    });

    dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('active');
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('active');
        handleVisionUpload(e.dataTransfer.files[0]);
    });


    modalOverlay?.addEventListener("click", (e) => {
        if (!modalContent.contains(e.target)) {
        modalOverlay.style.display = "none";
        }
    });

    viewVisionBtn?.addEventListener("click", () => {
        console.log("clicked"),
        chrome.tabs.create({
            url: chrome.runtime.getURL("src/visionboard/visionboard.html?source=settings"),
        });
    });

});
