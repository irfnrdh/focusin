document.addEventListener('DOMContentLoaded', async () => {
  updateTabCount();
  await syncTimerState();
  setupEventListeners();
});

function setupEventListeners() {
  document.getElementById('startFocus').addEventListener('click', async () => {
    const taskIntent = await promptForTaskIntent();
    if (taskIntent) {
      chrome.runtime.sendMessage({ action: 'startNewSession', task: taskIntent });
    } else {
      alert("Please provide a task to start the focus session.");
    }
  });

  document.getElementById('extendTime').addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: 'extendTime' });
  });
}

async function promptForTaskIntent() {
  const task = prompt("What is your current task?");
  return task ? task.trim() : null;
}

async function updateTabCount() {
  const tabs = await chrome.tabs.query({ currentWindow: true });
  document.getElementById('tabCount').textContent = `${tabs.length}/3`;
}

async function syncTimerState() {
  const state = await chrome.storage.local.get(['timerActive', 'currentEndTime', 'currentTaskIntent']);
  
  if (state.timerActive && state.currentEndTime) {
    updateTimer(state.currentEndTime - Date.now());
    document.getElementById('status').textContent = `Current Task: ${state.currentTaskIntent || 'Not Set'}`;
  }
}

function updateTimer(remainingTime) {
  if (globalTimer) clearInterval(globalTimer);
  
  function updateDisplay() {
    const minutes = Math.floor(remainingTime / 60000);
    const seconds = Math.floor((remainingTime % 60000) / 1000);
    document.getElementById('timer').textContent = 
      `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }

  globalTimer = setInterval(() => {
    remainingTime -= 1000;
    if (remainingTime <= 0) {
      clearInterval(globalTimer);
      document.getElementById('timer').textContent = '00:00';
      return;
    }
    updateDisplay();
  }, 1000);

  updateDisplay();
}

// Listen for timer updates from background
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'timerUpdate') {
    updateTimer(message.remainingTime);
  } else if (message.type === 'taskUpdate') {
    document.getElementById('status').textContent = `Current Task: ${message.task || 'Not Set'}`;
  }
});