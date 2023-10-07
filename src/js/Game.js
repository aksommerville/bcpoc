/* Game.js
 * Top level of game logic.
 * This is an immortal singleton.
 */
 
import { Injector } from "./Injector.js";
import { DataService } from "./DataService.js";
import { VideoOut } from "./VideoOut.js";
import { InputManager } from "./InputManager.js";
import { Clock } from "./Clock.js";
import * as K from "./Constants.js";
import { WorldScene } from "./WorldScene.js";
import { MinigameFactory } from "./MinigameFactory.js";
import { OvertureModal } from "./OvertureModal.js";
import { DenouementModal } from "./DenouementModal.js";
 
export class Game {
  static getDependencies() {
    return [Injector, DataService, VideoOut, InputManager, Clock, MinigameFactory];
  }
  constructor(injector, dataService, videoOut, inputManager, clock, minigameFactory) {
    this.injector = injector;
    this.dataService = dataService;
    this.videoOut = videoOut;
    this.inputManager = inputManager;
    this.clock = clock;
    this.minigameFactory = minigameFactory;
    
    this.running = false;
    this.inputListener = null;
    this.worldScene = null; // Always present when game in progress.
    this.minigame = null; // Overrides worldScene if present.
    this.modal = null; // Overrides minigame if present. TODO generalize modal stacking, three things is too many
    this.inputState = 0;
    this.minigameRandomSeed = 1; // must not be zero
  }
  
  start() {
    this.running = true;
    this.inputListener = this.inputManager.listen((btnid, value, state) => this.onInput(btnid, value, state));
    this.clock.start();
    this.minigameFactory.reset();
    this.worldScene = this.injector.get(WorldScene);
    this.minigame = null;
    this.modal = null;
  }
  
  stop() {
    this.running = false;
    this.clock.stop();
    if (this.inputListener) {
      this.inputManager.unlisten(this.inputListener);
      this.inputListener = null;
    }
    this.worldScene = null;
    this.minigame = null;
    this.modal = null;
  }
  
  update() {
    const interval = this.clock.update();
    if (this.modal) {
      this.modal.update(interval, this.inputState);
      if (this.minigame?.updateDuringSplashes) {
        this.minigame.update(interval, this.inputState);
      }
    } else if (this.minigame) {
      this.minigame.update(interval, this.inputState);
    } else {
      this.worldScene.update(interval, this.inputState);
    }
  }
  
  render() {
    if (this.modal) {
      this.modal.render();
      if (this.minigame?.renderDuringSplashes) this.minigame.render();
    } else if (this.minigame) {
      this.minigame.render();
    } else {
      this.worldScene.render();
    }
  }
  
  onInput(btnid, value, state) {
    this.inputState = state;
  }
  
  /* Returns true if the encounter started up ok.
   * False if anything failed, typically invalid id.
   * (difficulty) in 0..1
   */
  beginEncounter(id, difficulty) {
    const game = this.minigameFactory.get(id, difficulty, (victory) => {
      this.wrapUpEncounter(victory);
    }, this.minigameRandomSeed++);
    if (!game) return false;
    this.minigame = game;
    this.modal = this.injector.get(OvertureModal);
    this.modal.setup(game);
    return true;
  }
  
  // Callback from minigame that it has completed.
  wrapUpEncounter(victory) {
    const consq = this.calculateConsequences(this.minigame, victory);
    this.worldScene.hp += consq.hp;
    this.worldScene.gold += consq.gold;
    this.modal = this.injector.get(DenouementModal);
    this.modal.setup(this.minigame, victory, consq);
  }
  
  // This might belong in WorldScene, not Game.
  calculateConsequences(minigame, victory) {
    let hp = 0;
    let gold = 0;
    if (victory) {
      gold = 1;
    } else {
      hp = -1;
      gold = -5;
    }
    if (this.worldScene.hp + hp < 0) {
      hp = -this.worldScene.hp;
    } else if (this.worldScene.hp + hp > this.worldScene.maxhp) {
      hp = this.worldScene.maxhp - this.worldScene.hp;
    }
    if (this.worldScene.gold + gold < 0) {
      gold = -this.worldScene.gold;
    } else if (this.worldScene.gold + gold > 9999) {
      gold = 9999 - this.worldScene.gold;
    }
    return { hp, gold };
  }
  
  // OvertureModal asks to dismiss itself.
  startMinigame() {
    this.modal = null;
    if (!this.minigame) return;
    this.minigame.start();
  }
  
  // DenouementModal asks to dismiss itself.
  returnFromMinigame() {
    this.modal = null;
    this.minigame = null;
    if (!this.worldScene.hp) {
      //TODO return to main menu? some kind of cutscene?
      console.log(`--- GAME OVER ---`);
      this.start();
    }
  }
}

Game.singleton = true;
