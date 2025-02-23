const MAX_TABS = 3;
const DEFAULT_TIME_LIMIT = 5 * 60 * 1000; // 5 minutes in ms
const whitelist = ["docs.google.com", "obsidian.md", "notion.so"];
const blockedSites = ["facebook.com", "twitter.com", "instagram.com", "reddit.com"];

let globalTimer = null;
let activeTimer = null;
let endTime = null;

// Utility: Update badge text
function updateBadgeText(remainingTime) {
  const minutes = Math.floor(remainingTime / 60000);
  const seconds = Math.floor((remainingTime % 60000) / 1000);
  chrome.action.setBadgeText({
    text: `${minutes}:${seconds.toString().padStart(2, "0")}`,
  });
  chrome.action.setBadgeBackgroundColor({ color: "#4CAF50" });
}

// Global Timer Function
function startGlobalTimer(duration) {
  if (globalTimer) clearInterval(globalTimer);

  endTime = Date.now() + duration;

  function tick() {
    const remaining = endTime - Date.now();
    if (remaining <= 0) {
      clearInterval(globalTimer);
      handleTimerEnd();
      return;
    }
    updateBadgeText(remaining);

    // Broadcast timer updates to all tabs
    chrome.tabs.query({}, (tabs) => {
      tabs.forEach((tab) => {
        chrome.tabs.sendMessage(tab.id, { type: "timerUpdate", remainingTime: remaining }).catch(() => {});
      });
    });
  }

  globalTimer = setInterval(tick, 1000);
  tick(); // Initial call
}

// Start Focus Timer
async function startTimer(taskIntent) {
  if (globalTimer) {
    console.log("Timer already running");
    return;
  }

  const startTime = Date.now();
  endTime = startTime + DEFAULT_TIME_LIMIT;

  // Store session data
  await chrome.storage.local.set({
    timerActive: true,
    currentTaskIntent: taskIntent,
    startTime,
    currentEndTime: endTime,
  });

  // Broadcast task update to all tabs
  chrome.tabs.query({}, (tabs) => {
    tabs.forEach((tab) => {
      chrome.tabs.sendMessage(tab.id, { type: "taskUpdate", task: taskIntent }).catch(() => {});
    });
  });

  // Start the global timer
  startGlobalTimer(DEFAULT_TIME_LIMIT);
}

// Reset Timer
async function resetTimer() {
  if (globalTimer) clearInterval(globalTimer);
  if (activeTimer) clearTimeout(activeTimer);

  await chrome.storage.local.set({
    timerActive: false,
    startTime: null,
    currentEndTime: null,
  });

  endTime = null;
  globalTimer = null;
  activeTimer = null;
}

// Recover State on Service Worker Start
async function recoverState() {
  const { timerActive, currentEndTime } = await chrome.storage.local.get(["timerActive", "currentEndTime"]);

  if (timerActive && currentEndTime) {
    const remainingTime = currentEndTime - Date.now();
    if (remainingTime > 0) {
      endTime = currentEndTime;
      startGlobalTimer(remainingTime);
    } else {
      handleTimerEnd();
    }
  }
}

// Handle Timer End
async function handleTimerEnd() {
  clearInterval(globalTimer);
  globalTimer = null;

  chrome.action.setBadgeText({ text: "" });

  await chrome.storage.local.set({
    timerActive: false,
    startTime: null,
  });

  // Notify user
  chrome.notifications.create({
    type: "basic",
    iconUrl: "icons/icon48.png",
    title: "Focus Time Ended",
    message: "Your focus session is complete!",
    buttons: [{ title: "Take Break" }, { title: "Start New Session" }],
  });

  // Apply restrictions to non-whitelisted tabs
  const tabs = await chrome.tabs.query({});
  for (const tab of tabs) {
    if (!isWhitelisted(tab.url)) {
      handleBlurTabs(tab.id);
    }
  }
}

// Prompt for Task Intent
async function promptForTaskIntent() {
  return new Promise((resolve) => {
    chrome.windows.create(
      {
        url: "task-intent.html",
        type: "popup",
        width: 400,
        height: 300,
      },
      (window) => {
        chrome.runtime.onMessage.addListener(function listener(message) {
          if (message.type === "taskIntent") {
            chrome.runtime.onMessage.removeListener(listener);
            chrome.windows.remove(window.id);
            resolve(message.intent);
          }
        });
      }
    );
  });
}

// Message Listener
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  switch (request.action) {
    case "startNewSession":
      promptForTaskIntent().then((taskIntent) => {
        if (taskIntent) {
          startTimer(taskIntent);
        } else {
          alert("Please provide a task to start the focus session.");
        }
      });
      break;
    case "extendTime":
      handleTimeExtension();
      break;
    case "blockTabs":
      handleBlockTabs();
      break;
    case "blurTabs":
      handleBlurTabs();
      break;
    case "getTimeRemaining":
      sendResponse({ timeRemaining: endTime ? endTime - Date.now() : 0 });
      break;
    case "resetTimer":
      resetTimer();
      break;
    case "getState":
      getState(sendResponse);
      return true; // Keep channel open for async response
  }
});

// Notification Button Handler
chrome.notifications.onButtonClicked.addListener((notificationId, buttonIndex) => {
  if (buttonIndex === 1) {
    handleTimeExtension();
  }
});

// Check if URL is Whitelisted
function isWhitelisted(url) {
  if (!url) return false;
  return whitelist.some((domain) => url.includes(domain));
}

// Initial Setup
recoverState();