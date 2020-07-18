const test = require('tape');
const TwoDim = require('../');

const TestingKey = '__testing__';

test('construct with no options', function (t) {
  t.plan(1);
  const defaultInitBitmap = new TwoDim.SparseBitmap();
  t.equal(typeof defaultInitBitmap.backingStore, typeof new TwoDim.DefaultStore());
});

test('single coord', async function (t) {
  t.plan(6);

  const bitmap = new TwoDim.SparseBitmap();
  const ourRand = () => Math.round(Math.random() * TwoDim.Defaults[TwoDim.ChunkWidthKey] * 10);
  const [xRand, yRand] = [ourRand(), ourRand()];

  console.log(`using random x,y: ${xRand},${yRand}`);

  await bitmap.set(TestingKey, xRand, yRand);

  t.equal(await bitmap.get(TestingKey, xRand, yRand), 1);
  t.equal(await bitmap.get(TestingKey, xRand-1, yRand), 0);
  t.equal(await bitmap.get(TestingKey, xRand, yRand-1), 0);

  const boundsAdj = TwoDim.Defaults[TwoDim.ChunkWidthKey] / 2;
  const checkBounds = {
    from: { x: xRand - boundsAdj, y: yRand - boundsAdj },
    to: { x: xRand + boundsAdj, y: yRand + boundsAdj}
  };
  const inBounds = await bitmap.inBounds(TestingKey, checkBounds);
  console.log(`inBounds(${JSON.stringify(checkBounds)}) -> ${JSON.stringify(inBounds)}`);

  t.equal(inBounds.length, 1);
  t.equal(inBounds[0][0], xRand);
  t.equal(inBounds[0][1], yRand);
});
