#!/bin/bash
if grep -q "this.trans.readDouble()" ./node_modules/thrift/lib/nodejs/lib/thrift/compact_protocol.js; then
  echo readDouble already patched
else
sed -i '/TCompactProtocol.prototype.readDouble = function() {/c\
TCompactProtocol.prototype.readDouble = function() {\
  return this.trans.readDouble();' ./node_modules/thrift/lib/nodejs/lib/thrift/compact_protocol.js
fi

if grep -q "var str = this.inBuf.toString('binary', this.readPos, this.readPos + len);" ./node_modules/thrift/lib/nodejs/lib/thrift/framed_transport.js; then
  echo readString already patched
else
sed -i "/var str = this.inBuf.toString('utf8', this.readPos, this.readPos + len);/c\
  var str = this.inBuf.toString('binary', this.readPos, this.readPos + len);" ./node_modules/thrift/lib/nodejs/lib/thrift/framed_transport.js
fi
