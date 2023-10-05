/* Injector.js
 * Generic dependency injection.
 */
 
export class Injector {
  static getDependencies() {
    return [Window, Document];
  }
  constructor(window, document) {
    this.window = window;
    this.document = document;
    this._instances = {
      Window: window,
      Document: document,
      Injector: this,
    };
    this._inProgress = [];
  }
  
  get(clazz, overrides) {
    let instance = this._instances[clazz.name];
    if (instance) return instance;
    if (this._inProgress.includes(clazz.name)) {
      throw new Error(`Dependency cycle involving these classes: ${this._inProgress}`);
    }
    this._inProgress.push(clazz.name);
    
    const deps = [];
    if (clazz.getDependencies) {
      for (const dclazz of clazz.getDependencies()) {
        let dinstance = overrides?.find(o => o instanceof dclazz) || this.get(dclazz, overrides);
        deps.push(dinstance);
      }
    }
    instance = new clazz(...deps);
    if (clazz.singleton) this._instances[clazz.name] = instance;
    
    const p = this._inProgress.indexOf(clazz.name);
    if (p >= 0) this._inProgress.splice(p, 1);
    return instance;
  }
}

Injector.singleton = true;
