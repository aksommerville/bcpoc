/* MgSwearing.js
 * Swear at a sailor and try to get in the last word.
 */
 
import { VideoOut } from "../VideoOut.js";
import { InputManager } from "../InputManager.js";
import { DataService } from "../DataService.js";
 
export class MgSwearing {
  static getDependencies() {
    return [VideoOut, InputManager, DataService];
  }
  constructor(videoOut, inputManager, dataService) {
    this.videoOut = videoOut;
    this.inputManager = inputManager;
    this.dataService = dataService;
    
    this.updateDuringSplashes = false;
    this.actorName = "SAILOR";
    this.contestName = "A SWEARING CONTEST";
    
    this.srcbits = this.dataService.getImage(MgSwearing.IMAGE_NAME);
    this.cbComplete = () => {};
    const midW = Math.max(MgSwearing.IMG.dotSpeech[2], MgSwearing.IMG.sailorSpeech[2]);
    this.dotSpeechLeft = (this.videoOut.canvas.width >> 1) - (midW >> 1);
    this.sailorSpeechLeft = (this.videoOut.canvas.width >> 1) + (midW >> 1) - MgSwearing.IMG.sailorSpeech[2];
    const footY = Math.round((this.videoOut.canvas.height * 4) / 5);
    this.dotTop = footY - MgSwearing.IMG.dotBehind[3];
    this.sailorTop = footY - MgSwearing.IMG.sailorBehind[3];
    this.dotLeftAhead = this.dotSpeechLeft - MgSwearing.IMG.dotAhead[2] + 15;
    this.dotLeftBehind = this.dotSpeechLeft - MgSwearing.IMG.dotBehind[2];
    this.dotLeftGoof = this.dotSpeechLeft - MgSwearing.IMG.dotGoof[2];
    this.sailorLeftAhead = this.sailorSpeechLeft + MgSwearing.IMG.sailorSpeech[2] - 12;
    this.sailorLeftBehind = this.sailorSpeechLeft + MgSwearing.IMG.sailorSpeech[2];
    this.dotSpeechTop = this.dotTop + 60 - MgSwearing.IMG.dotSpeech[3]; // +60 = about where her mouth is
    this.sailorSpeechTop = this.sailorTop + 40 - MgSwearing.IMG.sailorSpeech[3]; // ''
    this.goofTime = 1000; // ms; forbidden to speak for so long after double talk
    this.gameTime = 5999; // ms
    this.farewellTime = 1000; // ms
    this.sailorSpeechTimeLow = 300; // ms
    this.sailorSpeechTimeHigh = 800;
    this.sailorSpeechProportion = 0.4; // wait for so much of the remaining time to elapse (but no less than sailorSpeechTime)
    
    this.difficulty = 0.5;
    this.elapsed = 0;
    this.speaker = ""; // "" | "dot" | "sailor"
    this.goofClock = 0;
    this.gameClock = this.gameTime;
    this.farewellClock = this.farewellTime;
    this.previousInputState = 0;
    this.speeches = []; // "dot" | "sailor", no more than 2, in rendering order, ie oldest first
    this.sailorSpeechTime = this.sailorSpeechTimeLow;
    this.sailorSpeechClock = 0;
  }
  
  setup(difficulty, cbComplete, seed) {
    this.difficulty = difficulty;
    this.cbComplete = cbComplete;
    this.elapsed = 0;
    this.speaker = "";
    this.goofClock = 0;
    this.gameClock = this.gameTime;
    this.farewellClock = this.farewellTime;
    this.sailorSpeechTime = this.sailorSpeechTimeLow * difficulty + this.sailorSpeechTimeHigh * (1 - difficulty);
    this.sailorSpeechClock = this.sailorSpeechTime;
  }
  
  start() {
  }
  
  update(interval, inputState) {
    this.elapsed += interval;
    
    // Game over? Run out the farewell clock, then report it.
    if (!this.gameClock) {
      if ((this.farewellClock -= interval) <= 0) {
        this.cbComplete(this.speaker === "dot");
      }
      return;
    }
    
    // Check the game clock.
    if ((this.gameClock -= interval) <= 0) {
      this.gameClock = 0;
      return;
    }
    
    // If Dot's goof clock is running, run it down.
    if (this.goofClock) {
      if ((this.goofClock -= interval) <= 0) {
        this.goofClock = 0;
      }
    
    // No goof clock, check for button presses from Dot.
    } else if ((inputState & InputManager.BTN_A) && !(this.previousInputState & InputManager.BTN_A)) {
      if (this.speaker === "dot") {
        this.goofClock = this.goofTime;
      } else {
        this.setSpeaker("dot");
      }
    }
    
    // Sailor speak on a schedule, as long as he's not already speaking. He never goofs.
    if (this.speaker !== "sailor") {
      if ((this.sailorSpeechClock -= interval) <= 0) {
        this.sailorSpeechClock = this.sailorSpeechTime;
        this.setSpeaker("sailor");
      }
    }
    
    this.previousInputState = inputState;
  }
  
  setSpeaker(name) {
    for (let i=this.speeches.length; i-->0; ) {
      if (this.speeches[i] === name) {
        this.speeches.splice(i, 1);
      }
    }
    this.speeches.push(name);
    this.speaker = name;
    if (name !== "sailor") {
      this.sailorSpeechClock = Math.max(this.gameClock * this.sailorSpeechProportion, this.sailorSpeechTime);
    }
  }
  
  render() {
    this.videoOut.fillRect(0, 0, this.videoOut.canvas.width, this.videoOut.canvas.height, MgSwearing.BGCOLOR);
    
    if (this.goofClock) {
      this.videoOut.blitDecal(this.dotLeftGoof, this.dotTop, this.srcbits, MgSwearing.IMG.dotGoof, 0);
    } else if (this.speaker === "dot") {
      this.videoOut.blitDecal(this.dotLeftAhead, this.dotTop, this.srcbits, MgSwearing.IMG.dotAhead, 0);
    } else {
      this.videoOut.blitDecal(this.dotLeftBehind, this.dotTop, this.srcbits, MgSwearing.IMG.dotBehind, 0);
    }
    
    if (this.speaker === "sailor") {
      this.videoOut.blitDecal(this.sailorLeftAhead, this.sailorTop, this.srcbits, MgSwearing.IMG.sailorAhead, 0);
    } else {
      this.videoOut.blitDecal(this.sailorLeftBehind, this.sailorTop, this.srcbits, MgSwearing.IMG.sailorBehind, 0);
    }
    
    for (const speaker of this.speeches) {
      if (speaker === "dot") {
        this.videoOut.blitDecal(this.dotSpeechLeft, this.dotSpeechTop, this.srcbits, MgSwearing.IMG.dotSpeech, 0);
      } else if (speaker === "sailor") {
        this.videoOut.blitDecal(this.sailorSpeechLeft, this.sailorSpeechTop, this.srcbits, MgSwearing.IMG.sailorSpeech, 0);
      }
    }
    
    this.videoOut.renderText((this.videoOut.canvas.width >> 1) - 4, 10, "#fff", Math.floor(this.gameClock / 1000).toString());
  }
}

MgSwearing.IMAGE_NAME = "./img/mg03.png";

MgSwearing.BGCOLOR = "#80a060";

MgSwearing.IMG = {
  dotBehind: [1, 159, 86, 157],
  dotAhead: [88, 219, 101, 157],
  dotGoof: [1, 317, 86, 157],
  dotSpeech: [190, 225, 122, 66],
  sailorBehind: [88, 377, 84, 132],
  sailorAhead: [173, 377, 96, 132],
  sailorSpeech: [190, 292, 135, 84],
};
