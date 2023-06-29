export {
  rearrangeVideoGrid,
  makeInactive,
  makeActive,
  isActive,
  CONTAINER_SELECTOR,
  GRID_SELECTOR,
  INFO_SELECTOR,
  isItVideoGridContainer,
  findVideoGridContainer,
  getYouTubePageName,
  checkVideoElement,
  findVideoContainerByHref,
  findVideoContainerByElement,
  checkIfVideoLinkChanged
};

// Constants
const CONTAINER_SELECTOR = "ytd-rich-item-renderer";
const GRID_SELECTOR = "contents"
const INFO_SELECTOR = "video-title-link"
const VIDEO_ROW_SELECTOR = "ytd-rich-grid-row"

// The `rearrangeVideos()` function rearranges video elements on a webpage based on their visibility.
// It first collects all video elements from the webpage and stores them in an array along with their visibility status.
// It then assigns an index value to each video object based on its visibility.
//
// After this, the function creates a sorted copy of the videos array and sorts the video elements by their visibility
// using the `sort()` function. During this sorting process, the `swap()` function is called to physically swap the
// position of the elements in the DOM (Document Object Model) based on their assigned index. The result is that
// visible videos are moved to the front and hidden videos are moved to the back, effectively rearranging the
// order of the video elements based on their visibility.
function rearrangeVideoGrid() {
  const rows = document.querySelectorAll(VIDEO_ROW_SELECTOR);

  let videos = [];
  rows.forEach(row => {
    const videoElements = Array.from(row.querySelectorAll(CONTAINER_SELECTOR));
    videoElements.forEach((video) => {
      videos.push({
        element: video,
      });
    });
  });

  let index = 0;
  videos.forEach((video) => {
    video.index = isActive(video.element) ? videos.length - index : 0;
    index++;
  });

  videos.sort((vA, vB) => {
    const a = vA.index;
    const b = vB.index;

    if (a > b) {
      swap(vA.element, vB.element);
    }

    return b - a;
  });
}

function swap(node1, node2) {
  // Create a temporary placeholder element
  const placeholder = document.createElement('div');

  // Insert the placeholder before node1 to mark its location
  node1.parentNode.insertBefore(placeholder, node1);

  // Move node1 to node2's location
  node2.parentNode.insertBefore(node1, node2);

  // Move node2 to the placeholder's location (original node1 location)
  placeholder.parentNode.insertBefore(node2, placeholder);

  // Remove the placeholder element
  placeholder.parentNode.removeChild(placeholder);
}

function isActive(element) {
  return !element.classList.contains('disable-pointer-events');
}

function makeInactive(element) {
  // Check if the element is currently inactive
  const isInactive = element.classList.contains('disable-pointer-events');
  if (isInactive) return;

  // Toggle the disable-pointer-events class
  element.classList.add('disable-pointer-events');

  // Update focus and tabindex for interactive elements
  const focusableElements = element.querySelectorAll('a[href], input, button, select, textarea');
  for (const focusable of focusableElements) {
    // Save the old tabindex and prevent focus
    const oldTabIndex = focusable.getAttribute('tabindex') || '0';
    focusable.setAttribute('data-old-tabindex', oldTabIndex);
    focusable.setAttribute('tabindex', '-1');
  }

  // element.style.display = 'none';
}

function makeActive(element) {
  // Check if the element is currently inactive
  const isInactive = element.classList.contains('disable-pointer-events');
  if (!isInactive) return;

  // Toggle the disable-pointer-events class
  element.classList.remove('disable-pointer-events');

  // Update focus and tabindex for interactive elements
  const focusableElements = element.querySelectorAll('a[href], input, button, select, textarea');
  for (const focusable of focusableElements) {
    // Restore the old tabindex
    const oldTabIndex = focusable.getAttribute('data-old-tabindex') || '0';
    focusable.setAttribute('tabindex', oldTabIndex);
    focusable.removeAttribute('data-old-tabindex');
  }

  // element.style.display = '';
}


function isItVideoGridContainer(node) {
  // Check if the current node has the id 'contents'
  if (node.id === 'contents') {
    // Check if the parent node exists and has the correct class
    let parentNodeType = node.parentNode && node.parentNode.getAttribute('class');
    if (
      parentNodeType &&
      (parentNodeType.includes('style-scope ytd-two-column-browse-results-renderer') ||
        parentNodeType.includes('style-scope ytd-watch-next-secondary-results-renderer'))
    ) {
      // Check if the child node exists and has the correct class
      if (
        node.children &&
        node.children.length > 0
      ) {
        let childNodeType = node.children[0].getAttribute('class');
        if (childNodeType &&
          (childNodeType.includes('style-scope ytd-rich-grid-renderer') ||
            childNodeType.includes('style-scope ytd-item-section-renderer'))) {
          return true;
        }
      }
    }
  }

  // If the conditions are not met, return false
  return false;
}

function findVideoGridContainer() {
  let nodes = document.querySelectorAll('#contents');
  if (!nodes) return null;

  for (let node of nodes) {
    // Check if the correct parent and child nodes exist.
    if (!isItVideoGridContainer(node)) continue;
    return node;
  }

  // If no matching node is found, return null
  return null;
}

function getYouTubePageName() {
  const url = window.location.href;
  let page = null;

  try {
    let urlObj = new URL(url);
    if (urlObj.pathname === "/") {
      page = "main";
    } else if (urlObj.pathname.startsWith("/watch")) {
      page = "watch";
    }
  } catch (_) { /* Failed to construct URL object, URL might not be valid */
  }

  return page;
}

function checkVideoElement(node) {
  // The first check is for the case when the added node itself has an ID 'video-title-link'.
  // This means the video element is directly added to the DOM and needs to be processed.
  if (node.nodeType === Node.ELEMENT_NODE) {
    if (node.id === INFO_SELECTOR) {
      console.log("VIDEO ELEMENT APPEARED", node);
      return node
    } else {
      let element = node.querySelector(`#${INFO_SELECTOR}`);
      if (element) {
        console.log("VIDEO ELEMENT part of", node, element);
        return element;
      }
    }
  }

  return null;
}

function checkIfVideoLinkChanged(node) {
  if (node.nodeType === Node.ELEMENT_NODE) {
    if (node.id === "video-title") {
      return node.parentNode
    }
  }

  return null;
}

function findVideoContainerByHref(href) {
  let link = findLinkElement(href);
  if (!link) return null;
  return findVideoContainerByElement(link);
}

function findVideoContainerByElement(element) {
  let currentElement = element.parentNode;

  while (currentElement) {
    if (currentElement.nodeName.toLowerCase() === CONTAINER_SELECTOR) {
      return currentElement;
    }

    currentElement = currentElement.parentNode;
  }

  return null;
}

function findLinkElement(href) {
  let allAnchorTags = Array.from(document.querySelectorAll('a'));

  let matchedElement = allAnchorTags.filter(el => {
    return el.getAttribute('href') === href;
  });

  return matchedElement.length > 0 ? matchedElement[0] : null;
}
