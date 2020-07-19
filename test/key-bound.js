const test = require('tape');
const TwoD = require('../');
const shared = require('./shared');

test('simple key-bound test', async function (t) {
  const key = shared.tKey('key-bound.simple');
  const bitmap = new TwoD.SparseBitmap();
  const keyBitmap = bitmap.boundToKey(key);

  await keyBitmap.set(1, 2);
  let verify = await bitmap.get(key, 1, 2);
  t.equal(verify, 1, 'set-test');

  await bitmap.set(key, 31, 149);
  verify = await keyBitmap.get(31, 149);
  t.equal(verify, 1, 'set-test-inv');

  const keyBounds = await keyBitmap.inBounds({
    from: { x: 0, y: 0 },
    to: { x: 32, y: 192 }
  }, true);

  t.equal(keyBounds.length, 2, 'keyBounds.length');

  keyBounds.forEach((x) => {
    if (!(x[0] === 1 || x[0] === 31)) {
      t.fail(`forEach-x ${x}`);
    }

    if (!(x[1] === 2 || x[1] === 149)) {
      t.fail(`forEach-y ${x}`);
    }
  })

  t.pass('simple key-bound');
});