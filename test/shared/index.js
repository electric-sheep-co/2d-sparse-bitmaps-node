const TwoD = require('../../');

const TestingKey = 'testing';
const OurRandMaxMult = 127;

const tKey = (key) => `${TestingKey}:${key}:${Date.now()}`;
const ourRand = () => Math.round(Math.random() * TwoD.Defaults[TwoD.ChunkWidthKey] * OurRandMaxMult);

async function singleSetTestUnset(key, t, x, y, bitmap = undefined) {
  t.plan(2);

  if (!bitmap) {
    bitmap = new TwoD.SparseBitmap();
  }

  key = tKey(key);

  await bitmap.set(key, x, y);
  t.equal(await bitmap.get(key, x, y), 1);
  await bitmap.unset(key, x, y);
  t.equal(await bitmap.get(key, x, y), 0);
}

async function setNRandomAndCheckInBounds(key, t, n, bitmap, strict = false) {
  const _s = process.hrtime.bigint();
  key = tKey(`setNRand:${key}`);
  const expectCoords = {};

  const mMax = bitmap[TwoD.ChunkWidthKey] * OurRandMaxMult;
  const limits = { min: [mMax, mMax], max: [0, 0] };

  const chkSetMinMax = (rCoords) => {
    const checkSet = (idx) => {
      if (rCoords[idx] < limits.min[idx]) {
        limits.min[idx] = rCoords[idx];
      }
      
      if (rCoords[idx] > limits.max[idx]) {
        limits.max[idx] = rCoords[idx];
      }
    };

    checkSet(0);
    checkSet(1);
  };

  for (let i = 0; i < n; i++) {
    let rX, rY;

    do {
      [rX, rY] = [ourRand(), ourRand()];
    } while (rX in expectCoords && rY in expectCoords[rX]);

    await bitmap.set(key, rX, rY);
    chkSetMinMax([rX, rY]);

    if (!(rX in expectCoords)) {
      expectCoords[rX] = {};
    }

    expectCoords[rX][rY] = true;
  }

  const bounds = {
    from: { x: limits.min[0], y: limits.min[1] },
    to: { x: limits.max[0], y: limits.max[1] }
  };

  const bWidth = bounds.to.x - bounds.from.x;
  const bHeight = bounds.to.y - bounds.from.y;
  console.log(`bounds encompass ${bWidth*bHeight} bits (${bWidth} x ${bHeight})`);
  const inBounds = await bitmap.inBounds(key, bounds, strict);
  
  for (let rCoords of inBounds) {
    if (!(rCoords[0] in expectCoords)) {
      t.fail(`row miss - ${rCoords[0]} not in ${Object.keys(expectCoords)}`);
      return;
    }

    const row = expectCoords[rCoords[0]];
    if (!(rCoords[1] in row)) {
      t.fail(`col miss - (${row},${rCoords[1]}) not in ${Object.keys(row)}`);
      return;
    }

    row[rCoords[1]] = false;
  }
  
  if (inBounds.length !== n) {
    t.fail(`lengths mismatch, ${inBounds.length} vs. n=${n}`);
    return;
  }

  console.log(`${key} took ${process.hrtime.bigint() - _s} ns`);
  t.pass(`${key} list matches expected`);
}

module.exports = {
    singleSetTestUnset,
    setNRandomAndCheckInBounds,
    tKey,
    ourRand,
};
