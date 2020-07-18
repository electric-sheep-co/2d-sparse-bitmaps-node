const test = require('tape');
const TwoD = require('../');

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

test('construct with no options', function (t) {
  t.plan(1);
  const defaultInitBitmap = new TwoD.SparseBitmap();
  t.equal(typeof defaultInitBitmap.backingStore, typeof new TwoD.InMemoryStore());
});

test('0,0 coord', async function (t) { await singleSetTestUnset('00', t, 0, 0); });
test('0,1 coord', async function (t) { await singleSetTestUnset('01', t, 0, 1); });
test('1,0 coord', async function (t) { await singleSetTestUnset('10', t, 1, 0); });
test('1,1 coord', async function (t) { await singleSetTestUnset('11', t, 1, 1); });

test('small chunk', async function (t) {
  t.plan(4);

  const scBitmap = new TwoD.SparseBitmap({
    [TwoD.ChunkWidthKey]: 16
  });

  const key = tKey('small');
  await scBitmap.set(key, 0, 17);
  t.equal(await scBitmap.get(key, 0, 17), 1);
  const inBounds = await scBitmap.inBounds(key, {
    from: { x: 0, y: 0 },
    to: { x: 32, y: 32 }
  });

  t.equal(inBounds.length, 1);
  t.equal(inBounds[0][0], 0);
  t.equal(inBounds[0][1], 17);
});

test('single simple coord', async function (t) {
  const coord = TwoD.Defaults[TwoD.ChunkWidthKey] / 2;
  await singleSetTestUnset('ssc', t, coord, coord);
});

test('single random coord', async function (t) {
  t.plan(7);

  const bitmap = new TwoD.SparseBitmap();
  const key = tKey('src');
  const [xRand, yRand] = [ourRand(), ourRand()];

  console.log(`using random x,y: ${xRand},${yRand}`);

  await bitmap.set(key, xRand, yRand);

  t.equal(await bitmap.get(key, xRand, yRand), 1);
  t.equal(await bitmap.get(key, xRand-1, yRand), 0);
  t.equal(await bitmap.get(key, xRand, yRand-1), 0);

  const boundsAdj = TwoD.Defaults[TwoD.ChunkWidthKey] / 2;
  const inBounds = await bitmap.inBounds(key, {
    from: { x: Math.max(xRand - boundsAdj, 0), y: Math.max(yRand - boundsAdj, 0) },
    to: { x: xRand + boundsAdj, y: yRand + boundsAdj}
  });

  t.equal(inBounds.length, 1);
  t.equal(inBounds[0][0], xRand);
  t.equal(inBounds[0][1], yRand);

  await bitmap.unset(key, xRand, yRand);
  t.equal(await bitmap.get(key, xRand, yRand), 0);
});

test('42 random coords', async function (t) {
  t.plan(43);

  const key = tKey('42rand');
  const expectCoords = {};
  const bitmap = new TwoD.SparseBitmap();

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

  for (let i = 0; i < 42; i++) {
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

  t.equal(inBounds.length, 42);
  inBounds.forEach((rCoords) => t.true(expectCoords[rCoords[0]][rCoords[1]]));
});