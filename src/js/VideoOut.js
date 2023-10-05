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
    
    // In real life we will render text from a private tilesheet in a private encoding.
    // That's too much effort for the POC, so we'll be using CanvasRenderingContext2D facilities here.
    this.context.font = "bold 12pt sans-serif";
    this.context.textAlign = "left";
    this.context.textBaseline = "top";
    this.context.direction = "ltr";
  }
  
  detachFromDom() {
    if (!this.canvas) return;
    this.canvas = null;
    this.context = null;
  }
  
  /* Rendering.
   ************************************************************************/
  
  // Do this before detaching, so we can see that it's detached.
  neutralizeImage() {
    if (!this.context) return;
    this.context.fillStyle = "#000";
    this.context.globalAlpha = 0.75;
    this.context.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }
   
  clear() {
    if (!this.context) return;
    this.context.fillStyle = "#000";
    this.context.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }
  
  fillRect(x, y, w, h, color) {
    if (!this.context) return;
    this.context.fillStyle = color;
    this.context.fillRect(x, y, w, h);
  }
   
  blit(dstx, dsty, src, srcx, srcy, w, h, xform) {
    if (!this.context) return;
    if (xform) {
      this.context.save();
      this.context.translate(
        dstx + ((xform & VideoOut.XFORM_XREV) ? w : 0),
        dsty + ((xform & VideoOut.XFORM_YREV) ? h : 0)
      );
      this.context.scale(
        (xform & VideoOut.XFORM_XREV) ? -1 : 1,
        (xform & VideoOut.XFORM_YREV) ? -1 : 1
      );
      this.context.drawImage(src, srcx, srcy, w, h, 0, 0, w, h);
      this.context.restore();
    } else {
      this.context.drawImage(src, srcx, srcy, w, h, dstx, dsty, w, h);
    }
  }
  
  // (dstx,y) is the center.
  blitTile(dstx, dsty, src, tileid, xform) {
    dstx -= K.TILESIZE >> 1;
    dsty -= K.TILESIZE >> 1;
    let srcx = (tileid & 0x0f) * K.TILESIZE;
    let srcy = (tileid >> 4) * K.TILESIZE;
    this.blit(dstx, dsty, src, srcx, srcy, K.TILESIZE, K.TILESIZE, xform);
  }
  
  // (srcr) is [x,y,w,h], i expect it will be common to have them like that.
  blitDecal(dstx, dsty, src, srcr, xform) {
    this.blit(dstx, dsty, src, srcr[0], srcr[1], srcr[2], srcr[3], xform);
  }
  
  renderText(x, y, color, src) {
    if (!this.context) return;
    this.context.fillStyle = color;
    this.context.fillText(src, x, y);
  }
}

VideoOut.singleton = true;

VideoOut.XFORM_XREV = 0x01;
VideoOut.XFORM_YREV = 0x02;
// We do not offer a SWAP transform. But we're using a general transform so it wouldn't be a big deal. TODO?
