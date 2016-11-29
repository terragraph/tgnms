#!/bin/bash
if grep -q "this.trans.readDouble()" ./node_modules/thrift/lib/nodejs/lib/thrift/compact_protocol.js; then
  echo already patched
else
sed -i '/TCompactProtocol.prototype.readDouble = function() {/c\
TCompactProtocol.prototype.readDouble = function() {\
  return this.trans.readDouble();' ./node_modules/thrift/lib/nodejs/lib/thrift/compact_protocol.js
fi
