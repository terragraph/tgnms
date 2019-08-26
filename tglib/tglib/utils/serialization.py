#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved.

from thrift.protocol import TBinaryProtocol, TJSONProtocol
from thrift.transport import TTransport


def thrift2bytes(thrift_obj) -> bytes:
    """Convert a thrift object into a byte string."""
    transport = TTransport.TMemoryBuffer()
    protocol = TBinaryProtocol.TBinaryProtocol(transport)
    thrift_obj.write(protocol)
    return transport.getvalue()


def thrift2json(thrift_obj) -> str:
    """Convert a thrift object into a JSON string."""
    transport = TTransport.TMemoryBuffer()
    protocol = TJSONProtocol.TJSONProtocol(transport)
    thrift_obj.write(protocol)
    return transport.getvalue().decode("utf-8")
