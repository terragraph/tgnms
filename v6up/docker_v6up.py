#!/usr/bin/env python3

# Copyright (c) Meta Platforms, Inc. and affiliates.
#
# This source code is licensed under the MIT license found in the
# LICENSE file in the root directory of this source tree.

import click
import json
import logging

import docker
from nsenter import Namespace


DOCKER_URL = "unix://var/run/docker.sock"
LOG = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)


class docker_v6up:
    def __init__(self, proc="/proc"):
        self.proc = proc

    def callns(self, pid):
        try:
            with Namespace(pid, "net", proc=self.proc):
                with open(
                    "{}/sys/net/ipv6/conf/all/disable_ipv6".format(self.proc), "w"
                ) as c:
                    print(0, file=c)
                    LOG.info(f"enabled v6 in pid {pid}")
        except FileNotFoundError:
            # fnf is common with 0 runtime containers, no need to crash
            pass

    def get_pid(self, container_id):
        inspect = self.client.api.inspect_container(container_id)
        LOG.debug(f"inspect container at {container_id}:\n{inspect}")
        pid = inspect["State"]["Pid"]
        return pid

    def docker_client(self):
        self.client = docker.DockerClient(base_url=DOCKER_URL)
        assert self.client is not None
        return self.client

    def listen(self):
        events = self.docker_client().events()
        LOG.info("Listening for new events")
        for event in events:
            event = event.decode("utf-8")
            jevent = json.loads(event)
            if jevent["Type"] == "network" and jevent["Action"] == "connect":
                pid = self.get_pid(jevent["Actor"]["Attributes"]["container"])
                self.callns(pid)


@click.command()
@click.option("-p", "--proc", default="/proc", help="Proc filesystem location")
def main(proc):
    try:
        v6up = docker_v6up(proc=proc)
        v6up.listen()
    except KeyboardInterrupt:
        # testing
        pass


if __name__ == "__main__":
    main()
