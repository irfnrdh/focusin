document.addEventListener('DOMContentLoaded', () => {
  const taskInput = document.getElementById('taskInput');
  const extend5Button = document.getElementById('extend5');
  // const extend10Button = document.getElementById('extend10');
  // const resumeButton = document.getElementById('resume');

  // Load previous task from storage
  chrome.storage.local.get(['currentTask'], (data) => {
    if (data.currentTask) {
      taskInput.value = data.currentTask;
    }
  });

  // Extend time by 5 minutes
  extend5Button.addEventListener('click', () => {
    // const taskDescription = taskInput.value.trim();
    // if (!taskDescription) {
    //   alert("Please explain what you are doing.");
    //   return;
    // }

    chrome.runtime.sendMessage({ action: "extendTime", minutes: 5 }, () => {
      alert("Waktu ditambah, Pergunakan dengan baik!");
      window.history.back();
      // window.close(); // Close after confirmation
    });

    
  });

  // Extend time by 10 minutes
  // extend10Button.addEventListener('click', () => {
  //   const taskDescription = taskInput.value.trim();
  //   if (!taskDescription) {
  //     alert("Please explain what you are doing.");
  //     return;
  //   }

  //   chrome.runtime.sendMessage({ action: "extendTime", minutes: 10 }, () => {
  //     alert("Time extended by 10 minutes!");
  //     window.history.back();
  //     // window.close(); // Close after confirmation
  //   });
  // });

  // Resume previous task
  // resumeButton.addEventListener('click', () => {
  //   chrome.runtime.sendMessage({ action: "resumeTask" }, () => {
  //     alert("Resuming previous task...");
  //     window.history.back();
  //     // window.close(); // Close after confirmation
  //   });
  // });


});