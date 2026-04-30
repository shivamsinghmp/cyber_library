// Background service worker
chrome.runtime.onInstalled.addListener(() => {
  console.log("Cyber Library PiP Extension installed!");
});

// Keyboard shortcut support (Alt+P = PiP current tab)
chrome.commands && chrome.commands.onCommand &&
chrome.commands.onCommand.addListener((command) => {
  if (command === "pip-current-tab") {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.scripting.executeScript({
          target: { tabId: tabs[0].id },
          func: () => {
            const w = window.open(
              window.location.href, "_pip_cyber",
              "width=420,height=680,resizable=yes,scrollbars=yes,toolbar=no,menubar=no,location=no,status=no,top=50,left=" + (screen.width - 440)
            );
            if (w) w.focus();
          }
        });
      }
    });
  }
});
