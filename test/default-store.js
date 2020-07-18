const test = require('tape');
const TwoD = require('../');

const TestingKey = '__testing__';

async function singleSetTestUnset(key, t, x, y) {
  t.plan(2);

  const bitmap = new TwoD.SparseBitmap();
  key = `${TestingKey}:${key}`;

  await bitmap.set(key, x, y);
  t.equal(await bitmap.get(key, x, y), 1);
  await bitmap.unset(key, x, y);
  t.equal(await bitmap.get(key, x, y), 0);
}

test('construct with no options', function (t) {
  t.plan(1);
  const defaultInitBitmap = new TwoD.SparseBitmap();
  t.equal(typeof defaultInitBitmap.backingStore, typeof new TwoD.DefaultStore());
});

test('0,0 coord', async function (t) {
  await singleSetTestUnset('zzc', t, 0, 0);
});

test('0,1 coord', async function (t) {
  await singleSetTestUnset('zzc', t, 0, 1);
});

test('1,0 coord', async function (t) {
  await singleSetTestUnset('zzc', t, 1, 0);
});

test('1,1 coord', async function (t) {
  await singleSetTestUnset('zzc', t, 1, 1);
});

test('single simple coord', async function (t) {
  const coord = TwoD.Defaults[TwoD.ChunkWidthKey] / 2;
  await singleSetTestUnset('ssc', t, coord, coord);
});

test('single random coord', async function (t) {
  t.plan(7);

  const bitmap = new TwoD.SparseBitmap();
  const key = `${TestingKey}:src`;
  const ourRand = () => Math.round(Math.random() * TwoD.Defaults[TwoD.ChunkWidthKey] * 10);
  const [xRand, yRand] = [ourRand(), ourRand()];

  console.log(`using random x,y: ${xRand},${yRand}`);

  await bitmap.set(key, xRand, yRand);

  t.equal(await bitmap.get(key, xRand, yRand), 1);
  t.equal(await bitmap.get(key, xRand-1, yRand), 0);
  t.equal(await bitmap.get(key, xRand, yRand-1), 0);

  const boundsAdj = TwoD.Defaults[TwoD.ChunkWidthKey] / 2;
  const checkBounds = {
    from: { x: xRand - boundsAdj, y: yRand - boundsAdj },
    to: { x: xRand + boundsAdj, y: yRand + boundsAdj}
  };
  const inBounds = await bitmap.inBounds(key, checkBounds);
  console.log(`inBounds(${JSON.stringify(checkBounds)}) -> ${JSON.stringify(inBounds)}`);

  t.equal(inBounds.length, 1);
  t.equal(inBounds[0][0], xRand);
  t.equal(inBounds[0][1], yRand);

  await bitmap.unset(key, xRand, yRand);
  t.equal(await bitmap.get(key, xRand, yRand), 0);
});
