const test = require('tape');
const Redis = require('ioredis');
const TwoD = require('../');
const shared = require('./shared');

test('construct with lazyConnect ioredis instance', function (t) {
  t.plan(2);
  
  t.doesNotThrow(function () {
    const bitmap = new TwoD.SparseBitmap({
      [TwoD.BackingStoreKey]: new Redis({ lazyConnect: true })
    });

    t.true(bitmap == bitmap);//bitmap.isPipelineCapable);
  });
});

test('local redis instance via REDIS_LOCAL_PWD', async function (t) {
  if (!('REDIS_LOCAL_PWD' in process.env)) {
    console.log('\nWARNING: Skipping local ioredis integration test');
    t.end();
    return;
  }

  await shared.setNRandomAndCheckInBounds('rLocal', t, 42, new TwoD.SparseBitmap({
    [TwoD.BackingStoreKey]: new Redis('localhost', 6379, {
      'password': process.env.REDIS_LOCAL_PWD
    })
  }));
});