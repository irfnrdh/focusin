class PomodoroTimer {
    constructor({ 
        mode = "reverse", 
        workTime = 25 * 60, 
        breakTime = 5 * 60, 
        logInterval = 30 * 60, 
        onTick = () => {}, 
        onComplete = () => {} 
    } = {}) {
        this.mode = mode;
        this.workTime = workTime * 1000; // Konversi ke milidetik
        this.breakTime = breakTime * 1000;
        this.logInterval = logInterval * 1000;
        this.onTick = onTick;
        this.onComplete = onComplete;

        this.isRunning = false;
        this.currentCycle = 1;
        this.logs = [];
        this.timer = null;
    }

    start() {
        if (this.isRunning) return;
        this.isRunning = true;

        if (this.mode === "pomodoro") {
            this.runPomodoroCycle();
        } else {
            this.runReversePomodoro();
        }
    }

    runPomodoroCycle() {
        console.log(`[Pomodoro] Cycle ${this.currentCycle} started.`);
        let timeRemaining = this.workTime / 1000; // Konversi ke detik

        this.timer = setInterval(() => {
            timeRemaining--;
            this.onTick(timeRemaining);

            if (timeRemaining <= 0) {
                clearInterval(this.timer);
                console.log("[Pomodoro] Time's up! Take a break.");
                this.logs.push({ cycle: this.currentCycle, status: "Completed" });

                setTimeout(() => {
                    this.currentCycle++;
                    this.runPomodoroCycle();
                }, this.breakTime);
            }
        }, 1000);
    }

    runReversePomodoro() {
        console.log("[Reverse Pomodoro] Tracking started...");
        this.timer = setInterval(() => {
            const activity = prompt("What did you do in the last 30 minutes?") || "Nothing";
            this.logs.push({ time: new Date().toLocaleTimeString(), activity });
            console.log(`[Reverse Pomodoro] ${activity}`);
        }, this.logInterval);
    }

    pause() {
        clearTimeout(this.timer);
        clearInterval(this.timer);
        this.isRunning = false;
        console.log("[Pomodoro] Timer paused.");
    }

    resume() {
        if (this.isRunning) return;
        this.isRunning = true;

        if (this.mode === "pomodoro") {
            this.runPomodoroCycle();
        } else {
            this.runReversePomodoro();
        }
    }

    stop() {
        clearTimeout(this.timer);
        clearInterval(this.timer);
        this.isRunning = false;
        console.log("[Pomodoro] Timer stopped.");
        console.table(this.logs);
    }
}

module.exports = PomodoroTimer;
