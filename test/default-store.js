const test = require('tape');
const TwoDim = require('../');

test('construct with no options', function (t) {
  t.plan(1);
  const defaultInitBitmap = new TwoDim.SparseBitmap();
  t.equal(typeof defaultInitBitmap.backingStore, typeof new TwoDim.DefaultStore());
});
