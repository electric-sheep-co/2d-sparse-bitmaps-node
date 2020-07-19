const { InMemoryStore } = require('./stores');
const SparseBitmapImpl = require('./impl');
const {
  BackingStoreKey,
  ChunkWidthKey,
  KeyPrefixKey
} = require('./constants');

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
  KeyPrefixKey,
  Defaults
};
