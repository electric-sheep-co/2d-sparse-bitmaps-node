# 2d-sparse-bitmaps

[![CI Status][1]][2]
[![Dependencies][3]][4]
[![Dev Dependencies][5]][6]

A two-dimensional sparse bitmap implementation for [Node.js](https://nodejs.org/) with no required dependencies.

Allows for flexible backing store choice, the primary supported being [Redis](http://redis.io/) via [`ioredis`](https://github.com/luin/ioredis).

The underlying chunked implementation is quite efficient; the following example needs only 64 bytes to represent two coordinates which are ~1,414,213 units distant each other on the diagonal:

```javascript
const TwoD = require('2d-sparse-bitmaps');
const bitmap = new TwoD.SparseBitmap({ [TwoD.ChunkWidthKey]: 16 });

await bitmap.set('so-far-away', 0, 0);
await bitmap.set('so-far-away', 1e6, 1e6);
```

Additionally, the sparse nature of the data structure allows for efficient queries within targetted bounds via the `inBounds()` method.

## Installation

```shell
$ npm install 2d-sparse-bitmaps
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

Any backing store must implement this interface:

```javascript
getbit(key, bitPosition);
setbit(key, bitPosition, value);
getBuffer(key);
```

It may optionally implement `pipeline()`, which must return an instance implementing the aforementioned interface *plus* `exec()` for pipeline execution; additionally, the backing store interface methods of this instance must accept an additional callback argument of type `function (err, result)`.

The default [`InMemoryStore`](stores/in-memory.js) provides an example implementation sans `pipeline()` et. al.

### Full options

| Constant Name | Description | Default | Restrictions |
| --- | --- | --- | --- |
| `ChunkWidthKey` | The width in bits of each chunk in the sparse bitmap | 128 | >= 8, must be a multiple of 8 |
| `KeyPrefixKey` | The string preprended to each `key` before being passed onto the backing store. | `sparse-bitmap` | none |
| `BackingStoreKey` | The backing store instance to be used.  | [`InMemoryStore`](stores/in-memory.js) | Must conform to the [aforementioned interface][7]. |

Each chunk requires up to `(X / 8) * X` bytes of storage, where `X` is the chosen chunk width. Accordingly, the default chunk width of 128 requires 2048 bytes per chunk.

## Usage

All coordinates must be _unsigned_, a limitation that may be removed in future releases.

### Get:

The bit at `(x, y)` in `key`:

```javascript
const xySet = await bitmap.get(key, x, y);
```

### Set:

The bit at `(x, y)` in `key`:

```javascript
await bitmap.set(key, x, y);
```

### Clear:

The bit at `(x, y)` in `key`:

```javascript
await bitmap.unset(key, x, y);
```

### Get all set-bits in given bounds:

Within the bounding box definition - here named `bBox` - `from` is the top-left coordinate and `to` is the bottom-right coordinate:

```javascript
const bBox = {
  from: { x: …, y: … },
  to: { x: …, y: … }
};

const allInBounds = await bitmap.inBounds(key, bBox);
```

`allInBounds` will be a list of two-element lists (tuples), where the `x` coordinate is the first value (`[0]`) and `y` is the second (`[1]`).

Has a third optional parameter, `strict`, which if set to `true` will cull the list before return to only include points strictly within the given bounding box; otherwise, points within any _chunk intersected by the bounding box_ will be returned.

### Get a key-bound instance:

The returned instance has the same interace as above _except_ that all methods _no longer take_ the `key` argument, as tgey are all now bound to `key` specifically:

```javascript
const occupiedBitmap = bitmap.boundToKey('occupied');
await occupiedBitmap.set(x, y);
const check = await occupiedBitmap.get(x, y);
await occupiedBitmap.unset(x, y);
const occupiedInBounds = await occupiedBitmap.inBounds({ … });
```

### Pipelined mutation:

When executing many mutations (`set()` and `unset()`) in high volume and/or frequency, the `pipelineMutate()` method should be used  to provide a context in which any calls to these mutators - *including methods of instances produced by `boundToKey()`* - will be pipelined appropriately and therefore executed as an atomic unit:

```javascript
const bitmap = new TwoD.SparseBitmap({ [TwoD.BackingStoreKey]: new Redis() });
const keyBound = bitmap.boundToKey('foobar');

const scopeReturn = await bitmap.pipelinedMutate(async () => {
  for (…) {
    await bitmap.set('foobar', x, y);
  }

  for (…) {
    await keyBound.unset(x, y)
  }

  // all .set() and .unset() calls executed against the store (effectively) *here*
});
```

Upon return of the scoped function, the pipeline will be executed (with the results being discarded) and the result of the scoped function returned by `pipelinedMutate()`.

When used with a backing store that does not support pipelining, the mutators are executed normally (against the store at call-time), therefore this method may be used with any backing store regardless of its pipelining capability or lack thereof.

Building a large pipeline may cause significant runtime memory pressure and as such has the potential to cause out-of-memory conditions. Consumers are advised to create reasonably-sized pipelines, though the author does not (yet) provide guidance as to what qualifies "reasonably-sized".

The accessor methods of `SparseBitmap` - `get()` and `inBounds()` - **cannot be called within a pipelined context!** Doing so is a programming error and will result in an exception being thrown.

## Contributing

Any and all contributions are welcome and the project is accepting of pull requests at all times.

### Testing

The full test suite (including linting) is run via:

```shell
$ npm test
```

If the `NODE_ENV` environment variable is set to `ci`, all tests against redis will be skipped entirely.

When running the tests against redis, the host is assumed to be the local machine on the standard port. Additionally:
* `REDIS_LOCAL_AUTH` will be used as the connection password, if set.
* `REDIS_LOCAL_DB` will select the redis DB to test within, if set.

Utilizing [`tape`][9], each individual test file can be executed in isolation:

```shell
$ node test/default-store.js
…
# ok
```

### Authors

* Ryan Joseph, [Electric Sheep Co.][8]

## Benchmarks

TBD.

## License

[MIT](LICENSE)

[1]: https://github.com/electric-sheep-co/2d-sparse-bitmaps-node/workflows/CI/badge.svg?branch=main
[2]: https://github.com/electric-sheep-co/2d-sparse-bitmaps-node/actions?query=workflow%3ACI
[3]: https://david-dm.org/electric-sheep-co/2d-sparse-bitmaps-node.svg
[4]: https://david-dm.org/electric-sheep-co/2d-sparse-bitmaps-node
[5]: https://david-dm.org/electric-sheep-co/2d-sparse-bitmaps-node/dev-status.svg
[6]: https://david-dm.org/electric-sheep-co/2d-sparse-bitmaps-node?type=dev
[7]: https://github.com/electric-sheep-co/2d-sparse-bitmaps-node/#backing-store-interface
[8]: https://electricsheep.co
[9]: https://www.npmjs.com/package/tape