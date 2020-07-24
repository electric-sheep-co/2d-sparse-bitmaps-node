# 2dsb-cli

A minimal command-line interface for `2d-sparse-bitmaps`

## Example

```shell
$ 2dsb-cli -g cli-example inBounds 0 0 10 5
(0,0)
  ...........
  ...........
  ...........
  ...........
  ...........
  ...........
          (10,5)
$ 2dsb-cli cli-example set 0 0
$ 2dsb-cli cli-example set 10 0
$ 2dsb-cli cli-example set 0 5
$ 2dsb-cli cli-example set 10 5
$ 2dsb-cli cli-example set 5 2
$ 2dsb-cli cli-example set 5 3
$ 2dsb-cli -g cli-example inBounds 0 0 10 5
(0,0)
  |.........|
  ...........
  .....|.....
  .....|.....
  ...........
  |.........|
          (10,5)
$ 2dsb-cli cli-example inBounds 0 0 10 5
[ [ 0, 0 ], [ 10, 0 ], [ 5, 2 ], [ 5, 3 ], [ 0, 5 ], [ 10, 5 ] ]
```

## Usage

```text
Usage: 2dsb-cli [options] key command ...

Options:
        -h, --host              redis host (default: 'localhost')
        -p, --port              redis port (default: 6379)
        -a, --auth              redis password
        -d, --db                redis db (default: 0)
        -s, --store             InMemoryStore persistence file; superceeds redis when used
        -c, --chunkWidth        chunk width (default: 128)
        -g, --grid              display output in a grid (applicable only to 'inBounds')
        --help                  this help text

Commands:
        get x y
        set x y
        unset x y
        inBounds fromX fromY toX toY
```