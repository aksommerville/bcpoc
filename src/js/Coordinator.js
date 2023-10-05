/* Coordinator.js
 * Top of the pyramid.
 */
 
import { VideoOut } from "./VideoOut.js";
import { InputManager } from "./InputManager.js";
import { Game } from "./Game.js";
import { DataService } from "./DataService.js";

export class Coordinator {
  static getDependencies() {
    return [Window, VideoOut, InputManager, Game, DataService];
  }
  constructor(window, videoOut, inputManager, game, dataService) {
    this.window = window;
    this.videoOut = videoOut;
    this.inputManager = inputManager;
    this.game = game;
    this.dataService = dataService;
    
    this.animationFrame = null;
    this.running = false;
  }
  
  start() {
    this.dataService.load().then(() => {
      this.videoOut.attachToDom();
      this.inputManager.start();
      this.game.start();
      this.running = true;
      this.animationFrame = this.window.requestAnimationFrame(() => this._onFrame());
    }).catch((e) => {
      console.error(`Failed to load data.`, e);
    });
  }
  
  stop() {
    if (this.animationFrame) {
      this.window.cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }
    this.game.stop();
    this.videoOut.neutralizeImage();
    this.videoOut.detachFromDom();
    this.inputManager.stop();
    this.running = false;
  }
  
  _onFrame() {
    this.animationFrame = null;
    if (!this.running) return;
    this.inputManager.update();
    this.game.update();
    this.game.render();
    this.animationFrame = this.window.requestAnimationFrame(() => this._onFrame());
  }
}

Coordinator.singleton = true;
