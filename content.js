// Content script to extract images
if (!window.imageDownloaderLoaded) {
    window.imageDownloaderLoaded = true;

    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === "getImages") {
            const mainImage = findMainImage();
            sendResponse({ mainImage });
        }
    });

    function findMainImage() {
        // 1. Heuristic: Find the largest visible image in the viewport
        const allImages = Array.from(document.images);
        let maxArea = 0;
        let bestCandidate = null;

        allImages.forEach(img => {
            const rect = img.getBoundingClientRect();
            // Check if visible
            if (rect.width > 50 && rect.height > 50 && rect.top >= 0 && rect.bottom <= window.innerHeight) {
                const area = rect.width * rect.height;
                if (area > maxArea) {
                    maxArea = area;
                    bestCandidate = img;
                }
            }
        });

        // Fallback: If no image in viewport, check Open Graph tags
        if (!bestCandidate) {
            const ogImage = document.querySelector('meta[property="og:image"]');
            if (ogImage && ogImage.content) {
                return {
                    src: ogImage.content,
                    resolutions: [{ label: 'Original (OG)', url: ogImage.content }]
                };
            }
        }

        if (bestCandidate) {
            return processImage(bestCandidate);
        }

        return null;
    }

    function processImage(img) {
        const resolutions = [];
        const src = img.currentSrc || img.src;

        // Add the current source
        resolutions.push({
            label: `Current (${img.naturalWidth}x${img.naturalHeight})`,
            url: src,
            width: img.naturalWidth
        });

        // Parse srcset
        if (img.srcset) {
            const sources = img.srcset.split(',');
            sources.forEach(source => {
                const parts = source.trim().split(/\s+/);
                if (parts.length >= 2) {
                    const url = parts[0];
                    const descriptor = parts[1];
                    resolutions.push({
                        label: descriptor, // e.g., "1000w" or "2x"
                        url: url,
                        width: parseInt(descriptor) || 0 // Rough sort helper
                    });
                }
            });
        }

        // Check for parent <a> link to larger image
        const parentLink = img.closest('a');
        if (parentLink && parentLink.href && parentLink.href.match(/\.(jpg|jpeg|png|webp)$/i)) {
            resolutions.push({
                label: 'Linked High-Res',
                url: parentLink.href,
                width: 99999 // Prioritize
            });
        }

        // Deduplicate by URL
        const uniqueResolutions = [];
        const seenUrls = new Set();

        // Sort by width/quality desc
        resolutions.sort((a, b) => (b.width || 0) - (a.width || 0));

        resolutions.forEach(res => {
            if (!seenUrls.has(res.url)) {
                seenUrls.add(res.url);
                uniqueResolutions.push(res);
            }
        });

        return {
            src: src,
            resolutions: uniqueResolutions
        };
    }
}
