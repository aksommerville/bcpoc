/* MgDodging.js
 * Bullet hell minigame.
 */
 
import { VideoOut } from "../VideoOut.js";
import { InputManager } from "../InputManager.js";
import { DataService } from "../DataService.js";

class Player {
  constructor(game, name) {
    this.game = game;
    this.name = name;
    this.decals = MgDodging.IMG[name + "s"];
    this.frame = 0;
    this.frameTime = 200; // ms
    this.frameClock = 0;
    this.xroff = -(this.decals[0][2] >> 1); // render offset
    this.yroff = -(this.decals[0][3] >> 1); // assume same size for all frames
    this.x = 0; // center; !! fp
    this.y = 0; // ''
    this.ox = 0;
    this.oy = 0;
    this.alive = true;
  }
  
  reset() {
    this.frame = 0;
    this.frameClock = this.frameTime;
    this.x = 0;
    this.y = 0;
    this.alive = true;
  }
  
  captureStartPosition() {
    this.ox = this.x;
    this.oy = this.y;
  }
  
  update(interval) {
    if ((this.frameClock -= interval) <= 0) {
      this.frameClock += this.frameTime;
      if ((++this.frame >= this.decals.length)) this.frame = 0;
    }
  }
  
  walk(dx, dy, interval) {
    if (!this.alive) return;
    const walkSpeed = 150; // px/sec TODO do we want to taper on press and release?
    const margin = 10;
    this.x += (dx * walkSpeed * interval) / 1000;
    this.y += (dy * walkSpeed * interval) / 1000;
    this.x = Math.max(margin, Math.min(this.game.videoOut.canvas.width - margin, this.x));
    this.y = Math.max(margin, Math.min(this.game.videoOut.canvas.height - margin, this.y));
  }
}

class Bullet {
  constructor(game, x, y, tx, ty) {
    this.game = game;
    this.x = x; // !! fp
    this.y = y; // !! fp
    this.ox = x;
    this.oy = y;
    if ((x == tx) && (y === ty)) {
      // Might be possible, I'm not sure whether we'll allow Players to rest on the edge.
      // Anyway, it's definitely not possible for a bullet to start dead center, so re-aim there on exact collisions.
      tx = game.videoOut.canvas.width >> 1;
      ty = game.videoOut.canvas.height >> 1;
    }
    this.tx = tx; // for reference only?
    this.ty = ty;
    const distance = Math.sqrt((tx - x) ** 2 + (ty - y) ** 2);
    const nx = (tx - x) / distance;
    const ny = (ty - y) / distance;
    this.dx = nx * game.bulletSpeed; // m/sec
    this.dy = ny * game.bulletSpeed;
    this.dx /= 1000; // m/msec, so we don't have to divide by 1000 at each step
    this.dy /= 1000;
    this.decal = MgDodging.IMG.bullet;
    this.xroff = -(this.decal[2] >> 1);
    this.yroff = -(this.decal[3] >> 1);
    this.frame = -1; // if >= 0, we are neutralized and doing the smokes animation, and will terminate at its end
    this.frameTime = 100; // ms
    this.frameClock = this.frameTime;
  }
  
  // Returns false to remove from game.
  update(interval) {
    if (this.frame >= 0) {
      if ((this.frameClock -= interval) <= 0) {
        this.frameClock += this.frameTime;
        if (++this.frame >= MgDodging.IMG.smokes.length) return false;
        this.decal = MgDodging.IMG.smokes[this.frame];
      }
    }
    this.ox = this.x;
    this.oy = this.y;
    this.x += this.dx * interval;
    this.y += this.dy * interval;
    if (this.x < 0) return false;
    if (this.y < 0) return false;
    if (this.x >= this.game.videoOut.canvas.width) return false;
    if (this.y >= this.game.videoOut.canvas.height) return false;
    return true;
  }
}
 
export class MgDodging {
  static getDependencies() {
    return [VideoOut, InputManager, DataService];
  }
  constructor(videoOut, inputManager, dataService) {
    this.videoOut = videoOut;
    this.inputManager = inputManager;
    this.dataService = dataService;
    
    this.updateDuringSplashes = false;
    this.actorName = "DEER";
    this.contestName = "A DODGING CONTEST";
    
    this.srcbits = this.dataService.getImage(MgDodging.IMAGE_NAME);
    this.cbComplete = () => {};
    this.fireStepDistance = 20; // pixels between where bullets appear
    this.fireStepCount = Math.floor(((this.videoOut.canvas.width + this.videoOut.canvas.height) >> 1) / this.fireStepDistance);
    this.fireDelayLow = 200; // ms
    this.fireDelayHigh = 800; // ms
    this.bulletSpeed = 200; // m/sec TODO vary on difficulty?
    this.playerCollisionRadius = 3;
    this.terminationTime = 1000; // ms; kicks in after a winner is determined AND all bullets have disappeared
    this.deerMixRateLow = 0.1; // units/sec, increase in the deer's circular walk (over her motivated walk)
    this.deerMixRateHigh = 0.3;
    this.deerRotateRate = 5.0; // radians/sec
    this.deerTrackTimeLow = 100; // ms
    this.deerTrackTimeHigh = 500;
    
    this.difficulty = 0.5;
    this.elapsed = 0;
    this.dot = new Player(this, "dot");
    this.deer = new Player(this, "deer");
    this.deerAngle = 0;
    this.deerMix = 0;
    this.deerMixRate = this.deerMixRateLow;
    this.deerTrack = null; // Bullet | null
    this.deerTrackTime = this.deerTrackTimeLow;
    this.deerTrackClock = 0; // ms; while counting down, she will not consider any other bullets
    this.bullets = []; // Bullet
    this.firePhase = 0; // 0..this.fireStepCount-1
    this.fireDelay = this.fireDelayLow;
    this.fireClock = this.fireDelay;
    this.live = true; // false as soon as one player is killed (can change during updates, by design, so only one gets killed)
    this.terminationClock = this.terminationTime;
    this.splatters = []; // {x,y,decal} (x,y) are top-left
  }
  
  setup(difficulty, cbComplete, seed) {
    this.difficulty = difficulty;
    this.cbComplete = cbComplete;
    this.elapsed = 0;
    this.dot.reset();
    this.dot.x = Math.floor((this.videoOut.canvas.width * 1) / 3);
    this.dot.y = this.videoOut.canvas.height >> 1;
    this.deer.reset();
    this.deer.x = Math.floor((this.videoOut.canvas.width * 2) / 3);
    this.deer.y = this.videoOut.canvas.height >> 1;
    this.deerAngle = 0;
    this.deerMix = 0;
    this.deerMixRate = this.deerMixRateLow * difficulty + this.deerMixRateHigh * (1 - difficulty);
    this.deerTrack = null;
    this.deerTrackTime = this.deerTrackTimeLow * difficulty + this.deerTrackTimeHigh * (1 - difficulty);
    this.deerTrackClock = 0;
    this.bullets = [];
    this.firePhase = 0;
    this.fireDelay = this.fireDelayLow * difficulty + this.fireDelayHigh * (1 - difficulty);
    this.fireClock = this.fireDelay;
    this.live = true;
    this.terminationClock = this.terminationTime;
    this.splatters = [];
  }
  
  start() {
  }
  
  update(interval, inputState) {
    this.elapsed += interval;
    
    // Generate bullets on a timer, as long as we are (live).
    if (this.live) {
      if ((this.fireClock -= interval) <= 0) {
        this.fireClock += this.fireDelay;
        this.fire();
      }
    }
    
    for (let i=this.bullets.length; i-->0; ) {
      const bullet = this.bullets[i];
      if (!bullet.update(interval)) {
        this.bullets.splice(i, 1);
      }
    }
    
    this.dot.captureStartPosition();
    this.deer.captureStartPosition();
    
    let dx = 0, dy = 0;
    switch (inputState & (InputManager.BTN_LEFT | InputManager.BTN_RIGHT)) {
      case InputManager.BTN_LEFT: dx = -1; break;
      case InputManager.BTN_RIGHT: dx = 1; break;
    }
    switch (inputState & (InputManager.BTN_UP | InputManager.BTN_DOWN)) {
      case InputManager.BTN_UP: dy = -1; break;
      case InputManager.BTN_DOWN: dy = 1; break;
    }
    this.dot.walk(dx, dy, interval);
    
    if (this.deer.alive && this.live) this.moveDeer(interval);
    
    this.dot.update(interval);
    this.deer.update(interval);
    
    if (this.live) {
      this.detectAndResolveCollisions();
    }
    
    // Game is complete when (live) has gone false, the last bullet leaves the scene, and our termination clock winds down.
    if (!this.live && !this.bullets.length) {
      if ((this.terminationClock -= interval) <= 0) {
        this.cbComplete(this.dot.alive);
      }
    }
  }
  
  moveDeer(interval) {
    const [mdx, mdy] = this.selectMotivatedDeerStep(interval);
    const [cdx, cdy] = this.selectCircularDeerStep(interval);
    const dx = mdx * (1 - this.deerMix) + cdx * this.deerMix;
    const dy = mdy * (1 - this.deerMix) + cdy * this.deerMix;
    if (!dx && !dy) return;
    const distance = Math.sqrt(dx ** 2 + dy ** 2);
    this.deer.walk(dx / distance, dy / distance, interval);
    if ((this.deerMix += (this.deerMixRate * interval) / 1000) >= 1) this.deerMix = 1;
  }
  
  selectMotivatedDeerStep(interval) {
    let nearest = null, distance;
    if (this.deerTrackClock) {
      if ((this.deerTrackClock -= interval) > 0) {
        nearest = this.deerTrack;
      } else {
        this.deerTrackClock = 0;
      }
    }
    if (nearest) {
      distance = Math.sqrt((nearest.x - this.deer.x) ** 2 + (nearest.y - this.deer.y) ** 2);
    } else {
      let nearestScore = 999999999;
      for (const bullet of this.bullets) {
        const score = (bullet.x - this.deer.x) ** 2 + (bullet.y - this.deer.y) ** 2;
        if (score < nearestScore) {
          nearest = bullet;
          nearestScore = score;
        }
      }
      if (!nearest) return [0, 0];
      distance = Math.sqrt(nearestScore);
    }
    if (nearest !== this.deerTrack) {
      this.deerTrack = nearest;
      this.deerTrackClock = this.deerTrackTime;
    }
    const nx = (this.deer.x - nearest.x) / distance;
    const ny = (this.deer.y - nearest.y) / distance;
    return [nx, ny];
  }
  
  selectCircularDeerStep(interval) {
    const dx = Math.cos(this.deerAngle);
    const dy = -Math.sin(this.deerAngle);
    if ((this.deerAngle += (this.deerRotateRate * interval) / 1000) >= Math.PI) {
      this.deerAngle -= Math.PI * 2;
    }
    return [dx, dy];
  }
  
  /* Bullets are in constant motion, so are represented by a zero-width line segment.
   * Players are circles when standing still, or line segments like Bullets when moving.
   * Deer first, so Dot wins ties.
   */
  detectAndResolveCollisions() {
    this.collideForPlayer(this.deer);
    if (!this.live) return;
    this.collideForPlayer(this.dot);
  }
  
  collideForPlayer(player) {
    if (!player.alive) return;
    let bullet = null;
    if ((player.x === player.ox) && (player.y === player.oy)) { // stationary; circle
      bullet = this.findBulletForCircle(player.x, player.y, this.playerCollisionRadius);
    } else {
      bullet = this.findBulletForLine(player.ox, player.oy, player.x, player.y);
    }
    if (!bullet) return;
    this.generateSplatter(player.x, player.y, bullet.dx, bullet.dy);
    player.alive = false;
    this.live = false;
    this.neutralizeBullets(bullet);
  }
  
  findBulletForCircle(x, y, radius) {
    const r2 = radius * radius;
    for (const bullet of this.bullets) {
      const rej2 = Math.abs((bullet.y - bullet.oy) * (x - bullet.ox) - (bullet.x - bullet.ox) * (y - bullet.oy));
      if (rej2 > r2) continue;
      const linelen = Math.sqrt((bullet.x - bullet.ox) ** 2 + (bullet.y - bullet.oy) ** 2);
      const proj = ((bullet.y - bullet.oy) * (y - bullet.oy) + (bullet.x - bullet.ox) * (x - bullet.ox)) / linelen;
      if (proj < -radius) continue;
      if (proj > linelen + radius) continue;
      return bullet;
    }
    return null;
  }
  
  findBulletForLine(ax, ay, bx, by) {
    const cx = bx - ax;
    const cy = by - ay;
    for (const bullet of this.bullets) {
      const dx = bullet.x - ax;
      const dy = bullet.y - ay;
      const ex = bullet.ox - ax;
      const ey = bullet.oy - ay;
      const cpd = cy * dx - cx * dy;
      const cpe = cy * ex - cx * ey;
      if ((cpd < 0) && (cpe < 0)) continue;
      if ((cpd > 0) && (cpe > 0)) continue;
      // Bullet's line is on opposite sides of the hero's, or one endpoint coincides.
      const cpa = (ax - bullet.ox) * (bullet.y - bullet.oy) - (ay - bullet.oy) * (bullet.x - bullet.ox);
      const cpb = (bx - bullet.ox) * (bullet.y - bullet.oy) - (by - bullet.oy) * (bullet.x - bullet.ox);
      if ((cpa < 0) && (cpb < 0)) continue;
      if ((cpa > 0) && (cpb > 0)) continue;
      return bullet;
    }
    return null;
  }
  
  /* After one player gets shot, the other is safe forever.
   * Illustrate this by making all bullets disappear in a puff of smoke, except the culprit.
   */
  neutralizeBullets(except) {
    for (const bullet of this.bullets) {
      if (bullet === except) continue;
      bullet.frame = 0;
      bullet.frameClock = bullet.frameTime;
      bullet.decal = MgDodging.IMG.smokes[0];
    }
  }
  
  generateSplatter(x, y, dx, dy) {
    let nx = 0, ny = 0;
    if (dx || dy) {
      const distance = Math.sqrt(dx ** 2 + dy ** 2);
      nx = dx / distance;
      ny = dy / distance;
    }
    const randomization = 4; // splatter is cosmetic only, so we are going to use Math.random instead of forcing a deterministic generator.
    let step = 0.5;
    for (const decal of MgDodging.IMG.bloods) {
      this.splatters.push({
        x: Math.round(x + Math.random() * randomization),
        y: Math.round(y + Math.random() * randomization),
        decal,
      });
      x += nx * step;
      y += ny * step;
      step *= 1.5;
    }
  }
  
  /* Generate four bullets at symmetric positions on the edge according to (this.firePhase).
   * The two on the left aim at deer (who starts on right), and the right ones aim at dot (who starts on left).
   * Then advance firePhase.
   */
  fire() {
    const xfold = this.videoOut.canvas.width >> 1;
    let dx = this.firePhase * this.fireStepDistance, dy = 0;
    if (dx >= xfold) {
      dy = dx - xfold;
      dx = xfold;
    }
    this.generateBullet(xfold - dx, dy, this.deer.x, this.deer.y);
    this.generateBullet(xfold - dx, this.videoOut.canvas.height - dy, this.deer.x, this.deer.y);
    this.generateBullet(xfold + dx, dy, this.dot.x, this.dot.y);
    this.generateBullet(xfold + dx, this.videoOut.canvas.height - dy, this.dot.x, this.dot.y);
    if (++this.firePhase >= this.fireStepCount) this.firePhase = 0;
  }
  
  generateBullet(x, y, tx, ty) {
    const bullet = new Bullet(this, x, y, tx, ty);
    this.bullets.push(bullet);
  }
  
  render() {
    this.videoOut.fillRect(0, 0, this.videoOut.canvas.width, this.videoOut.canvas.height, MgDodging.BGCOLOR);
    
    for (const splatter of this.splatters) {
      this.videoOut.blitDecal(splatter.x, splatter.y, this.srcbits, splatter.decal, 0);
    }
    
    if (this.dot.alive) {
      this.videoOut.blitDecal(
        Math.round(this.dot.x + this.dot.xroff),
        Math.round(this.dot.y + this.dot.yroff),
        this.srcbits, this.dot.decals[this.dot.frame], 0
      );
    }
    if (this.deer.alive) {
      this.videoOut.blitDecal(
        Math.round(this.deer.x + this.deer.xroff),
        Math.round(this.deer.y + this.deer.yroff),
        this.srcbits, this.deer.decals[this.deer.frame], 0
      );
    }
    
    for (const bullet of this.bullets) {
      this.videoOut.blitDecal(Math.round(bullet.x + bullet.xroff), Math.round(bullet.y + bullet.yroff), this.srcbits, bullet.decal, 0);
    }
  }
}

MgDodging.IMAGE_NAME = "./img/mg03.png";

MgDodging.BGCOLOR = "#20a030";

MgDodging.IMG = {
  dots: [ // all same size
    [369, 80, 10, 14],
    [380, 80, 10, 14],
    [391, 80, 10, 14],
  ],
  deers: [ // all same size
    [402, 80, 10, 12],
    [413, 80, 10, 12],
    [424, 80, 10, 12],
  ],
  bullet: [435, 80, 5, 5],
  bloods: [ // sort roughly large-to-small; they generate in this order, in the direction of the bullet's travel
    [441, 81, 4, 4],
    [446, 80, 4, 4],
    [444, 85, 6, 3],
    [435, 86, 5, 4],
    [441, 89, 4, 3],
    [442, 85, 2, 2],
    [446, 89, 2, 2],
    [449, 89, 1, 2],
  ],
  smokes: [ // all same size (not the size of the bullet; center on it)
    [451, 80, 9, 9],
    [461, 82, 9, 9],
    [471, 82, 9, 9],
    [481, 82, 9, 9],
  ],
};
