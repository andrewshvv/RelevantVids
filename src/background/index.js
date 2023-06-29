console.info('chrome-ext template-react-js background script')

export {}

// Send info that url has changed to the content script
// it is needed because we need to identify the new active
// youtube grid container
chrome.tabs.onUpdated.addListener(
  function (tabId, changeInfo, tab) {
    if (changeInfo.url) {
      chrome.tabs.sendMessage(tabId, {
        message: "ON_URL_CHANGED",
      })
    }
  }
);
