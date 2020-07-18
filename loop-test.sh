#!/bin/bash

while [ $? -eq 0 ]; do
  redis-cli --raw keys \* | xargs -I{} redis-cli --raw del {} > /dev/null
  npm test
done