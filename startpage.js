// Time and Date functionality
function updateTime() {
  // Get current time in Indonesia/Jakarta timezone
  const now = new Date();
  const timeElement = document.getElementById('time');
  const dateElement = document.getElementById('date');
  
  if (!timeElement || !dateElement) return; // Guard clause if elements not found
  
  // Format waktu dalam bahasa Indonesia (24 jam)
  let hours = now.getHours();
  let minutes = now.getMinutes();
  let seconds = now.getSeconds();
  
  // Add leading zeros
  hours = hours.toString().padStart(2, '0');
  minutes = minutes.toString().padStart(2, '0');
  seconds = seconds.toString().padStart(2, '0');
  
  timeElement.textContent = `${hours}:${minutes}:${seconds}`;
  
  // Array nama hari dan bulan dalam bahasa Indonesia
  const hariIndonesia = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const bulanIndonesia = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  
  const hari = hariIndonesia[now.getDay()];
  const tanggal = now.getDate();
  const bulan = bulanIndonesia[now.getMonth()];
  const tahun = now.getFullYear();
  
  dateElement.textContent = `${hari}, ${tanggal} ${bulan} ${tahun}`;
}

document.addEventListener('DOMContentLoaded', () => {
  // Initialize time immediately
  updateTime();
  
  // Update time every second
  setInterval(updateTime, 1000);
  
  const taskInput = document.getElementById('taskInput');
  const startTaskButton = document.getElementById('startTask');
  
  if (startTaskButton && taskInput) {
      startTaskButton.addEventListener('click', () => {
          const taskDescription = taskInput.value.trim();
          if (!taskDescription) {
              alert("Mohon jelaskan apa yang sedang kamu kerjakan.");
              return;
          }
          
          // Save task description to storage
          chrome.storage.local.set({ currentTask: taskDescription }, () => {
              console.log("Task saved:", taskDescription);
              alert("Task dimulai: " + taskDescription);
          });
      });
  }
});