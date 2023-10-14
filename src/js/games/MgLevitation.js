/* MgLevitation.js
 * Keep the ball centered in order to lift off the ground.
 */
 
import { VideoOut } from "../VideoOut.js";
import { InputManager } from "../InputManager.js";
import { DataService } from "../DataService.js";
import * as K from "../Constants.js";

class Player {
  constructor(game, name) {
    this.game = game;
    this.name = name;
    this.ctlRadius = this.game.videoOut.canvas.width >> 3;
    this.ctlMidX = this.game.videoOut.canvas.width >> 2;
    this.ctlMidY = Math.round(this.game.videoOut.canvas.height * 0.333);
    this.ctlT = 0;
    this.ctlDt = 1; // radians/sec
    this.fx = 0; // focus point, relative to ctlMid
    this.fy = 0;
    this.attractors = [false, false, false, false, false, false]; // left, right, up, down, a, b
    this.drunkT = 0;
    this.drunkDt = 2.5; // radians/sec ; TODO difficulty?
    this.drunkV = 10; // px/sec ; TODO difficulty?
    this.slideOut = 0.5; // multiplies against focus distance in pixels, per second
    this.gravity = 50; // px/sec ; TODO difficulty?
    this.balanceRadius = 0.25; // 0..1 ; TODO difficulty?
    this.quality = 0; // -1..1 based on focus proximity only
    this.scoreRate = 0.25; // units/sec at maximum quality
    this.unscoreRate = 1.000; // '' when dropping
    this.score = 0; // 0..1
    this.upRange = this.game.videoOut.canvas.height * 0.200;
    this.aiTime = 1000;
    this.aiClock = 0;
    this.aiActuationThreshold = 0.100; // 0..1 ; TODO difficulty?
    if (name === "dot") {
      this.tileid0 = 0x50;
    } else {
      this.tileid0 = 0x52;
    }
  }
  
  reset() {
    this.ctlT = 0;
    this.fx = 0;
    this.fy = 0;
    this.attractors = [false, false, false, false, false, false];
    this.drunkT = 0;
    this.quality = 0;
    this.score = 0;
    this.aiClock = 0;
    this.aiTime = 1000 * (1 - this.game.difficulty) + 200 * this.game.difficulty;
  }
  
  setAttractors(input) {
    this.attractors[0] = input & InputManager.BTN_LEFT;
    this.attractors[1] = input & InputManager.BTN_RIGHT;
    this.attractors[2] = input & InputManager.BTN_UP;
    this.attractors[3] = input & InputManager.BTN_DOWN;
    this.attractors[4] = input & InputManager.BTN_A;
    this.attractors[5] = input & InputManager.BTN_B;
  }
  
  updateAi(interval) {
    if ((this.aiClock -= interval) > 0) return;
    this.aiClock += this.aiTime;
    const fdistance = Math.sqrt(this.fx ** 2 + this.fy ** 2) / this.ctlRadius;
    if (fdistance < this.aiActuationThreshold) return this.setAttractors(0);
    
    // Select the one attractor closest to the ray from (f) thru origin.
    // Determine the angle on the control wheel that we'd like to attract to (ie half turn from focus angle).
    let bestAttractor = 0;
    let bestScore = 999;
    const ft = Math.atan2(this.fy, this.fx);
    const idealt = ft + Math.PI;
    for (let i=0, t=this.ctlT; i<this.attractors.length; i++, t+=Math.PI/3) {
      let diff = t - idealt;
      while (diff < 0) diff += Math.PI * 2;
      while (diff > Math.PI * 2) diff -= Math.PI * 2;
      if (diff < bestScore) {
        bestAttractor = i;
        bestScore = diff;
      }
    }
    this.attractors = [false, false, false, false, false, false];
    this.attractors[bestAttractor] = true;
  }
  
  update(interval) {
  
    // Spin the control wheel.
    this.ctlT += (this.ctlDt * interval) / 1000;
    if (this.ctlT > Math.PI) this.ctlT -= Math.PI * 2;
    
    // Gravitate towards attractors.
    for (let i=this.attractors.length; i-->0; ) {
      if (!this.attractors[i]) continue;
      const dstt = this.ctlT + i * Math.PI / 3;
      const dstx = this.ctlRadius * Math.sin(dstt);
      const dsty = this.ctlRadius * -Math.cos(dstt);
      const dx = dstx - this.fx;
      const dy = dsty - this.fy;
      const dist = Math.sqrt(dx ** 2 + dy ** 2);
      const nx = dx / dist;
      const ny = dy / dist;
      this.fx += (nx * this.gravity * interval) / 1000;
      this.fy += (ny * this.gravity * interval) / 1000;
    }
    
    // Drunk walk. It's cyclic, not random. A wee circle, just so the focus can't remain locked somewhere.
    this.drunkT += (this.drunkDt * interval) / 1000;
    if (this.drunkT > Math.PI) this.drunkT -= Math.PI * 2;
    const v = (this.drunkV * interval) / 1000;
    this.fx += Math.cos(this.drunkT) * v;
    this.fy -= Math.sin(this.drunkT) * v;
    
    // Push focus toward the edge, then clamp to the control wheel's size. Normalize distance.
    this.fx += (this.fx * this.slideOut * interval) / 1000;
    this.fy += (this.fy * this.slideOut * interval) / 1000;
    let distance = Math.sqrt(this.fx ** 2 + this.fy ** 2);
    if (distance > this.ctlRadius) {
      this.fx = (this.fx * this.ctlRadius) / distance;
      this.fy = (this.fy * this.ctlRadius) / distance;
      distance = 1;
    } else {
      distance /= this.ctlRadius;
    }
    
    // Calculate focus quality from proximity.
    if (distance <= this.balanceRadius) {
      this.quality = (this.balanceRadius - distance) / this.balanceRadius;
    } else {
      this.quality = (this.balanceRadius - distance) / (1 - this.balanceRadius);
    }
    
    // Advance score.
    if (this.quality > 0) {
      this.score += (this.quality * this.scoreRate * interval) / 1000;
    } else {
      this.score += (this.quality * this.unscoreRate * interval) / 1000;
    }
    if (this.score < 0) this.score = 0;
    else if (this.score > 1) this.score = 1;
  }
  
  render(dstx, dsty, dstw, dsth) {
    const vo = this.game.videoOut;
    const herox = dstx + (dstw >> 1);
    let heroy = this.game.groundY - K.TILESIZE - (K.TILESIZE >> 1);
    heroy -= Math.round(this.score * this.upRange);
    let tileid = this.tileid0;
    if (this.quality > 0) tileid++;
    vo.blitTile(herox, heroy, this.game.srcbits, tileid, 0);
    vo.blitTile(herox, heroy + K.TILESIZE, this.game.srcbits, tileid + 0x10, 0);
    
    vo.blitTile(dstx + this.ctlMidX, dsty + this.ctlMidY, this.game.srcbits, 0x54, 0);
    for (let i=0, t=this.ctlT; i<6; i++, t+=Math.PI/3) {
      vo.blitTile(
        Math.round(dstx + this.ctlMidX + Math.sin(t) * this.ctlRadius),
        Math.round(dsty + this.ctlMidY - Math.cos(t) * this.ctlRadius),
        this.game.srcbits,
        (this.attractors[i] ? 0x66 : 0x56) + i,
        0
      );
    }
    vo.blitTile(
      Math.round(dstx + this.ctlMidX + this.fx),
      Math.round(dsty + this.ctlMidY + this.fy),
      this.game.srcbits,
      (this.quality > 0) ? 0x65 : 0x55,
      0
    );
  }
}
 
export class MgLevitation {
  static getDependencies() {
    return [VideoOut, InputManager, DataService];
  }
  constructor(videoOut, inputManager, dataService) {
    this.videoOut = videoOut;
    this.inputManager = inputManager;
    this.dataService = dataService;
    
    this.updateDuringSplashes = false;
    this.actorName = "MONK";
    this.contestName = "A LEVITATION CONTEST";
    
    this.srcbits = this.dataService.getImage(MgLevitation.IMAGE_NAME);
    this.cbComplete = () => {};
    this.groundY = this.videoOut.canvas.height - 40;
    this.playTime = 4999;
    this.scoreStepTime = 250;
    this.termTime = 2000;
    
    this.difficulty = 0.5;
    this.elapsed = 0;
    this.dot = new Player(this, "dot");
    this.monk = new Player(this, "monk");
    this.playClock = this.playTime;
    this.scoreClock = this.scoreStepTime;
    this.scoreCount = 0; // how many lines drawn, during scoring
    this.winner = ""; // set after scoring complete (not immediately at end of playClock)
    this.termClock = this.termTime;
  }
  
  setup(difficulty, cbComplete, seed) {
    this.difficulty = difficulty;
    this.cbComplete = cbComplete;
    this.elapsed = 0;
    this.dot.reset();
    this.monk.reset();
    this.playClock = this.playTime;
    this.scoreClock = this.scoreStepTime;
    this.scoreCount = 0;
    this.winner = "";
    this.termClock = this.termTime;
  }
  
  start() {
  }
  
  update(interval, inputState) {
    this.elapsed += interval;
    
    if (this.playClock) {
      if ((this.playClock -= interval) <= 0) {
        this.playClock = 0;
      }
    } else if (this.winner) {
      if ((this.termClock -= interval) <= 0) {
        this.cbComplete(this.winner === "dot");
      }
      return;
    } else {
      if (this.scoreClock) {
        if ((this.scoreClock -= interval) <= 0) {
          this.scoreClock += this.scoreStepTime;
          this.stepScore();
        }
      }
      return;
    }
    
    this.dot.setAttractors(inputState);
    this.monk.updateAi(interval);
    
    this.dot.update(interval);
    this.monk.update(interval);
  }
  
  stepScore() {
    this.scoreCount++;
    // When the score lines cross somebody's feet we're done. Higher wins, and monk wins ties.
    const dotp = this.dot.score * this.dot.upRange * 0.5;
    const monkp = this.monk.score * this.monk.upRange * 0.5;
    if ((this.scoreCount >= dotp) || (this.scoreCount >= monkp)) {
      this.winner = (dotp > monkp) ? "dot" : "monk";
    }
  }
  
  render() {
    const halfw = this.videoOut.canvas.width >> 1;
    this.videoOut.fillRect(0, 0, this.videoOut.canvas.width, this.videoOut.canvas.height, MgLevitation.SKY_COLOR);
    this.videoOut.fillRect(0, this.groundY, this.videoOut.canvas.width, this.videoOut.canvas.height, MgLevitation.GROUND_COLOR);
    this.dot.render(0, 0, halfw, this.videoOut.canvas.height);
    this.monk.render(halfw, 0, halfw, this.videoOut.canvas.height);
    
    const x = this.videoOut.canvas.width >> 3;
    const w = (this.videoOut.canvas.width * 3) >> 2;
    for (let i=0, y=this.groundY-2; i<this.scoreCount; i++, y-=2) {
      this.videoOut.fillRect(x, y, w, 1, "#000");
    }
    
    switch (this.winner) {
      case "dot": this.videoOut.blitTile(
          Math.round(this.videoOut.canvas.width / 3),
          Math.round((this.videoOut.canvas.height * 2) / 3),
          this.srcbits, 0x64, 0
        ); break;
      case "monk": this.videoOut.blitTile(
          Math.round((this.videoOut.canvas.width * 2) / 3),
          Math.round((this.videoOut.canvas.height * 2) / 3),
          this.srcbits, 0x64, VideoOut.XFORM_XREV
        ); break;
    }
      
    this.videoOut.renderText(halfw - 4, 20, "#fff", Math.floor(this.playClock / 1000));
  }
}

MgLevitation.IMAGE_NAME = "./img/tiles.png";

MgLevitation.SKY_COLOR = "#a0c0f0";
MgLevitation.GROUND_COLOR = "#008000";

MgLevitation.IMG = {
};
