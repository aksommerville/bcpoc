/* MinigameFactory.js
 */
 
import { Injector } from "./Injector.js";
import { MgFlapping } from "./games/MgFlapping.js";
import { MgStirring } from "./games/MgStirring.js";
import { MgJumprope } from "./games/MgJumprope.js";
/*TODO
import { MgParachute } from "./games/MgParachute.js";
import { MgUmbrella } from "./games/MgUmbrella.js";
import { MgSwearing } from "./games/MgSwearing.js";
import { MgDoding } from "./games/MgDodging.js";
import { MgBalancing } from "./games/MgBalancing.js";
import { MgRollerskates } from "./games/MgRollerskates.js";
import { MgTraffic } from "./games/MgTraffic.js";
import { MgLevitation } from "./games/MgLevitation.js";
/**/

/* Minigame implementations definition.
 *
 * Must be injectable and *not* singleton.
 * Methods:
 *   setup(difficulty, cbComplete(victory)): Called once, directly after construction.
 *   start(): Called once, when the intro splash finished and game begins in earnest.
 *     There's no corresponding (stop) because the minigame itself triggers that, you already know when.
 *   update(elapsedMs, inputState)
 *   render()
 * Static members:
 *   IMAGE_NAME
 * Instance members:
 *   updateDuringSplashes: boolean. Normally update() and render() are only called after start(), and not after the Denouement begins.
 *   actorName: string. For user-visible message. All caps, and do not include an article.
 *   contestName: string. All caps, *do* include an article. (because for some games it should be definite and other indefinite).
 *   difficulty: number. Provided at setup(), and you must retain it.
 */
 
export class MinigameFactory {
  static getDependencies() {
    return [Injector];
  }
  constructor(injector) {
    this.injector = injector;
  }
  
  reset() {
  }
  
  get(id, difficulty, cbComplete) {
    const meta = MinigameFactory.implementations[id-1];
    if (!meta) return null;
    const game = this.injector.get(meta);
    game.setup(difficulty, cbComplete);
    return game;
  }
}

MinigameFactory.singleton = true;

/* TODO Define an interface for these.
 * Each implementation has an id based on its index here.
 */
MinigameFactory.implementations = [
  MgFlapping,
  MgStirring,
  MgJumprope,
  /*TODO
  MgParachute,
  MgUmbrella,
  MgSwearing,
  MgDodging,
  MgBalancing,
  MgRollerskates,
  MgTraffic,
  MgLevitation,
  /**/
];
