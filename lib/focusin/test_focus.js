const PomodoroTimer = require('./focusin.js');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Color codes for terminal
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

// Initialize the timer
const pomodoro = new PomodoroTimer({
  settings: {
    work_duration: 25,
    break_duration: 5,
    long_break_duration: 15,
    cycles_before_long_break: 4
  }
});

// Format time remaining
function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

// Clear terminal
function clearTerminal() {
  console.clear();
}

// Display menu
function displayMenu() {
  const status = pomodoro.getStatus();
  clearTerminal();
  console.log(`${colors.bright}=== Focusin Pomodoro Timer ===${colors.reset}\n`);
  console.log(`${colors.cyan}Current Status:${colors.reset}`);
  console.log(`• Mode: ${status.isReverse ? 'Reverse' : 'Normal'} Pomodoro`);
  console.log(`• State: ${status.state.toUpperCase()}`);
  console.log(`• Time Remaining: ${formatTime(status.timeRemaining)}`);
  console.log(`• Cycle: ${status.currentCycle}`);
  console.log(`• Timer: ${status.isRunning ? 'Running' : 'Stopped'}\n`);
  
  console.log(`${colors.yellow}Commands:${colors.reset}`);
  console.log('1. Start timer');
  console.log('2. Pause timer');
  console.log('3. Reset timer');
  console.log('4. Toggle reverse mode');
  console.log('5. Exit\n');
  
  console.log(`${colors.magenta}Enter your choice (1-5):${colors.reset}`);
}

// Handle user input
function handleCommand(command) {
  switch(command) {
    case '1':
      pomodoro.start();
      console.log(`${colors.green}Timer started!${colors.reset}`);
      break;
    case '2':
      pomodoro.pause();
      console.log(`${colors.yellow}Timer paused!${colors.reset}`);
      break;
    case '3':
      pomodoro.reset();
      console.log(`${colors.blue}Timer reset!${colors.reset}`);
      break;
    case '4':
      pomodoro.toggleReverse();
      console.log(`${colors.magenta}Mode toggled to ${pomodoro.getStatus().isReverse ? 'Reverse' : 'Normal'}!${colors.reset}`);
      break;
    case '5':
      console.log(`${colors.red}Exiting...${colors.reset}`);
      rl.close();
      process.exit(0);
      break;
    default:
      console.log(`${colors.red}Invalid command!${colors.reset}`);
  }
  
  // Short delay before showing menu again
  setTimeout(displayMenu, 1000);
}

// Setup event listeners
pomodoro.on('onTick', ({ timeRemaining, state }) => {
  // Update display every 5 seconds to avoid flooding the terminal
  if (timeRemaining % 5 === 0) {
    clearTerminal();
    displayMenu();
  }
});

pomodoro.on('onComplete', ({ state, stats }) => {
  console.log(`\n${colors.green}Session Complete!${colors.reset}`);
  console.log(`Completed ${state} session!`);
  
  // Play terminal bell
  process.stdout.write('\x07');
  
  setTimeout(displayMenu, 2000);
});

// Start the interactive interface
displayMenu();

// Handle user input
rl.on('line', (input) => {
  handleCommand(input.trim());
});

// Handle exit
rl.on('close', () => {
  console.log(`\n${colors.bright}Thank you for using Focusin Pomodoro Timer!${colors.reset}`);
  process.exit(0);
});

// Handle Ctrl+C
process.on('SIGINT', () => {
  console.log(`\n${colors.red}Interrupted by user${colors.reset}`);
  rl.close();
});