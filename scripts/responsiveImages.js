---
layout: null
---

// Debug mode flag - can be toggled in console
window.DEBUG = window.DEBUG || false;
// Add near the top of your file
window.placeholderImage = window.placeholderImage || '/assets/images/broken-img.png';

// Add at the top of the file with other global variables
window.initialScrollY = window.initialScrollY || window.scrollY;

// Store scroll position as early as possible - MOVE THIS TO TOP OF FILE
window.initialPageScroll = window.pageYOffset || document.documentElement.scrollTop;

// Debug logging helper
function debug(...args) {
    if (window.DEBUG) {
        console.log(...args);
    }
}

(function() {
    // Run IMMEDIATELY instead of waiting for DOMContentLoaded    
    function isExternalImage(src) {
        try {
            const url = new URL(src, window.location.origin);
            return url.hostname !== window.location.hostname && 
                   !url.hostname.includes('localhost');
        } catch (e) {
            return false; // Not a URL, treat as internal
        }
    }
    
    function blockImage(img) {
        if (img.src && !img.dataset.originalSrc) {
            // Check if external before blocking
            if (isExternalImage(img.src)) {
                debug("External image detected, skipping:", img.src);
                img.style.visibility = 'visible';
                img.dataset.processed = 'true';
                return;
            }
            
            debug("Blocking internal image load:", img.src);
            img.dataset.originalSrc = img.src;
            img.removeAttribute('src');
        }
    }
    
    // Create a MutationObserver to catch images as they're added
    const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            if (mutation.addedNodes) {
                mutation.addedNodes.forEach(function(node) {
                    if (node.tagName === 'IMG' && !node.dataset.processed) {
                        blockImage(node);
                    }
                });
            }
        });
    });
    
    function blockImage(img) {
        if (img.src && !img.dataset.originalSrc) {
            debug("Blocking image load:", img.src);
            img.dataset.originalSrc = img.src;
            img.removeAttribute('src');
        }
    }
    
    // Start observing immediately
    observer.observe(document, { 
        childList: true, 
        subtree: true 
    });
    
    // Also block any existing images
    if (document.readyState !== 'loading') {
        document.querySelectorAll('img:not([data-processed="true"])').forEach(blockImage);
    } else {
        document.addEventListener('DOMContentLoaded', () => {
            document.querySelectorAll('img:not([data-processed="true"])').forEach(blockImage);
            window.updateImages(true);
        }, {once: true});
    }
})();

// Global state tracking variables
window.previousMobileState = window.previousMobileState ?? null;
// Move resizeTimer to window to avoid duplicate declarations
window.resizeTimer = null;

// Format detection functions
function supportsAvif() {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = "data:image/avif;base64,AAAAIGZ0eXBhdmlmAAAAAGF2aWZtaWYxbWlhZk1BMUIAAADybWV0YQAAAAAAAAAoaGRscgAAAAAAAAAAcGljdAAAAAAAAAAAAAAAAGxpYmF2aWYAAAAADnBpdG0AAAAAAAEAAAAeaWxvYwAAAABEAAABAAEAAAABAAABGgAAAB0AAAAoaWluZgAAAAAAAQAAABppbmZlAgAAAAABAABhdjAxQ29sb3IAAAAAamlwcnAAAABLaXBjbwAAABRpc3BlAAAAAAAAAAIAAAACAAAAEHBpeGkAAAAAAwgICAAAAAxhdjFDgQ0MAAAAABNjb2xybmNseAACAAIAAYAAAAAXaXBtYQAAAAAAAAABAAEEAQKDBAAAACVtZGF0EgAKCBgANogQEAwgMg8f8D///8WfhwB8+ErK42A=";
      img.onload = () => resolve(true);
      img.onerror = () => resolve(false);
    });
}

function supportsWebp() {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = "data:image/webp;base64,UklGRh4AAABXRUJQVlA4TBEAAAAvAQAAAAfQ//73v/+BiOh/AAA=";
      img.onload = () => resolve(true);
      img.onerror = () => resolve(false);
    });
}

// Export functions globally
window.supportsAvif = supportsAvif;
window.supportsWebp = supportsWebp;

// Define the processImageQueue function
window.processImageQueue = function() {
  const avifOk = window.supportsAvif ? window.supportsAvif() : false;
  const webpOk = !avifOk && (window.supportsWebp ? window.supportsWebp() : false);
  const isMobile = window.innerWidth <= 768;
  const suffix = isMobile ? "_l" : "";
  
  debug(`Processing queued images - Format support: AVIF=${avifOk}, WebP=${webpOk}`);
  
  // Mark format detection as complete
  window._formatDetectionComplete = true;
  
  // Process any images queued by our constructor interceptor
  if (window._imgQueue && window._imgQueue.length > 0) {
    debug(`Processing ${window._imgQueue.length} images from constructor queue`);
    window._imgQueue.forEach(img => {
      // First unblock the image
      if (window._processQueuedImage) {
        window._processQueuedImage(img);
      }
      
      // Then process the image normally
      if (img.getAttribute('data-queued-src')) {
        processImageSrc(img, img.getAttribute('data-queued-src'), avifOk, webpOk, isMobile, suffix);
      }
    });
  }
  
  // Process any image tags with queued src
  const imgTags = document.querySelectorAll('img[data-queued-src]:not([data-processed="true"])');
  if (imgTags.length > 0) {
    debug(`Processing ${imgTags.length} queued img elements`);
    imgTags.forEach(img => {
      // First unblock the image
      if (window._processQueuedImage) {
        window._processQueuedImage(img);
      }
      
      // Then process the image normally
      processImageSrc(img, img.getAttribute('data-queued-src'), avifOk, webpOk, isMobile, suffix);
    });
  }
  
  // Restore original Image constructor
  if (window._Image) {
    window.Image = window._Image;
    debug("Restored original Image constructor");
  }
};

// Helper function to process an image source
function processImageSrc(img, originalSrc, avifOk, webpOk, isMobile, suffix) {
    if (!originalSrc) return;
    
    // Preserve the no-fade setting before any processing
    const noFade = img.getAttribute('data-nofade') === 'true';

    debug("Processing image:", originalSrc);
    
    // Single onload handler - remove the nested one
    img.onload = function() {
        // Mark as processed first
        this.dataset.processed = 'true';
        
        // Re-apply no-fade if needed
        if (noFade) {
            this.setAttribute('data-nofade', 'true');
        }
        
        debug(`✓ Image loaded successfully: ${this.src}`);
    };
    
    // Check for external URLs first
    try {
        const url = new URL(originalSrc);
        if (!url.hostname.includes('localhost') && 
            !url.hostname.includes('archstructlab.github.io')) {
            debug("External image detected, using as-is:", originalSrc);
            img.src = originalSrc;
            img.dataset.visibility = 'visible';
            img.dataset.processed = 'true';
            return;
        }
    } catch (e) {
        // Not a URL, continue with normal processing
    }
    
    // Continue with existing base path extraction for internal images
    const baseName = extractBasePath(originalSrc);
    if (!baseName) {
        console.error("Couldn't extract valid base path from:", originalSrc);
        img.src = window.placeholderImage;
        img.style.visibility = 'visible';
        img.dataset.processed = 'true'; // Mark as processed so it becomes visible
        img.style.opacity = '1';        // Force visibility
        return;
    }
     
    debug("Base name extracted:", baseName);
  

    // Prepare all possible image paths
    const avifPath = `${baseName}${suffix}.avif`;
    const webpPath = `${baseName}${suffix}.webp`;
    const pngPath = `${baseName}${suffix}.png`;
       
    // Make sure the image becomes visible when loaded
    img.onload = function() {
      // Mark as processed first
      this.dataset.processed = 'true';
      
      // Re-apply no-fade if needed
      if (noFade) {
          this.setAttribute('data-nofade', 'true');
      }
      
      debug(`✓ Image loaded successfully: ${this.src}`);
    }; // Add this semicolon
    
    // Set up error handling
    let formatsTried = 0;
    const totalFormats = avifOk ? 3 : (webpOk ? 2 : 1);
    
    img.addEventListener('error', function() {
        formatsTried++;
        debug(`Format failed (${formatsTried}/${totalFormats}) for: ${this.src}`);
        
        // Try next format
        if (formatsTried === 1 && avifOk) {
            debug("Trying WebP format...");
            this.src = webpPath;
        } else if ((formatsTried === 1 && webpOk) || (formatsTried === 2 && avifOk)) {
            debug("Trying PNG format...");
            this.src = pngPath;
        } else {
            // All formats failed
            console.error("All image formats failed for:", baseName);
            this.src = window.placeholderImage;
        }
    });
    
    // Start with the highest quality format and ensure visibility
    if (avifOk) {
        debug("Trying AVIF format first:", avifPath);
        img.src = avifPath; // Direct assignment is more reliable
    } else if (webpOk) {
        debug("Trying WebP format first:", webpPath);
        img.src = webpPath;
    } else {
        debug("Using PNG format:", pngPath);
        img.src = pngPath;
    }
}

(async function loadHeroImage() {
  const avifOk = await supportsAvif();
  const webpOk = !avifOk && (await supportsWebp());
  const isMobile = window.innerWidth <= 768;
  
  const suffix = isMobile ? "_l" : "";
  const format = avifOk ? "avif" : webpOk ? "webp" : "png";
  window.previousMobileState = isMobile; // Update shared variable
  
  // Get hero base path from config, removing any extensions
  const heroBase = "{{ site.heroimage }}".replace(/\.(avif|webp|png)$/, '');
  
  // Wait for DOM to be ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", setHeroImage);
  } else {
    setHeroImage();
  }
  
  function setHeroImage() {
    // We need to modify style sheet rule instead of directly setting style
    [...document.styleSheets].forEach(sheet => {
      try {
        [...sheet.cssRules].forEach(rule => {
          if (rule.selectorText === "#hero::before") {
            // Get the heroBase, suffix, and format from the surrounding scope
            const imageUrl = `${heroBase}${suffix}.${format}`;
            
            // Only change the background-image property
            rule.style.backgroundImage = `url("${imageUrl}")`;
            
            // Don't modify the opacity or animation properties
            debug("Hero image set to:", imageUrl);
          }
        });
      } catch (e) {
        console.warn("Could not access stylesheet rules:", e);
      }
    });
  }
})();

// Extract image replacement logic into a function
// Add state tracking


// Make functions available globally
window.updateImages = function(forceUpdate = false) {
    debug(`Starting updateImages with forceUpdate=${forceUpdate}`);
    
    Promise.all([supportsAvif(), supportsWebp()]).then(([avifOk, webpOk]) => {
        try {
            const isMobile = window.innerWidth <= 768;

            // Only update if screen size category has changed or force update
            if (!forceUpdate && window.previousMobileState === isMobile) {
                debug("Skipping update - no changes detected");
                return;
            }
            
            debug(`Device detection: Mobile=${isMobile}, AVIF=${avifOk}, WebP=${webpOk}`);

            // Process ALL images, including those already processed
            document.querySelectorAll("img").forEach((img) => {
                const originalSrc = img.dataset.originalSrc || img.getAttribute('src');
                if (!originalSrc) return;
                
                debug("Processing image:", originalSrc);
                processImageSrc(img, originalSrc, avifOk, webpOk, isMobile, isMobile ? "_l" : "");
            });

            // Update background images
            updateBackgroundImages();

            // Process special images (rounded, etc.)
            processSpecialImages();

            // Store current state
            window.previousMobileState = isMobile;
            
        } catch (error) {
            console.error("Error in updateImages:", error);
        }
    }).catch(error => {
        console.error("Error detecting format support:", error);
    });
};

// Enhanced background image handling function with fallbacks
async function updateBackgroundImages() {
  const avifOk = await supportsAvif();
  const webpOk = !avifOk && (await supportsWebp());
  const isMobile = window.innerWidth <= 768;
  const suffix = isMobile ? "_l" : "";
  
  // Try both kebab-case and camelCase attribute formats
  const elements = document.querySelectorAll('[data-bg-src], [data-bgsrc]');
  debug(`Found ${elements.length} elements with background image attributes`);
  
  elements.forEach(el => {
    // Check for already processed elements
    if (el.getAttribute('data-bg-processed') === 'true' || el.dataset.bgProcessed === 'true') {
      debug("Skipping already processed element:", el);
      return;
    }
    
    // Try different ways of accessing the attribute
    const rawPath = el.dataset.bgSrc || el.getAttribute('data-bg-src') || el.dataset.bgsrc || el.getAttribute('data-bgsrc');
    
    // Skip if no path provided
    if (!rawPath) {
      debug("Element has empty background image path:", el);
      return;
    }
    
    // IMPORTANT FIX: Remove any existing extension before adding format-specific one
    const basePath = rawPath.replace(/\.(png|jpe?g|gif|webp|avif)$/i, '');
    
    debug(`Processing element with base path: ${basePath}`, el);
    
    // Mark as processed immediately to prevent double processing
    el.dataset.bgProcessed = 'true';
    el.setAttribute('data-bg-processed', 'true');
    
    // Add necessary background properties
    el.style.setProperty('background-size', 'cover', 'important');
    el.style.setProperty('background-position', 'center', 'important');
    el.style.setProperty('background-repeat', 'no-repeat', 'important');
    
    // Ensure element has dimensions
    if (el.offsetWidth === 0 || el.offsetHeight === 0) {
      console.warn("Element has no dimensions, setting minimum height/width");
      el.style.setProperty('min-height', '150px', 'important');
      el.style.setProperty('min-width', '100px', 'important');
    }
    
    // Create paths for different formats
    const avifPath = `${basePath}${suffix}.avif`;
    const webpPath = `${basePath}${suffix}.webp`;
    const pngPath = `${basePath}${suffix}.png`;
    
    // Try formats with fallbacks similar to regular images
    tryBgImageWithFallbacks(el, avifOk, webpOk, avifPath, webpPath, pngPath, basePath);
  });
}

// Helper function to try background image formats with fallbacks
function tryBgImageWithFallbacks(element, avifOk, webpOk, avifPath, webpPath, pngPath, basePath) {
  let formatsTried = 0;
  const totalFormats = avifOk ? 3 : (webpOk ? 2 : 1);
  
  function tryNextFormat() {
    formatsTried++;
    
    if (formatsTried === 1 && avifOk) {
      checkImage(avifPath, () => {
        // Success
        element.style.setProperty('background-image', `url("${avifPath}")`, 'important');
        debug(`✓ Background AVIF loaded successfully: ${avifPath}`);
      }, () => {
        // Failed
        debug(`✗ Background AVIF failed to load: ${avifPath}`);
        tryNextFormat(); // Try next format
      });
    } else if ((formatsTried === 1 && webpOk) || (formatsTried === 2 && avifOk)) {
      checkImage(webpPath, () => {
        // Success
        element.style.setProperty('background-image', `url("${webpPath}")`, 'important');
        debug(`✓ Background WebP loaded successfully: ${webpPath}`);
      }, () => {
        // Failed
        debug(`✗ Background WebP failed to load: ${webpPath}`);
        tryNextFormat(); // Try next format
      });
    } else if ((formatsTried === 1 && !avifOk && !webpOk) || 
               (formatsTried === 2 && !avifOk && webpOk) || 
               (formatsTried === 3 && avifOk)) {
      checkImage(pngPath, () => {
        // Success
        element.style.setProperty('background-image', `url("${pngPath}")`, 'important');
        debug(`✓ Background PNG loaded successfully: ${pngPath}`);
      }, () => {
        // All formats failed
        console.error(`✗ All background image formats failed for: ${basePath}`);
        element.style.setProperty('background-image', `url("${window.placeholderImage}")`, 'important');
      });
    }
  }
  
  // Check if image loads successfully
  function checkImage(src, successCallback, errorCallback) {
    const testImg = new Image();
    testImg.onload = successCallback;
    testImg.onerror = errorCallback;
    testImg.src = src;
  }
  
  // Start trying formats
  tryNextFormat();
}

// Special handler for specific images that might be missed
function processSpecialImages() {
  // Find all rounded images - whether using class or inline style
  const roundedImages = document.querySelectorAll('img.is-rounded, img[style*="border-radius"]');
  const avifOk = window.supportsAvif ? window.supportsAvif() : false;
  const webpOk = !avifOk && (window.supportsWebp ? window.supportsWebp() : false);
  const isMobile = window.innerWidth <= 768;
  const suffix = isMobile ? "_l" : "";

  roundedImages.forEach(authorImage => {
    if (authorImage && !authorImage.dataset.processed) {
      // IMPORTANT FIX: Use data-original-src instead of src
      const originalSrc = authorImage.dataset.originalSrc || authorImage.getAttribute('src');
      
      debug("Processing rounded image:", originalSrc);
      
      if (!originalSrc) {
        console.warn("No source found for rounded image:", authorImage);
        return;
      }
      
      // Extract base path without extension
      const baseName = extractBasePath(originalSrc);
      if (!baseName) {
        console.error("Couldn't extract valid base path from:", originalSrc);
        img.src = window.placeholderImage;
        img.dataset.processed = 'true'; // Mark as processed so it becomes visible
        img.style.opacity = '1';        // Force visibility
        img.style.visibility = 'visible';
        return;
      }
      
      // Create a new image element to replace the old one
      const newImg = document.createElement('img');
      
      // PRESERVE all original attributes exactly as they are
      Array.from(authorImage.attributes).forEach(attr => {
        // Skip the src and data-processed attributes which we'll set ourselves
        if (!['src', 'data-processed'].includes(attr.name)) {
          newImg.setAttribute(attr.name, attr.value);
        }
      });
      
      // Mark as processed
      newImg.dataset.processed = 'true';
      
      // Set up error handling
      let formatsTried = 0;
      const totalFormats = avifOk ? 3 : (webpOk ? 2 : 1);
      
      newImg.addEventListener('error', function() {
        formatsTried++;
        debug(`Rounded image format failed (${formatsTried}/${totalFormats}) for: ${this.src}`);
        
        // Try next format
        if (formatsTried === 1 && avifOk) {
          debug("Trying WebP format...");
          this.src = `${baseName}${suffix}.webp`;
        } else if ((formatsTried === 1 && webpOk) || (formatsTried === 2 && avifOk)) {
          debug("Trying PNG format...");
          this.src = `${baseName}${suffix}.png`;
        } else {
          // All formats failed
          console.error("All image formats failed for:", baseName);
          this.src = window.placeholderImage;
        }
      });
      
      // Start with the highest quality format
      if (avifOk) {
        debug("Trying AVIF format first:", `${baseName}${suffix}.avif`);
        setTimeout(() => newImg.src = `${baseName}${suffix}.avif`, 0);
      } else if (webpOk) {
        debug("Trying WebP format first:", `${baseName}${suffix}.webp`);
        setTimeout(() => newImg.src = `${baseName}${suffix}.webp`, 0);
      } else {
        debug("Using PNG format:", `${baseName}${suffix}.png`);
        setTimeout(() => newImg.src = `${baseName}${suffix}.png`, 0);
      }
      
      // Replace the original image
      if (authorImage.parentNode) {
        authorImage.parentNode.replaceChild(newImg, authorImage);
        debug("Rounded image replaced with processed version");
      }
    }
  });
}

// Add helper function to check if element is in initial viewport
function isInInitialViewport(element) {
    const rect = element.getBoundingClientRect();
    const viewportTop = window.initialPageScroll;
    const viewportBottom = viewportTop + window.innerHeight;
    const elementTop = rect.top + window.pageYOffset;
    const elementBottom = elementTop + rect.height;
    
    return (
        elementBottom > viewportTop &&
        elementTop < viewportBottom &&
        rect.left >= 0 &&
        rect.right <= window.innerWidth
    );
}

// Run on page load
document.addEventListener("DOMContentLoaded", () => {
  // Store initial scroll position first
  window.initialScrollY = window.scrollY;
  debug("Initial scroll position:", window.initialScrollY);

  updateImages(true);
  updateBackgroundImages();
  processSpecialImages();

  debug("Initial page scroll:", window.initialPageScroll);

  // Process images in initial viewport first
  const allImages = document.querySelectorAll('img, .image');
  allImages.forEach(img => {
      if (isInInitialViewport(img)) {
          img.classList.add('fade-in-visible');
          debug("Image in initial viewport:", img.src || img.dataset.originalSrc);
      }
  });

  // Set up intersection observer for remaining images
  const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
          if (entry.isIntersecting && !isInInitialViewport(entry.target)) {
              entry.target.classList.add('fade-in-visible');
              observer.unobserve(entry.target);
              debug("Image scrolled into view:", entry.target.src || entry.target.dataset.originalSrc);
          }
      });
  }, {
      threshold: 0.2
  });

  // Only observe images outside initial viewport
  allImages.forEach(img => {
      if (!isInInitialViewport(img)) {
          observer.observe(img);
      }
  });

  // Process queued images after format detection is done
  if (typeof window.processImageQueue === 'function') {
    debug("Processing queued images");
    window.processImageQueue();
  }
});

// Replace the path extraction in all functions with this improved version

function extractBasePath(originalSrc) {
    if (!originalSrc) return null;
    
    debug("Extracting base path from:", originalSrc);
    
    // Handle Jekyll template variables
    if (originalSrc.includes('{{') || originalSrc.includes('}}')) {
      console.error("Unresolved Jekyll variable:", originalSrc);
      return null;
    }
    
    // Check if the path is absolute or relative
    let baseName = originalSrc;
    
    // For URLs with domain, extract only the path component
    try {
      if (originalSrc.startsWith('http')) {
        const url = new URL(originalSrc);
        // Keep ONLY the pathname, not the origin
        baseName = url.pathname;
        
        // Make path absolute for consistency
        if (!baseName.startsWith('/')) {
          baseName = '/' + baseName;
        }
      }
    } catch (e) {
      console.warn("URL parsing failed, using original path");
    }
    
    // Remove any mobile suffix if present
    baseName = baseName.replace(/_l\.(png|webp|avif|jpe?g|gif)$/i, '.$1');
    
    // Remove the extension if present
    baseName = baseName.replace(/\.(png|webp|avif|jpe?g|gif)$/i, '');
    
    // Final validation
    if (!baseName || baseName === '/') {
      console.error("Invalid base path (empty):", originalSrc);
      return null;
    }
    
    debug("Successfully extracted base path:", baseName);
    return baseName;
  }

// Add this debugging helper at the end of your file
function debugImageSources() {
    if (!window.DEBUG) {
        debug("Debug mode is OFF. Enable with window.DEBUG = true");
        return;
    }
    
    debug("=== DEBUG IMAGE SOURCES ===");
    document.querySelectorAll('img').forEach((img, index) => {
        debug(`Image #${index}:`);
        debug(`- src: ${img.src || 'NONE'}`);
        debug(`- data-original-src: ${img.dataset.originalSrc || 'NONE'}`);
        debug(`- data-processed: ${img.dataset.processed || 'NONE'}`);
        debug(`- visible: ${window.getComputedStyle(img).visibility}`);
        debug(`- opacity: ${window.getComputedStyle(img).opacity}`);
        debug(`- classList: ${Array.from(img.classList).join(', ')}`);
        debug("---");
    });
}

// Make debug functions available globally
window.debugImageSources = debugImageSources;

// Add resize event listener with debouncing
window.addEventListener('resize', function() {
    if (window.resizeTimer) {
        clearTimeout(window.resizeTimer);
    }
    window.resizeTimer = setTimeout(function() {
        debug("Screen size changed - updating images");
        window.updateImages(true);
    }, 250); // Debounce time in milliseconds
});
