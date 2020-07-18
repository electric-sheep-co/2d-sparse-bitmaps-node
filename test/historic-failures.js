
const test = require('tape');
const shared = require('./shared');
const TwoD = require('../');

test('historic - (1138,0)', async function (t) {
  await shared.singleSetTestUnset('ssc', t, 1138, 0);
});

test('historic - out-of-bounds 1', async function (t) {
  const bitmap = new TwoD.SparseBitmap();
  let exCount = 0;

  for (let row of Object.keys(oob1Expected)) {
    const colObj = oob1Expected[row];
    for (let col of Object.keys(colObj)) {
      await bitmap.set('hist-oob1', row, col);
      exCount++;
    }
  }

  if (exCount !== oob1ExpectedNum) {
    t.fail(`exCount ${exCount}`);
    return;
  }

  const inCheckBounds = await bitmap.inBounds('hist-oob1', oob1CheckBounds, true);

  for (let chkCoord of inCheckBounds) {
    let [cX, cY] = chkCoord;

    if (!(cX in oob1Expected)) {
      t.fail(`row ${cX}`);
      return;
    }

    if (!(cY in oob1Expected[cX])) {
      t.fail(`col ${cX},${cY}`);
      return;
    }

    oob1Expected[cX][cY] = null;
  }

  const leftover = [];
  Object.keys(oob1Expected).forEach((row) => {
    const colObj = oob1Expected[row];
    Object.keys(colObj).forEach((col) => {
      if (colObj[col] !== null) {
        leftover.push([row, col]);
      }
    });
  });

  if (leftover.length) {
    t.fail(`leftovers! ${JSON.stringify(leftover)}`);
    return;
  }

  if (inCheckBounds.length !== exCount) {
    t.fail(`inCheckBounds.length ${inCheckBounds.length}`);
    return;
  }

  t.pass('historic - out-of-bounds 1');
});

const oob1ExpectedNum = 42;

const oob1CheckBounds = {"from":{"x":22,"y":35},"to":{"x":1275,"y":1167}};

const oob1Expected = {
  "22": {
    "1134": false
  },
  "151": {
    "489": false
  },
  "167": {
    "915": false
  },
  "169": {
    "710": false
  },
  "226": {
    "81": false
  },
  "229": {
    "1167": true
  },
  "235": {
    "887": false
  },
  "267": {
    "570": false
  },
  "270": {
    "445": false
  },
  "302": {
    "1016": false
  },
  "305": {
    "491": false
  },
  "311": {
    "597": false
  },
  "322": {
    "730": false
  },
  "344": {
    "559": false
  },
  "366": {
    "35": false
  },
  "381": {
    "205": false
  },
  "437": {
    "811": false
  },
  "458": {
    "1130": false
  },
  "463": {
    "252": false
  },
  "510": {
    "544": false
  },
  "530": {
    "935": false
  },
  "561": {
    "472": false
  },
  "563": {
    "529": false
  },
  "575": {
    "431": false
  },
  "587": {
    "1064": false
  },
  "588": {
    "484": false
  },
  "620": {
    "541": false
  },
  "661": {
    "816": false
  },
  "682": {
    "1095": false
  },
  "703": {
    "753": false
  },
  "708": {
    "688": false
  },
  "729": {
    "159": false
  },
  "843": {
    "440": false
  },
  "908": {
    "321": false
  },
  "911": {
    "755": false
  },
  "961": {
    "775": false
  },
  "1000": {
    "666": false
  },
  "1009": {
    "68": false
  },
  "1220": {
    "680": false
  },
  "1237": {
    "777": false
  },
  "1274": {
    "323": false
  },
  "1275": {
    "402": false
  }
};