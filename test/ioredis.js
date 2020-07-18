const test = require('tape');
const Redis = require('ioredis');
const TwoD = require('../');

test('construct with lazyConnect ioredis instance', function (t) {
  t.plan(2);
  
  t.doesNotThrow(function () {
    const bitmap = new TwoD.SparseBitmap({
      [TwoD.BackingStoreKey]: new Redis({ lazyConnect: true })
    });

    t.true(bitmap.isPipelineCapable);
  });
});