/* Clock.js
 */
 
export class Clock {
  static getDependencies() {
    return [Window];
  }
  constructor(window) {
    this.window = window;
    
    this.minimumInterval = 5;
    this.maximumInterval = 40;
    
    this.startTimeMs = 0;
    this.recentTimeMs = 0;
    this.elapsedMs = 0;
    this.frameCount = 0;
    this.faultCount = 0;
  }
  
  start() {
    this.startTimeMs = this.window.Date.now();
    this.recentTimeMs = this.startTimeMs;
    this.elapsedMs = 0;
    this.frameCount = 0;
    this.faultCount = 0;
  }
  
  stop() {
    const elapsedRealMs = this.window.Date.now() - this.startTimeMs;
    this.window.console.log(`Clock.stop. real=${elapsedRealMs}ms reported=${this.elapsedMs} framec=${this.frameCount} faultc=${this.faultCount}`);
  }
  
  update() {
    const now = this.window.Date.now();
    let interval = now - this.recentTimeMs;
    if (interval < this.minimumInterval) {
      interval = this.minimumInterval;
      this.faultCount++;
    } else if (interval > this.maximumInterval) {
      interval = this.maximumInterval;
      this.faultCount++;
    }
    this.elapsedMs += interval;
    this.recentTimeMs = now;
    this.frameCount++;
    return interval;
  }
}

Clock.singleton = true;
