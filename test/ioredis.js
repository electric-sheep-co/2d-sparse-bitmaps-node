const test = require('tape');
const Redis = require('ioredis');
const TwoDim = require('../');

test('construct with lazyConnect ioredis instance', function (t) {
  t.plan(2);
  
  t.doesNotThrow(function () {
    const bitmap = new TwoDim.SparseBitmap({
      [TwoDim.BackingStoreKey]: new Redis({ lazyConnect: true })
    });

    t.true(bitmap.isPipelineCapable);
  });
});