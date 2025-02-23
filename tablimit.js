document
        .getElementById("backButton")
        .addEventListener("click", function () {
            window.history.back();
        //   chrome.tabs.query({ currentWindow: true }, function (tabs) {
        //     if (tabs.length > 1) {
        //       chrome.tabs.update(tabs[tabs.length - 2].id, { active: true });
        //     } else {
        //       alert("Tidak ada tab sebelumnya untuk kembali.");
        //     }
        //   });
        });