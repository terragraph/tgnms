#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved.

import logging
import os
import sys

import zmq
from api.models import TestRunExecution, TestStatus
from terragraph_thrift.Controller import ttypes as ctrl_types
from thrift.protocol.TCompactProtocol import TCompactProtocolAcceleratedFactory
from thrift.TSerialization import deserialize, serialize


_log = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)


class Base:
    def __init__(self, _ctrl_sock, zmq_identifier):
        self._ctrl_sock = _ctrl_sock
        self._TRAFFIC_APP_CTRL_ID = "ctrl-app-TRAFFIC_APP"
        self._MYID = zmq_identifier

    def _deserialize(self, in_byte_array, out_thrift_struct):
        deserialize(
            out_thrift_struct, in_byte_array, TCompactProtocolAcceleratedFactory()
        )

    def _serialize(self, in_thrift_struct):
        return serialize(in_thrift_struct, TCompactProtocolAcceleratedFactory())

    def _send_to_ctrl(self, msg_type, msg_data, receiver_app, type, minion=""):
        _log.info("\nSending {} request...".format(type))
        msg_type_str = ctrl_types.MessageType._VALUES_TO_NAMES.get(msg_type, "UNKNOWN")

        # prepare message
        data = self._serialize(ctrl_types.Message(msg_type, self._serialize(msg_data)))
        # send message
        try:
            self._ctrl_sock.send(str(minion).encode("ascii"), zmq.SNDMORE)
            self._ctrl_sock.send(str(receiver_app).encode("ascii"), zmq.SNDMORE)
            self._ctrl_sock.send(str(self._MYID).encode("ascii"), zmq.SNDMORE)
            self._ctrl_sock.send(data)
        except Exception as ex:
            self._my_exit(False, "Failed to send {}; {}".format(msg_type_str, ex))

    def _my_exit(self, success, error_msg="", operation=None, test_aborted=False):
        # Mark the test as finished as all iPerf sessions are over
        try:
            test_run_obj = TestRunExecution.objects.get(
                pk=int(self.parameters["test_run_id"])
            )
            if not test_aborted:
                test_run_obj.status = TestStatus.FINISHED.value
            else:
                pass
            test_run_obj.save()
        except Exception as ex:
            _log.error("\nWrite to db failed: {}".format(ex))
            success = False

        # close ZMQ Socket
        _log.warning("\nClosing Socket.")
        self._ctrl_sock.close()

        if not operation:
            operation = type(self).__name__
        if success:
            _log.warning("\n{} succeeded. {}\n".format(operation, error_msg))
            sys.exit(0)
        else:
            _log.error("\n{} failed. {}\n".format(operation, error_msg))
            sys.exit(1)
