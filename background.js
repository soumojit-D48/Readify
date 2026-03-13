'use strict';

chrome.runtime.onInstalled.addListener(async ({ reason }) => {
  console.log('Readify installed. Reason:', reason);

  if (reason === 'install') {
    await chrome.storage.local.set({
      settings: {
        defaultColor: '#ffef5c',
        installedAt: new Date().toISOString()
      }
    });
  }
});


chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {

  if (message.type === 'BACKGROUND_PING') {
    sendResponse({ alive: true, timestamp: Date.now() });
  }

  if (message.type === 'GET_TAB_INFO') {
    chrome.tabs.get(sender.tab?.id || message.tabId, (tab) => {
      sendResponse({ title: tab.title, url: tab.url, favIconUrl: tab.favIconUrl });
    });
    return true;
  }

  return true;
});


chrome.tabs.onActivated.addListener(async ({ tabId }) => {
  updateBadge(tabId);
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.active) {
    updateBadge(tabId);
  }
});


async function updateBadge(tabId) {
  try {
    const response = await chrome.tabs.sendMessage(tabId, { type: 'GET_PAGE_DATA' });

    if (response && response.wordCount) {
      const count = response.wordCount;
      const label = count >= 1000 ? Math.round(count / 1000) + 'k' : String(count);

      chrome.action.setBadgeText({ text: label, tabId });
      chrome.action.setBadgeBackgroundColor({ color: '#6c63ff', tabId });
    }
  } catch {
    chrome.action.setBadgeText({ text: '', tabId });
  }
}
