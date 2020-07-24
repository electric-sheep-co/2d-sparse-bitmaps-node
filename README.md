# 2d-sparse-bitmaps

[![CI Status][1]][2]
[![Dependencies][3]][4]
[![Dev Dependencies][5]][6]

A two-dimensional sparse bitmap implementation for [Node.js](https://nodejs.org/) 10 or later, with no required dependencies.

Allows for flexible backing store choice, the primary supported being [Redis](http://redis.io/) (via [`ioredis`](https://github.com/luin/ioredis)).

The underlying chunked implementation is efficient; the following example needs only 64 bytes to represent two coordinates which are ~1,414,213 units distant each other on the diagonal:

```javascript
const TwoD = require('2d-sparse-bitmaps');
const bitmap = new TwoD.SparseBitmap({ [TwoD.ChunkWidthKey]: 16 });

await bitmap.set('so-far-away', 0, 0);
await bitmap.set('so-far-away', 1e6, 1e6);
```

Additionally, the sparse nature of the data structure allows for performant queries within specified bounds via [`inBounds()`](#get-all-set-bits-in-given-bounds).

## Installation

```shell
$ npm install 2d-sparse-bitmaps
```

## Examples

The included [tests](./test), [benchmarking tool](./tools/benchmark) & [cli](./cli) hopefully provide ample usage examples, and in the case of the [cli](./cli) an easily-accessibly interactive means of working with the library.

## Usage

All coordinates must be _unsigned_, a limitation that may be removed in future releases.

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
const bitmap = new TwoD.SparseBitmap({ [TwoD.BackingStoreKey]: rConn });
```

#### Full options

| Constant Name | Description | Default | Restrictions |
| --- | --- | --- | --- |
| `ChunkWidthKey` | The width in bits of each chunk in the sparse bitmap | 128 | >= 8, must be a multiple of 8 |
| `KeyPrefixKey` | The string preprended to each `key` before being passed onto the backing store. | `sparse-bitmap` | none |
| `BackingStoreKey` | The backing store instance to be used.  | [`InMemoryStore`](stores/in-memory.js) | Must conform to the [aforementioned interface][7]. |

Each chunk requires up to `(X / 8) * X` bytes of storage, where `X` is the chosen chunk width. Accordingly, the default chunk width of 128 requires 2048 bytes per chunk.

#### Backing store interface

Any backing store must implement this interface:

```javascript
getbit(key, bitPosition);
setbit(key, bitPosition, value);
getBuffer(key);
```

It may optionally implement `pipeline()`, which must return an instance implementing the aforementioned interface *plus* `exec()` for pipeline execution; additionally, the backing store interface methods of this instance must accept an additional callback argument of type `function (err, result)`.

The default [`InMemoryStore`](stores/in-memory.js) provides an example implementation sans `pipeline()` et. al.

### Get:

Cannot be called within `pipelinedMutate()` context. No option to pipeline these calls is available; high-volume searches should be performed with [`inBounds()`](get-all-set-bits-in-given-bounds) instead.

The bit at `(x, y)` in `key`:

```javascript
const xySet = await bitmap.get(key, x, y);
```

### Set:

The bit at `(x, y)` in `key`:

```javascript
await bitmap.set(key, x, y);
```

### Unset:

The bit at `(x, y)` in `key`:

```javascript
await bitmap.unset(key, x, y);
```

### Get all set-bits in given bounds:

Cannot be called within `pipelinedMutate()` context. This method performs it's own internal pipelining to be as performant as possible.

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
    await keyBound.unset(x, y);
  }
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

The following rudimentary benchmarks were performed on an AWS EC2 type *m5a.large* (4 vCPUs, 16GB RAM) running the Ubuntu 20LTS AMI (ID `ami-03ceeb0f46ee38ce7`). Both the backing store redis instance and [`benchmark`](./tools/benchmark) script were run on this VM. All redis [snapshotting](https://redis.io/topics/persistence#snapshotting) was disabled. The EC2 instance was created specifically for this use and had no other workloads during the benchmarking process.

Version particulars:
* Linux kernel `5.4.0-1020-aws`
* Node `14.6.0` (v8 `8.4.371.19-node.12`)
* Redis `5.0.7 (636cde3b5c7a3923)` (standalone)

The benchmark run consisted three runs of differing multipliers (1, 3 & 5), each 101 iterations of the full sequence defined in [`benchmark::T.seq.main()`](./tools/benchmark#L54).

The primary takeaway is the significant increase in performance afforded by pipelined operations.

According to this limited dataset, the mean search rate is **~1.2 Gbit/s** (~150 MB/s), though it does depend on how sparsely-populated the search area is (with rates from ~493 Mbit/s - ~2 Gbit/s observed). Without pipelining enabled, this rate drops *drastically* to ~183 Mbit/s (a *6.5x* drop).

The full data set is linked below, and the Google Sheet used to post-process and analyze the data is [available here][10].

### Raw data

* [full JSON report][11] & [processed CSV][12] for `benchmark -i 101 -w 127`
* [full JSON report][13] & [processed CSV][14] for `benchmark -i 101 -w 127 -m 3`
* [full JSON report][15] & [processed CSV][16] for `benchmark -i 101 -w 127 -m 5`

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
[10]: https://docs.google.com/spreadsheets/d/1rFrTLa0Msnghn_Xy5vqghVWRXzJywtWvZrgdLZG-fvM/edit?usp=sharing
[11]: https://static.2dsb.electricsheep.co/report.20200722T110119219Z.json
[12]: https://static.2dsb.electricsheep.co/report.20200722T110119219Z.csv
[13]: https://static.2dsb.electricsheep.co/report.20200722T184653181Z.json
[14]: https://static.2dsb.electricsheep.co/report.20200722T184653181Z.csv
[15]: https://static.2dsb.electricsheep.co/report.20200723T102057790Z.json
[16]: https://static.2dsb.electricsheep.co/report.20200723T102057790Z.csv