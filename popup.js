document.addEventListener('DOMContentLoaded', () => {
  const timerElement = document.getElementById('timer');
  const historyElement = document.getElementById('history');
  const copyButton = document.getElementById('copyHistory');
  const exportButton = document.createElement('button');

  exportButton.textContent = 'Export Log';
  exportButton.className = 'copy';
  document.body.appendChild(exportButton);

  // Load history from storage
  function loadHistory() {
    chrome.storage.local.get(['activityHistory'], (data) => {
      const history = data.activityHistory || [];
      historyElement.innerHTML = ''; // Clear previous content

      history.forEach((item, index) => {
        const div = document.createElement('div');
        div.className = 'history-item';
        div.textContent = `${index + 1}. Task: ${item.task} | Time: ${item.timestamp} | Duration: ${item.duration} seconds | Status: ${item.isBlocked ? 'Blocked' : 'Completed'}`;
        historyElement.appendChild(div);
      });
    });
  }

  // Update the global timer every second
  function updateTimer() {
    chrome.storage.local.get(['globalStartTime'], (data) => {
      if (!data.globalStartTime) {
        timerElement.textContent = 'No active task';
        return;
      }

      const elapsedSeconds = Math.floor((Date.now() - data.globalStartTime) / 1000);
      const remainingSeconds = 5 * 60 - elapsedSeconds;

      if (remainingSeconds <= 0) {
        timerElement.textContent = 'Time is up!';
        return;
      }

      const minutes = Math.floor(remainingSeconds / 60);
      const seconds = remainingSeconds % 60;
      timerElement.textContent = `Active: ${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
    });
  }

  // Copy history to clipboard
  copyButton.addEventListener('click', () => {
    chrome.storage.local.get(['activityHistory'], (data) => {
      const history = data.activityHistory || [];
      const text = history
        .map((item, index) => `${index + 1}. Task: ${item.task} | Time: ${item.timestamp} | Duration: ${item.duration} seconds | Status: ${item.isBlocked ? 'Blocked' : 'Completed'}`)
        .join('\n');

      navigator.clipboard.writeText(text).then(() => {
        alert('History copied to clipboard!');
      });
    });
  });

  // Export log to file
  exportButton.addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: "exportLog" });
  });

  // Initialize
  setInterval(updateTimer, 1000); // Update timer every second
  loadHistory(); // Load history on popup open
});