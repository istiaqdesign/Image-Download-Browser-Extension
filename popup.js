// Popup logic
document.addEventListener('DOMContentLoaded', () => {
    const previewContainer = document.getElementById('previewContainer');
    const resolutionSelect = document.getElementById('resolutionSelect');
    const downloadBtn = document.getElementById('downloadBtn');

    let currentImage = null;

    // Inject content script and get images
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const activeTab = tabs[0];
        if (activeTab) {
            chrome.scripting.executeScript({
                target: { tabId: activeTab.id },
                files: ['content.js']
            }, () => {
                // After injection, ask for images
                chrome.tabs.sendMessage(activeTab.id, { action: "getImages" }, (response) => {
                    if (response && response.mainImage) {
                        currentImage = response.mainImage;
                        renderMainImage();
                    } else {
                        previewContainer.innerHTML = '<div class="loading">No main image found.</div>';
                    }
                });
            });
        }
    });

    function renderMainImage() {
        // Show preview (use the first resolution or src as preview)
        const previewSrc = currentImage.src;
        previewContainer.innerHTML = `<img src="${previewSrc}" class="preview-image" alt="Main Image Preview">`;

        // Populate resolutions
        resolutionSelect.innerHTML = '';
        if (currentImage.resolutions && currentImage.resolutions.length > 0) {
            currentImage.resolutions.forEach((res, index) => {
                const option = document.createElement('option');
                option.value = res.url;
                option.textContent = `${res.label} ${res.width ? `(${res.width}px)` : ''}`;
                resolutionSelect.appendChild(option);
            });
            resolutionSelect.disabled = false;
            downloadBtn.disabled = false;
        } else {
            // Fallback if no resolutions array (shouldn't happen with new logic but safe to handle)
            const option = document.createElement('option');
            option.value = currentImage.src;
            option.textContent = 'Default';
            resolutionSelect.appendChild(option);
            resolutionSelect.disabled = false;
            downloadBtn.disabled = false;
        }
    }

    downloadBtn.addEventListener('click', () => {
        const selectedUrl = resolutionSelect.value;
        if (selectedUrl) {
            chrome.downloads.download({
                url: selectedUrl
            });
        }
    });
});
