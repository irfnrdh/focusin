document.getElementById("start").addEventListener("click", () => {
    chrome.runtime.sendMessage({ action: "start" }, (response) => {
      console.log("Timer started:", response);
    });
  });
  
  document.getElementById("stop").addEventListener("click", () => {
    chrome.runtime.sendMessage({ action: "stop" }, (response) => {
      console.log("Timer stopped:", response);
    });
  });
  
  document.getElementById("export").addEventListener("click", () => {
    chrome.runtime.sendMessage({ action: "export" });
  });
  