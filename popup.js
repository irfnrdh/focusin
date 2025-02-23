let timer;
let timeLeft = 300; // 5 minutes in seconds
let isRunning = false;

document.addEventListener('DOMContentLoaded', () => {
  updateTabCount();
  setupEventListeners();
  loadSettings();
});

async function updateTabCount() {
  const tabs = await chrome.tabs.query({ currentWindow: true });
  document.getElementById('tabCount').textContent = tabs.length;
  
  if (tabs.length > 3) {
    showNotification('Too many tabs open', 'Please close some tabs to maintain focus.');
  }
}

function setupEventListeners() {
  document.getElementById('startTimer').addEventListener('click', startTimer);
  document.getElementById('pauseTimer').addEventListener('click', pauseTimer);
  document.getElementById('resetTimer').addEventListener('click', resetTimer);
  
  document.getElementById('taskIntent').addEventListener('change', saveTaskIntent);
  document.getElementById('hardcoreMode').addEventListener('change', saveSettings);
  document.getElementById('soundAlerts').addEventListener('change', saveSettings);
}

function startTimer() {
  const taskIntent = document.getElementById('taskIntent').value;
  if (!taskIntent.trim()) {
    showNotification('Task Intent Required', 'Please specify what you plan to accomplish.');
    return;
  }

  isRunning = true;
  document.getElementById('startTimer').disabled = true;
  document.getElementById('pauseTimer').disabled = false;
  
  timer = setInterval(() => {
    timeLeft--;
    updateTimerDisplay();
    
    if (timeLeft <= 0) {
      handleTimerComplete();
    } else if (timeLeft <= 30) {
      if (document.getElementById('soundAlerts').checked) {
        playAlert();
      }
    }
  }, 1000);
}

function pauseTimer() {
  isRunning = false;
  clearInterval(timer);
  document.getElementById('startTimer').disabled = false;
  document.getElementById('pauseTimer').disabled = true;
}

function resetTimer() {
  isRunning = false;
  clearInterval(timer);
  timeLeft = 300;
  updateTimerDisplay();
  document.getElementById('startTimer').disabled = false;
  document.getElementById('pauseTimer').disabled = true;
}

function updateTimerDisplay() {
  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  document.getElementById('timer').textContent = 
    `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

function handleTimerComplete() {
  clearInterval(timer);
  
  if (document.getElementById('hardcoreMode').checked) {
    chrome.runtime.sendMessage({ action: 'blockTabs' });
  } else {
    chrome.runtime.sendMessage({ action: 'blurTabs' });
  }
  
  showNotification('Time\'s Up!', 'Your focus session has ended.');
}

function showNotification(title, message) {
  chrome.notifications.create({
    type: 'basic',
    iconUrl: 'icons/icon48.png',
    title: title,
    message: message
  });
}

function saveTaskIntent() {
  const intent = document.getElementById('taskIntent').value;
  chrome.storage.local.set({ taskIntent: intent });
}

function saveSettings() {
  const settings = {
    hardcoreMode: document.getElementById('hardcoreMode').checked,
    soundAlerts: document.getElementById('soundAlerts').checked
  };
  chrome.storage.local.set({ settings });
}

function loadSettings() {
  chrome.storage.local.get(['settings', 'taskIntent'], (data) => {
    if (data.settings) {
      document.getElementById('hardcoreMode').checked = data.settings.hardcoreMode;
      document.getElementById('soundAlerts').checked = data.settings.soundAlerts;
    }
    if (data.taskIntent) {
      document.getElementById('taskIntent').value = data.taskIntent;
    }
  });
}

function playAlert() {
  const audio = new Audio('alert.mp3');
  audio.play();
}