const test = require('tape');
const TwoDim = require('../');

test('construct with invalid backing store', function(t) {
  t.plan(1);
  t.throws(function () {
    new TwoDim.SparseBitmap({ [TwoDim.BackingStoreKey]: {} });
  });
});
