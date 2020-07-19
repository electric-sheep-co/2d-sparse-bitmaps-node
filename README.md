# 2d-sparse-bitmaps

[![CI Status][1]][2]
[![Dependencies][3]][4]
[![Dev Dependencies][5]][6]

A two-dimensional sparse bitmap implementation for [Node.js](https://nodejs.org/).

Allows for flexible backing store choice, with the primary supported being [Redis](http://redis.io/) via [`ioredis`](https://github.com/luin/ioredis).

The underlying "chunked" implementation is quite efficient; the following example needs only 64 bytes to represent two coordinates which are ~1,414,213 units distant each other on the diagonal:

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

Any backing store must implement this interface:

```javascript
getbit(key, bitPosition);
setbit(key, bitPosition, value);
getBuffer(key);
```

and may optionally implement `pipeline()`, which must return an instance implementing the aforementioned interface *plus* `exec()` for pipeline execution. 

The backing store interface methods must also accept an additional callback argument of type `function (err, result)`.

The default `InMemoryStore` provides an example implementation (sans `pipeline()` et. al).

### Full options

| Constant Name | Description | Default | Restrictions |
| --- | --- | --- | --- |
| `ChunkWidthKey` | The width of each chunk in the sparse bitmap; eack chunk requires up to `(X / 8) * X` bytes of storage (where `X` is the chosen chunk width) | 128 | >= 8, must be a multiple of 8 |
| `KeyPrefixKey` | The string preprended to each `key` before being passed onto the backing store. | `sparse-bitmap` | none |
| `BackingStoreKey` | The backing store instance to be used.  | `InMemoryStore` | Must conform to the [aforementioned interface][7]. |

## Usage

Currently limited to _unsigned_ coordinates.

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

### Get all set bits within given bounds:

Within the bounding box definition - here named `bBox` - `from` is the top-left
coordinate and `to` is the bottom-right coordinate:

```javascript
const bBox = {
    from: { x: …, y: … },
    to: { x: …, y: … }
};

const allInBounds = await bitmap.inBounds(key, bBox);
```

`allInBounds` will be a list of two-element lists (tuples), where the `x` coordinate is the first value (`[0]`) and `y` is the second (`[1]`).

Has a third optional parameter, `strict`, which if set to `true` will cull the list before return to only include points strictly within the given bounding box; otherwise, points within any _chunk intersected by the bounding box_ will be returned.

### Get an instance bound to `key`:

The returned instance has the same interace as above _except_ that all methods _no longer take_ the `key` argument:

```javascript
const occupiedBitmap = bitmap.boundToKey('occupied');
await occupiedBitmap.set(x, y);
const check = await occupiedBitmap.get(x, y);
await occupiedBitmap.unset(x, y);
const occupiedInBounds = await occupiedBitmap.inBounds({ … });
```

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