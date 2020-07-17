const BackingStoreKey = 'backingStore';
const ChunkWidthKey = 'chunkWidth';

const Defaults = {
  [ChunkWidthKey]: 128,
  Limits: {
    [ChunkWidthKey]: {
      min: 8
    }
  }
};

const LimitChecks = {
  [ChunkWidthKey]: (x) => x >= Defaults.Limits[ChunkWidthKey].min && (x % 8) === 0
};

class DefaultStore {
  constructor() {
    this.store = {};
  }

  getbit(key, bitPosition) {
    return key in this.store ? this.store[key][bitPosition] : undefined;
  }

  setbit(key, bitPosition, value) {
    if (!(key in this.store)) {
      this.store[key] = [];
    }

    this.store[key][bitPosition] =  value;
  }
};

class SparseBitmap {
  constructor(options = {}) {
    this.options = options;

    if (!(ChunkWidthKey in options)) {
      options[ChunkWidthKey] = Defaults[ChunkWidthKey];
    }

    if (!LimitChecks[ChunkWidthKey](options[ChunkWidthKey])) {
      throw new Error(`invalid '${ChunkWidthKey}' ${options[ChunkWidthKey]}`);
    }

    if (!(BackingStoreKey in options)) {
      this.backingStore = new DefaultStore();
    } else {
      this.backingStore = options[BackingStoreKey];
    }

    if (!this.backingStoreIsValid()) {
      throw new Error(`invalid object given for '${BackingStoreKey}'`);
    }
  }

  backingStoreIsValid() {
    if (!('getbit' in this.backingStore) || typeof this.backingStore.getbit !== 'function') {
      return false;
    }
    
    if (!('setbit' in this.backingStore) || typeof this.backingStore.setbit !== 'function') {
      return false;
    }

    if ('pipeline' in this.backingStore) {
      this.isPipelineCapable = true;
    }

    return true;
  }
};

module.exports = {
  SparseBitmap,
  DefaultStore,
  BackingStoreKey,
  ChunkWidthKey,
  Defaults
};
