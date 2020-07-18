const TwoD = require('../../');

const TestingKey = '__testing__';
const OurRandMaxMult = 10;

const tKey = (key) => `${TestingKey}:${key}:${Date.now()}`;
const ourRand = () => Math.round(Math.random() * TwoD.Defaults[TwoD.ChunkWidthKey] * OurRandMaxMult);

async function singleSetTestUnset(key, t, x, y) {
  t.plan(2);

  const bitmap = new TwoD.SparseBitmap();
  key = tKey(key);

  await bitmap.set(key, x, y);
  t.equal(await bitmap.get(key, x, y), 1);
  await bitmap.unset(key, x, y);
  t.equal(await bitmap.get(key, x, y), 0);
}

async function setNRandomAndCheckInBounds(key, t, n, bitmap) {
  t.plan(n + 1);

  key = tKey(`setNRand:${key}`);
  const expectCoords = {};

  const mMax = bitmap[TwoD.ChunkWidthKey] * OurRandMaxMult;
  const limits = { min: [mMax, mMax], max: [0, 0] };

  const chkSetMinMax = (rCoords) => {
    const checkSet = (idx) => {
      if (rCoords[idx] < limits.min[idx]) {
        limits.min[idx] = rCoords[idx];
      } else if (rCoords[idx] > limits.max[idx]) {
        limits.max[idx] = rCoords[idx];
      }
    };

    checkSet(0);
    checkSet(1);
  };

  for (let i = 0; i < n; i++) {
    const rCoords = [ourRand(), ourRand()];
    await bitmap.set(key, rCoords[0], rCoords[1]);

    chkSetMinMax(rCoords);

    if (!(rCoords[0] in expectCoords)) {
      expectCoords[rCoords[0]] = {};
    }

    expectCoords[rCoords[0]][rCoords[1]] = true;
  }

  const inBounds = await bitmap.inBounds(key, {
    from: { x: limits.min[0], y: limits.min[1] },
    to: { x: limits.max[0], y: limits.max[1] }
  }, true);

  t.equal(inBounds.length, n);
  inBounds.forEach((rCoords) => t.true(expectCoords[rCoords[0]][rCoords[1]]));
}

module.exports = {
    singleSetTestUnset,
    setNRandomAndCheckInBounds,
    tKey,
    ourRand,
};
