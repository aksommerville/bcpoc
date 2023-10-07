/* MgStirring.js
 * Minigame where you stir a pot.
 */
 
import { VideoOut } from "../VideoOut.js";
import { InputManager } from "../InputManager.js";
import { DataService } from "../DataService.js";
 
export class MgStirring {
  static getDependencies() {
    return [VideoOut, InputManager, DataService];
  }
  constructor(videoOut, inputManager, dataService) {
    this.videoOut = videoOut;
    this.inputManager = inputManager;
    this.dataService = dataService;
    
    this.updateDuringSplashes = false;
    this.actorName = "MOUSE";
    this.contestName = "A STIRRING CONTEST";
    
    this.srcbits = this.dataService.getImage(MgStirring.IMAGE_NAME);
    this.cbComplete = () => {};
    // Define more constants...
    
    this.difficulty = 0.5;
    this.elapsed = 0;
    // Define the rest of volatile state...
  }
  
  setup(difficulty, cbComplete, seed) {
    this.difficulty = difficulty;
    this.cbComplete = cbComplete;
    this.elapsed = 0;
    // Initialize volatile state...
  }
  
  /* Nothing for us to do at start(). We're ready to go after setup().
   * This is normal for minigames that don't interfere with the splashes.
   * But implementing start() is required either way.
   */
  start() {
  }
  
  update(interval, inputState) {
    this.elapsed += interval;
    
    //TODO
  }
  
  render() {
    this.videoOut.fillRect(0, 0, this.videoOut.canvas.width, this.videoOut.canvas.height, MgStirring.BGCOLOR);
    
    //TODO
  }
}

MgStirring.IMAGE_NAME = "./img/mg01.png";

MgStirring.BGCOLOR = "#80a060";

MgStirring.IMAGE_BOUNDS = {
};
