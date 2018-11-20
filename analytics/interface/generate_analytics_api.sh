#!/bin/bash
set -e

SRC_DIR=$(dirname "$0")
SRC_DIR+="/beringei/if"
DST_DIR=$(dirname "$0")

# order to generate compiled thrift files
THRIFT_FILES="beringei_data.thrift beringei_query.thrift Topology.thrift scans.thrift Controller.thrift BWAllocation.thrift IpPrefix.thrift Lsdb.thrift"

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

echo Data structures successfully generated!
