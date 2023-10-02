/* InputManager.js
 */
 
export class InputManager {
  static getDependencies() {
    return [Window];
  }
  constructor(window) {
    this.window = window;
    
    this.keyDownListener = null;
    this.keyUpListener = null;
    this.state = 0;
    this.keyMap = {
      ArrowLeft: InputManager.BTN_LEFT,
      ArrowRight: InputManager.BTN_RIGHT,
      ArrowUp: InputManager.BTN_UP,
      ArrowDown: InputManager.BTN_DOWN,
      KeyZ: InputManager.BTN_A,
      KeyX: InputManager.BTN_B,
    };
    this.listeners = [];
    this.nextListenerId = 1;
  }
  
  start() {
    this.keyDownListener = e => this._onKey(e);
    this.keyUpListener = e => this._onKey(e);
    this.window.addEventListener("keydown", this.keyDownListener);
    this.window.addEventListener("keyup", this.keyUpListener);
  }
  
  stop() {
    if (this.keyDownListener) {
      this.window.removeEventListener("keydown", this.keyDownListener);
      this.keyDownListener = null;
    }
    if (this.keyUpListener) {
      this.window.removeEventListener("keyup", this.keyUpListener);
      this.keyUpListener = null;
    }
    this.state = 0;
  }
  
  update() {
  }
  
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
