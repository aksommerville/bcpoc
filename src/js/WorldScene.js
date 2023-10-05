/* WorldScene.js
 * Represents the outer world, where Dot explores 2D maps one tile at a time.
 * The map and the set of active sprites can change on the fly.
 * But we are not a singleton: A new WorldScene gets created when Game resets.
 */
 
import { BellaMap } from "./BellaMap.js";
import { VideoOut } from "./VideoOut.js";
import * as K from "./Constants.js";
import { DataService } from "./DataService.js";
import { WorldHero } from "./WorldHero.js";
import { Injector } from "./Injector.js";
import { Game } from "./Game.js";
 
export class WorldScene {
  static getDependencies() {
    return [Injector, VideoOut, DataService, Game];
  }
  constructor(injector, videoOut, dataService, game) {
    this.injector = injector;
    this.videoOut = videoOut;
    this.dataService = dataService;
    this.game = game;
    
    this.map = BellaMap.demo();
    this.hero = this.injector.get(WorldHero, [this]);
    this.camerax = 0;
    this.cameray = 0;
    this.hp = 3;
    this.maxhp = 3;
    this.gold = 0;
    this.encounterCounter = 5; // No fancy encounter-trigger logic for this POC.
    this.encounterIdNext = 1; // Just trigger it every fifth step, and increment the ID.
  }
  
  update(elapsedMs, input) {
    this.hero.update(elapsedMs, input);
  }
  
  render() {
    this.hero.commitPosition();
    this._selectCameraPosition();
    this._renderMap();
    this._renderSprites();
    this._renderOverlay();
  }
  
  _selectCameraPosition() {
    /* If one axis is the framebuffer size or smaller, center it and never move.
     * Otherwise center on the hero, then clamp to edges.
     */
    const mapw = this.map.w * K.TILESIZE;
    const maph = this.map.h * K.TILESIZE;
    if (mapw <= this.videoOut.canvas.width) {
      this.camerax = (mapw >> 1) - (this.videoOut.canvas.width >> 1);
    } else {
      this.camerax = this.hero.dstx - (this.videoOut.canvas.width >> 1);
      if (this.camerax < 0) this.camerax = 0;
      else if (this.camerax + this.videoOut.canvas.width > mapw) this.camerax = mapw - this.videoOut.canvas.width;
    }
    if (maph <= this.videoOut.canvas.height) {
      this.cameray = (maph >> 1) - (this.videoOut.canvas.height >> 1);
    } else {
      this.cameray = this.hero.dsty - (this.videoOut.canvas.height >> 1);
      if (this.cameray < 0) this.cameray = 0;
      else if (this.cameray + this.videoOut.canvas.height > maph) this.cameray = maph - this.videoOut.canvas.height;
    }
  }
  
  _renderMap() {
    //TODO Pre-render the map with a few tiles' margin into a temp image. Tile by tile every frame is murder on the CPU.
    // Experimentally, that should make a difference. But wow we are really eating CPU. 10-20% steady and we're not really doing anything yet.
    if (!this.map) {
      this.videoOut.clear();
      return;
    }
    if ( 
      (this.camerax < 0) || (this.cameray < 0) || 
      (this.camerax + this.videoOut.canvas.width > this.map.w * K.TILESIZE) ||
      (this.cameray + this.videoOut.canvas.height > this.map.h * K.TILESIZE)
    ) {
      this.videoOut.clear();
    }
    const image = this.dataService.getImage("./img/tiles.png");
    const cola = Math.max(0, Math.floor(this.camerax / K.TILESIZE));
    const rowa = Math.max(0, Math.floor(this.cameray / K.TILESIZE));
    const colz = Math.min(this.map.w - 1, Math.floor((this.camerax + this.videoOut.canvas.width - 1) / K.TILESIZE));
    const rowz = Math.min(this.map.h - 1, Math.floor((this.cameray + this.videoOut.canvas.height - 1) / K.TILESIZE));
    const dstx0 = cola * K.TILESIZE + (K.TILESIZE >> 1) - this.camerax;
    let dsty = rowa * K.TILESIZE + (K.TILESIZE >> 1) - this.cameray;
    for (let row=rowa, rowp=rowa*this.map.w+cola; row<=rowz; row++, dsty+=K.TILESIZE, rowp+=this.map.w) {
      for (let col=cola, p=rowp, dstx=dstx0; col<=colz; col++, dstx+=K.TILESIZE, p++) {
        this.videoOut.blitTile(dstx, dsty, image, this.map.v[p]);
      }
    }
  }
  
  _renderSprites() {
    this.hero.render();
  }
  
  _renderOverlay() {
    const image = this.dataService.getImage("./img/tiles.png");
    const heartspacing = 22;
    let dstx = K.TILESIZE >> 1;
    let dsty = K.TILESIZE >> 1;
    for (let i=0; i<this.maxhp; i++, dstx+=heartspacing) {
      this.videoOut.blitTile(dstx, dsty, image, (i < this.hp) ? 0x31 : 0x30, 0);
    }
    dsty += 24;
    dstx = K.TILESIZE >> 1;
    this.videoOut.blitTile(dstx, dsty, image, 0x32, 0);
    dstx += 20;
    const glyphspacing = 12;
    if (this.gold >= 1000) { this.videoOut.blitTile(dstx, dsty, image, 0x33 + Math.floor(this.gold / 1000) % 10, 0); dstx += glyphspacing; }
    if (this.gold >=  100) { this.videoOut.blitTile(dstx, dsty, image, 0x33 + Math.floor(this.gold /  100) % 10, 0); dstx += glyphspacing; }
    if (this.gold >=   10) { this.videoOut.blitTile(dstx, dsty, image, 0x33 + Math.floor(this.gold /   10) % 10, 0); dstx += glyphspacing; }
    this.videoOut.blitTile(dstx, dsty, image, 0x33 + this.gold % 10, 0);
  }
  
  // Called by WorldHero after each step finishes animation. Opportunity to launch an encounter.
  // Returns true if one started.
  advanceEncounter() {
    if (this.encounterCounter--) return;
    this.encounterCounter = 5;
    const difficulty = 0.5; // In real life, this will be a complicated and important calculation. For the POC, I think probably don't scale on difficulty.
    if (this.game.beginEncounter(this.encounterIdNext++, difficulty)) return true;
    if (this.encounterIdNext <= 1) return;
    this.encounterIdNext = 1;
    return this.game.beginEncounter(this.encounterIdNext++, difficulty);
  }
}
