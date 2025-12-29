chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "toggle-dark-mode",
    title: "Dark Mode",
    contexts: ["all"]
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "toggle-dark-mode") {
    chrome.tabs.sendMessage(tab.id, { action: "toggle_mode" });
  }
});