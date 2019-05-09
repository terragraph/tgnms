#!/usr/bin/env python3

"""
   Class to create Events.
"""

import json
import logging
import os
import time

import requests
from facebook.gorilla.beringei_query.ttypes import EventsWriteRequest, NodeEvents
from facebook.gorilla.Event.ttypes import Event, EventCategory, EventLevel
from facebook.gorilla.Topology.ttypes import Topology
from module.beringei_db_access import BeringeiDbAccess
from module.path_store import PathStore
from thrift.protocol.TJSONProtocol import TSimpleJSONProtocolFactory
from thrift.transport import TTransport


class EventWriter:
    """
    Create events.
    """

    def __init__(self):
        """Create new EventWriter class.
        """

        try:
            with open(PathStore.ANALYTICS_CONFIG_FILE) as local_file:
                analytics_config = json.load(local_file)
        except Exception:
            logging.error("Cannot find the configuration file")
            return None

        if "BQS" not in analytics_config:
            logging.error("Cannot find BQS config in the configurations")
            self._bqs_config = None
        else:
            logging.debug("EventWriter object created")
            self._bqs_config = analytics_config["BQS"]

    def create_event_auto_optimizer(
        self,
        source_mac: str,
        restart_minion_flag: bool,
        link_name: str,
        node_name: str,
        topology_name: str,
    ) -> bool:
        if restart_minion_flag:
            level = EventLevel.WARNING
        else:
            level = EventLevel.INFO

        details = {"link_name": link_name}
        event = Event(
            timestamp=int(time.time()),
            reason="auto optimizer",
            details=json.dumps(details),
            category=EventCategory.AUTO_OPTIMIZER,
            level=level,
            source="Auto-Optimizer",
            entity=source_mac,
        )

        return self._create_event(
            source_mac=source_mac,
            node_name=node_name,
            topology_name=topology_name,
            event=event,
        )

    def _create_event(
        self, source_mac: str, node_name: str, topology_name: str, event: Event
    ) -> bool:
        """Creates an Event and sends it to BQS.

        Args:
        source_mac:  MAC address of the source node of the statistic.
        event_id: ID of the event from thrift file.

        Return:
        HTTP response.
        """

        topo = Topology(name=topology_name)

        node_events = NodeEvents(mac=source_mac, name=node_name, events=[event])
        bqs = EventsWriteRequest(topology=topo, agents=[node_events])
        try:
            event_des = self._serialize_to_json(bqs)
        except Exception as e:
            logging.error("Exception happened while serializing thrift")
            logging.warning("Exception: {}".format(e))
            return "Failure to serialize thrift"

        bdb = BeringeiDbAccess()
        if not bdb:
            logging.error("Exception happened while creating BeringeiDbAccess()")
            return "Failure to create BeringeiDbAccess() object"

        try:
            response = bdb.write_bqs(
                stats_to_write=event_des, request_path="events_writer"
            )
            return response.status_code

        except Exception as e:
            logging.error("Exception happened while writing BQS")
            logging.warning("Exception: {}".format(e))
            return "Failure to write BQS"

    def _serialize_to_json(self, obj: Event) -> str:
        trans = TTransport.TMemoryBuffer()
        prot = TSimpleJSONProtocolFactory().getProtocol(trans)
        obj.write(prot)
        return trans.getvalue().decode("utf-8")
