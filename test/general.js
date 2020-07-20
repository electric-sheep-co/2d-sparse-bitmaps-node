const test = require('tape');
const TwoD = require('../');

test('Util.Bounds', function(t) {
  const fromList = TwoD.Util.Bounds.fromArray([[1, 1], [42, 42]]);
  t.equal(TwoD.Util.Bounds.toString(fromList), "[41x41: (1,1) -> (42,42)]");
  t.end();
});