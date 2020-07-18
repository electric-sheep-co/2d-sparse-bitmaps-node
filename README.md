# 2d-sparse-bitmaps

![CI Status](https://github.com/electric-sheep-co/2d-sparse-bitmaps-node/workflows/CI-Test/badge.svg?branch=main)
![Dependencies](https://david-dm.org/electric-sheep-co/2d-sparse-bitmaps-node.svg)

A two-dimensional sparse bitmap implementation for Node.js.

## Usage

### Instantiation

With the default in-memory store:

```javascript
const TwoD = require('2d-sparse-bitmaps');
const bitmap = new TwoD.SparseBitmap();
```

With an [`ioredis`](https://github.com/luin/ioredis) instance:

```javascript
const Redis = require('ioredis');
const TwoD = require('2d-sparse-bitmaps');

const rConn = new Redis();
const bitmap = new TwoD.SparseBitmap({ [TwoD.BackStoreKey]: rConn });
```

The backing store simply must implement this interface:

```javascript
getbit(key, bitPosition);
setbit(key, bitPosition, value);
getBuffer(key);
```

and may optionally implement `pipeline()`, which must return an instance implementing the aforementioned interface *plus* `exec()` for pipeline execution. Additionally, the interface methods must accept an additional `function (err, result)` callback argument.