/* InputManager.js
 */
 
export class InputManager {
  static getDependencies() {
    return [Window];
  }
  constructor(window) {
    this.window = window;
    
    this.keyListener = null; // up and down
    this.gamepadListener = null; // connect and disconnect, baffingly there is no "event" event
    this.state = 0;
    this.keyMap = {
      ArrowLeft: InputManager.BTN_LEFT,
      ArrowRight: InputManager.BTN_RIGHT,
      ArrowUp: InputManager.BTN_UP,
      ArrowDown: InputManager.BTN_DOWN,
      KeyZ: InputManager.BTN_A,
      KeyX: InputManager.BTN_B,
    };
    this.gamepads = []; // indexed by (Gamepad.index) and may be sparse.
    this.axisThreshold = 0.25;
    this.listeners = [];
    this.nextListenerId = 1;
  }
  
  start() {
    this.keyListener = e => this._onKey(e);
    this.window.addEventListener("keydown", this.keyListener);
    this.window.addEventListener("keyup", this.keyListener);
    this.gamepadListener = e => this._onGamepad(e);
    this.window.addEventListener("gamepadconnected", this.gamepadListener);
    this.window.addEventListener("gamepaddisconnected", this.gamepadListener);
  }
  
  stop() {
    if (this.keyListener) {
      this.window.removeEventListener("keydown", this.keyListener);
      this.window.removeEventListener("keyup", this.keyListener);
      this.keyListener = null;
    }
    if (this.gamepadListener) {
      this.window.removeEventListener("gamepadconnected", this.gamepadListener);
      this.window.removeEventListener("gamepaddisconnected", this.gamepadListener);
      this.gamepadListener = null;
    }
    this.state = 0;
  }
  
  update() {
    this._updateGamepads();
  }
  
  /* Clients.
   **************************************************************************/
  
  // cb(btnid, value, state)
  //TODO ^ that won't be adequate when we add multiplayer
  listen(cb) {
    const id = this.nextListenerId++;
    this.listeners.push({ cb, id });
    return id;
  }
  
  unlisten(id) {
    const p = this.listeners.findIndex(l => l.id === id);
    if (p < 0) return;
    this.listeners.splice(p, 1);
  }
  
  broadcast(btnid, value, state) {
    for (const { cb } of this.listeners) cb(btnid, value, state);
  }
  
  /* Keyboards.
   *****************************************************************************/
  
  _onKey(event) {
    
    /* Any modifiers down, let the event bubble.
     */
    if (event.altKey || event.ctrlKey || event.shiftKey || event.metaKey) {
      return;
    }
    
    /* Everything else, we consume.
     */
    event.stopPropagation();
    event.preventDefault();
    if (event.repeat) return;
    
    const btnid = this.keyMap[event.code];
    if (!btnid) return;
    if (event.type === "keydown") this._setButton(btnid, 1);
    else this._setButton(btnid, 0);
  }
  
  /* Gamepads.
   ***************************************************************************/
   
  _onGamepad(event) {
    console.log(`InputManager._onGamepad`, event);
    switch (event.type) {
      case "gamepadconnected": {
          this.gamepads[event.gamepad.index] = {
            id: event.gamepad.id,
            axes: [...event.gamepad.axes],
            buttons: event.gamepad.buttons.map(b => b.value),
          };
        } break;
      case "gamepaddisconnected": {
          const gp = this.gamepads[event.gamepad.index];
          delete this.gamepads[event.gamepad.index];
          if (gp) this._zeroGamepad(gp);
        } break;
    }
  }
  
  _zeroGamepad(gp) {
    for (let i=gp.axes.length; i-->0; ) {
      const v = gp.axes[i];
      if (v <= -this.axisThreshold) {
        this._setButton((i & 1) ? InputManager.BTN_UP : InputManager.BTN_LEFT, 0);
      } else if (v >= this.axisThreshold) {
        this._setButton((i & 1) ? InputManager.BTN_DOWN : InputManager.BTN_RIGHT, 0);
      }
    }
    for (let i=gp.buttons.length; i-->0; ) {
      if (gp.buttons[i]) {
        this._setButton((i & 1) ? InputManager.BTN_B : InputManager.BTN_A, 0);
      }
    }
  }
  
  _updateGamepads() {
    const devv = this.window.navigator.getGamepads?.() || [];
    for (const dev of devv) {
      if (!dev) continue;
      const gp = this.gamepads.find(g => g.id === dev.id);
      if (!gp) continue;
      for (let i = dev.axes.length; i-->0; ) {
        const ov = gp.axes[i];
        const nv = dev.axes[i];
        gp.axes[i] = nv;
        const on = (ov <= -this.axisThreshold) ? -1 : (ov >= this.axisThreshold) ? 1 : 0;
        const nn = (nv <= -this.axisThreshold) ? -1 : (nv >= this.axisThreshold) ? 1 : 0;
        if (on === nn) continue;
             if (on < 0) this._setButton((i & 1) ? InputManager.BTN_UP : InputManager.BTN_LEFT, 0);
        else if (on > 0) this._setButton((i & 1) ? InputManager.BTN_DOWN : InputManager.BTN_RIGHT, 0);
             if (nn < 0) this._setButton((i & 1) ? InputManager.BTN_UP : InputManager.BTN_LEFT, 1);
        else if (nn > 0) this._setButton((i & 1) ? InputManager.BTN_DOWN : InputManager.BTN_RIGHT, 1);
      }
      for (let i=dev.buttons.length; i-->0; ) {
        const ov = gp.buttons[i];
        const nv = dev.buttons[i].value;
        if (ov === nv) continue;
        gp.buttons[i] = nv;
        if (nv) this._setButton((i & 1) ? InputManager.BTN_B : InputManager.BTN_A, 1);
        else this._setButton((i & 1) ? InputManager.BTN_B : InputManager.BTN_A, 0);
      }
    }
  }
  
  /* Internal state.
   *********************************************************************************/
  
  _setButton(btnid, value) {
    if (value) {
      if (this.state & btnid) return;
      this.state |= btnid;
    } else {
      if (!(this.state & btnid)) return;
      this.state &= ~btnid;
    }
    this.broadcast(btnid, value, this.state);
  }
}

InputManager.singleton = true;

InputManager.BTN_LEFT = 0x01;
InputManager.BTN_RIGHT = 0x02;
InputManager.BTN_UP = 0x04;
InputManager.BTN_DOWN = 0x08;
InputManager.BTN_A = 0x10; // aka z
InputManager.BTN_B = 0x20; // aka x

InputManager.BTNS_DPAD = InputManager.BTN_LEFT | InputManager.BTN_RIGHT | InputManager.BTN_UP | InputManager.BTN_DOWN;
InputManager.BTNS_THUMB = InputManager.BTN_A | InputManager.BTN_B;
