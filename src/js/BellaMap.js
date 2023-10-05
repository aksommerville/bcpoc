/* BellaMap.js
 */
 
import * as K from "./Constants.js";
 
export class BellaMap {
  constructor(w, h) {
    this.w = w;
    this.h = h;
    this.v = new Uint8Array(w * h);
  }
  
  static demo() { //XXX
    const map = new BellaMap(K.FB_COLC * 4, K.FB_ROWC * 2);
    for (let x=0, p=(map.h-1)*map.w; x<map.w; x++, p++) {
      map.v[x] = 0x06;
      map.v[p] = 0x06;
    }
    for (let y=0, p1=0, p2=map.w-1; y<map.h; y++, p1+=map.w, p2+=map.w) {
      map.v[p1] = 0x06;
      map.v[p2] = 0x06;
    }
    map.v[3*map.w+2] = 0x05;
    for (let i=map.w*map.h; i-->0; ) {
      if (map.v[i]) continue;
      map.v[i] = Math.floor(Math.random() * 5);
    }
    return map;
  }
}
