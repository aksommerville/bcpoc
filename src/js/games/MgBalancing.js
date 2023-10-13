/* MgBalancing.js
 * Race to the finish line with a tomato on your head.
 */
 
import { VideoOut } from "../VideoOut.js";
import { InputManager } from "../InputManager.js";
import { DataService } from "../DataService.js";

class Player {
  constructor(game, name, startX) {
    this.game = game;
    this.name = name;
    this.startX = startX;
    
    this.walkSpeed = 100; // px/sec
    this.tomatoRadius = 23;
    this.headRadius = 20;
    this.walkFrameTime = 400;
    this.tomatoVy = 100; // px/sec. There's no gravity; it's a constant downward velocity.
    
    this.x = this.startX;
    this.y = this.game.groundY;
    if (name === "dot") { // this.y is the top edge of the body
      this.y -= MgBalancing.IMG.dotLegs[3] - MgBalancing.IMG.dotLegs[5]; // up by legs height minus control
      this.y -= MgBalancing.IMG.dotBody[7]; // up by body's lower control
      this.y += 3;
      this.headY = this.y + MgBalancing.IMG.dotBody[5] - MgBalancing.IMG.dotHead[5] + this.headRadius;
    } else {
      this.y -= MgBalancing.IMG.orn[3]; // orn is just one decal, and both frames are the same size
      this.y += 9;
      this.headY = this.y + this.headRadius;
    }
    this.tomatoX = this.x;
    this.tomatoY = this.headY - this.headRadius - this.tomatoRadius;
    this.walking = false;
    this.walkFrameClock = 0;
    this.walkFrame = 0;
    this.dx = 0;
    this.ketchupped = false; // or is it "kaughtUp"?
  }
  
  reset() {
    this.x = this.startX;
    this.tomatoX = this.x;
    this.tomatyY = this.headY - this.headRadius - this.tomatoRadius;
    this.walking = false;
    this.walkFrameClock = 0;
    this.walkFrame = 0;
    this.dx = 0;
    this.ketchupped = false;
    this.crossedGo = false;
    
    /* The AI is super simple:
     *   When the tomato's distance goes above one threshold, start walking, and walk until distance drops below a second threshold.
     * The stop threshold is fixed at 10 pixels left of center.
     * Go threshold slides left with difficulty.
     * With the current coefficients (0.40, 0.70), he reaches the goal in 3750..6788 ms and never drops the tomato.
     * I've finished in 2800 ms, and that was a lucky catch, must be pretty close to optimal.
     */
    if (this.name === "orn") {
      const goEasy = (this.tomatoRadius + this.headRadius) * 0.40;
      const goHard = (this.tomatoRadius + this.headRadius) * 0.70; // if this goes too high, he'll drop it
      this.aiGoThreshold = goEasy * (1 - this.game.difficulty) + goHard * this.game.difficulty;
      this.aiStopThreshold = 10;
      if (this.aiGoThreshold <= this.aiStopThreshold) {
        this.aiGoThreshold = this.aiStopThreshold + 5;
      }
    }
  }
  
  walk(dx, interval) {
    this.x += (dx * this.walkSpeed * interval) / 1000;
    this.dx = dx;
    this.walking = true;
    if ((this.walkFrameClock -= interval) <= 0) {
      this.walkFrameClock += this.walkFrameTime;
      if (++(this.walkFrame) > 1) this.walkFrame = 0;
    }
  }
  
  standStill(interval) {
    if (!this.walking) return;
    this.walking = false;
    this.walkFrameClock = 0;
    this.walkFrame = 0;
  }
  
  updateWithAdvancedArtificialIntelligence(interval) {
    // The orangutan must walk left.
    // So if the tomato is right of us at all, walk right.
    // If it's beyond a certain threshold leftward, walk left.
    // If it's exactly on top, eg first update, walk right to kick things off.
    if (this.tomatoX >= this.x) {
      this.crossedGo = false;
      this.walk(1, interval);
    } else if (this.tomatoX < this.x - this.aiGoThreshold) {
      this.crossedGo = true;
      this.walk(-1, interval);
    } else if ((this.tomatoX < this.x - this.aiStopThreshold) && (this.dx < 0) && this.crossedGo) {
      this.walk(-1, interval);
    } else {
      this.crossedGo = false;
      this.standStill(interval);
    }
  }
  
  updateTomato(interval) {
    if (this.ketchupped) return;
    this.tomatoY += (this.tomatoVy * interval) / 1000;
    if (this.tomatoY >= this.game.groundY) {
      this.ketchupped = true;
      this.tomatoY = this.game.groundY;
      return;
    }
    
    /* What passes for physics around here is laughably simple:
     * We have just two bodies, tomato and head, and they are both circles.
     * Head's position is immutable (from here).
     */
    const dx = this.tomatoX - this.x;
    const dy = this.tomatoY - this.headY;
    const distance = Math.sqrt(dx ** 2 + dy ** 2);
    const penetration = this.tomatoRadius + this.headRadius - distance;
    if (penetration <= 0) return;
    if (!distance) return; // the heck? skip this frame and let gravity move it into a non-divide-by-zero position
    const nx = dx / distance;
    const ny = dy / distance;
    this.tomatoX += nx * penetration;
    this.tomatoY += ny * penetration;
  }
  
  drawDot(videoOut) {
    const x = Math.round(this.x - MgBalancing.IMG.dotBody[2] * 0.5) - 7; // 7 because her pics are a little off-center visually
    const legsDecal = this.walkFrame ? (
      (this.dx < 0) ? MgBalancing.IMG.dotLegsLeft : MgBalancing.IMG.dotLegsRight
    ) : MgBalancing.IMG.dotLegs;
    const dangerDistance = this.headRadius >> 1;
    const headDecal =
      this.ketchupped ? MgBalancing.IMG.dotHeadSad :
      (this.tomatoX < this.x - dangerDistance) ? MgBalancing.IMG.dotHeadLeft :
      (this.tomatoX > this.x + dangerDistance) ? MgBalancing.IMG.dotHeadRight :
      MgBalancing.IMG.dotHead;
    videoOut.blitDecal(
      x,
      this.y,
      this.game.srcbits,
      MgBalancing.IMG.dotBody,
      0
    );
    videoOut.blitDecal(
      x + MgBalancing.IMG.dotBody[4] - headDecal[4],
      this.y + MgBalancing.IMG.dotBody[5] - headDecal[5],
      this.game.srcbits,
      headDecal,
      0
    );
    videoOut.blitDecal(
      x + MgBalancing.IMG.dotBody[6] - legsDecal[4],
      this.y + MgBalancing.IMG.dotBody[7] - legsDecal[5],
      this.game.srcbits,
      legsDecal,
      0
    );
    this.drawTomato(videoOut);
  }
  
  drawOrn(videoOut) {
    const decal = this.walkFrame ? MgBalancing.IMG.ornWalk : MgBalancing.IMG.orn;
    videoOut.blitDecal(Math.round(this.x - MgBalancing.IMG.orn[2] * 0.5), this.y, this.game.srcbits, decal, 0);
    this.drawTomato(videoOut);
  }
  
  drawTomato(videoOut) {
    const decal = this.ketchupped ? MgBalancing.IMG.ketchup : MgBalancing.IMG.tomato;
    const x = Math.round(this.tomatoX - decal[2] * 0.5);
    const y = Math.round(this.tomatoY - decal[3] * 0.5);
    videoOut.blitDecal(x, y, this.game.srcbits, decal, 0);
  }
}
 
export class MgBalancing {
  static getDependencies() {
    return [VideoOut, InputManager, DataService];
  }
  constructor(videoOut, inputManager, dataService) {
    this.videoOut = videoOut;
    this.inputManager = inputManager;
    this.dataService = dataService;
    
    this.updateDuringSplashes = false;
    this.actorName = "ORANGUTAN";
    this.contestName = "A BALANCING CONTEST";
    this.terminationTime = 1000;
    
    this.srcbits = this.dataService.getImage(MgBalancing.IMAGE_NAME);
    this.cbComplete = () => {};
    this.groundY = this.videoOut.canvas.height - MgBalancing.IMG.goal[3];
    this.goalLeft = (this.videoOut.canvas.width >> 1) - (MgBalancing.IMG.goal[2] >> 1);
    this.goalRight = this.goalLeft + MgBalancing.IMG.goal[2];
    this.dotStartX = Math.floor((this.videoOut.canvas.width * 1) / 9);
    this.ornStartX = Math.floor((this.videoOut.canvas.width * 8) / 9);
    
    this.difficulty = 0.5;
    this.elapsed = 0;
    this.dot = new Player(this, "dot", this.dotStartX);
    this.orn = new Player(this, "orn", this.ornStartX);
    this.winner = ""; // "" | "dot" | "orn"
    this.terminationClock = this.terminationTime;
  }
  
  setup(difficulty, cbComplete, seed) {
    this.difficulty = difficulty;
    this.cbComplete = cbComplete;
    this.elapsed = 0;
    this.dot.reset();
    this.orn.reset();
    this.winner = "";
    this.terminationClock = this.terminationTime;
  }
  
  start() {
  }
  
  update(interval, inputState) {
    this.elapsed += interval;
    
    if (this.winner) {
      if ((this.terminationTime -= interval) <= 0) {
        this.cbComplete(this.winner === "dot");
      }
      return;
    }
    
    switch (inputState & (InputManager.BTN_LEFT | InputManager.BTN_RIGHT)) {
      case InputManager.BTN_LEFT: this.dot.walk(-1, interval); break;
      case InputManager.BTN_RIGHT: this.dot.walk(1, interval); break;
      default: this.dot.standStill(interval);
    }
    
    this.orn.updateWithAdvancedArtificialIntelligence(interval);
    
    this.dot.updateTomato(interval);
    this.orn.updateTomato(interval);
    
    if (this.orn.ketchupped) {
      if (this.dot.ketchupped) {
        // Ties are theoretically possible. If it happens, pretend Dot's hasn't landed yet and she wins.
        this.dot.ketchupped = false;
      }
      this.winner = "dot";
    } else if (this.dot.ketchupped) {
      this.winner = "orn";
    } else if (this.dot.x >= this.goalLeft) {
      this.winner = "dot";
    } else if (this.orn.x <= this.goalRight) {
      this.winner = "orn";
    }
  }
  
  render() {
    this.videoOut.fillRect(0, 0, this.videoOut.canvas.width, this.videoOut.canvas.height, MgBalancing.SKY_COLOR);
    this.videoOut.fillRect(0, this.groundY, this.videoOut.canvas.width, this.videoOut.canvas.height, MgBalancing.GROUND_COLOR);
    this.videoOut.blitDecal(this.goalLeft, this.groundY, this.srcbits, MgBalancing.IMG.goal, 0);
    
    this.dot.drawDot(this.videoOut);
    this.orn.drawOrn(this.videoOut);
  }
}

MgBalancing.IMAGE_NAME = "./img/mg03.png";

MgBalancing.SKY_COLOR = "#80b0f0";
MgBalancing.GROUND_COLOR = "#108030";

MgBalancing.IMG = {
  tomato: [88, 159, 59, 59],
  ketchup: [364, 155, 54, 41],
  dotHead: [240, 135, 61, 44, 1, 33], // heads same size and have a control point (which is also always the same)
  dotHeadLeft: [240, 180, 61, 44, 1, 33],
  dotHeadRight: [302, 153, 61, 44, 1, 33],
  dotHeadSad: [313, 198, 61, 44, 1, 33],
  dotBody: [302, 119, 80, 33, 14, 3, 26, 28], // body has two control points: head then legs
  dotLegs: [383, 95, 47, 29, 4, 1], // legs have a control point and are *not* all the same size. they *are* all same height and vert ctl.
  dotLegsLeft: [431, 93, 49, 29, 8, 1],
  dotLegsRight: [383, 125, 53, 29, 4, 1],
  orn: [326, 243, 79, 95], // orn frames same size
  ornWalk: [406, 243, 79, 95],
  goal: [481, 92, 16, 56],
};
