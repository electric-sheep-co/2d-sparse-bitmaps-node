#!/bin/bash

COUNT=0
while [ $? -eq 0 ]; do
  COUNT=$[$COUNT+1]
  echo "*** iteration ${COUNT}"
  redis-cli --raw keys \* | xargs -I{} redis-cli --raw del {} > /dev/null
  npm test
done

echo "***** ${COUNT} iterations before failure"