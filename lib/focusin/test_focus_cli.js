const PomodoroTimer = require('./focusin.js');
const readline = require('readline');
const cliProgress = require('cli-progress');
const colors = require('colors/safe');
const figlet = require('figlet');

// Create interface for terminal input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Initialize progress bar
const progressBar = new cliProgress.SingleBar({
  format: colors.cyan('{bar}') + ' | {percentage}% | {duration_formatted} | {state}',
  barCompleteChar: '\u2588',
  barIncompleteChar: '\u2591',
  hideCursor: true,
  clearOnComplete: false
});

// Global state for testing
let pomodoro;
let currentTest = null;
let testStats = {
  total: 0,
  passed: 0,
  failed: 0,
  skipped: 0
};

// Test scenarios
const testScenarios = {
  basic: [
    {
      name: 'Timer Initialization',
      run: () => {
        const status = pomodoro.getStatus();
        assert(status.state === 'idle', 'Initial state should be idle');
        assert(status.isRunning === false, 'Timer should not be running initially');
        assert(status.currentCycle === 1, 'Should start at cycle 1');
      }
    },
    {
      name: 'Start Timer',
      run: () => {
        pomodoro.start();
        const status = pomodoro.getStatus();
        assert(status.isRunning === true, 'Timer should be running');
        assert(status.state === 'work', 'Should start in work state');
      }
    },
    {
      name: 'Pause Timer',
      run: async () => {
        await sleep(2000);
        const timeBeforePause = pomodoro.getStatus().timeRemaining;
        pomodoro.pause();
        await sleep(1000);
        const timeAfterPause = pomodoro.getStatus().timeRemaining;
        assert(timeBeforePause === timeAfterPause, 'Time should not change while paused');
        assert(pomodoro.getStatus().isRunning === false, 'Timer should not be running');
      }
    }
  ],
  reverse: [
    {
      name: 'Toggle Reverse Mode',
      run: () => {
        pomodoro.toggleReverse();
        const status = pomodoro.getStatus();
        assert(status.isReverse === true, 'Should be in reverse mode');
        assert(status.state === 'idle', 'Should reset to idle state');
      }
    },
    {
      name: 'Start Reverse Timer',
      run: () => {
        pomodoro.start();
        const status = pomodoro.getStatus();
        assert(status.state === 'break', 'Should start with break in reverse mode');
      }
    }
  ],
  cycles: [
    {
      name: 'Complete Work Cycle',
      run: async () => {
        pomodoro.reset();
        pomodoro.start();
        await waitForStateChange(pomodoro, 'break');
        assert(pomodoro.getStatus().currentCycle === 2, 'Should increment cycle');
      }
    },
    {
      name: 'Long Break After 4 Cycles',
      run: async () => {
        pomodoro = new PomodoroTimer({ settings: { work_duration: 0.1, break_duration: 0.1 }});
        for (let i = 0; i < 7; i++) {
          await waitForStateChange(pomodoro);
        }
        assert(pomodoro.getStatus().state === 'longBreak', 'Should enter long break');
      }
    }
  ],
  tasks: [
    {
      name: 'Add Task',
      run: () => {
        const task = { title: 'Test Task', priority: 'high' };
        const result = pomodoro.addTask(task);
        assert(result.title === task.title, 'Task should be added correctly');
      }
    },
    {
      name: 'Complete Task',
      run: () => {
        const taskId = pomodoro.tasks.list[0].id;
        pomodoro.completeTask(taskId);
        assert(pomodoro.tasks.list[0].completed === true, 'Task should be marked complete');
      }
    }
  ]
};

// Utility functions
function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function waitForStateChange(timer, targetState = null) {
  return new Promise((resolve) => {
    timer.on('onStateChange', ({ state }) => {
      if (!targetState || state === targetState) {
        resolve();
      }
    });
    timer.start();
  });
}

// Display functions
function displayHeader() {
  console.clear();
  console.log(colors.rainbow(figlet.textSync('Focusin Tests', { horizontalLayout: 'full' })));
  console.log('\n');
}

function displayProgress(type, name) {
  const symbol = type === 'running' ? '⚡' : type === 'passed' ? '✓' : type === 'failed' ? '✗' : '○';
  const color = type === 'running' ? colors.yellow : 
                type === 'passed' ? colors.green : 
                type === 'failed' ? colors.red : colors.grey;
  console.log(color(`${symbol} ${name}`));
}

async function runTest(test) {
  currentTest = test;
  displayProgress('running', test.name);
  
  try {
    await test.run();
    testStats.passed++;
    displayProgress('passed', test.name);
  } catch (error) {
    testStats.failed++;
    displayProgress('failed', `${test.name}: ${error.message}`);
  }
}

// Interactive menu
function displayMenu() {
  console.log(colors.cyan('\nTest Menu:'));
  console.log('1. Run All Tests');
  console.log('2. Run Basic Tests');
  console.log('3. Run Reverse Mode Tests');
  console.log('4. Run Cycle Tests');
  console.log('5. Run Task Tests');
  console.log('6. Run Performance Test');
  console.log('7. Run Interactive Mode');
  console.log('8. Exit\n');
}

// Performance test
async function runPerformanceTest() {
  console.log(colors.yellow('\nRunning Performance Test...'));
  const startTime = process.hrtime();
  
  // Create many timers
  const timers = Array(1000).fill().map(() => new PomodoroTimer());
  
  // Start all timers
  timers.forEach(timer => timer.start());
  
  // Let them run for a bit
  await sleep(1000);
  
  // Stop all timers
  timers.forEach(timer => timer.pause());
  
  const [seconds, nanoseconds] = process.hrtime(startTime);
  const ms = seconds * 1000 + nanoseconds / 1000000;
  
  console.log(colors.green(`\nPerformance Test Results:`));
  console.log(`Created and managed 1000 timers in ${ms.toFixed(2)}ms`);
  console.log(`Average time per timer: ${(ms / 1000).toFixed(2)}ms`);
}

// Interactive mode
async function startInteractiveMode() {
  displayHeader();
  console.log(colors.cyan('Interactive Test Mode\n'));
  
  const timer = new PomodoroTimer();
  progressBar.start(100, 0);
  
  timer.on('onTick', ({ timeRemaining, state }) => {
    const total = state === 'work' ? 25 * 60 : 5 * 60;
    const progress = ((total - timeRemaining) / total) * 100;
    progressBar.update(progress, {
      state: state.toUpperCase(),
      duration_formatted: formatTime(timeRemaining)
    });
  });
  
  timer.start();
  
  await new Promise(resolve => timer.on('onComplete', resolve));
  progressBar.stop();
}

// Main test runner
async function runTests(category = 'all') {
  displayHeader();
  console.log(colors.yellow(`Running ${category} tests...\n`));
  
  pomodoro = new PomodoroTimer();
  const selectedTests = category === 'all' ? 
    Object.values(testScenarios).flat() :
    testScenarios[category] || [];
  
  testStats = { total: selectedTests.length, passed: 0, failed: 0, skipped: 0 };
  
  for (const test of selectedTests) {
    await runTest(test);
  }
  
  displayTestSummary();
}

function displayTestSummary() {
  console.log('\nTest Summary:');
  console.log(colors.green(`✓ Passed: ${testStats.passed}`));
  console.log(colors.red(`✗ Failed: ${testStats.failed}`));
  console.log(colors.grey(`○ Skipped: ${testStats.skipped}`));
  console.log(colors.cyan(`Total: ${testStats.total}`));
}

function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// Main menu handler
async function handleMenuChoice(choice) {
  switch(choice) {
    case '1':
      await runTests('all');
      break;
    case '2':
      await runTests('basic');
      break;
    case '3':
      await runTests('reverse');
      break;
    case '4':
      await runTests('cycles');
      break;
    case '5':
      await runTests('tasks');
      break;
    case '6':
      await runPerformanceTest();
      break;
    case '7':
      await startInteractiveMode();
      break;
    case '8':
      console.log(colors.yellow('\nExiting...\n'));
      rl.close();
      process.exit(0);
    default:
      console.log(colors.red('Invalid choice!'));
  }
  
  displayMenu();
}

// Start the test suite
async function start() {
  displayHeader();
  displayMenu();
  
  rl.on('line', (input) => {
    handleMenuChoice(input.trim());
  });
}

// Error handling
process.on('uncaughtException', (error) => {
  console.log(colors.red('\nError in test:'), error);
  if (currentTest) {
    console.log(colors.yellow(`Failed during test: ${currentTest.name}`));
  }
  displayTestSummary();
  process.exit(1);
});

// Start the test suite
start();