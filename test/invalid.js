const test = require('tape-promise').default(require('tape'));
const TwoD = require('../');

test('construct with invalid backing store', function(t) {
  t.plan(1);
  t.throws(function () {
    new TwoD.SparseBitmap({ [TwoD.BackingStoreKey]: {} });
  });
});

test('construct with invalid chunk widths', function(t) {
  t.plan(3);

  t.throws(function() {
    new TwoD.SparseBitmap({
      [TwoD.ChunkWidthKey]: TwoD.Defaults.Limits[TwoD.ChunkWidthKey].min - 1
    })
  });
  
  // chunk width must be a multiple of eight
  t.throws(function() { new TwoD.SparseBitmap({ [TwoD.ChunkWidthKey]: 23 }); });
  t.throws(function() { new TwoD.SparseBitmap({ [TwoD.ChunkWidthKey]: 12 }); });
});

test('negative coordinate', async function (t) {
  t.plan(1);
  t.rejects(async function() {
    const bitmap = new TwoD.SparseBitmap();
    await bitmap.get('negcoord', -1, -1); 
  });
});

test('call invalid functions within pipelinedMutate context', async function (t) {
  t.plan(2);

  const fauxPipelinedStore = new TwoD.InMemoryStore();
  fauxPipelinedStore.pipeline = () => {};

  const bitmap = new TwoD.SparseBitmap({ [TwoD.BackingStoreKey]: fauxPipelinedStore });

  t.rejects(async function() { await bitmap.get('', -1, -1); }, 'get');
  t.rejects(async function() { await bitmap.inBounds('', {}); }, 'inBounds');
});
