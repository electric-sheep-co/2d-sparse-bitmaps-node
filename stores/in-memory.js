// a very simple, unoptimized store provided as an example implementation & last-chance default
module.exports = class {
  constructor() {
    this.store = {};
  }

  getbit(key, bitPosition) {
    if (key in this.store) {
      const byteIdx = Math.floor(bitPosition / 8);
      const innerPos = (bitPosition % 8);
      const bitMask = 0x80 >> innerPos;
      if (byteIdx in this.store[key]) {
        return (this.store[key][byteIdx] & bitMask) >> (7 - innerPos);
      }
    }

    return 0;
  }

  setbit(key, bitPosition, value) {
    if (!(key in this.store)) {
      this.store[key] = [];
    }

    const byteIdx = Math.floor(bitPosition / 8);
    const bitMask = 0x80 >> (bitPosition % 8);

    // lazily initialize everything up to and including byteIdx, if it isn't already initialized
    if (!(byteIdx in this.store[key])) {
      for (let bi = 0; bi <= byteIdx; bi++) {
        if (!(bi in this.store[key])) {
          this.store[key][bi] = 0;
        }
      }
    }

    if (value == true) {
      this.store[key][byteIdx] |= bitMask;
    } else {
      this.store[key][byteIdx] &= ~bitMask;
    }
  }

  getBuffer(key) {
    if (!(key in this.store)) {
      this.store[key] = [];
    }
    
    return Buffer.from(this.store[key]);
  }
}