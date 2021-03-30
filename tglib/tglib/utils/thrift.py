#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved.

from typing import Callable, Protocol

from thrift.protocol import TBinaryProtocol, TJSONProtocol, TProtocol
from thrift.transport import TTransport


class Thrift(Protocol):
    """User-defined protocol class for representing thrift Python objects.

    Real thrift Python objects (e.g. ``Node``, ``IperfOptions``) are subtypes
    of the :class:`Thrift` protocol since they define compatible methods (i.e.
    :meth:`~.Thrift.read` and :meth:`~.Thrift.write`).

    Note:
        Use this class for typehinting functions that expect a real thrift object.
    """

    def read(self, iproto: TProtocol.TProtocolBase) -> None:
        """Deserialize a byte string into oneself according to ``iproto``.

        Args:
            iproto: The input protocol to use for deserialization.
        """
        ...

    def write(self, oproto: TProtocol.TProtocolBase) -> None:
        """Serielize oneself into a byte string according to ``oproto``.

        Args:
            oproto: The output protocol to use for serialization.
        """
        ...


def binary2thrift(base: Callable, serialized: bytes) -> Thrift:
    """Convert a binary-serialized byte string into a thrift object.

    Args:
        base: The thrift class type (e.g. ``Node``, ``IperfOptions``).
        serialized: The binary-serialized byte string.

    Returns:
        A thrift object of type ``base`` deserialized from ``serialized``.

    Example:
        >>> serialized = b"\\x0b\\x00\\x01\\x00\\x00\\x00\\x04test\\x00"
        >>> binary2thrift(Node, serialized)
        Node(
            name="test")
    """
    transport = TTransport.TMemoryBuffer(serialized)
    protocol = TBinaryProtocol.TBinaryProtocol(transport)
    thrift_obj: Thrift = base()
    thrift_obj.read(protocol)
    return thrift_obj


def json2thrift(base: Callable, serialized: bytes) -> Thrift:
    """Convert a JSON-serialized byte string into a thrift object.

    Args:
        base: The thrift class type (e.g. ``Node``, ``IperfOptions``).
        serialized: The JSON-serialized byte string.

    Returns:
        A thrift object of type ``base`` deserialized from ``serialized``.

    Example:
        >>> serialized = b"{'1':{'str':'test'}}"
        >>> json2thrift(Node, serialized)
        Node(
            name="test")
    """
    transport = TTransport.TMemoryBuffer(serialized)
    protocol = TJSONProtocol.TJSONProtocol(transport)
    thrift_obj: Thrift = base()
    thrift_obj.read(protocol)
    return thrift_obj


def thrift2binary(thrift_obj: Thrift) -> bytes:
    """Convert a thrift object into a binary-serialized byte string.

    Args:
        thrift_obj: A Python thrift object.

    Returns:
        A binary-serialized byte string.

    Example:
        >>> node = Node()
        >>> node.name = "test"
        >>> thrift2binary(node)
        b"\\x0b\\x00\\x01\\x00\\x00\\x00\\x04test\\x00"
    """
    transport = TTransport.TMemoryBuffer()
    protocol = TBinaryProtocol.TBinaryProtocol(transport)
    thrift_obj.write(protocol)
    value: bytes = transport.getvalue()
    return value


def thrift2json(thrift_obj: Thrift) -> bytes:
    """Convert a thrift object into a JSON-serialized byte string.

    Args:
        thrift_obj: A Python thrift object.

    Returns:
        A JSON-serialized byte string.

    Example:
        >>> node = Node()
        >>> node.name = "test"
        >>> thrift2json(node)
        b"{'1':{'str':'test'}}"
    """
    transport = TTransport.TMemoryBuffer()
    protocol = TJSONProtocol.TJSONProtocol(transport)
    thrift_obj.write(protocol)
    value: bytes = transport.getvalue()
    return value
