/* MgTraffic.js
 * Minigame where you select one of four positions to maintain traffic flow.
 */
 
import { VideoOut } from "../VideoOut.js";
import { InputManager } from "../InputManager.js";
import { DataService } from "../DataService.js";

class Player {
  constructor(game, name) {
    this.game = game;
    this.name = name;
    this.x = 0; // 0,1
    this.y = 0; // 0,1
    if (name === "dot") {
      this.tileid = 0x40;
    } else {
      this.tileid = 0x41;
    }
    this.cars = [];
    this.score = 0;
    this.leftLine = (this.game.videoOut.canvas.width >> 1) * 0.333 - 20;
    this.rightLine = (this.game.videoOut.canvas.width >> 1) * 0.666 + 20;
    this.topLine = this.game.videoOut.canvas.height * 0.333 - 20;
    this.bottomLine = this.game.videoOut.canvas.height * 0.666 + 20;
    this.aiPollTime = 800;
    this.aiPollClock = 0;
  }
  
  reset() {
    this.x = 0;
    this.y = 0;
    this.cars = [];
    this.score = 0;
    this.aiPollClock = 0;
  }
  
  // One of (dx,dy) must be 1 or -1, and the other 0.
  addCar(dx, dy) {
    const car = {
      dx, dy,
      stopped: false, // true only while stopped at the intersection
      cleared: false, // true after we reach the intersection and the player is outside our sight
    };
    const vieww = this.game.videoOut.canvas.width >> 1; // as in, this player's half of the screen
    const viewh = this.game.videoOut.canvas.height;
    if (dx < 0) {
      car.x = vieww + 16;
      car.y = (viewh >> 1) - 20;
      car.tileid = 0x42;
      car.xform = VideoOut.XFORM_XREV;
    } else if (dx > 0) {
      car.x = -16;
      car.y = (viewh >> 1) + 20;
      car.tileid = 0x42;
      car.xform = 0;
    } else if (dy < 0) {
      car.x = (vieww >> 1) + 20;
      car.y = viewh + 16;
      car.tileid = 0x43;
      car.xform = VideoOut.XFORM_YREV;
    } else if (dy > 0) {
      car.x = (vieww >> 1) - 20;
      car.y = -16;
      car.tileid = 0x43;
      car.xform = 0;
    } else throw new Error(`car needs a nonzero delta`);
    if (this.carNearby(car)) return;
    this.cars.push(car);
  }
  
  move(dx, dy) {
    this.x += dx;
    this.y += dy;
    if (this.x < 0) this.x = 0;
    else if (this.x > 1) this.x = 1;
    if (this.y < 0) this.y = 0;
    else if (this.y > 1) this.y = 1;
  }
  
  updateAi(interval) {
    if ((this.aiPollClock -= interval) > 0) return;
    this.aiPollClock += this.aiPollTime;
    
    // There's only three moves we can make: horz, vert, or nothing.
    // I tried a sensible strategy and it's no fun because it's way too good no matter what.
    // So instead pick randomly among the three possibilities.
    const noopOdds = 0.500;
    let choice = Math.random();
    if ((choice -= noopOdds) < 0) return;
    if (choice < (1 - noopOdds) * 0.5) return this.move(this.x ? -1 : 1, 0);
    return this.move(0, this.y ? -1 : 1);
  }
  
  update(interval) {
    const carSpeed = 100;
    const margin = 20;
    const left = -margin, top = -margin, right = (this.game.videoOut.canvas.width >> 1) + margin, bottom = this.game.videoOut.canvas.height + margin;
    for (let i=this.cars.length; i-->0; ) {
      const car = this.cars[i];
      
      // Proceed when she says so.
      if (car.stopped) {
        if (car.dx < 0) {
          if (this.y) {
            car.stopped = false;
            car.cleared = true;
          }
        } else if (car.dx > 0) {
          if (!this.y) {
            car.stopped = false;
            car.cleared = true;
          }
        } else if (car.dy < 0) {
          if (!this.x) {
            car.stopped = false;
            car.cleared = true;
          }
        } else if (car.dy > 0) {
          if (this.x) {
            car.stopped = false;
            car.cleared = true;
          }
        }
        continue;
      }
      
      // Stop at the intersection.
      if (!car.cleared) {
        if (car.dx < 0) {
          if (car.x <= this.rightLine) car.stopped = true;
        } else if (car.dx > 0) {
          if (car.x >= this.leftLine) car.stopped = true;
        } else if (car.dy < 0) {
          if (car.y <= this.bottomLine) car.stopped = true;
        } else if (car.dy > 0) {
          if (car.y >= this.topLine) car.stopped = true;
        }
      }
      
      // Rolling.
      const ox = car.x, oy = car.y;
      car.x += (carSpeed * interval * car.dx) / 1000;
      car.y += (carSpeed * interval * car.dy) / 1000;
      if ((car.x < left) || (car.x > right) || (car.y < top) || (car.y > bottom)) {
        this.cars.splice(i, 1);
        this.score++;
      }
      
      // Back up if we're too close to another car.
      if (this.carNearby(car)) {
        car.x = ox;
        car.y = oy;
      }
    }
  }
  
  carNearby(a) {
    const range = 30;
    for (const b of this.cars) {
      if (a === b) continue;
      const dx = Math.abs(a.x - b.x);
      if (dx > range) continue;
      const dy = Math.abs(a.y - b.y);
      if (dy > range) continue;
      return true;
    }
    return false;
  }
}
 
export class MgTraffic {
  static getDependencies() {
    return [VideoOut, InputManager, DataService];
  }
  constructor(videoOut, inputManager, dataService) {
    this.videoOut = videoOut;
    this.inputManager = inputManager;
    this.dataService = dataService;
    
    this.updateDuringSplashes = false;
    this.actorName = "ELEPHANT";
    this.contestName = "A TRAFFIC CONTEST";
    
    this.srcbits = this.dataService.getImage(MgTraffic.IMAGE_NAME);
    this.cbComplete = () => {};
    this.nextTimeEasy = 1000;
    this.nextTimeHard = 200;
    this.playTime = 10000;
    
    this.difficulty = 0.5;
    this.elapsed = 0;
    this.previousInput = 0;
    this.dot = new Player(this, "dot");
    this.ele = new Player(this, "ele");
    this.nextClock = 0;
    this.nextTime = this.nextTimeEasy;
    this.playClock = this.playTime;
  }
  
  setup(difficulty, cbComplete, seed) {
    this.difficulty = difficulty;
    this.cbComplete = cbComplete;
    this.elapsed = 0;
    this.previousInput = 0;
    this.dot.reset();
    this.ele.reset();
    this.nextClock = 0;
    this.nextTime = this.nextTimeEasy * (1 - this.difficulty) + this.nextTimeHard * this.difficulty;
    this.playClock = this.playTime;
  }
  
  start() {
  }
  
  update(interval, inputState) {
    this.elapsed += interval;
    
    if ((this.playClock -= interval) <= 0) {
      if (this.dot.score > this.ele.score) return this.cbComplete(true);
      if (this.dot.score < this.ele.score) return this.cbComplete(false);
      // If it's a tie, let it run for sudden death.
    }
    
    // Make a new car?
    if ((this.nextClock -= interval) <= 0) {
      this.nextClock += this.nextTime;
      let dx = 0, dy = 0;
      switch (Math.floor(Math.random() * 4)) {
        case 0: dx = 1; break;
        case 1: dx = -1; break;
        case 2: dy = 1; break;
        default: dy = -1;
      }
      this.dot.addCar(dx, dy);
      this.ele.addCar(dx, dy);
    }
    
    if (inputState !== this.previousInput) {
      // We only care about new presses in cardinal directions, easy.
      switch (inputState & ~this.previousInput & InputManager.BTNS_DPAD) {
        case InputManager.BTN_LEFT: this.dot.move(-1, 0); break;
        case InputManager.BTN_RIGHT: this.dot.move(1, 0); break;
        case InputManager.BTN_UP: this.dot.move(0, -1); break;
        case InputManager.BTN_DOWN: this.dot.move(0, 1); break;
      }
      this.previousInput = inputState;
    }
    
    this.ele.updateAi(interval);
    
    this.dot.update(interval);
    this.ele.update(interval);
  }
  
  render() {
    const halfw = this.videoOut.canvas.width >> 1;
    this.videoOut.fillRect(0, 0, this.videoOut.canvas.width, this.videoOut.canvas.height, MgTraffic.BGCOLOR);
    this.renderForPlayer(0, 0, halfw, this.videoOut.canvas.height, this.dot);
    this.renderForPlayer(halfw, 0, halfw, this.videoOut.canvas.height, this.ele);
    this.videoOut.fillRect(halfw, 0, 1, this.videoOut.canvas.height, "#000");
    if (this.playClock >= 0) {
      this.videoOut.renderText(halfw - 6, 10, "#fff", Math.floor(this.playClock / 1000));
    } else {
      this.videoOut.renderText(halfw - 60, 10, "#fff", "SUDDEN DEATH!");
    }
  }
  
  renderForPlayer(dstx, dsty, dstw, dsth, player) {
    this.videoOut.context.save();
    this.videoOut.context.beginPath();
    this.videoOut.context.rect(dstx, dsty, dstw, dsth);
    this.videoOut.context.clip();
  
    // Determine where the box goes. We could do this at init, and certainly would if i cared at all.
    const minor = Math.min(dstw, dsth);
    const boxw = Math.floor(minor / 3);
    const boxh = boxw;
    const boxx = dstx + (dstw >> 1) - (boxw >> 1);
    const boxy = dsty + (dsth >> 1) - (boxw >> 1);
    
    // Street edges.
    this.videoOut.context.beginPath();
    this.videoOut.context.moveTo(dstx, boxy);
    this.videoOut.context.lineTo(boxx, boxy);
    this.videoOut.context.lineTo(boxx, 0);
    this.videoOut.context.moveTo(boxx + boxw, 0);
    this.videoOut.context.lineTo(boxx + boxw, boxy);
    this.videoOut.context.lineTo(dstx + dstw, boxy);
    this.videoOut.context.moveTo(dstx + dstw, boxy + boxh);
    this.videoOut.context.lineTo(boxx + boxw, boxy + boxh);
    this.videoOut.context.lineTo(boxx + boxw, dsty + dsth);
    this.videoOut.context.moveTo(boxx, dsty + dsth);
    this.videoOut.context.lineTo(boxx, boxy + boxh);
    this.videoOut.context.lineTo(dstx, boxy + boxh);
    this.videoOut.context.lineWidth = 2;
    this.videoOut.context.strokeStyle = "#fff";
    this.videoOut.context.stroke();
    
    // Cars.
    for (const car of player.cars) {
      this.videoOut.blitTile(dstx + Math.round(car.x), dsty + Math.round(car.y), this.srcbits, car.tileid, car.xform);
    }
    
    // Player.
    const herox = boxx + Math.round(((player.x ? 3 : 1) * boxw) / 4);
    const heroy = boxy + Math.round(((player.y ? 3 : 1) * boxh) / 4);
    this.videoOut.blitTile(herox, heroy, this.srcbits, player.tileid, 0);
    
    // Score.
    if (dstx) {
      this.videoOut.renderText(dstx + 10, dsty + dsth - 40, "#fff", player.score);
    } else {
      this.videoOut.renderText(dstw - 30, dsty + dsth - 40, "#fff", player.score);
    }
    
    this.videoOut.context.restore();
  }
}

MgTraffic.IMAGE_NAME = "./img/tiles.png";

MgTraffic.BGCOLOR = "#202830";

MgTraffic.IMG = {
};
