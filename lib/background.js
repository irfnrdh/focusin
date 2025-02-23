chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === "reverse_pomodoro") {
      chrome.notifications.create({
        type: "basic",
        iconUrl: "icon.png",
        title: "Reverse Pomodoro",
        message: "30 menit berlalu! Apa yang kamu lakukan?",
        buttons: [{ title: "Catat Aktivitas" }],
        priority: 1
      });
  
      chrome.storage.local.get({ logs: [] }, (data) => {
        let logs = data.logs;
        let activity = prompt("Apa yang kamu lakukan dalam 30 menit terakhir?") || "Tidak ada aktivitas";
        logs.push({ time: new Date().toLocaleTimeString(), activity });
  
        chrome.storage.local.set({ logs });
      });
    }
  });


  
  
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "start") {
      chrome.alarms.create("reverse_pomodoro", { periodInMinutes: 30 });
      sendResponse({ status: "started" });
    } else if (message.action === "stop") {
      chrome.alarms.clear("reverse_pomodoro");
      sendResponse({ status: "stopped" });
    } else if (message.action === "export") {
        chrome.storage.local.get("logs", (data) => {
          let logs = JSON.stringify(data.logs, null, 2);
          let blob = new Blob([logs], { type: "application/json" });
    
          let reader = new FileReader();
          reader.onloadend = function () {
            let url = reader.result;
            chrome.downloads.download({
              url: url,
              filename: "reverse_pomodoro_log.json",
              saveAs: true
            });
          };
          reader.readAsDataURL(blob);
        });
      }
  });
  