const test = require('tape');
const TwoD = require('../');
const {
  singleSetTestUnset, 
  tKey, 
  ourRand,
  setNRandomAndCheckInBounds
} = require('./shared');

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
  t.plan(5);

  const bitmap = new TwoD.SparseBitmap();
  const key = tKey('src');
  const [xRand, yRand] = [ourRand(), ourRand()];

  console.log(`using random x,y: ${xRand},${yRand}`);

  await bitmap.set(key, xRand, yRand);
  t.equal(await bitmap.get(key, xRand, yRand), 1);

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
  await setNRandomAndCheckInBounds('42rand', t, 42, new TwoD.SparseBitmap());
});

test('rand random coords', async function (t) {
  const nRand = Math.floor(512 + Math.random() * 512);
  console.log(`using n=${nRand}`);
  await setNRandomAndCheckInBounds(`rand${nRand}rand`, t, nRand, new TwoD.SparseBitmap());
});

test('42 random coords - strict', async function (t) {
  await setNRandomAndCheckInBounds('42rand', t, 42, new TwoD.SparseBitmap(), true);
});

test('rand random coords - strict', async function (t) {
  const nRand = Math.floor(512 + Math.random() * 512);
  console.log(`using n=${nRand}`);
  await setNRandomAndCheckInBounds(`rand${nRand}rand`, t, nRand, new TwoD.SparseBitmap(), true);
});