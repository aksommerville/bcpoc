/* WorldHero.js
 * Instantiated on demand.
 * The outer world's model is simple enough that I'm not sure we need a general "Sprite" class.
 * Instead, making bespoke objects for every kind of thing that can appear in the outer world.
 */
 
import { WorldScene } from "./WorldScene.js";
import { VideoOut } from "./VideoOut.js";
import { DataService } from "./DataService.js";
import * as K from "./Constants.js";
import { InputManager } from "./InputManager.js";
 
export class WorldHero {
  static getDependencies() {
    return [WorldScene, VideoOut, DataService];
  }
  constructor(worldScene, videoOut, dataService) {
    this.worldScene = worldScene;
    this.videoOut = videoOut;
    this.dataService = dataService;
    
    /* We have a canonical position in exact cells.
     * Animated walking from one cell to the next is purely ornamental.
     * During the walk animation, (x,y) is already the new position.
     * (stepTime) counts down from K.STEP_DURATION_MS.
     * (stepdx,stepdy) are the visual offset direction, ie backward of her motion.
     */
    this.x = 8; // cells
    this.y = 4;
    this.stepTime = 0; // >0 if step in progress
    this.stepdx = 0;
    this.stepdy = 0;
    this.stepRejectTime = 0;
    this.facedx = -1;
    this.facedy = 0;
    this.faceTime = 0; // a brief delay when turning
    
    this.dstx = 0;
    this.dsty = 0;
    
    this.tilesheet = this.dataService.getImage("./img/tiles.png");
  }
  
  update(elapsedMs, input) {
    if (this.stepTime) {
      this.stepTime -= elapsedMs;
      if (this.stepTime <= 0) {
        if (this._finishStep()) return;
        // Pass, allow the next step to begin immediately. (if we didn't launch an encounter)
      } else {
        return;
      }
    } else if (this.stepRejectTime) {
      this.stepRejectTime -= elapsedMs;
      if (this.stepRejectTime <= 0) {
        this.stepRejectTime = 0;
        // Pass, though not as important as the first case.
      } else {
        return;
      }
    } else if (this.faceTime) {
      this.faceTime -= elapsedMs;
      if (this.faceTime <= 0) {
        this.faceTime = 0;
        // Pass.
      } else {
        return;
      }
    }
    if (input & InputManager.BTN_LEFT) this._tryStep(-1, 0);
    else if (input & InputManager.BTN_RIGHT) this._tryStep(1, 0);
    else if (input & InputManager.BTN_UP) this._tryStep(0, -1);
    else if (input & InputManager.BTN_DOWN) this._tryStep(0, 1);
  }
  
  // Call before render, to calculate true position in world pixels.
  // It's separate from render because the camera needs it first to determine its own location.
  commitPosition() {
    this.dstx = this.x * K.TILESIZE + (K.TILESIZE >> 1);
    this.dsty = this.y * K.TILESIZE + (K.TILESIZE >> 1);
    if (this.stepTime) {
      this.dstx += Math.floor((this.stepTime * this.stepdx * K.TILESIZE) / K.STEP_DURATION_MS);
      this.dsty += Math.floor((this.stepTime * this.stepdy * K.TILESIZE) / K.STEP_DURATION_MS);
    } else if (this.stepRejectTime > K.STEP_REJECT_VISUAL_TIME) {
      this.dstx += this.stepdx;
      this.dsty += this.stepdy;
    }
  }
  
  render() {
    let col = 0, xform = 0;
    if (this.facedx < 0) ;
    else if (this.facedx > 0) xform = VideoOut.XFORM_XREV;
    else if (this.facedy < 0) col = 1;
    else col = 2;
    const dstx = this.dstx - this.worldScene.camerax;
    const dsty = this.dsty - this.worldScene.cameray;
    this.videoOut.blitTile(dstx, dsty, this.tilesheet, 0x20 | col, xform); // body
    this.videoOut.blitTile(dstx, dsty - 26, this.tilesheet, 0x10 | col, xform); // head
    //TODO animation
  }
  
  _finishStep() {
    this.stepTime = 0;
    return this.worldScene.advanceEncounter();
  }
  
  _tryStep(dx, dy) {
    if ((dx !== this.facedx) || (dy !== this.facedy)) {
      this.facedx = dx;
      this.facedy = dy;
      this.faceTime = K.CHANGE_DIRECTION_DURATION_MS;
      return;
    }
    const nx = this.x + dx;
    const ny = this.y + dy;
    if (this.cellIsWalkable(nx, ny)) {
      this.stepTime = K.STEP_DURATION_MS;
      this.stepdx = -dx;
      this.stepdy = -dy;
      this.x += dx;
      this.y += dy;
    } else {
      this.stepRejectTime = K.STEP_REJECT_DURATION_MS;
      this.stepdx = dx;
      this.stepdy = dy;
    }
  }
  
  cellIsWalkable(x, y) {
    if (x < 0) return false;
    if (y < 0) return false;
    if (x >= this.worldScene.map.w) return false;
    if (y >= this.worldScene.map.h) return false;
    if (this.worldScene.map.v[y * this.worldScene.map.w + x] >=5) return false;
    return true;
  }
}
