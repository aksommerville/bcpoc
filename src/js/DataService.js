/* DataService.js
 * Manages static resources. Images etc.
 * Everything gets loaded at once as the game starts up.
 * So accessing individual resources is easy, synchronous, and deterministic.
 */
 
export class DataService {
  static getDependencies() {
    return [Window];
  }
  constructor(window) {
    this.window = window;
    
    this._images = {}; // [name]: Image
    this._loadState = false; // boolean | Promise
  }
  
  load() {
    if (this._loadState instanceof Promise) return this._loadState;
    if (this._loadState) return Promise.resolve(); // already loaded. don't reload or anything
    return this._loadState = Promise.all(DataService.imageNames.map(name => {
      return new Promise((resolve, reject) => {
        const image = new this.window.Image();
        image.addEventListener("load", () => {
          this._images[name] = image;
          resolve();
        });
        image.addEventListener("error", reject);
        image.src = name;
      });
    })).then(() => {
      this._loadState = true;
      return null;
    }).catch(e => {
      this._loadState = false;
      throw e;
    });
  }
  
  getImage(name) {
    return this._images[name];
  }
}

DataService.singleton = true;

DataService.imageNames = [
  "./img/tiles.png",
  "./img/mg01.png",
  "./img/mg02.png",
  "./img/mg03.png",
];
