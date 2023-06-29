import {enqueueRequest, totalTokens} from "./gpt";
import {
  rearrangeVideoGrid,
  makeInactive,
  makeActive,
  INFO_SELECTOR,
  isItVideoGridContainer,
  findVideoGridContainer,
  getYouTubePageName,
  isActive,
  checkVideoElement,
  findVideoContainerByHref,
  checkIfVideoLinkChanged,
} from "./utils";

// Initialize the context object to store theme and video state information
let context = {
  theme: null,
  states: new Map(),
  activeState: null,
};

function getCurrentState() {
  return context.activeState;
}

// Get the theme value from Chrome storage and update the theme
chrome.storage.local.get("theme", function (result) {
  updateTheme(result.theme);
});

// Listen for changes in Chrome storage to update the theme
chrome.storage.onChanged.addListener(function (changes, namespace) {
  for (let key in changes) {
    let change = changes[key];
    if (key === 'theme') {
      updateTheme(change.newValue);
      return;
    }
  }
});

// Listen for messages from the background script
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  if (request.message === 'ON_URL_CHANGED') {
    // If the YouTube page URL has changed, update the active state and resync video states
    if (!context.states.has(getYouTubePageName())) return;
    context.activeState = context.states.get(getYouTubePageName());
    console.log("NEW ACTIVE GRID", getYouTubePageName(), context.activeState.gridContainer);
    resyncVideoStates();
  }
});

// Update the theme and reset videos when the theme value changes
function updateTheme(theme) {
  if (theme === "") {
    context.theme = null;
    resetVideos(true);
  } else {
    context.theme = theme;
    resetVideos(false);

    let state = getCurrentState();
    if (!state) return;

    for (const video of state.videos.values()) {
      checkVideo(video);
    }
  }
}

// Reset the videos by updating their status and visibility
function resetVideos(active = false) {
  let state = getCurrentState();
  if (!state) return;

  for (const video of state.videos.values()) {
    video.status = "init";
    video.active = active;

    let element = findVideoContainerByHref(video.url);
    if (!element) return;

    if (active) {
      makeActive(element);
    } else {
      makeInactive(element);
    }
  }
}

// Check the status of a video by sending a request to the remote server
function checkVideo(video) {
  if (video.status !== "init") return;
  video.status = "queue";

  const data = {
    "title": video.title,
    "theme": context.theme,
  };

  enqueueRequest(data)
    .then((response) => {
      video.status = "checked";
      video.active = response;

      syncVideoVisibility(video);
    })
    .catch((error) => {
      video.status = "init";
      console.error('Error:', error);
    });
}

// Resync the visibility of videos based on their active status
function resyncVideoStates() {
  let state = getCurrentState();
  if (!state) return;
  for (let video of state.videos.values()) {
    syncVideoVisibility(video);
  }
}

// Create a new video object or get an existing one based on the provided info element
function createOrGetVideo(infoElem, state) {
  let videos = state.videos;
  let url = infoElem.getAttribute("href");
  if (videos.has(url)) {
    return [videos.get(url), false];
  }

  let video = {
    title: infoElem.getAttribute("aria-label"),
    url: url,
    status: "init",
    active: context.theme == null,
  };

  console.log("new video", video.title.slice(0, 40));
  videos.set(url, video);
  return [video, true];
}

// Sync the visibility of a video by manipulating its container element
function syncVideoVisibility(video) {
  let element = findVideoContainerByHref(video.url);
  if (!element) return;

  if (video.active && !isActive(element)) {
    makeActive(element);
    console.log("active", video.title.slice(0, 40));
  } else if (!video.active && isActive(element)) {
    makeInactive(element);
  }

  rearrangeVideoGrid();
}

// Perform a full update of the video grid by processing each video element
function fullUpdate(videoGrid, state) {
  const elements = videoGrid.querySelectorAll(`#${INFO_SELECTOR}`);

  elements.forEach((element) => {
    let [video, _] = createOrGetVideo(element, state);
    syncVideoVisibility(video);
  });
}

// Function to be executed when the DOM is fully loaded
function DOMContentLoaded() {
  listenForVideoGrid();
}

// Add a new state object for the active video grid container
function addNewState(gridContainer) {
  let currentState = {
    videos: new Map(),
    gridContainer: gridContainer,
  };
  context.states.set(getYouTubePageName(), currentState);
  context.activeState = currentState;
  console.log("NEW ACTIVE GRID", getYouTubePageName(), context.activeState.gridContainer);
  return currentState;
}

// Listen for the appearance of the main video grid container in the DOM
function listenForVideoGrid() {
  const startSearchForMainVideoGrid = () => {
    const videoGrid = findVideoGridContainer();
    if (videoGrid) {
      let state = addNewState(videoGrid);
      listeningForNewVideos(videoGrid, state);
      fullUpdate(videoGrid, state);
    }

    const domObserver = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === 'childList') {
          for (const node of mutation.addedNodes) {
            if (!isItVideoGridContainer(node)) continue;
            let state = addNewState(node);
            listeningForNewVideos(node, state);
            fullUpdate(node, state);
          }
        }
      }
    });

    domObserver.observe(document.body, {childList: true, subtree: true});
  };

  startSearchForMainVideoGrid();
}

// Listen for changes in the current active video grid container
function listeningForNewVideos(videoGridContainer, state) {
  const observerOptions = {
    childList: true,
    attributes: true,
    subtree: true,
  };

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type === 'childList') {
        let link = checkIfVideoLinkChanged(mutation.target);
        if (link) {
          let url = link.getAttribute("href");
          let video = state.videos.get(url);
          if (video) syncVideoVisibility(video);
        }

        mutation.addedNodes.forEach((node) => {
          let element = checkVideoElement(node);
          if (element) {
            console.log("ELEMENT");
            let [video, justCreated] = createOrGetVideo(element, state);
            syncVideoVisibility(video);

            if (justCreated) {
              checkVideo(video);
            }
          }
        });
      }
    }
  });

  observer.observe(videoGridContainer, observerOptions);
  return observer;
}

// Print the state information periodically
setInterval(function () {
  let queue = 0;
  let init = 0;
  let checked = 0;
  let active = 0;
  let inactive = 0;

  for (const video of getCurrentState().videos.values()) {
    if (video.active) {
      active++;
    }
    if (!video.active) inactive++;
    if (video.status === "init") init++;
    if (video.status === "queue") queue++;
    if (video.status === "checked") checked++;
  }

  console.log(`state ${(RUB_USD * TOKEN_PRICE * totalTokens / 1000).toFixed(2)},${totalTokens} ${init}/${queue}/${checked} ${active}/${inactive}/${active + inactive}`, getCurrentState());
}, 10000);

// Wait for the DOM to load and call the DOMContentLoaded function
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', DOMContentLoaded);
} else {
  DOMContentLoaded();
}
