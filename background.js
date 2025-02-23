const MAX_TABS = 3;
const DEFAULT_TIME_LIMIT = 5 * 60 * 1000; // 5 minutes in ms
const whitelist = [
    'docs.google.com',
    'obsidian.md',
    'notion.so'
];

let activeTimer = null;
let endTime = null;

// Initial setup on extension installation
chrome.runtime.onInstalled.addListener(() => {
    chrome.storage.local.set({
        timeLimit: DEFAULT_TIME_LIMIT,
        startTime: null,
        whitelist,
        settings: {
            hardcoreMode: false,
            soundAlerts: true
        }
    });
});

// Start timer when new window is created
chrome.windows.onCreated.addListener(() => {
    startTimer();
});

// Monitor tab creation
chrome.tabs.onCreated.addListener(() => {
    enforceTabLimit();
});

// Listen for tab updates
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete') {
        enforceTabLimit();
        checkAndApplyRestrictions(tab);
    }
});

// Message handling
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    switch (request.action) {
        case 'extendTime':
            handleTimeExtension();
            break;
        case 'blockTabs':
            handleBlockTabs();
            break;
        case 'blurTabs':
            handleBlurTabs();
            break;
        case 'getTimeRemaining':
            sendResponse({ timeRemaining: endTime ? endTime - Date.now() : 0 });
            break;
        case 'startNewSession':
            startTimer();
            break;
        case 'resetTimer':
            resetTimer();
            break;
        case 'getState':
            getState(sendResponse);
            return true; // Keep channel open for async response
    }
});

// Notification button handler
chrome.notifications.onButtonClicked.addListener((notificationId, buttonIndex) => {
    if (buttonIndex === 1) { // Extend Time button
        handleTimeExtension();
    }
});

async function startTimer() {
    const startTime = Date.now();
    endTime = startTime + DEFAULT_TIME_LIMIT;

    // Store start time and timer status
    await chrome.storage.local.set({
        startTime,
        timerActive: true,
        currentEndTime: endTime
    });

    // Clear existing timer
    if (activeTimer) {
        clearTimeout(activeTimer);
    }

    // Set new timer
    activeTimer = setTimeout(handleTimerEnd, DEFAULT_TIME_LIMIT);

    // Get task intent
    const taskIntent = await promptForTaskIntent();
    if (taskIntent) {
        await chrome.storage.local.set({
            currentTaskIntent: taskIntent,
            lastTaskTime: startTime,
            taskHistory: [{
                time: startTime,
                task: taskIntent
            }]
        });
        await syncWithObsidian(taskIntent);
    } else {
        // Cancel timer if no task intent provided
        clearTimeout(activeTimer);
        await chrome.storage.local.set({
            startTime: null,
            timerActive: false
        });
    }
}

async function resetTimer() {
    if (activeTimer) {
        clearTimeout(activeTimer);
    }

    await chrome.storage.local.set({
        startTime: null,
        timerActive: false,
        currentEndTime: null
    });

    endTime = null;
    activeTimer = null;
}

async function enforceTabLimit() {
    const tabs = await chrome.tabs.query({ currentWindow: true });

    if (tabs.length > MAX_TABS) {
        // Create warning notification
        chrome.notifications.create({
            type: 'basic',
            iconUrl: 'icons/icon48.png',
            title: 'Tab Limit Exceeded',
            message: `Maximum ${MAX_TABS} tabs allowed. Please close some tabs to continue.`
        });

        // Get the most recently created tab
        const latestTab = tabs[tabs.length - 1];

        // Close the most recent tab
        chrome.tabs.remove(latestTab.id);
    }
}

async function checkAndApplyRestrictions(tab) {
    const { startTime, timeLimit } = await chrome.storage.local.get(['startTime', 'timeLimit']);

    if (startTime && Date.now() - startTime >= timeLimit) {
        if (!isWhitelisted(tab.url)) {
            handleTimerEnd();
        }
    }
}

async function handleTimerEnd() {
    clearTimeout(activeTimer);

    // Update timer status
    await chrome.storage.local.set({
        timerActive: false,
        startTime: null
    });

    const { settings } = await chrome.storage.local.get('settings');

    if (settings.hardcoreMode) {
        await handleBlockTabs();
    } else {
        await handleBlurTabs();
    }

    // Show notification
    chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/icon48.png',
        title: 'Focus Time Ended',
        message: 'Time to take a break or extend with a reason.',
        buttons: [
            { title: 'Take Break' },
            { title: 'Extend Time' }
        ]
    });

    // Play sound if enabled
    if (settings.soundAlerts) {
        playAlertSound();
    }
}

async function handleTimeExtension() {
    const reason = await promptForExtensionReason();

    if (reason) {
        // Log the extension reason
        const timestamp = new Date().toISOString();
        const { timeExtensionLog = [] } = await chrome.storage.local.get('timeExtensionLog');

        timeExtensionLog.push({
            timestamp,
            reason
        });

        await chrome.storage.local.set({ timeExtensionLog });

        // Add 5 minutes
        endTime = Date.now() + (5 * 60 * 1000);

        // Reset timer
        clearTimeout(activeTimer);
        activeTimer = setTimeout(handleTimerEnd, 5 * 60 * 1000);

        // Update storage
        await chrome.storage.local.set({
            currentEndTime: endTime,
            timerActive: true
        });

        // Sync with Obsidian
        syncWithObsidian(`Time extended: ${reason}`);

        // Remove blur/block if present
        removeRestrictions();
    }
}

async function handleBlockTabs() {
    const tabs = await chrome.tabs.query({ currentWindow: true });

    for (const tab of tabs) {
        if (!isWhitelisted(tab.url)) {
            try {
                await chrome.scripting.executeScript({
                    target: { tabId: tab.id },
                    function: () => {
                        const overlay = document.createElement('div');
                        overlay.className = 'fokusind-overlay fokusind-animate';
                        overlay.innerHTML = `
                            <div class="fokusind-message">
                                <h2 style="font-size: 24px; margin-bottom: 16px;">Focus Time Ended</h2>
                                <p style="margin-bottom: 16px;">Take a break or provide a reason to extend time.</p>
                                <button onclick="chrome.runtime.sendMessage({action: 'extendTime'})" 
                                        style="padding: 8px 16px; background: #3b82f6; color: white; border: none; border-radius: 4px; cursor: pointer;">
                                    Extend Time
                                </button>
                            </div>
                        `;
                        document.body.appendChild(overlay);
                    }
                });
            } catch (error) {
                console.error(`Failed to block tab ${tab.id}:`, error);
            }
        }
    }
}

async function handleBlurTabs() {
    const tabs = await chrome.tabs.query({ currentWindow: true });

    for (const tab of tabs) {
        if (!isWhitelisted(tab.url)) {
            try {
                await chrome.scripting.insertCSS({
                    target: { tabId: tab.id },
                    css: `
                        body { 
                            filter: blur(5px);
                            pointer-events: none;
                        }
                        body::after {
                            content: "Focus time ended. Take a break or extend time!";
                            position: fixed;
                            top: 50%;
                            left: 50%;
                            transform: translate(-50%, -50%);
                            background: rgba(0, 0, 0, 0.8);
                            color: white;
                            padding: 20px;
                            border-radius: 10px;
                            z-index: 9999;
                            filter: none;
                        }
                    `
                });
            } catch (error) {
                console.error(`Failed to blur tab ${tab.id}:`, error);
            }
        }
    }
}

async function removeRestrictions() {
    const tabs = await chrome.tabs.query({ currentWindow: true });

    for (const tab of tabs) {
        if (!isWhitelisted(tab.url)) {
            try {
                await chrome.scripting.executeScript({
                    target: { tabId: tab.id },
                    function: () => {
                        const overlay = document.querySelector('.fokusind-overlay');
                        if (overlay) {
                            overlay.remove();
                        }
                    }
                });

                await chrome.scripting.insertCSS({
                    target: { tabId: tab.id },
                    css: `
                        body { 
                            filter: none !important;
                            pointer-events: auto !important;
                        }
                        body::after {
                            content: none !important;
                        }
                    `
                });
            } catch (error) {
                console.error(`Failed to remove restrictions from tab ${tab.id}:`, error);
            }
        }
    }
}

async function promptForTaskIntent() {
    return new Promise((resolve) => {
        chrome.windows.create({
            url: 'task-intent.html',
            type: 'popup',
            width: 400,
            height: 300
        }, (window) => {
            // Listen for the response from task-intent.html
            chrome.runtime.onMessage.addListener(function listener(message) {
                if (message.type === 'taskIntent') {
                    chrome.runtime.onMessage.removeListener(listener);
                    chrome.windows.remove(window.id);
                    resolve(message.intent);
                }
            });
        });
    });
}

async function promptForExtensionReason() {
    return new Promise((resolve) => {
        chrome.windows.create({
            url: 'extend-time.html',
            type: 'popup',
            width: 400,
            height: 300
        }, (window) => {
            chrome.runtime.onMessage.addListener(function listener(message) {
                if (message.type === 'extensionReason') {
                    chrome.runtime.onMessage.removeListener(listener);
                    chrome.windows.remove(window.id);
                    resolve(message.reason);
                }
            });
        });
    });
}

async function syncWithObsidian(content) {
    try {
        const timestamp = new Date().toISOString();
        const { obsidianSyncLog = [] } = await chrome.storage.local.get('obsidianSyncLog');

        obsidianSyncLog.push({
            timestamp,
            content
        });

        await chrome.storage.local.set({ obsidianSyncLog });

        // Here you would implement actual Obsidian sync
        console.log('Syncing with Obsidian:', content);
    } catch (error) {
        console.error('Failed to sync with Obsidian:', error);
    }
}

function isWhitelisted(url) {
    if (!url) return false;
    return whitelist.some(domain => url.includes(domain));
}

async function getState(sendResponse) {
    const state = await chrome.storage.local.get([
        'startTime',
        'timerActive',
        'currentEndTime',
        'currentTaskIntent',
        'settings'
    ]);
    sendResponse(state);
}

function playAlertSound() {
    const audio = new Audio(chrome.runtime.getURL('alert.mp3'));
    audio.play().catch(error => console.error('Failed to play alert sound:', error));
}

// Recovery state when service worker starts
async function recoverState() {
    const {
        startTime,
        timerActive,
        currentEndTime
    } = await chrome.storage.local.get(['startTime', 'timerActive', 'currentEndTime']);

    if (timerActive && startTime && currentEndTime) {
        const remainingTime = currentEndTime - Date.now();
        if (remainingTime > 0) {
            endTime = currentEndTime;
            activeTimer = setTimeout(handleTimerEnd, remainingTime);
        } else {
            handleTimerEnd();
        }
    }
}

// Call recovery state when service worker starts
recoverState();