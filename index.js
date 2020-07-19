const BackingStoreKey = 'backingStore';
const ChunkWidthKey = 'chunkWidth';
const KeyPrefixKey = 'keyPrefix';

const Defaults = {
  [ChunkWidthKey]: 128,
  [KeyPrefixKey]: 'twodim-sparse-bitmap',
  Limits: {
    [ChunkWidthKey]: {
      min: 8
    }
  }
};

const LimitChecks = {
  [ChunkWidthKey]: (x) => x >= Defaults.Limits[ChunkWidthKey].min && (x % 8) === 0
};

// a very simple, unoptimized store provided as an example implementation & last-chance default
class InMemoryStore {
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
};

class SparseBitmapImpl {
  constructor(parentFacade) {
    this.parent = parentFacade;
  }

  chunkCoords(x, y) {
    const cWidth = this.parent[ChunkWidthKey];
    return [Math.floor(Number(x) / cWidth), Math.floor(Number(y) / cWidth)];
  }

  bitPosition(chunkXY, x, y) {
    const cWidth = this.parent[ChunkWidthKey];
    return (Number(x) - (chunkXY[0] * cWidth)) + ((Number(y) - (chunkXY[1] * cWidth)) * cWidth);
  }

  key(bmType, cX, cY) {
    return `${this.parent[KeyPrefixKey]}:${bmType}:${cX}:${cY}`;
  }

  async getSet(bmType, x, y, setVal = undefined) {
    const chunk = this.chunkCoords(x, y);
    const bitPos = this.bitPosition(chunk, x, y);
    const [cX, cY] = chunk;

    if (setVal === undefined) {
      return this.parent[BackingStoreKey].getbit(this.key(bmType, cX, cY), bitPos);
    } else {
      return this.parent[BackingStoreKey].setbit(this.key(bmType, cX, cY), bitPos, setVal == true ? 1 : 0);
    }
  };

  async allSetInBounds(bmType, fromX, fromY, toX, toY, strict = false) {
    const rowWidth = this.parent[ChunkWidthKey];
    const [fcX, fcY] = this.chunkCoords(fromX, fromY);
    const [tcX, tcY] = this.chunkCoords(toX, toY);

    let retList = [];
    let bufferGetter = async (bgX, bgY) => this.parent[BackingStoreKey].getBuffer(this.key(bmType, bgX, bgY));

    if (this.parent.isPipelineCapable) {
      const plBuffer = {};

      bufferGetter = async (bgX, bgY) => {
        if (bgX in plBuffer) {
          if (bgY in plBuffer[bgX]) {
            return plBuffer[bgX][bgY];
          }
        }
      };

      const pipeline = this.parent[BackingStoreKey].pipeline();
      for (let wcX = fcX; wcX <= tcX; wcX++) {
        if (!(wcX in plBuffer)) {
          plBuffer[wcX] = {};
        }

        for (let wcY = fcY; wcY <= tcY; wcY++) {
          pipeline.getBuffer(this.key(bmType, wcX, wcY), function (err, result) {
            if (err) {
              throw new Error(`pipeline.getBuffer: shouldn't happen! ${err}`);
            }

            plBuffer[wcX][wcY] = result;
          });
        }
      }

      await pipeline.exec();
      bufferGetter = async (bgX, bgY) => plBuffer[bgX][bgY];
    }

    for (let wcX = fcX; wcX <= tcX; wcX++) {
      for (let wcY = fcY; wcY <= tcY; wcY++) {
        const chunkBytes = await bufferGetter(wcX, wcY);

        if (!chunkBytes || chunkBytes.length < 1) {
          continue;
        }

        for (let cByte = 0; cByte < chunkBytes.length; cByte++) {
          for (let bit = 0; bit < 8; bit++) {
            if (chunkBytes[cByte] & (1 << bit)) {
              let ix = (wcX * rowWidth) + (7 - bit) + ((cByte % (rowWidth / 8)) * 8);
              let iy = ((((7 - bit) + (cByte * 8)) - ix + (wcX * rowWidth)) / rowWidth) + (wcY * rowWidth);
              retList.push([ix, iy]);
            }
          }
        }
      }
    }

    // strict includes *only* coordinates within the specified bounding box, otherwise all coordinates
    // within the *chunks* intersected by the specified bounding box are returned
    if (strict) {
      retList = retList.filter(x => x[0] >= fromX && x[1] >= fromY && x[0] <= toX && x[1] <= toY);
    }

    return retList;
  };
}

class SparseBitmap {
  constructor(options = {}) {
    if (!(ChunkWidthKey in options)) {
      options[ChunkWidthKey] = Defaults[ChunkWidthKey];
    }

    if (!LimitChecks[ChunkWidthKey](options[ChunkWidthKey])) {
      throw new Error(`invalid '${ChunkWidthKey}' ${options[ChunkWidthKey]}`);
    }

    this[ChunkWidthKey] = options[ChunkWidthKey];

    if (!(KeyPrefixKey in options)) {
      options[KeyPrefixKey] = Defaults[KeyPrefixKey];
    }

    this[KeyPrefixKey] = options[KeyPrefixKey];

    if (!(BackingStoreKey in options)) {
      this[BackingStoreKey] = new InMemoryStore();
    } else {
      this[BackingStoreKey] = options[BackingStoreKey];
    }

    // defined here so as to be private to the constructor & defined as an arrow
    // function so as to automatically capture 'this' appropriately
    const backingStoreIsValid = () => {
      const bs = this[BackingStoreKey];
  
      if (!('getbit' in bs) || typeof bs.getbit !== 'function') {
        return false;
      }
      
      if (!('setbit' in bs) || typeof bs.setbit !== 'function') {
        return false;
      }
      
      if (!('getBuffer' in bs) || typeof bs.getBuffer !== 'function') {
        return false;
      }
  
      if ('pipeline' in bs) {
        this.isPipelineCapable = true;
      }
  
      return true;
    };

    if (!backingStoreIsValid()) {
      throw new Error(`invalid object given for '${BackingStoreKey}'`);
    }

    this.coordBoundsCheck = (x, y) => {
      if (x < 0 || y < 0) {
        throw new Error(`coordinate bounds check: ${x},${y}`);
      }
    }

    this.impl = new SparseBitmapImpl(this);
  }

  async get(key, x, y) {
    this.coordBoundsCheck(x, y);
    return this.impl.getSet(key, x, y);
  }

  async set(key, x, y) {
    this.coordBoundsCheck(x, y);
    return this.impl.getSet(key, x, y, 1);
  }

  async unset(key, x, y) {
    this.coordBoundsCheck(x, y);
    return this.impl.getSet(key, x, y, 0);
  }

  async inBounds(key, bounds, strict = false) {
    this.coordBoundsCheck(bounds.from.x, bounds.from.y);
    this.coordBoundsCheck(bounds.to.x, bounds.to.y);
    return this.impl.allSetInBounds(key, bounds.from.x, bounds.from.y, bounds.to.x, bounds.to.y, strict);
  }

  boundToKey(key) {
    return {
      get: this.get.bind(this, key),
      set: this.set.bind(this, key),
      unset: this.unset.bind(this, key),
      inBounds: this.inBounds.bind(this, key)
    }
  }
};

module.exports = {
  SparseBitmap,
  InMemoryStore,
  BackingStoreKey,
  ChunkWidthKey,
  Defaults
};
