// URL of the placeholder image
const placeholder = 'https://samwilcock.xyz/assets/img/broken-img.png'; // Replace with your placeholder image URL

// Global variable for the ping delay
let globalPingDelay = 2000; // Default to 1000 ms (1 second)

// Function to handle image load error with a delay based on the global ping delay
function handleImageError(event) {
    const img = event.target; // Reference to the image
    const timeoutId = setTimeout(() => {
        img.src = placeholder; // Set the src to the placeholder after the global delay
    }, globalPingDelay); // Use the global ping delay

    // Clear the timeout if the image loads successfully
    img.addEventListener('load', () => {
        clearTimeout(timeoutId); // Clear the timeout if the image loads
    }, { once: true }); // Use { once: true } to ensure the listener is removed after execution
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
