/* MgFlapping.js
 * Minigame where you flap wings to move a sailboat.
 */
 
import { VideoOut } from "../VideoOut.js";
import { InputManager } from "../InputManager.js";
import { DataService } from "../DataService.js";
 
export class MgFlapping {
  static getDependencies() {
    return [VideoOut, InputManager, DataService];
  }
  constructor(videoOut, inputManager, dataService) {
    this.videoOut = videoOut;
    this.inputManager = inputManager;
    this.dataService = dataService;
    
    this.updateDuringSplashes = false;
    this.actorName = "BIRD";
    this.contestName = "A FLAPPING CONTEST";
    
    this.srcbits = this.dataService.getImage("./img/mg01.png");
    this.landRight = this.videoOut.canvas.width - MgFlapping.IMAGE_BOUNDS.land[2];
    this.landTop = this.videoOut.canvas.height - MgFlapping.IMAGE_BOUNDS.land[3];
    this.seaTop = this.videoOut.canvas.height - MgFlapping.IMAGE_BOUNDS.sea[3];
    this.dotLeft = 35;
    this.dotTop = 145;
    this.birdLeft = 400;
    this.birdTop = 161;
    this.boatTop = 165;
    this.leftVictoryX = 170;
    this.rightVictoryX = this.videoOut.canvas.width - this.leftVictoryX;
    this.dotFlapBlackoutTime = 150;
    this.dotUnflapBlackoutTime = 50;
    this.birdFlapBlackoutTimeMin = 150;
    this.birdFlapBlackoutTimeMax = 500;
    this.birdUnflapBlackoutTimeMin = 150;
    this.birdUnflapBlackoutTimeMax = 500;
    this.flapWeight = 0.125;
    this.sailDecay = 0.1; // points per second
    this.boatSpeedMax = 40; // pixels per second
    this.cbComplete = () => {};
    
    this.difficulty = 0.5;
    this.elapsed = 0;
    this.boatX = (this.videoOut.canvas.width >> 1);
    this.dotState = false; // true if arms forward
    this.dotClock = 0; // counts down while a state change is forbidden
    this.birdState = false;
    this.birdClock = 0;
    this.sailState = 0; // -1..1
    this.birdFlapBlackoutTime = (this.birdFlapBlackoutTimeMin + this.birdFlapBlackoutTimeMax) >> 1;
    this.birdUnflapBlackoutTime = (this.birdUnflapBlackoutTimeMin + this.birdUnflapBlackoutTimeMax) >> 1;
  }
  
  setup(difficulty, cbComplete) {
    this.difficulty = difficulty;
    this.cbComplete = cbComplete;
    this.elapsed = 0;
    this.boatX = (this.videoOut.canvas.width >> 1);
    this.dotState = false;
    this.dotClock = 0;
    this.birdState = false;
    this.birdClock = 0;
    this.sailState = 0;
    // Note that minimum difficulty is maximum blackout time, and vice versa:
    this.birdFlapBlackoutTime = this.birdFlapBlackoutTimeMax + Math.round(difficulty * (this.birdFlapBlackoutTimeMin - this.birdFlapBlackoutTimeMax));
    this.birdUnflapBlackoutTime = this.birdUnflapBlackoutTimeMax + Math.round(difficulty * (this.birdUnflapBlackoutTimeMin - this.birdUnflapBlackoutTimeMax));
  }
  
  /* Nothing for us to do at start(). We're ready to go after setup().
   * This is normal for minigames that don't interfere with the splashes.
   * But implementing start() is required either way.
   */
  start() {
  }
  
  update(interval, inputState) {
    this.elapsed += interval;
    
    if (this.dotClock) {
      if ((this.dotClock -= interval) <= 0) {
        this.dotClock = 0;
      }
    } else if (this.dotState && !(inputState & InputManager.BTN_A)) {
      this.dotState = false;
      this.dotClock = this.dotUnflapBlackoutTime;
    } else if (!this.dotState && (inputState & InputManager.BTN_A)) {
      this.dotState = true;
      this.dotClock = this.dotFlapBlackoutTime;
      this.flap(1);
    }
    
    if (this.birdClock) {
      if ((this.birdClock -= interval) <= 0) {
        this.birdClock = 0;
      }
    } else if (this.birdState) {
      this.birdState = false;
      this.birdClock = this.birdUnflapBlackoutTime;
    } else {
      this.birdState = true;
      this.birdClock = this.birdFlapBlackoutTime;
      this.flap(-1);
    }
    
    if (this.sailState) {
      this.boatX += (this.boatSpeedMax * interval * this.sailState) / 1000;
      if (this.boatX < this.leftVictoryX) return this.win(-1);
      else if (this.boatX > this.rightVictoryX) return this.win(1);
    }
    
    if (this.sailState < 0) {
      if ((this.sailState += (this.sailDecay * interval) / 1000) >= 0) {
        this.sailState = 0;
      }
    } else if (this.sailState > 0) {
      if ((this.sailState -= (this.sailDecay * interval) / 1000) <= 0) {
        this.sailState = 0;
      }
    }
  }
  
  win(d) {
    this.cbComplete(d > 0);
  }
  
  flap(d) {
    this.sailState += d * this.flapWeight;
    if (this.sailState < -1) this.sailState = -1;
    else if (this.sailState > 1) this.sailState = 1;
  }
  
  render() {
    this.videoOut.fillRect(0, 0, this.videoOut.canvas.width, this.videoOut.canvas.height, MgFlapping.BGCOLOR);
    
    const boatTop = this.boatTop + Math.round(Math.sin((this.elapsed * Math.PI * 0.5) / 1000) * 2);
    const boatLeft = Math.round(this.boatX) - (MgFlapping.IMAGE_BOUNDS.boat[2] >> 1);
    this.videoOut.blitDecal(boatLeft, boatTop, this.srcbits, MgFlapping.IMAGE_BOUNDS.boat, 0);
    if (this.sailState < -0.600) {
      const dstx = Math.round(this.boatX) - MgFlapping.IMAGE_BOUNDS.sailHeavy[2] - 3;
      this.videoOut.blitDecal(dstx, boatTop + 5, this.srcbits, MgFlapping.IMAGE_BOUNDS.sailHeavy, VideoOut.XFORM_XREV);
    } else if (this.sailState < -0.150) {
      const dstx = Math.round(this.boatX) - MgFlapping.IMAGE_BOUNDS.sailLight[2] - 3;
      this.videoOut.blitDecal(dstx, boatTop + 5, this.srcbits, MgFlapping.IMAGE_BOUNDS.sailLight, VideoOut.XFORM_XREV);
    } else if (this.sailState < 0.150) {
      const dstx = Math.round(this.boatX) - (MgFlapping.IMAGE_BOUNDS.sailNeutral[2] >> 1);
      this.videoOut.blitDecal(dstx, boatTop + 5, this.srcbits, MgFlapping.IMAGE_BOUNDS.sailNeutral, 0);
    } else if (this.sailState < 0.600) {
      const dstx = Math.round(this.boatX) + 3;
      this.videoOut.blitDecal(dstx, boatTop + 5, this.srcbits, MgFlapping.IMAGE_BOUNDS.sailLight, 0);
    } else {
      const dstx = Math.round(this.boatX) + 3;
      this.videoOut.blitDecal(dstx, boatTop + 5, this.srcbits, MgFlapping.IMAGE_BOUNDS.sailHeavy, 0);
    }
    
    const seaOffset = Math.round(Math.sin((this.elapsed * Math.PI) / 1000) * 6);
    this.videoOut.blitDecal(seaOffset, this.seaTop, this.srcbits, MgFlapping.IMAGE_BOUNDS.sea, 0);
    
    this.videoOut.blitDecal(0, this.landTop, this.srcbits, MgFlapping.IMAGE_BOUNDS.land, 0);
    this.videoOut.blitDecal(this.landRight, this.landTop, this.srcbits, MgFlapping.IMAGE_BOUNDS.land, VideoOut.XFORM_XREV);
    
    if (this.dotState) {
      this.videoOut.blitDecal(this.dotLeft + 9, this.dotTop, this.srcbits, MgFlapping.IMAGE_BOUNDS.dotClosed, 0);
    } else {
      this.videoOut.blitDecal(this.dotLeft, this.dotTop, this.srcbits, MgFlapping.IMAGE_BOUNDS.dotOpen, 0);
    }
    if (this.birdState) {
      this.videoOut.blitDecal(this.birdLeft - 10, this.birdTop, this.srcbits, MgFlapping.IMAGE_BOUNDS.birdClosed, 0);
    } else {
      this.videoOut.blitDecal(this.birdLeft, this.birdTop, this.srcbits, MgFlapping.IMAGE_BOUNDS.birdOpen, 0);
    }
  }
}

MgFlapping.IMAGE_NAME = "./img/mg01.png";

MgFlapping.BGCOLOR = "#40aeed";

MgFlapping.IMAGE_BOUNDS = {
  land: [0,0,134,63],
  sea: [0,64,512,53],
  dotOpen: [1,118,80,92],
  dotClosed: [82,118,87,92],
  birdOpen: [170,118,82,76],
  birdClosed: [253,118,59,76],
  boat: [313,118,119,93],
  sailNeutral: [135,1,26,55],
  sailLight: [162,1,25,57],
  sailHeavy: [188,1,54,57],
};
