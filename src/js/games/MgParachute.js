/* MgParachute.js
 * Minigame where you jump out of a helicopter.
 */
 
import { VideoOut } from "../VideoOut.js";
import { InputManager } from "../InputManager.js";
import { DataService } from "../DataService.js";
 
export class MgParachute {
  static getDependencies() {
    return [VideoOut, InputManager, DataService];
  }
  constructor(videoOut, inputManager, dataService) {
    this.videoOut = videoOut;
    this.inputManager = inputManager;
    this.dataService = dataService;
    
    this.updateDuringSplashes = false;
    this.actorName = "CHICKEN";
    this.contestName = "A PARACHUTE CONTEST";
    
    this.srcbits = this.dataService.getImage(MgParachute.IMAGE_NAME);
    this.cbComplete = () => {};
    const midX = this.videoOut.canvas.width >> 1;
    this.chopperLeft = midX - (MgParachute.IMAGE_BOUNDS.chopper[2] >> 1);
    this.chopperTop = 20;
    this.bladeLeft = midX - (MgParachute.IMAGE_BOUNDS.blade1[2] >> 1);
    this.bladeTop = this.chopperTop - (MgParachute.IMAGE_BOUNDS.blade1[3] >> 1);
    this.bladeFrameTime = 100;
    this.groundY = this.videoOut.canvas.height - 10;
    const dotMidX = Math.floor((this.videoOut.canvas.width * 1) / 5);
    const chickenMidX = Math.floor((this.videoOut.canvas.width * 4) / 5);
    this.dotFallLeft = dotMidX - (MgParachute.IMAGE_BOUNDS.dotFall[2] >> 1);
    this.dotStandLeft = dotMidX - (MgParachute.IMAGE_BOUNDS.dotStand[2] >> 1);
    this.dotFallTop = this.chopperTop + 20;
    this.dotDeployAdjustY = -((MgParachute.IMAGE_BOUNDS.dotStand[3] - MgParachute.IMAGE_BOUNDS.dotFall[3]) >> 1);
    this.dotChuteOpenLeft = dotMidX - (MgParachute.IMAGE_BOUNDS.chuteOpen[2] >> 1);
    this.dotChuteOpenOffset = (MgParachute.IMAGE_BOUNDS.dotStand[3] >> 1) - MgParachute.IMAGE_BOUNDS.chuteOpen[3];
    this.dotChuteDefunctLeft = dotMidX - (MgParachute.IMAGE_BOUNDS.chuteDefunct[2] >> 1);
    this.dotChuteDefunctTop = this.groundY - MgParachute.IMAGE_BOUNDS.chuteDefunct[3] + 5;
    this.dotTopFatal = this.groundY - MgParachute.IMAGE_BOUNDS.dotFall[3];
    this.dotTopLand = this.groundY - MgParachute.IMAGE_BOUNDS.dotStand[3] + 10;
    this.chickenFallLeft = chickenMidX - (MgParachute.IMAGE_BOUNDS.chickenFall[2] >> 1);
    this.chickenStandLeft = chickenMidX - (MgParachute.IMAGE_BOUNDS.chickenStand[2] >> 1);
    this.chickenFallTop = this.chopperTop + 40;
    this.chickenDeployAdjustY = 0;
    this.chickenChuteOpenLeft = chickenMidX - (MgParachute.IMAGE_BOUNDS.chuteOpen[2] >> 1);
    this.chickenChuteOpenOffset = (MgParachute.IMAGE_BOUNDS.chickenStand[3] >> 1) - MgParachute.IMAGE_BOUNDS.chuteOpen[3];
    this.chickenChuteDefunctLeft = chickenMidX - (MgParachute.IMAGE_BOUNDS.chuteDefunct[2] >> 1);
    this.chickenChuteDefunctTop = this.groundY - MgParachute.IMAGE_BOUNDS.chuteDefunct[3] + 5;
    this.chickenTopFatal = this.groundY - MgParachute.IMAGE_BOUNDS.chickenFall[3];
    this.chickenTopLand = this.groundY - MgParachute.IMAGE_BOUNDS.chickenStand[3] + 5;
    this.chickenDeployYEasy = this.chickenFallTop + ((this.chickenTopFatal - this.chickenFallTop) * 0.300);
    this.chickenDeployYHard = this.chickenFallTop + ((this.chickenTopFatal - this.chickenFallTop) * 0.800);
    this.crashLeft = dotMidX - (MgParachute.IMAGE_BOUNDS.explosion[2] >> 1);
    this.crashRight = chickenMidX - (MgParachute.IMAGE_BOUNDS.explosion[2] >> 1);
    this.crashTop = this.videoOut.canvas.height - MgParachute.IMAGE_BOUNDS.explosion[3];
    this.starLeft = dotMidX - (MgParachute.IMAGE_BOUNDS.star[2] >> 1);
    this.starRight = chickenMidX - (MgParachute.IMAGE_BOUNDS.star[2] >> 1);
    this.starTop = this.videoOut.canvas.height >> 1;
    this.fallRateOpen = 30; // pixel/sec; fp
    this.fallRateStart = 20; // pixel/sec; fp
    this.accelerationLow = 50; // pixel/sec**2; fp
    this.accelerationHigh = 250; // pixel/sec**2; fp
    this.waitTime = 500; // ms
    this.farewellTime = 1500; // ms
    
    this.difficulty = 0.5;
    this.elapsed = 0;
    this.bladeFrame = 1; // 1..3
    this.bladeFrameClock = 0;
    this.dotTop = this.dotFallTop; // !! fp
    this.chickenTop = this.chickenFallTop; // !! fp
    this.dotState = "wait"; // "wait","fall","deploy","land","crash","gone"
    this.chickenState = "wait"; // ''
    this.fallRate = this.fallRateStart; // fp
    this.acceleration = this.accelerationLow; // fp
    this.waitClock = this.waitTime;
    this.dotLandTime = 999999999;
    this.chickenLandTime = 999999999;
    this.farewellClock = 0;
    this.winner = "retry"; // "retry","dot","chicken"
    this.chickenDeployY = this.chickenDeployYHard;
  }
  
  setup(difficulty, cbComplete) {
    this.difficulty = difficulty;
    this.cbComplete = cbComplete;
    this.elapsed = 0;
    this.bladeFrame = 1;
    this.bladeFrameClock = 0;
    this.dotTop = this.dotFallTop;
    this.chickenTop = this.chickenFallTop;
    this.dotState = "wait";
    this.chickenState = "wait";
    this.fallRate = this.fallRateStart;
    this.acceleration = this.accelerationLow * (1 - difficulty) + this.accelerationHigh * difficulty;
    this.waitClock = this.waitTime;
    this.dotLandTime = 999999999;
    this.chickenLandTime = 999999999;
    this.farewellClock = 0;
    this.winner = "retry";
    this.chickenDeployY = this.chickenDeployYEasy * (1 - difficulty) + this.chickenDeployYHard * difficulty;
  }
  
  start() {
  }
  
  update(interval, inputState) {
    this.elapsed += interval;
    
    // Animate blades no matter what. It would be devastating if they were to stop spinning.
    if ((this.bladeFrameClock -= interval) <= 0) {
      this.bladeFrameClock += this.bladeFrameTime;
      if (++(this.bladeFrame) > 3) this.bladeFrame = 1;
    }
    
    // If we're waiting, that's all.
    if (this.waitClock > 0) {
      if ((this.waitClock -= interval) <= 0) {
        this.waitClock = 0;
        this.dotState = "fall";
        this.chickenState = "fall";
      }
      return;
    }
    
    // Farewell?
    if (this.farewellClock) {
      if ((this.farewellClock -= interval) <= 0) {
        switch (this.winner) {
          case "dot": this.cbComplete(true); break;
          case "chicken": this.cbComplete(false); break;
          // It's not generally legal to call setup() again, but ok for us since we know start() is noop and we don't track during splashes.
          default: this.setup(this.difficulty, this.cbComplete);
        }
      }
      return;
    }
    
    // Determine velocity for any object in freefall.
    this.fallRate += (this.acceleration * interval) / 1000;
    const freeFallDY = (this.fallRate * interval) / 1000;
    
    switch (this.dotState) {
      case "fall": {
          if (inputState & InputManager.BTN_A) {
            this.dotState = "deploy";
            this.dotTop += this.dotDeployAdjustY;
          } else {
            this.dotTop += freeFallDY;
            if (this.dotTop >= this.dotTopFatal) {
              this.dotState = "crash";
            }
          }
        } break;
      case "deploy": {
          this.dotTop += (this.fallRateOpen * interval) / 1000;
          if (this.dotTop >= this.dotTopLand) {
            this.dotTop = this.dotTopLand;
            this.dotState = "land";
            this.dotLandTime = this.elapsed;
          }
        } break;
    }
    
    switch (this.chickenState) {
      case "fall": {
          if (this.chickenTop >= this.chickenDeployY) {
            this.chickenState = "deploy";
            this.chickenTop += this.chickenDeployAdjustY;
          } else {
            this.chickenTop += freeFallDY;
            if (this.chickenTop >= this.chickenTopFatal) {
              this.chickenState = "crash";
            }
          }
        } break;
      case "deploy": {
          this.chickenTop += (this.fallRateOpen * interval) / 1000;
          if (this.chickenTop >= this.chickenTopLand) {
            this.chickenTop = this.chickenTopLand;
            this.chickenState = "land";
            this.chickenLandTime = this.elapsed;
          }
        } break;
    }
    
    if (this.dotState === "land") {
      if (this.chickenState === "land") { // whoever landed first wins. dot is taller, so she can actually deploy after the chicken and win
        this.winner = (this.dotLandTime <= this.chickenLandTime) ? "dot" : "chicken";
        this.farewellClock = this.farewellTime;
      } else if (this.chickenState === "crash") {
        this.winner = "dot";
        this.farewellClock = this.farewellTime;
      }
    } else if (this.dotState === "crash") {
      if (this.chickenState === "land") {
        this.winner = "chicken";
        this.farewellClock = this.farewellTime;
      } else if (this.chickenState === "crash") { // both crashed. restart. This shouldn't happen; the chicken always deploys
        this.winner = "retry";
        this.farewellClock = this.farewellTime;
      }
    }
  }
  
  render() {
    this.videoOut.fillRect(0, 0, this.videoOut.canvas.width, this.videoOut.canvas.height, MgParachute.BGCOLOR);
    this.videoOut.fillRect(0, this.groundY, this.videoOut.canvas.width, this.videoOut.canvas.height, MgParachute.GROUND_COLOR);
    
    this.videoOut.blitDecal(this.chopperLeft, this.chopperTop, this.srcbits, MgParachute.IMAGE_BOUNDS.chopper, 0);
    switch (this.bladeFrame) {
      case 1: this.videoOut.blitDecal(this.bladeLeft, this.bladeTop, this.srcbits, MgParachute.IMAGE_BOUNDS.blade1, 0); break;
      case 2: this.videoOut.blitDecal(this.bladeLeft, this.bladeTop, this.srcbits, MgParachute.IMAGE_BOUNDS.blade2, 0); break;
      case 3: this.videoOut.blitDecal(this.bladeLeft, this.bladeTop, this.srcbits, MgParachute.IMAGE_BOUNDS.blade3, 0); break;
    }
    
    const dotTop = Math.round(this.dotTop);
    switch (this.dotState) {
      case "fall": this.videoOut.blitDecal(this.dotFallLeft, dotTop, this.srcbits, MgParachute.IMAGE_BOUNDS.dotFall, 0); break;
      case "deploy": {
          this.videoOut.blitDecal(this.dotChuteOpenLeft, dotTop + this.dotChuteOpenOffset, this.srcbits, MgParachute.IMAGE_BOUNDS.chuteOpen, 0);
          this.videoOut.blitDecal(this.dotStandLeft, dotTop, this.srcbits, MgParachute.IMAGE_BOUNDS.dotStand, 0);
        } break;
      case "land": {
          this.videoOut.blitDecal(this.dotChuteDefunctLeft, this.dotChuteDefunctTop, this.srcbits, MgParachute.IMAGE_BOUNDS.chuteDefunct, 0);
          this.videoOut.blitDecal(this.dotStandLeft, dotTop, this.srcbits, MgParachute.IMAGE_BOUNDS.dotStand, 0);
        } break;
      case "crash": this.videoOut.blitDecal(this.crashLeft, this.crashTop, this.srcbits, MgParachute.IMAGE_BOUNDS.explosion, 0); break;
    }
    const chickenTop = Math.round(this.chickenTop);
    switch (this.chickenState) {
      case "fall": this.videoOut.blitDecal(this.chickenFallLeft, chickenTop, this.srcbits, MgParachute.IMAGE_BOUNDS.chickenFall, 0); break;
      case "deploy": {
          this.videoOut.blitDecal(this.chickenChuteOpenLeft, chickenTop + this.chickenChuteOpenOffset, this.srcbits, MgParachute.IMAGE_BOUNDS.chuteOpen, 0);
          this.videoOut.blitDecal(this.chickenStandLeft, chickenTop, this.srcbits, MgParachute.IMAGE_BOUNDS.chickenStand, 0);
        } break;
      case "land": {
          this.videoOut.blitDecal(this.chickenChuteDefunctLeft, this.chickenChuteDefunctTop, this.srcbits, MgParachute.IMAGE_BOUNDS.chuteDefunct, 0);
          this.videoOut.blitDecal(this.chickenStandLeft, chickenTop, this.srcbits, MgParachute.IMAGE_BOUNDS.chickenStand, 0);
        } break;
      case "crash": this.videoOut.blitDecal(this.crashRight, this.crashTop, this.srcbits, MgParachute.IMAGE_BOUNDS.explosion, 0); break;
    }
    if ((this.dotLandTime < this.elapsed) && (this.dotLandTime < this.chickenLandTime)) {
      this.videoOut.blitDecal(this.starLeft, this.starTop, this.srcbits, MgParachute.IMAGE_BOUNDS.star, 0);
    } else if (this.chickenLandTime < this.elapsed) {
      this.videoOut.blitDecal(this.starRight, this.starTop, this.srcbits, MgParachute.IMAGE_BOUNDS.star, 0);
    }
  }
}

MgParachute.IMAGE_NAME = "./img/mg02.png";

MgParachute.BGCOLOR = "#a0b0c0";
MgParachute.GROUND_COLOR = "#008020";

MgParachute.IMAGE_BOUNDS = {
  blade1: [1, 289, 264, 21], // blades are all same size
  blade2: [1, 311, 264, 21],
  blade3: [1, 333, 264, 21],
  chopper: [1, 355, 188, 128],
  chickenFall: [311, 289, 100, 30],
  chickenStand: [266, 289, 44, 60],
  dotFall: [311, 320, 117, 71],
  dotStand: [438, 289, 60, 111],
  chuteOpen: [190, 355, 117, 130],
  chuteDefunct: [308, 392, 129, 28],
  explosion: [308, 421, 189, 71],
  star: [1, 484, 23, 24],
};
