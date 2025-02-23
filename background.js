const MAX_TABS = 3; // maksimal tab
const FOCUS_TIME_LIMIT = 5 * 60; // 5 lama waktu per putaran
let activeTabs = {};
let globalTimer = null;
let globalStartTime = null;

// Function to update the badge text with the countdown timer
function updateBadgeText(seconds) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  const timeString = `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
  chrome.action.setBadgeText({ text: timeString });
}

// Function to start the global countdown timer
function startGlobalCountdown() {
  if (globalTimer) return; // Prevent multiple timers

  globalStartTime = Date.now();
  let remainingTime = FOCUS_TIME_LIMIT;

  // Update the badge text immediately
  updateBadgeText(remainingTime);

  // Start the countdown interval
  globalTimer = setInterval(() => {
    remainingTime = FOCUS_TIME_LIMIT - Math.floor((Date.now() - globalStartTime) / 1000);

    if (remainingTime <= 0) {
      clearInterval(globalTimer);
      blockAllTabs();
      chrome.action.setBadgeText({ text: "X" });
      saveActivity("Global Timer Expired", true); // Save activity when blocked
      return;
    }
    updateBadgeText(remainingTime);
  }, 1000);
}

// Function to block all tabs
function blockAllTabs() {
  chrome.tabs.query({}, (tabs) => {
    tabs.forEach((tab) => {
      chrome.tabs.update(tab.id, { url: chrome.runtime.getURL("blocked.html") });
    });
  });
}

// Handle tab activation
chrome.tabs.onActivated.addListener((activeInfo) => {
  chrome.tabs.get(activeInfo.tabId, (tab) => {
    if (!activeTabs[tab.id]) {
      activeTabs[tab.id] = { startTime: Date.now(), url: tab.url };
      checkTabLimit();
    }
  });

  // Start global timer if not already started
  if (!globalStartTime) {
    startGlobalCountdown();
  }
});


chrome.tabs.onCreated.addListener(async (tab) => {
  // const taskValid = await isTaskInputValid();
  // if (!taskValid) {
  //   chrome.tabs.remove(tab.id);
  //   chrome.notifications.create({
  //     type: "basic",
  //     iconUrl: "icon.png",
  //     title: "Task Required",
  //     message: "You must enter a task before opening tabs."
  //   });
  //   return;
  // }

  // Hitung jumlah tab saat ini
  chrome.tabs.query({}, (tabs) => {
    if (tabs.length > MAX_TABS) {
      
      chrome.tabs.remove(tab.id);

      // chrome.notifications.create({
      //   type: "basic",
      //   iconUrl: "icon.png",
      //   title: "Tab Limit Reached",
      //   message: `You can only have ${MAX_TABS} tabs open at a time.`
      // });

      alert("Kamu hanya boleh fokus pada 3 tab aktif saja.");


    } else {
      // Simpan informasi tab di objek activeTabs
      activeTabs[tab.id] = { startTime: Date.now(), url: tab.url };
    }
  });


});


// Handle tab removal
chrome.tabs.onRemoved.addListener((tabId) => {
  saveActivity(`Tab Closed: ${activeTabs[tabId]?.url}`, false); // Save activity when tab is closed
  delete activeTabs[tabId];
});

// Check tab limit
function checkTabLimit() {
  if (Object.keys(activeTabs).length > MAX_TABS) {
    // Block all tabs that exceed the limit
    // chrome.tabs.query({}, (tabs) => {
    //   tabs.forEach((tab) => {
    //     chrome.tabs.update(tab.id, { url: chrome.runtime.getURL("tablimit.html") });
    //   });
    // });

  alert("Kamu hanya boleh fokus pada 3 tab aktif saja.");


    // Notify the user
    // chrome.notifications.create({
    //   type: "basic",
    //   iconUrl: "icon.png",
    //   title: "Focus Blocker",
    //   message: "You have exceeded the maximum number of tabs allowed. All tabs are now blocked.",
    // });

    // Clear active tabs to prevent further actions
    // activeTabs = {};
  }
}

// Save activity to storage
function saveActivity(task, isBlocked) {
  const timestamp = new Date().toLocaleString(); // Record the timestamp
  const duration = Math.floor((Date.now() - globalStartTime) / 1000);

  chrome.storage.local.get(['activityHistory'], (data) => {
    const history = data.activityHistory || [];
    history.push({ task, timestamp, duration, isBlocked });
    chrome.storage.local.set({ activityHistory: history });
  });
}

// Handle messages from blocked.html
// Handle messages from blocked.html
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "extendTime") {
    const newTime = message.minutes * 60; // Convert minutes to seconds
    globalStartTime = Date.now() - (FOCUS_TIME_LIMIT - newTime) * 1000;

    // Restart the countdown timer
    clearInterval(globalTimer);
    globalTimer = null;
    startGlobalCountdown();
  } else if (message.action === "resumeTask") {
    const tabId = sender.tab.id;
    chrome.storage.local.get(['previousUrl'], (data) => {
      const previousUrl = data.previousUrl || "https://www.google.com"; // Default fallback
      chrome.tabs.update(tabId, { url: previousUrl });
    });
  } else if (message.action === "exportLog") {
    exportLogToFile();
  }
});

// Save previous URL when blocking a site
function blockSite(tabId) {
  chrome.tabs.get(tabId, (tab) => {
    chrome.storage.local.set({ previousUrl: tab.url }, () => {
      chrome.tabs.update(tabId, { url: chrome.runtime.getURL("blocked.html") });
    });
  });
}

// Export log to a JSON file
function exportLogToFile() {
  chrome.storage.local.get(['activityHistory'], (data) => {
    const history = data.activityHistory || [];
    const logContent = JSON.stringify(history, null, 2);

    const blob = new Blob([logContent], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    chrome.downloads.download({
      url: url,
      filename: "focus_blocker_log.json",
      saveAs: true,
    });
  });
}

// Initialize on install
chrome.runtime.onInstalled.addListener(() => {
  chrome.tabs.query({}, (tabs) => {
    tabs.forEach((tab) => {
      activeTabs[tab.id] = { startTime: Date.now(), url: tab.url };
    });
    checkTabLimit();
  });
});


// Mendapatkan history log

chrome.history.onVisited.addListener((historyItem) => {
  chrome.storage.local.get({ logs: [] }, (data) => {
    const logs = data.logs;
    logs.push({
      url: historyItem.url,
      title: historyItem.title,
      timestamp: new Date().toISOString()
    });

    chrome.storage.local.set({ logs });
  });
});
