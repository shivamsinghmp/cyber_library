const BASE = "https://cyberlib.in";

function showStatus(msg, type = "success") {
  const el = document.getElementById("status");
  el.textContent = msg;
  el.className = `status ${type}`;
  setTimeout(() => { el.className = "status"; }, 3000);
}

async function openPiP(url) {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (url) {
      // Open a new tab and then PiP it
      const newTab = await chrome.tabs.create({ url, active: false });
      await new Promise(r => setTimeout(r, 1500));
      await chrome.scripting.executeScript({
        target: { tabId: newTab.id },
        func: enterPiP,
      });
      showStatus("✓ PiP mein khul gaya!");
    } else {
      // PiP the current tab
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: enterPiP,
      });
      showStatus("✓ Current tab PiP mein!");
    }
  } catch (e) {
    showStatus("✗ Error: " + (e.message || "kuch galat hua"), "error");
  }
}

// This runs in the target page context
function enterPiP() {
  try {
    // Method 1: Document PiP API (Chrome 116+)
    if (window.documentPictureInPicture) {
      window.documentPictureInPicture.requestWindow({
        width: 400,
        height: 600,
      }).then((pipWin) => {
        // Copy all styles
        [...document.styleSheets].forEach(sheet => {
          try {
            const link = pipWin.document.createElement("link");
            link.rel = "stylesheet";
            link.href = sheet.href || "";
            if (sheet.href) pipWin.document.head.appendChild(link);
          } catch {}
        });
        // Move body content
        const clone = document.body.cloneNode(true);
        pipWin.document.body.replaceWith(clone);
        pipWin.document.title = document.title;
      }).catch(() => {
        // Fallback: small popup window
        const w = window.open(window.location.href, "_pip",
          "width=400,height=650,resizable=yes,scrollbars=yes,toolbar=no,menubar=no,location=no,status=no"
        );
        if (w) w.focus();
      });
      return;
    }

    // Method 2: Popup window as PiP fallback
    const w = window.open(
      window.location.href,
      "_pip_cyber",
      "width=420,height=680,resizable=yes,scrollbars=yes,toolbar=no,menubar=no,location=no,status=no,top=50,left=" + (screen.width - 440)
    );
    if (w) {
      w.focus();
      // Try to make it always on top (limited browser support)
      w.moveTo(screen.width - 440, 50);
    }
  } catch (e) {
    console.error("PiP error:", e);
  }
}

// Current tab PiP
document.getElementById("pipCurrentTab").addEventListener("click", () => openPiP(null));

// Quick open buttons
document.getElementById("openPanel").addEventListener("click", () =>
  openPiP(BASE + "/meet-addon/panel")
);
document.getElementById("openDashboard").addEventListener("click", () =>
  openPiP(BASE + "/dashboard")
);
document.getElementById("openMain").addEventListener("click", () =>
  openPiP(BASE + "/meet-addon/main")
);

// Close all PiP
document.getElementById("closePip").addEventListener("click", async () => {
  try {
    const tabs = await chrome.tabs.query({});
    for (const tab of tabs) {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => {
          if (window.documentPictureInPicture?.window) {
            window.documentPictureInPicture.window.close();
          }
        },
      }).catch(() => {});
    }
    showStatus("✓ PiP band ho gaya!");
  } catch (e) {
    showStatus("✗ " + e.message, "error");
  }
});
