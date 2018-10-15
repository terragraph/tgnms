#!/usr/bin/env python3.6
# Copyright 2004-present Facebook. All Rights Reserved.

import zmq
import sys
import random
import logging
_log = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)


class ConnectToController:

    def __init__(
        self,
        controller_addr,
        controller_port
    ):
        self._controller_addr = controller_addr
        self._controller_port = controller_port
        self._context = zmq.Context()
        self._ctrl_sock = None
        self._MYID = "p2p_traffic_id_" + str(random.randint(0, 65535))

    def _connect_to_controller(
            self,
            send_timeout=4000
    ):
        # prepare socket
        self._ctrl_sock = self._context.socket(zmq.DEALER)
        self._ctrl_sock.SNDTIMEO = send_timeout  # ms
        self._ctrl_sock.linger = 2000  # ms

        # Enable IPv6 on the socket
        try:
            self._ctrl_sock.set(zmq.IPV6, 1)
        except Exception as ex:
            _log.error("Error enabling ipv6 on socket: {}".format(ex))
            sys.exit(1)

        # Set ZMQ_IDENTITY on the socket
        try:
            self._ctrl_sock.set(zmq.IDENTITY, str(self._MYID).encode('ascii'))
        except Exception as ex:
            _log.error("Error setting zmq id on socket: {}".format(ex))
            sys.exit(1)

        # Connect to the router socket
        try:
            router_sock_url = "tcp://[{}]:{}".format(self._controller_addr,
                                                     self._controller_port)
            _log.info("\nConnecting to controller on URL {} ...".format(
                                                            router_sock_url))
            self._ctrl_sock.connect(router_sock_url)
        except Exception as ex:
            _log.error("Error connecting to router socket: {}".format(ex))
            sys.exit(1)
        return self._ctrl_sock, self._MYID
