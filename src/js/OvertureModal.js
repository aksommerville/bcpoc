/* OvertureModal.js
 * Displays at the start of an encounter.
 */
 
import { VideoOut } from "./VideoOut.js";
import { Game } from "./Game.js";
import { InputManager } from "./InputManager.js";

export class OvertureModal {
  static getDependencies() {
    return [Game, VideoOut];
  }
  constructor(game, videoOut) {
    this.game = game;
    this.videoOut = videoOut;
    
    this.blackout = 500;
    this.minigame = null;
    this.awaitInputZero = true;
    this.ack = false;
  }
  
  setup(minigame) {
    this.blackout = 500;
    this.minigame = minigame;
    this.awaitInputZero = true;
    this.ack = false;
  }
  
  update(elapsed, inputState) {
    if (this.blackout) {
      if ((this.blackout -= elapsed) > 0) return;
      this.blackout = 0;
    }
    if (this.awaitInputZero) {
      if (inputState) return;
      if (this.ack) {
        this.game.startMinigame();
        return;
      }
      this.awaitInputZero = false;
    }
    if (inputState & InputManager.BTN_A) {
      this.ack = true;
      this.awaitInputZero = true;
    }
  }
  
  render() {
    this.videoOut.clear();
    this.videoOut.renderText(100, 100, "#fff", `${this.minigame.actorName} CHALLENGES YOU TO`);
    this.videoOut.renderText(100, 120, "#fff", `${this.minigame.contestName}!`);
  }
}
