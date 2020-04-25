#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved.

from thrift.protocol import TBinaryProtocol, TJSONProtocol
from thrift.transport import TTransport


def thrift2binary(thrift_obj) -> bytes:
    """Convert a thrift object into a binary-serialized byte string."""
    transport = TTransport.TMemoryBuffer()
    protocol = TBinaryProtocol.TBinaryProtocol(transport)
    thrift_obj.write(protocol)
    value: bytes = transport.getvalue()
    return value


def thrift2json(thrift_obj) -> bytes:
    """Convert a thrift object into a JSON-serialized byte string."""
    transport = TTransport.TMemoryBuffer()
    protocol = TJSONProtocol.TJSONProtocol(transport)
    thrift_obj.write(protocol)
    value: bytes = transport.getvalue()
    return value
