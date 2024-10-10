// URL of the placeholder image
const placeholder = 'https://samwilcock.xyz/assets/img/broken-img.png'; // Replace with your placeholder image URL

// Function to handle image load error
function handleImageError(event) {
    event.target.src = placeholder; // Set the src to the placeholder
}

// Function to add error event listener to an image
function addImageErrorListener(img) {
    img.addEventListener('error', handleImageError);
}

// Function to observe added images
function observeImages() {
    const images = document.querySelectorAll('img');
    images.forEach(addImageErrorListener);
}

// Set up a MutationObserver to monitor the document for added nodes
const observer = new MutationObserver((mutationsList) => {
    for (const mutation of mutationsList) {
        if (mutation.type === 'childList') {
            // Check for added nodes
            mutation.addedNodes.forEach((node) => {
                if (node.tagName === 'IMG') {
                    addImageErrorListener(node); // Add listener to newly added images
                }
                // If the added node is an element, check its children for images
                if (node.nodeType === Node.ELEMENT_NODE) {
                    const newImages = node.querySelectorAll('img');
                    newImages.forEach(addImageErrorListener); // Add listener to images in new elements
                }
            });
        }
    }
});

// Start observing the document body for added nodes
observer.observe(document.body, { childList: true, subtree: true });

// Initial call to add error listeners for existing images
observeImages();
