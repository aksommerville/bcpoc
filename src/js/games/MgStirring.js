/* MgStirring.js
 * Minigame where you stir a pot.
 */
 
import { VideoOut } from "../VideoOut.js";
import { InputManager } from "../InputManager.js";
import { DataService } from "../DataService.js";
 
export class MgStirring {
  static getDependencies() {
    return [VideoOut, InputManager, DataService];
  }
  constructor(videoOut, inputManager, dataService) {
    this.videoOut = videoOut;
    this.inputManager = inputManager;
    this.dataService = dataService;
    
    this.updateDuringSplashes = false;
    this.actorName = "MOUSE";
    this.contestName = "A STIRRING CONTEST";
    
    this.srcbits = this.dataService.getImage(MgStirring.IMAGE_NAME);
    this.cbComplete = () => {};
    this.dotLeft = (this.videoOut.canvas.width >> 2) - (MgStirring.IMAGE_BOUNDS.dot[2] >> 1);
    this.dotTop = this.videoOut.canvas.height - MgStirring.IMAGE_BOUNDS.dot[3];
    this.mouseLeft = ((this.videoOut.canvas.width * 3) >> 2) - (MgStirring.IMAGE_BOUNDS.mouse[2] >> 1);
    this.mouseTop = this.videoOut.canvas.height - MgStirring.IMAGE_BOUNDS.mouse[3];
    this.dotPotLeft = (this.videoOut.canvas.width >> 2) - (MgStirring.IMAGE_BOUNDS.potFg[2] >> 1);
    this.mousePotLeft = ((this.videoOut.canvas.width * 3) >> 2) - (MgStirring.IMAGE_BOUNDS.potFg[2] >> 1);
    this.potTop = this.videoOut.canvas.height - MgStirring.IMAGE_BOUNDS.potFg[3];
    this.powerW = 20;
    this.powerH = Math.floor(this.videoOut.canvas.height * 0.8);
    this.powerTop = this.videoOut.canvas.height - 10 - this.powerH;
    this.dotPowerLeft = (this.videoOut.canvas.width >> 1) - 4 - this.powerW;
    this.mousePowerLeft = (this.videoOut.canvas.width >> 1) + 4;
    this.clockTop = 10;
    this.clockLeft = (this.videoOut.canvas.width >> 1) - 8;
    this.mouseDelayMin = 125; // ms/stroke
    this.mouseDelayMax = 500;
    this.goodStrokeBonus = 0.1;
    this.badStrokePenalty = 0.3;
    this.decayBase = 0.4; // units/second; lower is a faster decay
    this.timeLimit = 5.99 * 1000; // ms; the ".99" means the significand is the digit we display first, and it doesn't flash right out
    
    // Hand positions are [x,y] for [center, left, right, up, down]
    this.dotHandPositions = [
      [110, 180],
      [ 50, 180],
      [180, 180],
      [100, 160],
      [120, 210],
    ];
    this.mouseHandPositions = [
      [362, 180],
      [300, 180],
      [432, 180],
      [348, 160],
      [380, 210],
    ];
    
    this.difficulty = 0.5;
    this.prevInputState = 0;
    this.elapsed = 0;
    this.dotHandP = 0;
    this.dotHandX = this.dotHandPositions[0][0];
    this.dotHandY = this.dotHandPositions[0][1];
    this.mouseHandP = 0;
    this.mouseHandX = this.mouseHandPositions[0][0];
    this.mouseHandY = this.mouseHandPositions[0][1];
    this.direction = 0; // -1,0,1 = counterclock,unset,clockwise
    this.mouseDelay = this.mouseDelayMin;
    this.mouseClock = 0;
    this.dotPower = 0;
    this.mousePower = 0;
  }
  
  setup(difficulty, cbComplete) {
    this.difficulty = difficulty;
    this.cbComplete = cbComplete;
    this.prevInputState = 0;
    this.elapsed = 0;
    this.dotHandP = 0;
    this.dotHandX = this.dotHandPositions[0][0];
    this.dotHandY = this.dotHandPositions[0][1];
    this.mouseHandP = 0;
    this.mouseHandX = this.mouseHandPositions[0][0];
    this.mouseHandY = this.mouseHandPositions[0][1];
    this.direction = 0;
    this.mouseDelay = Math.floor(this.mouseDelayMax * (1 - difficulty) + this.mouseDelayMin * difficulty);
    this.mouseClock = this.mouseDelay;
    this.dotPower = 0;
    this.mousePower = 0;
  }
  
  /* Nothing for us to do at start(). We're ready to go after setup().
   * This is normal for minigames that don't interfere with the splashes.
   * But implementing start() is required either way.
   */
  start() {
  }
  
  update(interval, inputState) {
    this.elapsed += interval;
    
    if (this.elapsed >= this.timeLimit) {
      return this.cbComplete(this.dotPower > this.mousePower); // mouse wins ties -- you can't win with a zero score
    }
    
    // Mouse advances at a steady rate.
    this.mouseClock -= interval;
    if (this.mouseClock <= 0) {
      this.mouseClock += this.mouseDelay;
      this.mouseHandP = this.nextDirection(this.mouseHandP);
      this.mouseGoodStroke();
    }
    
    // The only interesting input event is "new button pressed".
    if (inputState !== this.prevInputState) {
      if (inputState) {
        const newButtons = (inputState & ~this.prevInputState) & InputManager.BTNS_DPAD;
        switch (newButtons) {
          case InputManager.BTN_LEFT: this.setHandTarget(1); break;
          case InputManager.BTN_RIGHT: this.setHandTarget(2); break;
          case InputManager.BTN_UP: this.setHandTarget(3); break;
          case InputManager.BTN_DOWN: this.setHandTarget(4); break;
          // Multiple at once is unlikely, but if it happens ignore them both.
        }
      }
      this.prevInputState = inputState;
    }
    
    // Move hands toward their target position.
    this.dotHandX = this.approach(this.dotHandPositions[this.dotHandP][0], this.dotHandX, interval);
    this.dotHandY = this.approach(this.dotHandPositions[this.dotHandP][1], this.dotHandY, interval);
    this.mouseHandX = this.approach(this.mouseHandPositions[this.mouseHandP][0], this.mouseHandX, interval);
    this.mouseHandY = this.approach(this.mouseHandPositions[this.mouseHandP][1], this.mouseHandY, interval);
    
    //TODO: Would an exponential decrease be more satisfying? ie multiply by <1 instead of subtracting.
    const decay = Math.pow(this.decayBase, interval / 1000);
    this.dotPower *= decay;
    this.mousePower *= decay;
  }
  
  setHandTarget(p) {
    if (p === this.dotHandP) return;
    
    if (!this.dotHandP) { // initial stroke: always good
      this.goodStroke();
    } else if (!this.direction) { // second stroke establishes direction
      const dir = this.getDirection(p, this.dotHandP);
      if (dir) {
        this.direction = dir;
        this.goodStroke();
      } else {
        this.badStroke();
      }
    } else { // after the second stroke, you must continue in that direction
      const dir = this.getDirection(p, this.dotHandP);
      if (dir === this.direction) {
        this.goodStroke();
      } else {
        this.badStroke();
        this.direction = 0;
      }
    }
    this.dotHandP = p;
  }
  
  getDirection(to, from) {
    switch (from) {
      case 1: return (to === 3) ? 1 : (to === 4) ? -1 : 0;
      case 2: return (to === 4) ? 1 : (to === 3) ? -1 : 0;
      case 3: return (to === 2) ? 1 : (to === 1) ? -1 : 0;
      case 4: return (to === 1) ? 1 : (to === 2) ? -1 : 0;
    }
    return 0;
  }
  
  // Always clockwise, because we are in the northern hemisphere.
  nextDirection(from) {
    switch (from) {
      case 1: return 3;
      case 2: return 4;
      case 3: return 2;
      case 4: return 1;
    }
    return 1;
  }
  
  mouseGoodStroke() {
    if ((this.mousePower += this.goodStrokeBonus) > 1) this.mousePower = 1;
  }
  
  goodStroke() {
    if ((this.dotPower += this.goodStrokeBonus) > 1) this.dotPower = 1;
  }
  
  badStroke() {
    if ((this.dotPower -= this.badStrokePenalty) < 0) this.dotPower = 0;
  }
  
  approach(dst, src, interval) {
    const pixelsPerSecond = 1000;
    const speed = Math.max(1, Math.round((pixelsPerSecond * interval) / 1000));
    if (src > dst) {
      if ((src -= speed) < dst) src = dst;
    } else if (src < dst) {
      if ((src += speed) > dst) src = dst;
    }
    return src;
  }
  
  render() {
    this.videoOut.fillRect(0, 0, this.videoOut.canvas.width, this.videoOut.canvas.height, MgStirring.BGCOLOR);
    
    this.videoOut.blitDecal(this.dotLeft, this.dotTop, this.srcbits, MgStirring.IMAGE_BOUNDS.dot, 0);
    this.videoOut.blitDecal(this.dotPotLeft, this.potTop, this.srcbits, MgStirring.IMAGE_BOUNDS.potBg, 0);
    this.videoOut.blitDecal(this.dotHandX, this.dotHandY, this.srcbits, MgStirring.IMAGE_BOUNDS.dotHand, 0);
    this.videoOut.blitDecal(this.dotPotLeft, this.potTop, this.srcbits, MgStirring.IMAGE_BOUNDS.potFg, 0);
    
    this.videoOut.blitDecal(this.mouseLeft, this.mouseTop, this.srcbits, MgStirring.IMAGE_BOUNDS.mouse, 0);
    this.videoOut.blitDecal(this.mousePotLeft, this.potTop, this.srcbits, MgStirring.IMAGE_BOUNDS.potBg, 0);
    this.videoOut.blitDecal(this.mouseHandX, this.mouseHandY, this.srcbits, MgStirring.IMAGE_BOUNDS.mouseHand, 0);
    this.videoOut.blitDecal(this.mousePotLeft, this.potTop, this.srcbits, MgStirring.IMAGE_BOUNDS.potFg, 0);
    
    this.drawPowerMeter(this.dotPowerLeft, this.powerTop, this.dotPower);
    this.drawPowerMeter(this.mousePowerLeft, this.powerTop, this.mousePower);
    
    const sec = Math.floor((this.timeLimit - this.elapsed) / 1000);
    if (sec >= 0) {
      this.videoOut.renderText(this.clockLeft, this.clockTop, "#fff", sec.toString());
    }
  }
  
  drawPowerMeter(x, y, power) {
    const h = Math.floor(power * this.powerH);
    this.videoOut.fillRect(x, y, this.powerW, this.powerH - h, "#444");
    this.videoOut.fillRect(x, y + this.powerH - h, this.powerW, h, "#f00");
  }
}

MgStirring.IMAGE_NAME = "./img/mg01.png";

MgStirring.BGCOLOR = "#80a060";

MgStirring.IMAGE_BOUNDS = {
  potBg: [243, 1, 223, 38],
  potFg: [1, 211, 223, 80],
  mouse: [1, 292, 190, 211],
  dot: [225, 212, 196, 269],
  dotHand: [433, 118, 29, 108],
  mouseHand: [463, 118, 27, 104],
};
