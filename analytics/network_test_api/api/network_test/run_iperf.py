#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved.


from api.network_test import base
from terragraph_thrift.Controller import ttypes as ctrl_types
from zmq.sugar.socket import Socket


class RunIperf(base.Base):
    def __init__(self, _ctrl_sock: Socket, zmq_identifier: str) -> None:
        super().__init__(_ctrl_sock, zmq_identifier)

    """
        * src_node_id {String}: The source node MAC address
        * dst_node_id {String}: The destination node MAC address
        * bitrate {Int64}: The target traffic bitrate (bps)
        * time_sec {Int32}: The measurement duration (in seconds)
        * proto {Int(IperfTransportProtocol)=6,17}: The transport proto (6=TCP, 17=UDP)
        * interval_sec {Int32}: The interval between periodic bandwidth reports
                                (in seconds)
        * window_size {Int64}: The window size (in bytes)
        * mss {Int32}: The TCP maximum segment size (MTU - 40 bytes)
        * no_delay {Boolean}: Disable Nagle's Algorithm
        * omit_sec {Int32}: Omit the first n seconds of the measurement
        * verbose {Boolean}: Show more detailed output
        * json {Boolean}: Output in JSON format
        * buffer_length{Int64}: The buffer length (in bytes)
        * format {Int(IperfFormat)=1,2,3,4,5,6}: The format to report
                                    (1=KILOBITS, 2=MEGABITS, 3=GIGABITS,
                                    4=KILOBYTES, 5=MEGABYTES, 6=GIGABYTES)
        * use_link_local {Boolean}: Whether to use the link-local IP address
                                    and interface
    """

    def _config_iperf(
        self,
        src_node_id: str,
        dst_node_id: str,
        bitrate: int,
        time_sec: int,
        proto: str,
        interval_sec: int,
        window_size: int,
        mss: int,
        no_delay: bool,
        omit_sec: int,
        verbose: bool,
        json: bool,
        buffer_length: int,
        format: int,
        use_link_local: bool,
    ) -> None:

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

    def _stop_iperf(self, id: int) -> None:
        self._send_to_ctrl(
            ctrl_types.MessageType.STOP_IPERF,
            ctrl_types.StopIperf(id),
            self._TRAFFIC_APP_CTRL_ID,
            type="Stop iPerf",
        )
