#!/bin/bash

COUNT=0
while [ $? -eq 0 ]; do
  if [ ! -z $1 ]; then
    sleep $1
  fi

  if [ ! -z $2 ]; then
    if [ $2 -eq $COUNT ]; then
      break
    fi
  fi

  COUNT=$[$COUNT+1]
  echo "*** iteration ${COUNT}"
  redis-cli --raw keys \* | xargs -I{} redis-cli --raw del {} > /dev/null
  npm test
done

echo "***** ${COUNT} iterations, result: $?"
exit $?