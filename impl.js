const {
  BackingStoreKey,
  ChunkWidthKey,
  KeyPrefixKey
} = require('./constants');

module.exports = class {
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
  }

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
  }
};