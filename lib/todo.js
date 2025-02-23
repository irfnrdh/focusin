document.getElementById("addTask").addEventListener("click", () => {
    let task = document.getElementById("task").value.trim();
    if (!task) return;
  
    chrome.storage.local.get({ todos: [] }, (data) => {
      let todos = data.todos;
      todos.push(task);
      chrome.storage.local.set({ todos }, updateTodoList);
    });
  
    document.getElementById("task").value = "";
  });
  
  function updateTodoList() {
    chrome.storage.local.get({ todos: [] }, (data) => {
      let taskList = document.getElementById("taskList");
      taskList.innerHTML = "";
      data.todos.forEach((task, index) => {
        let li = document.createElement("li");
        li.textContent = task;
  
        let removeButton = document.createElement("button");
        removeButton.textContent = "❌";
        removeButton.onclick = () => {
          data.todos.splice(index, 1);
          chrome.storage.local.set({ todos: data.todos }, updateTodoList);
        };
  
        li.appendChild(removeButton);
        taskList.appendChild(li);
      });
    });
  }
  
  // Load to-do list saat popup dibuka
  updateTodoList();
  