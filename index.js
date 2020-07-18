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
class DefaultStore {
  constructor() {
    this.store = {};
  }

  getbit(key, bitPosition) {
    if (key in this.store) {
      const byteIdx = Math.floor(bitPosition / 8);
      const innerPos = (bitPosition % 8);
      const bitMask = 1 << innerPos;
      if (byteIdx in this.store[key]) {
        return (this.store[key][byteIdx] & bitMask) >> innerPos;
      }
    }

    return 0;
  }

  setbit(key, bitPosition, value) {
    if (!(key in this.store)) {
      this.store[key] = [];
    }

    const byteIdx = Math.floor(bitPosition / 8);
    const bitMask = 1 << (bitPosition % 8);

    // lazily initialize everything up to and including byteIdx that isn't already initialized
    if (!(byteIdx in this.store[key])) {
      for (let bi = 0; bi <= byteIdx; bi++) {
        if (!(bi in this.store[key])) {
          this.store[key][bi] = 0;
        }
      }
    }

    console.log(`setbit(${key}, ${bitPosition}, ${value}) -> byteIdx=${byteIdx} mask=${bitMask} --> ${this.store[key][byteIdx]}`);
    if (value == true) {
      this.store[key][byteIdx] |= bitMask;
    } else {
      this.store[key][byteIdx] &= ~bitMask;
    }
    console.log(`\t----> ${this.store[key][byteIdx]}`);
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
    return [Math.floor(Number(x) / this.parent[ChunkWidthKey]), Math.floor(Number(y) / this.parent[ChunkWidthKey])];
  }

  bitPosition(chunkXY, x, y) {
    return (Number(x) - (chunkXY[0] * this.parent[ChunkWidthKey])) + ((Number(y) - (chunkXY[1] * this.parent[ChunkWidthKey])) * this.parent[ChunkWidthKey]);
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
      return this.parent[BackingStoreKey].setbit(this.key(bmType, cX, cY), bitPos, Number(setVal));
    }
  };

  async allSetInBounds(bmType, fromX, fromY, toX, toY, strict = false) {
    const [fcX, fcY] = this.chunkCoords(fromX, fromY);
    const [tcX, tcY] = this.chunkCoords(toX, toY);
    const rowWidth = this.parent[ChunkWidthKey];
    let retList = [];

    for (let wcX = fcX; wcX <= tcX; wcX++) {
      for (let wcY = fcY; wcY <= tcY; wcY++) {
        const chunkBytes = await this.parent[BackingStoreKey].getBuffer(this.key(bmType, wcX, wcY));
        console.log(`buffer for chunk ${wcX},${wcY}:`);
        console.log(chunkBytes);

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

    // strict includes only blocks within the specified bounding box and sorts them in CW order;
    // otherwise, all blocks within the *chunks* the specified bound box *hits* are included
    if (strict) {
      retList = retList.filter(x => x[0] >= fromX && x[1] >= fromY && x[0] <= toX && x[1] <= toY);

      // sort in clockwise order
      retList.sort((a, b) => {
        const xDiff = a[0] - b[0];
        if (xDiff === 0) {
          return a[1] - b[1];
        }
        return xDiff;
      });
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
      this[BackingStoreKey] = new DefaultStore();
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

  async inBounds(key, bounds) {
    this.coordBoundsCheck(bounds.from.x, bounds.from.y);
    this.coordBoundsCheck(bounds.to.x, bounds.to.y);
    return this.impl.allSetInBounds(key, bounds.from.x, bounds.from.y, bounds.to.x, bounds.to.y);
  }
};

module.exports = {
  SparseBitmap,
  DefaultStore,
  BackingStoreKey,
  ChunkWidthKey,
  Defaults
};
