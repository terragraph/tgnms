#!/usr/bin/env python3.6
# Copyright 2004-present Facebook. All Rights Reserved.

import os
import sys

from api.network_test import base


sys.path.append(
    os.path.abspath(
        os.path.join(os.path.dirname(__file__), "..") + "/../../interface/gen-py"
    )
)
from terragraph_thrift.Controller import ttypes as ctrl_types


class RunIperf(base.Base):
    def __init__(self, _ctrl_sock, zmq_identifier):
        super().__init__(_ctrl_sock, zmq_identifier)

    """
        * {String} [src_node_id]
        *           The source node MAC address
        * {String} [dst_node_id]
        *           The destination node MAC address
        * {Int64} [bitrate]
        *           The target traffic bitrate (bps)
        * {Int32} [time_sec]
        *           The measurement duration (in seconds)
        * {Int(IperfTransportProtocol)=6,17} [proto]
        *           The transport proto (6=TCP, 17=UDP)
        * {Int32} [interval_sec]
        *           The interval between periodic bandwidth reports
        *           (in seconds)
        * {Int64} [window_size]
        *           The window size (in bytes)
        * {Int32} [mss]
        *           The TCP maximum segment size (MTU - 40 bytes)
        * {Boolean} [no_delay]
        *           Disable Nagle's Algorithm
        * {Int32} [omit_sec]
        *           Omit the first n seconds of the measurement
        * {Boolean} [verbose]
        *           Show more detailed output
        * {Boolean} [json] Output in JSON format
        * {Int64} [buffer_length] T
        *           he buffer length (in bytes)
        * {Int(IperfFormat)=1,2,3,4,5,6} [format]
        *           The format to report (1=KILOBITS, 2=MEGABITS, 3=GIGABITS,
        *           4=KILOBYTES, 5=MEGABYTES, 6=GIGABYTES)
        * {Boolean} [use_link_local]
        *             Whether to use the link-local IP address and interface
    """

    def _config_iperf(
        self,
        src_node_id,
        dst_node_id,
        bitrate,
        time_sec,
        proto,
        interval_sec,
        window_size,
        mss,
        no_delay,
        omit_sec,
        verbose,
        json,
        buffer_length,
        format,
        use_link_local,
    ):

        # send request
        protocol = None
        if proto:
            proto = proto.upper()
            if proto not in ctrl_types.IperfTransportProtocol._NAMES_TO_VALUES:
                return self._my_exit(False, "Invalid transport protocol specified")
            protocol = ctrl_types.IperfTransportProtocol._NAMES_TO_VALUES[proto]
        options = ctrl_types.IperfOptions(
            bitrate=bitrate,
            timeSec=time_sec,
            protocol=protocol,
            intervalSec=interval_sec,
            windowSize=window_size,
            mss=mss,
            noDelay=no_delay,
            omitSec=omit_sec,
            verbose=verbose,
            json=json,
            bufferLength=buffer_length,
            format=format,
        )

        self._send_to_ctrl(
            ctrl_types.MessageType.START_IPERF,
            ctrl_types.StartIperf(
                srcNodeId=src_node_id,
                dstNodeId=dst_node_id,
                options=options,
                useLinkLocal=use_link_local,
            ),
            self._TRAFFIC_APP_CTRL_ID,
            type="iPerf",
        )

    def _stop_iperf(self, id):
        self._send_to_ctrl(
            ctrl_types.MessageType.STOP_IPERF,
            ctrl_types.StopIperf(id),
            self._TRAFFIC_APP_CTRL_ID,
            type="Stop iPerf",
        )
