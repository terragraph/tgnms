#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved.

import dataclasses
from typing import Dict, Optional

from ..models import NetworkTestHealth


@dataclasses.dataclass
class Metric:
    interval_s: Optional[int]
    lower_threshold: float
    higher_threshold: float
    reverse: bool


class Metrics:
    prometheus_hold_time: int
    analytics_alignment_status: Metric
    topology_link_is_online: Metric
    link_alive: Metric
    link_avail_for_data: Metric
    tx_byte: Metric
    analytics_foliage_factor: Metric
    drs_cn_egress_routes_count: Metric
    tx_ok: Metric
    link_avail: Metric
    mcs: Metric
    mcs_diff: Metric
    tx_power_diff: Metric
    link_health: Metric
    interference: Metric
    analytics_cn_power_status: Metric
    topology_node_is_online: Metric
    udp_pinger_loss_ratio: Metric
    node_online: Metric
    udp_pinger_rtt_avg: Metric
    node_health: Metric

    @classmethod
    def update_metrics(
        cls, metrics: Dict[str, Dict], prometheus_hold_time: int
    ) -> None:
        cls.prometheus_hold_time = prometheus_hold_time
        cls.analytics_alignment_status = Metric(
            metrics["analytics_alignment_status"]["interval_s"],
            metrics["analytics_alignment_status"]["lower_threshold"],
            metrics["analytics_alignment_status"]["higher_threshold"],
            False,
        )
        cls.topology_link_is_online = Metric(
            metrics["topology_link_is_online"]["interval_s"],
            metrics["topology_link_is_online"]["lower_threshold"],
            metrics["topology_link_is_online"]["higher_threshold"],
            False,
        )
        cls.link_alive = Metric(
            metrics["link_alive"]["interval_s"],
            metrics["link_alive"]["lower_threshold"],
            metrics["link_alive"]["higher_threshold"],
            False,
        )
        cls.link_avail_for_data = Metric(
            metrics["link_avail_for_data"]["interval_s"],
            metrics["link_avail_for_data"]["lower_threshold"],
            metrics["link_avail_for_data"]["higher_threshold"],
            False,
        )
        cls.tx_byte = Metric(
            metrics["tx_byte"]["interval_s"],
            metrics["tx_byte"]["lower_threshold"],
            metrics["tx_byte"]["higher_threshold"],
            True,
        )
        cls.analytics_foliage_factor = Metric(
            metrics["analytics_foliage_factor"]["interval_s"],
            metrics["analytics_foliage_factor"]["lower_threshold"],
            metrics["analytics_foliage_factor"]["higher_threshold"],
            True,
        )
        cls.drs_cn_egress_routes_count = Metric(
            metrics["drs_cn_egress_routes_count"]["interval_s"],
            metrics["drs_cn_egress_routes_count"]["lower_threshold"],
            metrics["drs_cn_egress_routes_count"]["higher_threshold"],
            True,
        )
        cls.tx_ok = Metric(
            metrics["tx_ok"]["interval_s"],
            metrics["tx_ok"]["lower_threshold"],
            metrics["tx_ok"]["higher_threshold"],
            True,
        )
        cls.link_avail = Metric(
            metrics["link_avail"]["interval_s"],
            metrics["link_avail"]["lower_threshold"],
            metrics["link_avail"]["higher_threshold"],
            True,
        )
        cls.mcs = Metric(
            metrics["mcs"]["interval_s"],
            metrics["mcs"]["lower_threshold"],
            metrics["mcs"]["higher_threshold"],
            False,
        )
        cls.mcs_diff = Metric(
            metrics["mcs_diff"]["interval_s"],
            metrics["mcs_diff"]["lower_threshold"],
            metrics["mcs_diff"]["higher_threshold"],
            True,
        )
        cls.tx_power_diff = Metric(
            metrics["tx_power_diff"]["interval_s"],
            metrics["tx_power_diff"]["lower_threshold"],
            metrics["tx_power_diff"]["higher_threshold"],
            True,
        )
        cls.link_health = Metric(
            None, NetworkTestHealth.EXCELLENT.value, NetworkTestHealth.GOOD.value, True
        )
        cls.interference = Metric(
            metrics["interference"]["interval_s"],
            metrics["interference"]["lower_threshold"],
            metrics["interference"]["higher_threshold"],
            True,
        )
        cls.analytics_cn_power_status = Metric(
            metrics["analytics_cn_power_status"]["interval_s"],
            metrics["analytics_cn_power_status"]["lower_threshold"],
            metrics["analytics_cn_power_status"]["higher_threshold"],
            False,
        )
        cls.topology_node_is_online = Metric(
            metrics["topology_node_is_online"]["interval_s"],
            metrics["topology_node_is_online"]["lower_threshold"],
            metrics["topology_node_is_online"]["higher_threshold"],
            False,
        )
        cls.udp_pinger_loss_ratio = Metric(
            metrics["udp_pinger_loss_ratio"]["interval_s"],
            metrics["udp_pinger_loss_ratio"]["lower_threshold"],
            metrics["udp_pinger_loss_ratio"]["higher_threshold"],
            False,
        )
        cls.node_online = Metric(
            metrics["node_online"]["interval_s"],
            metrics["node_online"]["lower_threshold"],
            metrics["node_online"]["higher_threshold"],
            False,
        )
        cls.udp_pinger_rtt_avg = Metric(
            metrics["udp_pinger_rtt_avg"]["interval_s"],
            metrics["udp_pinger_rtt_avg"]["lower_threshold"],
            metrics["udp_pinger_rtt_avg"]["higher_threshold"],
            True,
        )
        cls.node_health = Metric(
            None, NetworkTestHealth.EXCELLENT.value, NetworkTestHealth.GOOD.value, True
        )
