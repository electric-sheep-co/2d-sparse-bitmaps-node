const test = require('tape');
const TwoDim = require('../');

test('construct with invalid backing store', function(t) {
  t.plan(1);
  t.throws(function () {
    new TwoDim.SparseBitmap({ [TwoDim.BackingStoreKey]: {} });
  });
});

test('construct with invalid chunk widths', function(t) {
  t.plan(3);

  t.throws(function() {
    new TwoDim.SparseBitmap({
      [TwoDim.ChunkWidthKey]: TwoDim.Defaults.Limits[TwoDim.ChunkWidthKey].min - 1
    })
  });
  
  // chunk width must be a multiple of eight
  t.throws(function() {
    new TwoDim.SparseBitmap({
      [TwoDim.ChunkWidthKey]: 23
    })
  });
  
  t.throws(function() {
    new TwoDim.SparseBitmap({
      [TwoDim.ChunkWidthKey]: 12
    })
  });
});