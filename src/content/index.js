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
  checkIfVideoLinkChanged
} from "./utils";

console.info('chrome-ext template-react-js content script');

const RUB_USD = 80;
const TOKEN_PRICE = 0.0015;

export {}

let context = {
  theme: null,
  states: new Map(),
  activeState: null,
}

function getCurrentState() {
  return context.activeState;
}

chrome.storage.local.get("theme", function (result) {
  updateTheme(result.theme);
});

chrome.storage.onChanged.addListener(function (changes, namespace) {
  for (let key in changes) {
    let change = changes[key];
    if (key === 'theme') {
      updateTheme(change.newValue);
      return;
    }
  }
});

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  if (request.message === 'ON_URL_CHANGED') {
    if (!context.states.has(getYouTubePageName())) return;
    context.activeState = context.states.get(getYouTubePageName());
    console.log("NEW ACTIVE GRID", getYouTubePageName(), context.activeState.gridContainer);
    resyncVideoStates();
    // resyncVideoStates();
  }
});

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

function syncVideoVisibility(video) {
  let element = findVideoContainerByHref(video.url);
  if (!element) return;

  if (video.active && !isActive(element)) {
    makeActive(element);
    rearrangeVideoGrid();
    console.log("active", video.title.slice(0, 40));
  } else if (!video.active && isActive(element)) {
    makeInactive(element);
    rearrangeVideoGrid();
  }
}

// Perform a full update of the video grid by processing each video element
function fullUpdate(videoGrid, state) {
  const elements = videoGrid.querySelectorAll(`#${INFO_SELECTOR}`);

  elements.forEach((element) => {
    let [video, _] = createOrGetVideo(element, state);
    syncVideoVisibility(video);
  });
}

function DOMContentLoaded() {
  // Wait for the main container for video to appear in DOM.
  listenForVideoGrid();
}

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

function listenForVideoGrid() {
  const startSearchForMainVideoGrid = () => {
    const videoGrid = findVideoGridContainer();
    if (videoGrid) {
      let state = addNewState(videoGrid);
      listeningForNewVideos(videoGrid, state);
      fullUpdate(videoGrid, state);
    }

    // In case if page changes, we have to pick up new video grid.
    const domObserver = new MutationObserver((mutations, observer) => {
      for (const mutation of mutations) {
        // Detect if an element has just appeared
        if (mutation.type === 'childList') {
          for (const node of mutation.addedNodes) {
            if (!isItVideoGridContainer(node)) continue;
            let state = addNewState(node);
            listeningForNewVideos(node, state);
            fullUpdate(node, state);

            // After two containers disconnect
            if (context.states.size >= 2) observer.disconnect();
          }
        }
      }
    });

    domObserver.observe(document.body, {childList: true, subtree: true});
  };

  // Start waiting for the videoGrid to appear in the DOM
  startSearchForMainVideoGrid();
}

// Start observing the changes in the current active video grid container
// i.e. listening for new videos to appear on page.
function listeningForNewVideos(videoGridContainer, state) {
  const observerOptions = {
    childList: true,
    attributes: false,
    subtree: true,
  };

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type !== 'childList') return;

      // For the case when we return back, and youtube changes
      // the content of video container
      let link = checkIfVideoLinkChanged(mutation.target);
      if (link) {
        let url = link.getAttribute("href");
        let video = state.videos.get(url);
        if (video) syncVideoVisibility(video);
      }

      let element = checkVideoElement(mutation.target);
      if (element !== null) {
        // console.log("ELEMENT", element);
        let [video, justCreated] = createOrGetVideo(element, state);
        syncVideoVisibility(video);

        if (justCreated) {
          checkVideo(video);
        }
      }
    }
  });

  // Start observing the videoGridContainer with the specified configuration
  observer.observe(videoGridContainer, observerOptions);
  return observer;
}

// State info print
setInterval(function () {
  let queue = 0;
  let init = 0;
  let checked = 0;
  let active = 0;
  let inactive = 0;

  // resyncVideoStates();
  for (const video of getCurrentState().videos.values()) {
    if (video.active) {
      // console.log(video.title, findVideoContainerByHref(video.url));
      active++;
    }
    if (!video.active) inactive++;
    if (video.status === "init") init++;
    if (video.status === "queue") queue++;
    if (video.status === "checked") checked++;

  }

  console.log(`state ${(RUB_USD * TOKEN_PRICE * totalTokens / 1000).toFixed(2)},${totalTokens} ${init}/${queue}/${checked} ${active}/${inactive}/${active + inactive}`, getCurrentState());
}, 10000);


if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', DOMContentLoaded);
} else {
  DOMContentLoaded();
}
