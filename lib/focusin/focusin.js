class PomodoroTimer {
  constructor(config = {}) {
    // Default settings
    this.settings = {
      workDuration: config.work_duration || 25,
      breakDuration: config.break_duration || 5,
      longBreakDuration: config.long_break_duration || 15,
      cyclesBeforeLongBreak: config.cycles_before_long_break || 4,
      notifications: {
        enabled: true,
        sound: 'default',
        desktopAlert: true
      },
      ...config.settings
    };

    // Timer state
    this.timer = {
      state: 'idle', // idle, work, break, longBreak
      currentCycle: 1,
      timeRemaining: 0,
      isRunning: false,
      lastStartTime: null,
      isReverse: false // for reverse pomodoro
    };

    // Tasks management
    this.tasks = {
      list: [],
      currentTask: null,
      maxTasks: config.tasks?.max_tasks || 3
    };

    // Event listeners
    this.listeners = {
      onTick: [],
      onStateChange: [],
      onComplete: [],
      onTaskUpdate: []
    };

    // Analytics
    this.stats = {
      completedCycles: 0,
      totalTimeFocused: 0,
      streak: 0,
      completedTasks: 0
    };
  }

  // Task Management Methods
  addTask({ title, priority = 'medium', estimatedPomodoros = 1 }) {
    if (this.tasks.list.length >= this.tasks.maxTasks) {
      throw new Error('Maximum task limit reached');
    }

    const newTask = {
      id: Date.now().toString(),
      title,
      priority,
      estimatedPomodoros,
      completedPomodoros: 0,
      completed: false,
      createdAt: new Date(),
      completedAt: null
    };

    this.tasks.list.push(newTask);
    this._notifyTaskUpdate();
    return newTask;
  }

  completeTask(taskId) {
    const task = this.tasks.list.find(t => t.id === taskId);
    if (!task) {
      throw new Error('Task not found');
    }

    task.completed = true;
    task.completedAt = new Date();
    this.stats.completedTasks++;
    this._notifyTaskUpdate();
    return task;
  }

  updateTask(taskId, updates) {
    const task = this.tasks.list.find(t => t.id === taskId);
    if (!task) {
      throw new Error('Task not found');
    }

    Object.assign(task, updates);
    this._notifyTaskUpdate();
    return task;
  }

  deleteTask(taskId) {
    const index = this.tasks.list.findIndex(t => t.id === taskId);
    if (index === -1) {
      throw new Error('Task not found');
    }

    this.tasks.list.splice(index, 1);
    this._notifyTaskUpdate();
  }

  getTasks() {
    return {
      list: this.tasks.list,
      current: this.tasks.currentTask,
      stats: {
        total: this.tasks.list.length,
        completed: this.tasks.list.filter(t => t.completed).length,
        inProgress: this.tasks.list.filter(t => !t.completed).length
      }
    };
  }

  // Timer Control Methods
  start() {
    if (!this.timer.isRunning) {
      this.timer.isRunning = true;
      this.timer.lastStartTime = Date.now();
      
      if (this.timer.state === 'idle') {
        this.timer.state = this.timer.isReverse ? 'break' : 'work';
        this.timer.timeRemaining = this.getInitialTime();
      }
      
      this._startTicker();
    }
    return this.getStatus();
  }

  pause() {
    this.timer.isRunning = false;
    if (this._tickerId) {
      clearInterval(this._tickerId);
    }
    return this.getStatus();
  }

  reset() {
    this.pause();
    this.timer.state = 'idle';
    this.timer.timeRemaining = this.getInitialTime();
    this.timer.currentCycle = 1;
    this._notifyStateChange();
    return this.getStatus();
  }

  toggleReverse() {
    const wasRunning = this.timer.isRunning;
    this.timer.isReverse = !this.timer.isReverse;
    this.reset();
    
    if (wasRunning) {
      this.start();
    }
    
    return this.getStatus();
  }

  getInitialTime() {
    if (this.timer.state === 'work') {
      return this.settings.workDuration * 60;
    } else if (this.timer.state === 'break') {
      return this.settings.breakDuration * 60;
    }
    return this.settings.longBreakDuration * 60;
  }

  // Private methods
  _startTicker() {
    this._tickerId = setInterval(() => {
      if (this.timer.timeRemaining > 0) {
        this.timer.timeRemaining--;
        this._notifyTick();
      } else {
        this._handleCycleComplete();
      }
    }, 1000);
  }

  _handleCycleComplete() {
    this.pause();
    
    if (this.timer.state === 'work') {
      this.stats.completedCycles++;
      this.stats.totalTimeFocused += this.settings.workDuration * 60;
      
      if (this.timer.currentCycle >= this.settings.cyclesBeforeLongBreak) {
        this.timer.state = 'longBreak';
        this.timer.currentCycle = 1;
      } else {
        this.timer.state = 'break';
        this.timer.currentCycle++;
      }

      // Update current task if exists
      if (this.tasks.currentTask) {
        this.tasks.currentTask.completedPomodoros++;
        this._notifyTaskUpdate();
      }
    } else {
      this.timer.state = 'work';
    }

    this.timer.timeRemaining = this.getInitialTime();
    this._notifyComplete();
    this._notifyStateChange();
  }

  // Event handlers
  on(event, callback) {
    if (this.listeners[event]) {
      this.listeners[event].push(callback);
    }
  }

  _notifyTick() {
    this.listeners.onTick.forEach(callback => callback({
      timeRemaining: this.timer.timeRemaining,
      state: this.timer.state
    }));
  }

  _notifyStateChange() {
    this.listeners.onStateChange.forEach(callback => callback({
      state: this.timer.state,
      cycle: this.timer.currentCycle
    }));
  }

  _notifyComplete() {
    this.listeners.onComplete.forEach(callback => callback({
      state: this.timer.state,
      stats: this.stats
    }));
  }

  _notifyTaskUpdate() {
    this.listeners.onTaskUpdate.forEach(callback => callback({
      tasks: this.getTasks()
    }));
  }

  // Status and statistics
  getStatus() {
    return {
      state: this.timer.state,
      timeRemaining: this.timer.timeRemaining,
      currentCycle: this.timer.currentCycle,
      isRunning: this.timer.isRunning,
      isReverse: this.timer.isReverse,
      currentTask: this.tasks.currentTask,
      stats: this.stats
    };
  }

  getStats() {
    return {
      ...this.stats,
      currentStreak: this._calculateStreak(),
      taskCompletion: this.getTasks().stats
    };
  }
}

// Export for Node.js
module.exports = PomodoroTimer;