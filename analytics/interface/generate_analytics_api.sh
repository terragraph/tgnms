#!/bin/bash
set -e

SRC_DIR=$(dirname "$0")
SRC_DIR+="/beringei/if"
DST_DIR=$(dirname "$0")

BERINGEI_DATA_THRIFT="beringei_data.thrift"
BERINGEI_QUERY_THRIFT="beringei_query.thrift"
TOPOLOGY_THRIFT="Topology.thrift"
SCAN_THRIFT="scans.thrift"
CONTROLLER_THRIFT="Controller.thrift"
BWALLOCATION_THRIFT="BWAllocation.thrift"
IPPREFIX_THRIFT="IpPrefix.thrift"
LSDB_THRIFT="Lsdb.thrift"

cp "$SRC_DIR/$BERINGEI_DATA_THRIFT" "$DST_DIR"
cp "$SRC_DIR/$BERINGEI_QUERY_THRIFT" "$DST_DIR"
cp "$SRC_DIR/$TOPOLOGY_THRIFT" "$DST_DIR"
cp "$SRC_DIR/$SCAN_THRIFT" "$DST_DIR"
cp "$SRC_DIR/$CONTROLLER_THRIFT" "$DST_DIR"
cp "$SRC_DIR/$BWALLOCATION_THRIFT" "$DST_DIR"
cp "$SRC_DIR/$IPPREFIX_THRIFT" "$DST_DIR"
cp "$SRC_DIR/$LSDB_THRIFT" "$DST_DIR"

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
# remove the cpp2 lines for scans.thrift
_LINE_TO_REMOVE=$(grep -n "cpp2" $DST_DIR/$SCAN_THRIFT | head -1 | cut -d: -f1)
sed -i "${_LINE_TO_REMOVE}d" $DST_DIR/$SCAN_THRIFT
# remove the cpp2 lines for Controller.thrift and fix the include path
_LINE_TO_REMOVE=$(grep -n "cpp2" $DST_DIR/$CONTROLLER_THRIFT | head -1 | cut -d: -f1)
sed -i "${_LINE_TO_REMOVE}d" $DST_DIR/$CONTROLLER_THRIFT
_LINE_OF_INCLUDE=$(grep -n "openr/if/Lsdb.thrift" $DST_DIR/$CONTROLLER_THRIFT | head -1 | cut -d: -f1)
sed -i "${_LINE_OF_INCLUDE}d" $DST_DIR/$CONTROLLER_THRIFT
NEW_INCLUDE_LINE="include \"Lsdb.thrift\""
sed -i "${_LINE_OF_INCLUDE} a ${NEW_INCLUDE_LINE}" $DST_DIR/$CONTROLLER_THRIFT
# remove the cpp2 lines for BWAllocation.thrift
_LINE_TO_REMOVE=$(grep -n "cpp2" $DST_DIR/$BWALLOCATION_THRIFT | head -1 | cut -d: -f1)
sed -i "${_LINE_TO_REMOVE}d" $DST_DIR/$BWALLOCATION_THRIFT
# remove the cpp2 and php lines for IpPrefix.thrift
_LINE_TO_REMOVE=$(grep -n "cpp2" $DST_DIR/$IPPREFIX_THRIFT | head -1 | cut -d: -f1)
sed -i "${_LINE_TO_REMOVE}d" $DST_DIR/$IPPREFIX_THRIFT
_LINE_TO_REMOVE=$(grep -n "php" $DST_DIR/$IPPREFIX_THRIFT | head -1 | cut -d: -f1)
sed -i "${_LINE_TO_REMOVE}d" $DST_DIR/$IPPREFIX_THRIFT
# remove the cpp2 and php lines for Lsdb.thrift
_LINE_TO_REMOVE=$(grep -n "cpp2" $DST_DIR/$LSDB_THRIFT | head -1 | cut -d: -f1)
sed -i "${_LINE_TO_REMOVE}d" $DST_DIR/$LSDB_THRIFT
_LINE_TO_REMOVE=$(grep -n "php" $DST_DIR/$LSDB_THRIFT | head -1 | cut -d: -f1)
sed -i "${_LINE_TO_REMOVE}d" $DST_DIR/$LSDB_THRIFT

echo Thrift files obatined from $SRC_DIR, now start data structure generation \for python

thrift --gen py -o $DST_DIR "$DST_DIR/$BERINGEI_DATA_THRIFT"
thrift --gen py -o $DST_DIR "$DST_DIR/$BERINGEI_QUERY_THRIFT"
thrift --gen py -o $DST_DIR "$DST_DIR/$TOPOLOGY_THRIFT"
thrift --gen py -o $DST_DIR "$DST_DIR/$SCAN_THRIFT"
thrift --gen py -o $DST_DIR "$DST_DIR/$CONTROLLER_THRIFT"
thrift --gen py -o $DST_DIR "$DST_DIR/$BWALLOCATION_THRIFT"
thrift --gen py -o $DST_DIR "$DST_DIR/$IPPREFIX_THRIFT"
thrift --gen py -o $DST_DIR "$DST_DIR/$LSDB_THRIFT"

echo Data structures successfully generated!
