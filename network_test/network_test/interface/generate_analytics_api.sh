#!/bin/bash
set -e

SRC_DIR=$(dirname "$0")
SRC_DIR+="/../../../if"
DST_DIR=$(dirname "$0")

echo SRC_DIR is $SRC_DIR and DST_DIR is $DST_DIR

# order to generate compiled thrift files
THRIFT_FILES="beringei_query.thrift Topology.thrift scans.thrift Controller.thrift BWAllocation.thrift IpPrefix.thrift Lsdb.thrift Event.thrift NetworkTest.thrift"

for file in $THRIFT_FILES
do
        cp "${SRC_DIR}/${file}" "${DST_DIR}"
        sed -i '/namespace cpp2/d' "${DST_DIR}/${file}"
done

echo Thrift files obtained from $SRC_DIR, now start data structure generation for python

for file in $THRIFT_FILES
do
        thrift --gen py -o $DST_DIR "${DST_DIR}/${file}"
done

# Copy generated thrift Python into dist-packages rather than have sys.path hacks
# in our source code everywhere
PYTHON_DIST_PKGS="/usr/lib/python3/dist-packages"
for src_thrift_dir in $(find $DST_DIR -type d)
do
  echo "Copying $src_thrift_dir thrift files to "
  cp -rv "$src_thrift_dir" "$PYTHON_DIST_PKGS"
done

echo Data structures successfully generated!
