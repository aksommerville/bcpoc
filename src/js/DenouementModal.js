/* DenouementModal.js
 * Displays at the end of an encounter.
 */
 
import { VideoOut } from "./VideoOut.js";
import { Game } from "./Game.js";
import { InputManager } from "./InputManager.js";

export class DenouementModal {
  static getDependencies() {
    return [Game, VideoOut];
  }
  constructor(game, videoOut) {
    this.game = game;
    this.videoOut = videoOut;
    
    this.blackout = 500;
    this.minigame = null;
    this.consq = null;
    this.victory = false;
    this.awaitInputZero = true;
    this.ack = false;
  }
  
  /* (consq) are the outcome's relative consequences: {
   *   gold: int
   *   hp: int
   * }
   * Consequences are already clamped and applied.
   */
  setup(minigame, victory, consq) {
    this.minigame = minigame;
    this.victory = victory;
    this.consq = consq;
    this.blackout = 500;
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
        this.game.returnFromMinigame();
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
    let peny = 100;
    this.videoOut.renderText(100, peny, "#fff", this.victory ? "YOU WIN!" : "YOU LOSE!");
    peny += 20;
    if (this.consq?.hp) {
      this.videoOut.renderText(100, peny, "#fff", `${ (this.consq.hp > 0) ? "GAINED" : "LOST" } ${Math.abs(this.consq.hp)} HP.`);
      peny += 20;
    }
    if (this.consq?.gold) {
      this.videoOut.renderText(100, peny, "#fff", `${ (this.consq.gold > 0) ? "GAINED" : "LOST" } ${Math.abs(this.consq.gold)} GOLD.`);
      peny += 20;
    }
  }
}
