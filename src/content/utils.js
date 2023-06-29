// Exported functions and constants
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
  checkIfVideoLinkChanged,
};

// Constants
const CONTAINER_SELECTOR = "ytd-rich-item-renderer";
const GRID_SELECTOR = "contents";
const INFO_SELECTOR = "video-title-link";
const VIDEO_ROW_SELECTOR = "ytd-rich-grid-row";

// Rearrange the video grid based on the visibility of the videos
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

// Swap the positions of two elements in the DOM
function swap(node1, node2) {
  const placeholder = document.createElement('div');
  node1.parentNode.insertBefore(placeholder, node1);
  node2.parentNode.insertBefore(node1, node2);
  placeholder.parentNode.insertBefore(node2, placeholder);
  placeholder.parentNode.removeChild(placeholder);
}

// Check if an element is active
function isActive(element) {
  return !element.classList.contains('disable-pointer-events');
}

// Make an element inactive
function makeInactive(element) {
  const isInactive = element.classList.contains('disable-pointer-events');
  if (isInactive) return;

  element.classList.add('disable-pointer-events');

  const focusableElements = element.querySelectorAll('a[href], input, button, select, textarea');
  for (const focusable of focusableElements) {
    const oldTabIndex = focusable.getAttribute('tabindex') || '0';
    focusable.setAttribute('data-old-tabindex', oldTabIndex);
    focusable.setAttribute('tabindex', '-1');
  }
}

// Make an element active
function makeActive(element) {
  const isInactive = element.classList.contains('disable-pointer-events');
  if (!isInactive) return;

  element.classList.remove('disable-pointer-events');

  const focusableElements = element.querySelectorAll('a[href], input, button, select, textarea');
  for (const focusable of focusableElements) {
    const oldTabIndex = focusable.getAttribute('data-old-tabindex') || '0';
    focusable.setAttribute('tabindex', oldTabIndex);
    focusable.removeAttribute('data-old-tabindex');
  }
}

// Check if a node is a video grid container
function isItVideoGridContainer(node) {
  if (node.id === 'contents') {
    let parentNodeType = node.parentNode && node.parentNode.getAttribute('class');
    if (
      parentNodeType &&
      (parentNodeType.includes('style-scope ytd-two-column-browse-results-renderer') ||
        parentNodeType.includes('style-scope ytd-watch-next-secondary-results-renderer'))
    ) {

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

  return false;
}

// Find the video grid container on the page
function findVideoGridContainer() {
  let nodes = document.querySelectorAll('#contents');
  if (!nodes) return null;

  for (let node of nodes) {
    if (!isItVideoGridContainer(node)) continue;
    return node;
  }

  return null;
}

// Get the YouTube page name based on the URL
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
  } catch (_) { /* Failed to construct URL object, URL might not be valid */ }

  return page;
}

// Check if a node is a video element to be processed
function checkVideoElement(node) {
  if (node.nodeType === Node.ELEMENT_NODE) {
    if (node.id === INFO_SELECTOR) {
      return node;
    } else {
      let element = node.querySelector(`#${INFO_SELECTOR}`);
      if (element) {
        return element;
      }
    }
  }

  return null;
}

// Check if a video link has changed in the DOM
function checkIfVideoLinkChanged(node) {
  if (node.nodeType === Node.ELEMENT_NODE) {
    if (node.id === "video-title") {
      return node.parentNode;
    }
  }

  return null;
}

// Find the video container based on its href value
function findVideoContainerByHref(href) {
  let link = findLinkElement(href);
  if (!link) return null;
  return findVideoContainerByElement(link);
}

// Find the video container based on the video element
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

// Find a link element with a specific href value
function findLinkElement(href) {
  let allAnchorTags = Array.from(document.querySelectorAll('a'));

  let matchedElement = allAnchorTags.filter(el => {
    return el.getAttribute('href') === href;
  });

  return matchedElement.length > 0 ? matchedElement[0] : null;
}
