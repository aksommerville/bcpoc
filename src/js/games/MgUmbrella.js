/* MgUmbrella.js
 * Minigame where you deploy or stow an umbrella according to the weather.
 */
 
import { VideoOut } from "../VideoOut.js";
import { InputManager } from "../InputManager.js";
import { DataService } from "../DataService.js";

class Player {
  constructor(name, vw, vh, groundY, body, stow, deploy, extraDY) {
    this.name = name; // internal id
    this.vh = vh;
    this.body = body; // IMAGE_BOUNDS with focus
    this.stow = stow; // ''
    this.deploy = deploy; // ''
    this.score = 0; // 0..1
    this.deployed = false;
    this.delay = 0; // for cat only; managed at top layer
    
    if (name === "dot") {
      this.midX = Math.floor((vw * 2) / 7);
      this.phyLeft = this.midX - 35;
      this.phyRight = this.midX + 35;
      this.meterLeft = (vw >> 1) - 20;
    } else {
      this.midX = Math.floor((vw * 5) / 7);
      this.phyLeft = this.midX - 20;
      this.phyRight = this.midX + 20;
      this.meterLeft = (vw >> 1) + 10;
    }
    this.meterW = 15;
    this.meterTop = (vh >> 1);
    this.meterH = (vh >> 1) - 10;
    this.bodyLeft = this.midX - (this.body[2] >> 1);
    this.bodyTop = groundY - this.body[3] + extraDY;
    this.stowLeft = this.bodyLeft + this.body[4] - this.stow[4];
    this.stowTop = this.bodyTop + this.body[5] - this.stow[5];
    this.deployLeft = this.bodyLeft + this.body[4] - this.deploy[4];
    this.deployRight = this.deployLeft + this.deploy[2];
    this.deployTop = this.bodyTop + this.body[5] - this.deploy[5];
  }
  
  reset() {
    this.score = 0;
    this.deployed = false;
  }
  
  // Remove from (drops) anything that collides, and call cb(drop, damage) after removing.
  catchDrops(drops, cb) {
    if (this.deployed) {
      for (let i=drops.length; i-->0; ) {
        const drop = drops[i];
        if (drop.x < this.deployLeft) continue;
        if (drop.x > this.deployRight) continue;
        if (drop.top < this.deployTop) continue;
        drops.splice(i, 1);
        cb(drop, false);
      }
    } else {
      for (let i=drops.length; i-->0; ) {
        const drop = drops[i];
        if (drop.x < this.phyLeft) continue;
        if (drop.x > this.phyRight) continue;
        if (drop.top < this.bodyTop) continue;
        drops.splice(i, 1);
        cb(drop, true);
      }
    }
  }
  
  addScore(d) {
    this.score = Math.min(1, Math.max(0, this.score + d));
  }
  
  smellDanger(drops) {
    const left = this.phyLeft - 10; // -10/+10: Cat is not perfect at estimating distances, and errs on the side of caution.
    const right = this.phyRight + 10;
    const top = this.bodyTop - this.vh / 4;
    for (const drop of drops) {
      if (drop.x < left) continue;
      if (drop.x > right) continue;
      if (drop.y < top) continue;
      return true;
    }
    return false;
  }
}

class Drop {
  constructor(x) {
    this.x = x;
    this.decal = MgUmbrella.IMAGE_BOUNDS.drop1;
    this.top = -this.decal[3]; // !! fp
    this.left = this.x - (this.decal[2] >> 1);
  }
}

class Splash {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.left = x - (MgUmbrella.IMAGE_BOUNDS.splash[2] >> 1);
    this.top = y - (MgUmbrella.IMAGE_BOUNDS.splash[3] >> 1);
    this.ttl = 300;
  }
}
 
export class MgUmbrella {
  static getDependencies() {
    return [VideoOut, InputManager, DataService];
  }
  constructor(videoOut, inputManager, dataService) {
    this.videoOut = videoOut;
    this.inputManager = inputManager;
    this.dataService = dataService;
    
    this.updateDuringSplashes = false;
    this.actorName = "KITTEN";
    this.contestName = "AN UMBRELLA CONTEST";
    
    this.srcbits = this.dataService.getImage(MgUmbrella.IMAGE_NAME);
    this.cbComplete = () => {};
    this.sunLeft = (this.videoOut.canvas.width >> 1) - (MgUmbrella.IMAGE_BOUNDS.sun[2] >> 1);
    this.sunTop = 20;
    this.groundY = this.videoOut.canvas.height - 40;
    this.dropEndY = this.groundY - MgUmbrella.IMAGE_BOUNDS.drop1[3];
    this.dropInterval = 40; // ms
    this.dropSpeed = 200; // px/sec
    this.shinePeriodLow = 500; // ms
    this.shinePeriodHigh = 2000; // ms
    this.dropPositionM = 2147483647; // Lehmer RNG
    this.dropPositionA = 48271;
    this.dropOnTheHeadPenalty = -0.200;
    this.blockedDropBonusDot = 0.050;
    this.blockedDropBonusCatLow = 0.050;
    this.blockedDropBonusCatHigh = 0.120;
    this.scoreDecay = -0.200; // unit/sec
    this.totalDuration = 5999; // ms
    this.catDelayLow = 50; // ms; minimum duration before cat changes state
    this.catDelayHigh = 500;
    
    this.difficulty = 0.5;
    this.elapsed = 0;
    this.dot = new Player(
      "dot",
      this.videoOut.canvas.width, this.videoOut.canvas.height,
      this.groundY,
      MgUmbrella.IMAGE_BOUNDS.dotBody,
      MgUmbrella.IMAGE_BOUNDS.dotStow,
      MgUmbrella.IMAGE_BOUNDS.dotDeploy,
      5
    );
    this.cat = new Player(
      "cat",
      this.videoOut.canvas.width, this.videoOut.canvas.height,
      this.groundY,
      MgUmbrella.IMAGE_BOUNDS.catBody,
      MgUmbrella.IMAGE_BOUNDS.catStow,
      MgUmbrella.IMAGE_BOUNDS.catDeploy,
      10
    );
    this.drops = []; // Drop
    this.splashes = []; // Splash
    this.dropPosition = this.videoOut.canvas.width >> 1;
    this.dropClock = 0;
    this.shinePeriod = this.shinePeriodLow;
    this.shineClock = 0;
    this.shining = false;
    this.totalClock = this.totalDuration;
    this.catDelay = this.catDelayLow;
    this.blockedDropBonusCat = this.droppedBlockBonusCatLow;
  }
  
  setup(difficulty, cbComplete, seed) {
    this.difficulty = difficulty;
    this.cbComplete = cbComplete;
    this.elapsed = 0;
    this.dot.reset();
    this.cat.reset();
    this.drops = [];
    this.splashes = [];
    this.dropClock = 0;
    this.shinePeriod = this.shinePeriodHigh * (1 - difficulty) + this.shinePeriodLow * difficulty;
    this.shineClock = this.shinePeriod;
    this.shining = true;
    this.totalClock = this.totalDuration;
    this.catDelay = this.catDelayLow * difficulty + this.catDelayHigh * (1 - difficulty);
    this.dropPosition = seed % this.videoOut.canvas.width;
    this.blockedDropBonusCat = this.blockedDropBonusCatLow * (1 - difficulty) + this.blockedDropBonusCatHigh * difficulty;
  }
  
  start() {
  }
  
  update(interval, inputState) {
    this.elapsed += interval;
    
    if ((this.totalClock -= interval) <= 0) {
      this.cbComplete(this.dot.score > this.cat.score); // must be > not >=; in the zero-zero case you lose
      return;
    }
    
    if ((this.shineClock -= interval) <= 0) {
      this.shineClock += this.shinePeriod;
      this.shining = !this.shining;
    }
    
    for (let i=this.splashes.length; i-->0; ) {
      const splash = this.splashes[i];
      if ((splash.ttl -= interval) <= 0) {
        this.splashes.splice(i, 1);
      }
    }
    
    for (let i=this.drops.length; i-->0; ) {
      const drop = this.drops[i];
      drop.top += (this.dropSpeed * interval) / 1000;
      if (drop.top >= this.dropEndY) {
        this.createSplash(drop.x, this.groundY);
        this.drops.splice(i, 1);
      }
    }
    
    if ((this.dropClock -= interval) <= 0) {
      this.dropClock += this.dropInterval;
      if (!this.shining) {
        this.dropPosition = (this.dropPositionA * this.dropPosition) % this.dropPositionM;
        this.createDrop(this.dropPosition % this.videoOut.canvas.width);
      }
    }
    
    this.dot.deployed = inputState & InputManager.BTN_A;
    if (this.dot.deployed) {
      this.dot.addScore((this.scoreDecay * interval) / 1000);
    }
    this.dot.catchDrops(this.drops, (drop, damage) => {
      this.createSplash(drop.x, Math.round(drop.top));
      if (damage) this.dot.addScore(this.dropOnTheHeadPenalty);
      else this.dot.addScore(this.blockedDropBonusDot);
    });
    
    if (this.cat.delay) {
      if ((this.cat.delay -= interval) <= 0) {
        this.cat.delay = 0;
      }
    } else if (this.cat.smellDanger(this.drops)) {
      if (!this.cat.deployed) {
        this.cat.deployed = true;
        this.cat.delay = this.catDelay;
      }
    } else {
      if (this.cat.deployed) {
        this.cat.deployed = false;
        this.cat.delay = this.catDelay;
      }
    }
    if (this.cat.deployed) {
      this.cat.addScore((this.scoreDecay * interval) / 1000);
    }
    this.cat.catchDrops(this.drops, (drop, damage) => {
      this.createSplash(drop.x, Math.round(drop.top));
      if (damage) this.cat.addScore(this.dropOnTheHeadPenalty);
      else this.cat.addScore(this.blockedDropBonusCat);
    });
  }
  
  createDrop(x) {
    const drop = new Drop(x);
    this.drops.push(drop);
  }
  
  createSplash(x, y) {
    const splash = new Splash(x, y);
    this.splashes.push(splash);
  }
  
  render() {
    this.videoOut.fillRect(0, 0, this.videoOut.canvas.width, this.videoOut.canvas.height, this.shining ? MgUmbrella.SUNNY_COLOR : MgUmbrella.RAINY_COLOR);
    this.videoOut.fillRect(0, this.groundY, this.videoOut.canvas.width, this.videoOut.canvas.height, MgUmbrella.GROUND_COLOR);
    
    if (this.shining) {
      this.videoOut.blitDecal(this.sunLeft, this.sunTop, this.srcbits, MgUmbrella.IMAGE_BOUNDS.sun, 0);
    }
    
    this.videoOut.blitDecal(this.dot.bodyLeft, this.dot.bodyTop, this.srcbits, this.dot.body, 0);
    if (this.dot.deployed) {
      this.videoOut.blitDecal(this.dot.deployLeft, this.dot.deployTop, this.srcbits, this.dot.deploy, 0);
    } else {
      this.videoOut.blitDecal(this.dot.stowLeft, this.dot.stowTop, this.srcbits, this.dot.stow, 0);
    }
    
    this.videoOut.blitDecal(this.cat.bodyLeft, this.cat.bodyTop, this.srcbits, this.cat.body, 0);
    if (this.cat.deployed) {
      this.videoOut.blitDecal(this.cat.deployLeft, this.cat.deployTop, this.srcbits, this.cat.deploy, 0);
    } else {
      this.videoOut.blitDecal(this.cat.stowLeft, this.cat.stowTop, this.srcbits, this.cat.stow, 0);
    }
    
    for (const drop of this.drops) {
      this.videoOut.blitDecal(drop.left, Math.round(drop.top), this.srcbits, drop.decal, 0);
    }
    for (const splash of this.splashes) {
      this.videoOut.blitDecal(splash.left, splash.top, this.srcbits, MgUmbrella.IMAGE_BOUNDS.splash, 0);
    }
    
    let badH = Math.floor((1 - this.dot.score) * this.dot.meterH);
    this.videoOut.fillRect(this.dot.meterLeft, this.dot.meterTop, this.dot.meterW, this.dot.meterH, MgUmbrella.METER_BAD_COLOR);
    this.videoOut.fillRect(this.dot.meterLeft, this.dot.meterTop + badH, this.dot.meterW, this.dot.meterH - badH, MgUmbrella.METER_GOOD_COLOR);
    badH = Math.floor((1 - this.cat.score) * this.cat.meterH);
    this.videoOut.fillRect(this.cat.meterLeft, this.cat.meterTop, this.cat.meterW, this.cat.meterH, MgUmbrella.METER_BAD_COLOR);
    this.videoOut.fillRect(this.cat.meterLeft, this.cat.meterTop + badH, this.cat.meterW, this.cat.meterH - badH, MgUmbrella.METER_GOOD_COLOR);
    
    if (this.totalClock > 0) {
      this.videoOut.renderText((this.videoOut.canvas.width >> 1) - 4, 5, "#fff", Math.floor(this.totalClock / 1000));
    }
  }
}

MgUmbrella.IMAGE_NAME = "./img/mg03.png";

MgUmbrella.RAINY_COLOR = "#8090a0";
MgUmbrella.SUNNY_COLOR = "#a0c0ff";
MgUmbrella.GROUND_COLOR = "#206030";
MgUmbrella.METER_BAD_COLOR = "#f00";
MgUmbrella.METER_GOOD_COLOR = "#0a3";

/* dot and cat images have an extra focus point at [4,5].
 * These are relative to the decal's origin.
 */
MgUmbrella.IMAGE_BOUNDS = {
  dotBody: [1, 1, 98, 157, 80, 18],
  dotDeploy: [100, 1, 139, 125, 88, 39],
  dotStow: [240, 1, 51, 116, 5, 21],
  catBody: [292, 1, 76, 117, 56, 37],
  catDeploy: [369, 1, 91, 78, 66, 53],
  catStow: [461, 1, 43, 80, 4, 53],
  drop1: [100, 127, 15, 31], // drops all same size
  drop2: [116, 127, 15, 31],
  drop3: [132, 127, 15, 31],
  splash: [240, 118, 51, 16],
  sun: [148, 127, 91, 91],
};
