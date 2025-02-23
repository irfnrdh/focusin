const PomodoroTimer = require("./reversePomodoro"); // Sesuaikan path

const timer = new PomodoroTimer({
    workTime: 25 * 60,
    breakTime: 5 * 60,
    onTick: (time) => console.log("Sisa waktu:", time),
    onComplete: () => console.log("Pomodoro selesai!"),
});

timer.start();

setTimeout(() => {
    timer.stop();
    console.log("Timer dihentikan");
}, 5000); // Stop setelah 5 detik
