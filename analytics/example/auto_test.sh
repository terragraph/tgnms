#!/bin/bash
set -e

for f in *.py; do
  python3 "$f";
done
