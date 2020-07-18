const test = require('tape');
const Redis = require('ioredis');
const TwoD = require('../');
const shared = require('./shared');

const execWithLocal = async (eFunc) => {
  const bitmap = new TwoD.SparseBitmap({
    [TwoD.BackingStoreKey]: new Redis('localhost', 6379)
  });

  await eFunc(bitmap);
  bitmap[TwoD.BackingStoreKey].disconnect();
};

const singleLocal = async (t, x, y) => 
  execWithLocal(async (bitmap) => shared.singleSetTestUnset('rLocal', t, x, y, bitmap));

test('construct with lazyConnect ioredis instance', function (t) {
  t.plan(2);
  
  t.doesNotThrow(function () {
    const bitmap = new TwoD.SparseBitmap({
      [TwoD.BackingStoreKey]: new Redis({ lazyConnect: true })
    });

    t.true(bitmap.isPipelineCapable);
  });
});

test('local redis - 0,0', async function (t) { await singleLocal(t, 0, 0); });
test('local redis - 0,1', async function (t) { await singleLocal(t, 0, 1); });
test('local redis - 1,0', async function (t) { await singleLocal(t, 1, 0); });
test('local redis - 1,1', async function (t) { await singleLocal(t, 1, 1); });

test('local redis - 42 random, non-strict', async function (t) {
  await execWithLocal(async (bitmap) => shared.setNRandomAndCheckInBounds('r42Rand', t, 42, bitmap));
});

test('local redis - random random, non-strict', async function (t) {
  const nRand = Math.floor(512 + Math.random() * 512);
  console.log(`using n=${nRand}`);
  await execWithLocal(async (bitmap) => shared.setNRandomAndCheckInBounds(`rRand${nRand}Rand`, t, nRand, bitmap));
});

test('local redis - 42 random, strict', async function (t) {
  await execWithLocal(async (bitmap) => shared.setNRandomAndCheckInBounds('r42Rand', t, 42, bitmap, true));
});

test('local redis - random random, strict', async function (t) {
  const nRand = Math.floor(512 + Math.random() * 512);
  console.log(`using n=${nRand}`);
  await execWithLocal(async (bitmap) => shared.setNRandomAndCheckInBounds(`rRand${nRand}Rand`, t, nRand, bitmap, true));
});

test('local redis pipeline compare - default', async function (t) {
  await execWithLocal(async (bitmap) => {
    return shared.setNRandomAndCheckInBounds(`421`, t, 421, bitmap, true);
  });
});

test('local redis pipeline compare - NO pipeline', async function (t) {
  await execWithLocal(async (bitmap) => {
    bitmap.isPipelineCapable = false;
    return shared.setNRandomAndCheckInBounds(`421-NP`, t, 421, bitmap, true);
  });
});