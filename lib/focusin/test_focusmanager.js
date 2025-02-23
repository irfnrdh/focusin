const PomodoroTimer = require('./focusin');
const FocusManager = require('./focusmanager');

// Initialize both managers
const timer = new PomodoroTimer(config);
const focusManager = new FocusManager(config);

// Link them together
timer.on('onStateChange', ({ state, isRunning }) => {
  focusManager.updateTimerState(isRunning, state);
});

// Example usage
focusManager.addToBlocklist('facebook.com');
focusManager.createAutoblock({
  url: 'youtube.com',
  duration: 30,
  note: 'Limited YouTube access during work'
});
focusManager.createWorkflow({
  name: 'Morning Focus',
  url: 'twitter.com',
  timeRange: { start: '09:00', end: '12:00' },
  days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
});