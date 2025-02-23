document.addEventListener("DOMContentLoaded", () => {
    const table = document.getElementById("historyTable");
  
    chrome.storage.local.get("logs", (data) => {
      const logs = data.logs || [];
      logs.forEach((log) => {
        const row = table.insertRow();
        row.insertCell(0).textContent = log.timestamp;
        row.insertCell(1).textContent = log.title;
        row.insertCell(2).textContent = log.url;
      });
    });
  
    document.getElementById("exportLogs").addEventListener("click", () => {
      chrome.storage.local.get("logs", (data) => {
        const logs = data.logs || [];
        const blob = new Blob([JSON.stringify(logs, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "browsing_history.json";
        a.click();
      });
    });
  });
  