/* MgRollerskates.js
 * Minigame where you skate downhill forever.
 */
 
import { VideoOut } from "../VideoOut.js";
import { InputManager } from "../InputManager.js";
import { DataService } from "../DataService.js";

class Player {
  constructor(game, name) {
    this.game = game;
    this.name = name;
    this.jumpTimeLimit = 800;
    this.x = 0; // in world pixels; fp
    this.velocity = 0;
    this.acceleration = game.accelerationEasy;
    this.deceleration = game.decelerationEasy;
    this.braking = false;
    this.jumping = false;
    this.fallen = false;
    this.jumpTime = 0;
    this.jumpLead = 100; // ai only
    this.targetVelocity = 0; // ai only
    if (name === "dot") {
      this.decalSkate = MgRollerskates.IMG.dotSkate;
      this.decalJump = MgRollerskates.IMG.dotJump;
      this.decalBrake = MgRollerskates.IMG.dotBrake;
      this.decalFall = MgRollerskates.IMG.dotFall;
    } else {
      this.decalSkate = MgRollerskates.IMG.rabbitSkate;
      this.decalJump = MgRollerskates.IMG.rabbitJump;
      this.decalBrake = MgRollerskates.IMG.rabbitBrake;
      this.decalFall = MgRollerskates.IMG.rabbitFall;
    }
  }
  
  reset() {
    this.x = 0;
    this.velocity = 0;
    this.acceleration = this.game.accelerationEasy * (1 - this.game.difficulty) + this.game.accelerationHard * this.game.difficulty;
    this.deceleration = this.game.decelerationEasy * (1 - this.game.difficulty) + this.game.decelerationHard * this.game.difficulty;
    this.braking = false;
    this.jumping = false;
    this.fallen = false;
    this.targetVelocity = this.game.rabbitTargetVelocityEasy * (1 - this.game.difficulty) + this.game.rabbitTargetVelocityHard * this.game.difficulty;
    this.acceptVelocity = this.targetVelocity * 0.75;
  }
  
  /* Called before plain update() for the rabbit only.
   */
  updateAi(interval) {
  
    if (this.braking) {
      if (this.velocity < this.acceptVelocity) this.braking = false;
    } else if (this.velocity > this.targetVelocity) {
      this.braking = true;
    }
    
    this.jumping = false;
    const xignore = this.x - 50;
    const xjump = this.x + this.jumpLead;
    for (const obx of this.game.obstacles) {
      if (obx <= xignore) continue;
      if (obx <= xjump) {
        this.jumping = true;
        return;
      }
    }
  }
  
  update(interval) {
    if (this.fallen) return;
    
    if (this.jumping) {
      if ((this.jumpTime += interval) >= this.jumpTimeLimit) {
        this.jumping = false;
      }
    } else {
      // Reset jumpTime only when (jumping) is false from the caller.
      this.jumpTime = 0;
    }
    
    if (!this.jumping) { // in the air, your velocity is constant.
      if (this.braking) {
        if ((this.velocity -= (this.deceleration * interval) / 1000) <= 0) {
          this.velocity = 0;
        }
      } else {
        if ((this.velocity += (this.acceleration * interval) / 1000) > this.game.velocityLimit) {
          this.velocity = this.game.velocityLimit;
        }
      }
    }
    this.x += (this.velocity * interval) / 1000;
    
    if (!this.jumping) {
      for (const obx of this.game.obstacles) {
        if (this.x < obx) continue;
        if (this.x >= obx + MgRollerskates.IMG.obstacle[2]) continue;
        this.fallen = true;
        this.x = obx + 40;
        break;
      }
    }
  }
}
 
export class MgRollerskates {
  static getDependencies() {
    return [VideoOut, InputManager, DataService];
  }
  constructor(videoOut, inputManager, dataService) {
    this.videoOut = videoOut;
    this.inputManager = inputManager;
    this.dataService = dataService;
    
    this.updateDuringSplashes = false;
    this.actorName = "RABBIT";
    this.contestName = "A ROLLERSKATES CONTEST";
    
    this.srcbits = this.dataService.getImage(MgRollerskates.IMAGE_NAME);
    this.cbComplete = () => {};
    this.accelerationEasy = 100; // px/sec**2
    this.accelerationHard = 400;
    this.decelerationEasy = 600; // positive
    this.decelerationHard = 400;
    this.velocityLimit = 800; // px/sec
    this.terminationTime = 500;
    this.rabbitTargetVelocityEasy = 400;
    this.rabbitTargetVelocityHard = this.velocityLimit;
    
    this.difficulty = 0.5;
    this.elapsed = 0;
    this.obstacles = []; // x
    this.goal = 500; // x
    this.dot = new Player(this, "dot");
    this.rabbit = new Player(this, "rabbit");
    this.terminationClock = 0;
  }
  
  setup(difficulty, cbComplete, seed) {
    this.difficulty = difficulty;
    this.cbComplete = cbComplete;
    this.elapsed = 0;
    this.obstacles = [600, 1200, 1800, 2400, 3100, 3600, 4200, 4600];
    this.goal = 5500;
    this.dot.reset();
    this.rabbit.reset();
    this.terminationClock = this.terminationTime;
  }
  
  start() {
  }
  
  update(interval, inputState) {
    this.elapsed += interval;
    
    if (this.winner) {
      if ((this.terminationClock -= interval) <= 0) {
        this.cbComplete(this.winner === "dot");
      }
    }
    
    if (inputState & InputManager.BTN_A) this.dot.jumping = true;
    else this.dot.jumping = false;
    if (inputState & InputManager.BTN_LEFT) this.dot.braking = true;
    else this.dot.braking = false;
    
    this.rabbit.updateAi(interval);
    
    this.dot.update(interval);
    this.rabbit.update(interval);
    
    if (!this.winner) {
      // If they've both fallen, whoever is ahead wins, Rabbit wins ties. (must be Rabbit -- in a dead-man case you always lose)
      if (this.dot.fallen && this.rabbit.fallen) {
        this.winner = (this.dot.x > this.rabbit.x) ? "dot" : "rabbit";
        
      // If one is beyond the goal, they win. Check Dot first so she wins ties.
      // It is not possible to be both fallen and goaled.
      } else if (this.dot.x >= this.goal) {
        this.winner = "dot";
      } else if (this.rabbit.x >= this.goal) {
        this.winner = "rabbit";
      }
    }
  }
  
  render() {
    const sch = this.videoOut.canvas.height >> 1;
    this.videoOut.fillRect(0, 0, this.videoOut.canvas.width, this.videoOut.canvas.height, MgRollerskates.SKY_COLOR);
    this.renderScene(0, 0, this.videoOut.canvas.width, sch, this.dot, this.rabbit);
    this.renderScene(0, sch, this.videoOut.canvas.width, sch, this.rabbit, this.dot);
    this.videoOut.context.beginPath();
    this.videoOut.context.moveTo(0, sch - 0.5);
    this.videoOut.context.lineTo(this.videoOut.canvas.width, sch - 0.5);
    this.videoOut.context.strokeStyle = "#000";
    this.videoOut.context.stroke();
  }
  
  renderScene(dstx, dsty, dstw, dsth, leader, opponent) {
    this.videoOut.context.save();
    this.videoOut.context.beginPath();
    this.videoOut.context.rect(dstx, dsty, dstw, dsth);
    this.videoOut.context.clip();
    
    // Ground.
    const worldx = Math.round(leader.x) - (dstw >> 1); // left edge of camera in world pixels
    const stopX = worldx + dstw;
    let col = Math.floor(worldx / MgRollerskates.IMG.bgA[2]);
    let colX = col * MgRollerskates.IMG.bgA[2];
    let ycorrect = Math.floor((worldx - colX) * 0.25);
    let colY = dsty + 14 - ycorrect;
    for (; colX < stopX; col++, colX+=MgRollerskates.IMG.bgA[2], colY+=8) {
      this.videoOut.blitDecal(dstx + colX - worldx, colY, this.srcbits, (col & 1) ? MgRollerskates.IMG.bgA : MgRollerskates.IMG.bgB, 0);
    }
    
    // Obstacles and goal. There aren't many, so don't even bother figuring out which are in scope.
    for (const obx of this.obstacles) {
      const oby = dsty + Math.floor((obx - worldx) * 0.25);
      this.videoOut.blitDecal(dstx + obx - worldx, oby, this.srcbits, MgRollerskates.IMG.obstacle, 0);
    }
    const goaly = dsty + Math.floor((this.goal - worldx) * 0.25) + 16;
    this.videoOut.blitDecal(dstx + this.goal - worldx, goaly, this.srcbits, MgRollerskates.IMG.goal, 0);
    
    this.videoOut.context.globalAlpha = 0.5;
    let oppx = Math.floor(dstx + opponent.x - worldx);
    let oppy = dsty + Math.floor((opponent.x - worldx) * 0.25);
    if (opponent.fallen) {
      oppx -= opponent.decalFall[2] >> 1;
      oppy += 6;
      this.videoOut.blitDecal(oppx, oppy, this.srcbits, opponent.decalFall, 0);
    } else {
      let decal;
      if (opponent.jumping) decal = opponent.decalJump;
      else if (opponent.braking) decal = opponent.decalBrake;
      else decal = opponent.decalSkate;
      oppx -= decal[2] >> 1;
      oppy -= 39;
      this.videoOut.blitDecal(oppx, oppy, this.srcbits, decal, 0);
    }
    this.videoOut.context.globalAlpha = 1;
    
    if (leader.fallen) { // different size
      const decal = leader.decalFall;
      let heroy = dsty + (dsth >> 1) - (decal[3] >> 1);
      this.videoOut.blitDecal(dstx + (dstw >> 1) - (decal[2] >> 1), heroy, this.srcbits, decal, 0);
    } else {
      let decal;
      if (leader.jumping) decal = leader.decalJump;
      else if (leader.braking) decal = leader.decalBrake;
      else decal = leader.decalSkate;
      let heroy = dsty + (dsth >> 1) - (decal[3] >> 1) - 19;
      if (leader.jumping) heroy -= 10;
      this.videoOut.blitDecal(dstx + (dstw >> 1) - (decal[2] >> 1), heroy, this.srcbits, decal, 0);
    }
    
    this.videoOut.context.restore();
  }
}

MgRollerskates.IMAGE_NAME = "./img/mg03.png";

MgRollerskates.SKY_COLOR = "#a0d0f0";

MgRollerskates.IMG = {
  bgA: [326, 339, 32, 142], // backgrounds same size, and their top edges have a slope exactly 1/4, ie 8 pixels
  bgB: [359, 339, 32, 142],
  obstacle: [294, 377, 31, 21],
  dotSkate: [392, 339, 35, 58], // upright heroes, both dot and rabbit, all same size
  dotJump: [428, 339, 35, 58],
  dotBrake: [464, 339, 35, 58],
  dotFall: [392, 398, 63, 23],
  rabbitSkate: [392, 422, 35, 58],
  rabbitJump: [428, 422, 35, 58],
  rabbitBrake: [464, 422, 35, 58],
  rabbitFall: [392, 481, 63, 23],
  goal: [293, 399, 32, 28],
};
