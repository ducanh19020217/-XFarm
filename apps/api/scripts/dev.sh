#!/bin/sh

set -eu

tsc -p tsconfig.json

tsc -p tsconfig.json --watch &
compiler_pid=$!
node --import tsx --watch dist/src/main.js &
server_pid=$!

cleanup() {
  kill "$server_pid" "$compiler_pid" 2>/dev/null || true
  wait "$server_pid" 2>/dev/null || true
  wait "$compiler_pid" 2>/dev/null || true
}

trap cleanup EXIT INT TERM
wait "$server_pid"
