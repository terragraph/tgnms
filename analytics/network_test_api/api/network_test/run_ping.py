#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved.


from api.network_test import base
from terragraph_thrift.Controller import ttypes as ctrl_types
from zmq.sugar.socket import Socket


class RunPing(base.Base):
    def __init__(self, _ctrl_sock: Socket, zmq_identifier: str) -> None:
        super().__init__(_ctrl_sock, zmq_identifier)

    """
        * src_node_id {String}: The source node MAC address
        * dst_node_id {String}: The destination node MAC address
        * count {Int32}: Stop after sending count ECHO_REQUEST packets
        * interval {Int32}: Wait interval seconds between sending each packet
        * packet_size {Int32}: Specifies the number of data bytes to be sent
        * verbose {Boolean}: Verbose output
        * deadline {Int32}:  Seconds before exit regardless of how many packets
                             sent or received
        * timeout{Int32}: Time to wait for a response, in seconds
        * use_link_local {Boolean}: Whether to use the link-local IP address and
                                    interface
    """

    def _config_ping(
        self,
        src_node_id: str,
        dst_node_id: str,
        count: int,
        interval: int,
        packet_size: int,
        verbose: bool,
        deadline: int,
        timeout: int,
        use_link_local: bool,
    ) -> None:

        # send request
        options = ctrl_types.PingOptions(
            count=count,
            interval=interval,
            packetSize=packet_size,
            verbose=verbose,
            deadline=deadline,
            timeout=timeout,
        )

        self._send_to_ctrl(
            ctrl_types.MessageType.START_PING,
            ctrl_types.StartPing(
                srcNodeId=src_node_id,
                dstNodeId=dst_node_id,
                options=options,
                useLinkLocal=use_link_local,
            ),
            self._TRAFFIC_APP_CTRL_ID,
            type="Ping",
        )

    def _stop_ping(self, id: int) -> None:
        self._send_to_ctrl(
            ctrl_types.MessageType.STOP_PING,
            ctrl_types.StopPing(id),
            self._TRAFFIC_APP_CTRL_ID,
            type="Stop Ping",
        )
