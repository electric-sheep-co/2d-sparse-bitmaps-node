# 2d-sparse-bitmaps

[![CI Status][1]][2]
[![Dependencies][3]][4]
[![Dev Dependencies][5]][6]

A two-dimensional sparse bitmap implementation for [Node.js](https://nodejs.org/) allowing flexible backing store choise, the primary supported being [Redis](http://redis.io/) via [`ioredis`](https://github.com/luin/ioredis).

The following example needs only 64 bytes to represent two coordinates which are ~1,414,213 units distant each other on the diagonal:

```javascript
const TwoD = require('2d-sparse-bitmaps');
const bitmap = new TwoD.SparseBitmap({ [TwoD.ChunkWidthKey]: 16 });

await bitmap.set('so-far-away', 0, 0);
await bitmap.set('so-far-away', 1e6, 1e6);
```

## Instantiation

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
const bitmap = new TwoD.SparseBitmap({ [TwoD.BackingStoreKey]: rConn });
```

### Backing store interface

The backing store simply must implement this interface:

```javascript
getbit(key, bitPosition);
setbit(key, bitPosition, value);
getBuffer(key);
```

and may optionally implement `pipeline()`, which must return an instance implementing the aforementioned interface *plus* `exec()` for pipeline execution. 

Additionally, the backing store interface methods must accept an additional `function (err, result)` callback argument.

## Usage

Refer to the [API documentation][5] for full details.

### Get a bit in `key` at `(x, y)`:

```javascript
const xySet = await bitmap.get(key, x, y);
```

### Set a bit in `key` at `(x, y)`:

```javascript
await bitmap.set(key, x, y);
```

### Clear a bit in `key` at `(x, y)`:

```javascript
await bitmap.unset(key, x, y);
```

### Get all set bits:

Finds all bits set in `key` within the bounding box defined by `bBox`, where `from` is the top-left
coordinate and `to` is the bottom-right coordinate:

```javascript
const bBox = {
    from: { x: …, y: … },
    to: { x: …, y: … }
};

const allInBounds = await bitmap.inBounds(key, bBox);
```

`allInBounds` will be a list of two-element lists (tuples), where the `x` coordinate is the first value (`[0]`) and `y` is the second (`[1]`).

### Get an instance bound to `key`:

The returned instance has the same methods as above but all _no longer take_ the `key` argument:

```javascript
const occupiedBitmap = bitmap.boundToKey('occupied');

await occupiedBitmap.set(x, y);
// …

const bBox = { … };
const occupiedInBounds = await occupiedBitmap.inBounds(bBox);
```

[1]: https://github.com/electric-sheep-co/2d-sparse-bitmaps-node/workflows/CI/badge.svg?branch=main
[2]: https://github.com/electric-sheep-co/2d-sparse-bitmaps-node/actions?query=workflow%3ACI
[3]: https://david-dm.org/electric-sheep-co/2d-sparse-bitmaps-node.svg
[4]: https://david-dm.org/electric-sheep-co/2d-sparse-bitmaps-node
[5]: https://david-dm.org/electric-sheep-co/2d-sparse-bitmaps-node/dev-status.svg
[6]: https://david-dm.org/electric-sheep-co/2d-sparse-bitmaps-node?type=dev