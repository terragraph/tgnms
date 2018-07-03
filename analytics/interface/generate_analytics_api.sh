#!/bin/bash
set -e

SRC_DIR=$(dirname "$0")"/../../beringei/beringei/if"
DST_DIR=$(dirname "$0")

BERINGEI_DATA_THRIFT="beringei_data.thrift"
BERINGEI_QUERY_THRIFT="beringei_query.thrift"
TOPOLOGY_THRIFT="Topology.thrift"

cp "$SRC_DIR/$BERINGEI_DATA_THRIFT" "$DST_DIR"
cp "$SRC_DIR/$BERINGEI_QUERY_THRIFT" "$DST_DIR"
cp "$SRC_DIR/$TOPOLOGY_THRIFT" "$DST_DIR"

# remove the cpp2 lines for beringei_data.thrift
_LINE_TO_REMOVE=$(grep -n "cpp2" $DST_DIR/$BERINGEI_DATA_THRIFT | head -1 | cut -d: -f1)
sed -i "${_LINE_TO_REMOVE}d" $DST_DIR/$BERINGEI_DATA_THRIFT
# remove the cpp2 lines for beringei_query.thrift and fix the include path
_LINE_TO_REMOVE=$(grep -n "cpp2" $DST_DIR/$BERINGEI_QUERY_THRIFT | head -1 | cut -d: -f1)
sed -i "${_LINE_TO_REMOVE}d" $DST_DIR/$BERINGEI_QUERY_THRIFT
_LINE_OF_INCLUDE=$(grep -n "beringei/if/Topology.thrift" $DST_DIR/$BERINGEI_QUERY_THRIFT | head -1 | cut -d: -f1)
sed -i "${_LINE_OF_INCLUDE}d" $DST_DIR/$BERINGEI_QUERY_THRIFT
NEW_INCLUDE_LINE="include \"Topology.thrift\""
sed -i "${_LINE_OF_INCLUDE} a ${NEW_INCLUDE_LINE}" $DST_DIR/$BERINGEI_QUERY_THRIFT
# remove the cpp2 lines for Topology.thrift
_LINE_TO_REMOVE=$(grep -n "cpp2" $DST_DIR/$TOPOLOGY_THRIFT | head -1 | cut -d: -f1)
sed -i "${_LINE_TO_REMOVE}d" $DST_DIR/$TOPOLOGY_THRIFT

echo Thrift files obatined from $SRC_DIR, now start data structure generation \for python

thrift --gen py -o $DST_DIR "$DST_DIR/$BERINGEI_DATA_THRIFT"
thrift --gen py -o $DST_DIR "$DST_DIR/$BERINGEI_QUERY_THRIFT"
thrift --gen py -o $DST_DIR "$DST_DIR/$TOPOLOGY_THRIFT"

echo Data structures successfully generated!
