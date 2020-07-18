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
  KCOUNT=$(redis-cli --raw keys \* | wc -l)
  echo "*** iteration ${COUNT}, clearing local redis (currently ${KCOUNT} keys)"
  redis-cli --raw keys \* | xargs -I{} redis-cli --raw del {} > /dev/null
  echo "*** iteration ${COUNT}, testing"
  npm test
done

echo "***** ${COUNT} iterations, result: $?"
exit $?