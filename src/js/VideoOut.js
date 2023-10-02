/* VideoOut.js
 * Manages a <canvas> which must already exist.
 */
 
import * as K from "./Constants.js";
 
export class VideoOut {
  static getDependencies() {
    return [Window, Document];
  }
  constructor(window, document) {
    this.window = window;
    this.document = document;
    
    this.canvas = null;
    this.context = null;
  }
  
  attachToDom() {
    if (this.canvas) return;
    if (!(this.canvas = this.document.querySelector("canvas#mainview"))) {
      throw new Error(`canvas#mainview not found`);
    }
    this.canvas.width = K.FBW;
    this.canvas.height = K.FBH;
    this.context = this.canvas.getContext("2d");
  }
  
  detachFromDom() {
    if (!this.canvas) return;
    this.canvas = null;
    this.context = null;
  }
  
  /* Rendering.
   ************************************************************************/
   
  clear() {
    if (!this.context) return;
    this.context.fillStyle = "#000";
    this.context.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }
   
  //TODO xform
  blit(dstx, dsty, src, srcx, srcy, w, h) {
    if (!this.context) return;
    this.context.drawImage(src, srcx, srcy, w, h, dstx, dsty, w, h);
  }
  
  // (dstx,y) is the center. TODO xform
  blitTile(dstx, dsty, src, tileid) {
    if (!this.context) return;
    dstx -= K.TILESIZE >> 1;
    dsty -= K.TILESIZE >> 1;
    const srcx = (tileid & 0x0f) * K.TILESIZE;
    const srcy = (tileid >> 4) * K.TILESIZE;
    this.context.drawImage(src, srcx, srcy, K.TILESIZE, K.TILESIZE, dstx, dsty, K.TILESIZE, K.TILESIZE);
  }
}

VideoOut.singleton = true;
