/* MgJumprope.js
 * Minigame where you jump twosies with the opponent.
 */
 
import { VideoOut } from "../VideoOut.js";
import { InputManager } from "../InputManager.js";
import { DataService } from "../DataService.js";
 
export class MgJumprope {
  static getDependencies() {
    return [VideoOut, InputManager, DataService];
  }
  constructor(videoOut, inputManager, dataService) {
    this.videoOut = videoOut;
    this.inputManager = inputManager;
    this.dataService = dataService;
    
    this.updateDuringSplashes = false;
    this.actorName = "JOEY";
    this.contestName = "A JUMPROPE CONTEST";
    
    this.srcbits = this.dataService.getImage(MgJumprope.IMAGE_NAME);
    this.cbComplete = () => {};
    this.horizonTop = Math.round(this.videoOut.canvas.height * 0.5) - (MgJumprope.IMAGE_BOUNDS.horizon[3] >> 1);
    this.treeLeft = 20;
    this.treeTop = (this.videoOut.canvas.height >> 1) - (MgJumprope.IMAGE_BOUNDS.tree[3] >> 1);
    this.trollLeft = this.videoOut.canvas.width - 20 - MgJumprope.IMAGE_BOUNDS.troll[2];
    this.trollTop = this.treeTop + MgJumprope.IMAGE_BOUNDS.tree[3] - MgJumprope.IMAGE_BOUNDS.troll[3]; // align bottoms
    this.trollArmLeft = this.trollLeft - 20;
    this.trollArmTop = this.trollTop + 49;
    this.treeKnotX = this.treeLeft + 58; // tree knot is stationary
    this.treeKnotY = this.treeTop + 159;
    this.trollKnotLowX = this.trollArmLeft + 7; // troll knot (where rope meets hand) moves per frame
    this.trollKnotLowY = this.trollArmTop + 54;
    this.trollKnotMidX = this.trollArmLeft + 0;
    this.trollKnotMidY = this.trollArmTop + 42;
    this.trollKnotHighX = this.trollArmLeft + 2;
    this.trollKnotHighY = this.trollArmTop + 27;
    this.ropeArcW = 40;
    this.ropeRange = 65;
    // Images for Dot and Joey have fixed widths, so we don't need to worry which frame is showing.
    // Their shadows are the same height.
    // dotTop and joeyTop are when idle, they reach to some height above that when jumping.
    // Joey has a long tail to the right, so both Dot and Joey are offset a bit left.
    this.dotLeft = (this.videoOut.canvas.width >> 1) - 30 - MgJumprope.IMAGE_BOUNDS.dotIdle[2];
    this.dotTop = this.treeTop + MgJumprope.IMAGE_BOUNDS.tree[3] - MgJumprope.IMAGE_BOUNDS.dotIdle[3];
    this.joeyLeft = (this.videoOut.canvas.width >> 1) - 10;
    this.joeyTop = this.treeTop + MgJumprope.IMAGE_BOUNDS.tree[3] - MgJumprope.IMAGE_BOUNDS.joeyIdle[3];
    this.shadowTop = this.dotTop + MgJumprope.IMAGE_BOUNDS.dotIdle[3] - MgJumprope.IMAGE_BOUNDS.dotShadow[3];
    this.dotJumpMax = Math.round(this.videoOut.canvas.height * 0.2);
    this.joeyJumpMax = Math.round(this.videoOut.canvas.height * 0.275);
    this.dotJumpSpeed = 400; // pixels/sec
    this.joeyJumpSpeed = 375;
    this.gravitySpeed = 400;
    this.joeyDelayLow = 30; // waits for so long between landing and jumping again
    this.joeyDelayHigh = 200;
    this.ropeRateStartLow = 0.5;
    this.ropeRateStartHigh = 1;
    this.ropeRateRateLow = 1.100;
    this.ropeRateRateHigh = 1.200;
    this.ropeRateMax = 2.5; // regardless of difficulty
    this.finalTime = 1500;
    
    this.difficulty = 0.5;
    this.elapsed = 0;
    this.ropePhase = 0; // 0=bottom, 0.25=backward, 0.5=top, 0.75=forward
    this.trollFrame = 1; // populated only during render, 0,1,2 = low,mid,high
    this.dotJumping = false; // input state
    this.dotDisplacement = 0; // 0..dotJumpMax, floating
    this.joeyJumping = false;
    this.joeyDisplacement = 0;
    this.aOk = false; // goes true when the A button is released and Dot is on the ground
    this.ropeRate = this.ropeRateStartLow;
    this.ropeRateRate = this.ropeRateRateLow;
    this.joeyDelay = this.joeyDelayLow;
    this.joeyClock = 0;
    this.lastToLand = "joey"; // "joey" or "dot"; this one wins ties
    this.finalClock = 0;
    this.winner = "";
  }
  
  setup(difficulty, cbComplete) {
    this.difficulty = difficulty;
    this.cbComplete = cbComplete;
    this.elapsed = 0;
    this.ropePhase = 0;
    this.dotJumping = false;
    this.dotDisplacement = 0;
    this.joeyJumping = false;
    this.joeyDisplacement = 0;
    this.aOk = false;
    this.ropeRate = this.ropeRateStartLow * (1 - difficulty) + this.ropeRateStartHigh * difficulty;
    this.ropeRateRate = this.ropeRateRateLow * (1 - difficulty) + this.ropeRateRateHigh * difficulty;
    this.joeyDelay = this.joeyDelayLow * difficulty + this.joeyDelayHigh * (1 - difficulty);
    this.joeyClock = 0;
    this.lastToLand = "joey";
    this.finalClock = 0;
    this.winner = "";
  }
  
  start() {
  }
  
  update(interval, inputState) {
    this.elapsed += interval;
    
    if (this.finalClock) {
      if (this.dotDisplacement) {
        if ((this.dotDisplacement -= (interval * this.gravitySpeed) / 1000) <= 0) {
          this.dotDisplacement = 0;
        }
      }
      if (this.joeyDisplacement) {
        if ((this.joeyDisplacement -= (interval * this.gravitySpeed) / 1000) <= 0) {
          this.joeyDisplacement = 0;
        }
      }
      if ((this.finalClock -= interval) <= 0) {
        this.finalClock = -1;
        this.cbComplete(this.winner === "dot");
      }
      return;
    }
    
    if (this.dotJumping) {
      if (inputState & InputManager.BTN_A) {
        if ((this.dotDisplacement += (interval * this.dotJumpSpeed) / 1000) >= this.dotJumpMax) {
          this.dotDisplacement = this.dotJumpMax;
          this.dotJumping = false;
        }
      } else {
        this.dotJumping = false;
      }
    } else if (this.dotDisplacement) {
      if ((this.dotDisplacement -= (interval * this.gravitySpeed) / 1000) <= 0) {
        this.dotDisplacement = 0;
        this.lastToLand = "dot";
      }
    } else if (!(inputState & InputManager.BTN_A)) {
      this.aOk = true;
    } else if (this.aOk) {
      this.aOk = false;
      this.dotJumping = true;
    }
    
    if (this.joeyClock) {
      if ((this.joeyClock -= interval) <= 0) {
        this.joeyClock = 0;
      }
    } else if (this.joeyJumping) {
      if ((this.joeyDisplacement += (interval * this.joeyJumpSpeed) / 1000) >= this.joeyJumpMax) {
        this.joeyDisplacement = this.joeyJumpMax;
        this.joeyJumping = false;
      }
    } else if (this.joeyDisplacement) {
      if ((this.joeyDisplacement -= (interval * this.gravitySpeed) / 1000) <= 0) {
        this.joeyDisplacement = 0;
        this.joeyClock = this.joeyDelay;
        this.lastToLand = "joey";
      }
    } else if (this.ropePhase >= 0.80) {
      this.joeyJumping = true;
    }
    
    if (this.ropeRate < this.ropeRateMax) {
      this.ropeRate *= Math.pow(this.ropeRateRate, interval / 1000);
    } else if (this.ropeRate !== this.ropeRateMax) {
      console.log("TOP SPEED");
      this.ropeRate = this.ropeRateMax;
    }
    this.ropePhase += (this.ropeRate * interval) / 1000;
    if (this.ropePhase >= 1) {
      this.ropePhase -= 1;
      if (this.dotDisplacement && this.joeyDisplacement) {
      } else if (this.dotDisplacement) {
        this.finalClock = this.finalTime;
        this.winner = "dot";
        this.ropePhase = 0;
        this.dotJumping = this.joeyJumping = false;
      } else if (this.joeyDisplacement) {
        this.finalClock = this.finalTime;
        this.winner = "joey";
        this.ropePhase = 0;
        this.dotJumping = this.joeyJumping = false;
      } else {
        this.finalClock = this.finalTime;
        this.winner = this.lastToLand;
        this.ropePhase = 0;
        this.dotJumping = this.joeyJumping = false;
      }
    }
  }
  
  render() {
  
    if (this.ropePhase < 0.125) this.trollFrame = 0;
    else if (this.ropePhase < 0.375) this.trollFrame = 1;
    else if (this.ropePhase < 0.625) this.trollFrame = 2;
    else if (this.ropePhase < 0.875) this.trollFrame = 1;
    else this.trollFrame = 0;
  
    this.videoOut.fillRect(0, 0, this.videoOut.canvas.width, this.horizonTop, MgJumprope.SKY_COLOR);
    this.videoOut.fillRect(0, this.horizonTop, this.videoOut.canvas.width, this.videoOut.canvas.height, MgJumprope.GROUND_COLOR);
    this.videoOut.blitDecal(0, this.horizonTop, this.srcbits, MgJumprope.IMAGE_BOUNDS.horizon, 0);
    
    this.videoOut.blitDecal(this.treeLeft, this.treeTop, this.srcbits, MgJumprope.IMAGE_BOUNDS.tree, 0);
    switch (this.trollFrame) {
      case 0: this.videoOut.blitDecal(this.trollArmLeft, this.trollArmTop, this.srcbits, MgJumprope.IMAGE_BOUNDS.trollArmLow, 0); break;
      case 1: this.videoOut.blitDecal(this.trollArmLeft, this.trollArmTop, this.srcbits, MgJumprope.IMAGE_BOUNDS.trollArmMid, 0); break;
      case 2: this.videoOut.blitDecal(this.trollArmLeft, this.trollArmTop, this.srcbits, MgJumprope.IMAGE_BOUNDS.trollArmHigh, 0); break;
    }
    this.videoOut.blitDecal(this.trollLeft, this.trollTop, this.srcbits, MgJumprope.IMAGE_BOUNDS.troll, 0);
    
    this.videoOut.blitDecal(this.dotLeft, this.shadowTop, this.srcbits, MgJumprope.IMAGE_BOUNDS.dotShadow, 0);
    this.videoOut.blitDecal(this.joeyLeft, this.shadowTop, this.srcbits, MgJumprope.IMAGE_BOUNDS.joeyShadow, 0);
    
    if (this.ropePhase <= 0.5) this.drawRope();
    
    let dotFrame = this.dotJumping ? MgJumprope.IMAGE_BOUNDS.dotJump : MgJumprope.IMAGE_BOUNDS.dotIdle;
    let joeyFrame = this.joeyJumping ? MgJumprope.IMAGE_BOUNDS.joeyJump : MgJumprope.IMAGE_BOUNDS.joeyIdle;
    if (this.finalClock) {
      if (this.winner === "dot") joeyFrame = MgJumprope.IMAGE_BOUNDS.joeyLose;
      else dotFrame = MgJumprope.IMAGE_BOUNDS.dotLose;
    }
    this.videoOut.blitDecal(this.dotLeft, this.dotTop - Math.round(this.dotDisplacement), this.srcbits, dotFrame, 0);
    this.videoOut.blitDecal(this.joeyLeft, this.joeyTop - Math.round(this.joeyDisplacement), this.srcbits, joeyFrame, 0);
    
    if (this.ropePhase > 0.5) this.drawRope();
    
    //TODO overlay? score? timer?
  }
  
  drawRope() {
    // XXX this would of course need to be exposed by VideoOut; games shouldn't touch the context directly. but meh, "poc".
    if (!this.videoOut.context) return;
    let trollKnotX, trollKnotY, ropeY;
    switch (this.trollFrame) {
      case 0: trollKnotX = this.trollKnotLowX; trollKnotY = this.trollKnotLowY; break;
      case 1: trollKnotX = this.trollKnotMidX; trollKnotY = this.trollKnotMidY; break;
      case 2: trollKnotX = this.trollKnotHighX; trollKnotY = this.trollKnotHighY; break;
    }
    let norm = this.ropePhase;
    if (norm >= 0.5) norm = 1 - norm;
    norm = 0.25 - norm;
    norm *= 4;
    ropeY = Math.round(this.treeKnotY + norm * this.ropeRange) + 0.5;
    this.videoOut.context.beginPath();
    this.videoOut.context.moveTo(this.treeKnotX, this.treeKnotY);
    this.videoOut.context.lineTo(this.treeKnotX + this.ropeArcW, ropeY);
    this.videoOut.context.lineTo(trollKnotX - this.ropeArcW, ropeY);
    this.videoOut.context.lineTo(trollKnotX, trollKnotY);
    this.videoOut.context.strokeStyle = "#fff";
    this.videoOut.context.stroke();
  }
}

MgJumprope.IMAGE_NAME = "./img/mg02.png";

MgJumprope.SKY_COLOR = "#7f979e";
MgJumprope.GROUND_COLOR = "#c0b78e";

MgJumprope.IMAGE_BOUNDS = {
  horizon: [0, 263, 512, 25],
  tree: [1, 1, 93, 221],
  dotIdle: [95, 1, 75, 108],
  dotJump: [171, 1, 75, 108], // matches dotIdle size
  dotLose: [247, 135, 75, 108], // ''
  dotShadow: [247, 119, 75, 15], // matches dot width
  joeyIdle: [247, 1, 130, 117],
  joeyJump: [378, 1, 130, 117], // matches joeyIdle size
  joeyLose: [323, 135, 130, 117], // ''
  joeyShadow: [323, 119, 130, 15], // matches joey width
  troll: [95, 110, 67, 152],
  trollArmLow: [163, 110, 41, 62],
  trollArmMid: [205, 110, 41, 62], // arms all same size; anchored at NE
  trollArmHigh: [163, 173, 41, 62], // ''
};
