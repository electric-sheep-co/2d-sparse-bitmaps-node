const test = require('tape');
const TwoDim = require('../');

test('construct with invalid backing store', function(t) {
  t.plan(1);
  t.throws(function () {
    new TwoDim.SparseBitmap({ [TwoDim.BackingStoreKey]: {} });
  });
});

test('construct with invalid chunk widths', function(t) {
  t.plan(2);

  t.throws(function() {
    new TwoDim.SparseBitmap({
      [TwoDim.ChunkWidthKey]: TwoDim.Defaults.Limits[TwoDim.ChunkWidthKey].min - 1
    })
  });
  
  // chunk width must be a power of two
  t.throws(function() {
    new TwoDim.SparseBitmap({
      [TwoDim.ChunkWidthKey]: 23
    })
  });
});