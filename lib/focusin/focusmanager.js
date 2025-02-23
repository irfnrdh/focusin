class FocusManager {
    constructor(config = {}) {
      this.blocklist = {
        enabled: config.website_blocking?.enabled || true,
        sites: new Set(config.website_blocking?.blocked_sites || []),
        exceptions: new Set()
      };
  
      this.autoblock = {
        enabled: config.autoblock?.enabled || true,
        rules: new Map(),
        activeBlocks: new Map(),
        breakBlock: config.autoblock?.break_block || true
      };
  
      this.workflows = {
        enabled: config.workflows?.enabled || true,
        triggers: new Map(),
        activeWorkflows: new Map()
      };
  
      this.timerRunning = false;
      this.currentState = 'idle';
  
      // Event listeners
      this.listeners = {
        onBlock: [],
        onUnblock: [],
        onWorkflowTrigger: [],
        onAutoblockStart: [],
        onAutoblockEnd: []
      };
    }
  
    // Blocklist Methods
    addToBlocklist(url) {
      const normalizedUrl = this._normalizeUrl(url);
      this.blocklist.sites.add(normalizedUrl);
      this._notifyBlock(normalizedUrl);
      return Array.from(this.blocklist.sites);
    }
  
    removeFromBlocklist(url) {
      const normalizedUrl = this._normalizeUrl(url);
      this.blocklist.sites.delete(normalizedUrl);
      this._notifyUnblock(normalizedUrl);
      return Array.from(this.blocklist.sites);
    }
  
    isBlocked(url) {
      const normalizedUrl = this._normalizeUrl(url);
      return this.blocklist.enabled && this.blocklist.sites.has(normalizedUrl);
    }
  
    // Autoblock Methods
    createAutoblock({ url, duration, note = '' }) {
      const normalizedUrl = this._normalizeUrl(url);
      const rule = {
        url: normalizedUrl,
        duration: duration,
        note,
        createdAt: new Date(),
        activeOnly: true
      };
  
      this.autoblock.rules.set(normalizedUrl, rule);
      if (this.timerRunning) {
        this._activateAutoblock(normalizedUrl);
      }
      return rule;
    }
  
    removeAutoblock(url) {
      const normalizedUrl = this._normalizeUrl(url);
      this.autoblock.rules.delete(normalizedUrl);
      this.autoblock.activeBlocks.delete(normalizedUrl);
    }
  
    // Workflow Methods
    createWorkflow({ name, url, timeRange, days }) {
      const workflow = {
        id: `workflow_${Date.now()}`,
        name,
        url: this._normalizeUrl(url),
        timeRange,
        days: new Set(days),
        active: true
      };
  
      this.workflows.triggers.set(workflow.id, workflow);
      this._scheduleWorkflow(workflow);
      return workflow;
    }
  
    removeWorkflow(id) {
      const workflow = this.workflows.triggers.get(id);
      if (workflow) {
        this._unscheduleWorkflow(workflow);
        this.workflows.triggers.delete(id);
      }
    }
  
    // Timer Integration Methods
    updateTimerState(isRunning, state) {
      this.timerRunning = isRunning;
      this.currentState = state;
      
      if (isRunning) {
        this._activateAllAutoblocks();
      } else {
        this._deactivateAllAutoblocks();
      }
    }
  
    // Private Methods
    _normalizeUrl(url) {
      try {
        url = url.toLowerCase().trim();
        if (!url.startsWith('http')) {
          url = 'https://' + url;
        }
        const urlObj = new URL(url);
        return urlObj.hostname.replace('www.', '');
      } catch {
        return url.toLowerCase().trim();
      }
    }
  
    _activateAutoblock(url) {
      const rule = this.autoblock.rules.get(url);
      if (!rule) return;
  
      const block = {
        ...rule,
        startTime: Date.now(),
        endTime: Date.now() + (rule.duration * 60 * 1000)
      };
  
      this.autoblock.activeBlocks.set(url, block);
      this._notifyAutoblockStart(block);
  
      // Schedule end of autoblock
      setTimeout(() => {
        this._deactivateAutoblock(url);
      }, rule.duration * 60 * 1000);
    }
  
    _activateAllAutoblocks() {
      for (const [url] of this.autoblock.rules) {
        this._activateAutoblock(url);
      }
    }
  
    _deactivateAutoblock(url) {
      const block = this.autoblock.activeBlocks.get(url);
      if (block) {
        this.autoblock.activeBlocks.delete(url);
        this._notifyAutoblockEnd(block);
      }
    }
  
    _deactivateAllAutoblocks() {
      for (const [url] of this.autoblock.activeBlocks) {
        this._deactivateAutoblock(url);
      }
    }
  
    _scheduleWorkflow(workflow) {
      const checkAndTrigger = () => {
        const now = new Date();
        const currentDay = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][now.getDay()];
        
        if (workflow.days.has(currentDay)) {
          const currentTime = now.toLocaleTimeString('en-US', { hour12: false });
          if (currentTime >= workflow.timeRange.start && currentTime <= workflow.timeRange.end) {
            this._notifyWorkflowTrigger(workflow);
          }
        }
      };
  
      // Check every minute
      const intervalId = setInterval(checkAndTrigger, 60000);
      this.workflows.activeWorkflows.set(workflow.id, intervalId);
    }
  
    _unscheduleWorkflow(workflow) {
      const intervalId = this.workflows.activeWorkflows.get(workflow.id);
      if (intervalId) {
        clearInterval(intervalId);
        this.workflows.activeWorkflows.delete(workflow.id);
      }
    }
  
    // Event System
    on(event, callback) {
      if (this.listeners[event]) {
        this.listeners[event].push(callback);
      }
    }
  
    _notifyBlock(url) {
      this.listeners.onBlock.forEach(callback => callback({ url }));
    }
  
    _notifyUnblock(url) {
      this.listeners.onUnblock.forEach(callback => callback({ url }));
    }
  
    _notifyWorkflowTrigger(workflow) {
      this.listeners.onWorkflowTrigger.forEach(callback => callback(workflow));
    }
  
    _notifyAutoblockStart(block) {
      this.listeners.onAutoblockStart.forEach(callback => callback(block));
    }
  
    _notifyAutoblockEnd(block) {
      this.listeners.onAutoblockEnd.forEach(callback => callback(block));
    }
  
    // Status Methods
    getStatus() {
      return {
        blocklist: {
          enabled: this.blocklist.enabled,
          sites: Array.from(this.blocklist.sites),
          count: this.blocklist.sites.size
        },
        autoblock: {
          enabled: this.autoblock.enabled,
          activeRules: Array.from(this.autoblock.rules.values()),
          activeBlocks: Array.from(this.autoblock.activeBlocks.values())
        },
        workflows: {
          enabled: this.workflows.enabled,
          triggers: Array.from(this.workflows.triggers.values()),
          activeCount: this.workflows.activeWorkflows.size
        }
      };
    }
  }
  
  module.exports = FocusManager;