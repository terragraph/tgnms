#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved.

import dataclasses
from typing import Dict, Optional

from ..models import Health


@dataclasses.dataclass
class Metric:
    key: str
    description: str
    period_s: Optional[int]
    lower_threshold: float
    higher_threshold: float
    reverse: bool


class Metrics:
    prometheus_hold_time: int
    use_real_throughput: bool
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
    min_route_mcs: Metric
    tx_power_diff: Metric
    link_health: Metric
    interference: Metric
    analytics_cn_power_status: Metric
    topology_node_is_online: Metric
    udp_pinger_loss_ratio: Metric
    udp_pinger_rtt_avg: Metric
    reroutes_estimate_min: Metric
    node_health: Metric

    @classmethod
    def update_metrics(
        cls,
        metrics: Dict[str, Dict],
        prometheus_hold_time: int,
        use_real_throughput: bool,
    ) -> None:
        cls.prometheus_hold_time = prometheus_hold_time
        cls.use_real_throughput = use_real_throughput
        cls.analytics_alignment_status = Metric(
            "alignment_ok_percent",
            "Percentage of time TX and RX beam-angles were reasonable.",
            metrics["analytics_alignment_status"]["period_s"],
            metrics["analytics_alignment_status"]["lower_threshold"],
            metrics["analytics_alignment_status"]["higher_threshold"],
            False,
        )
        cls.topology_link_is_online = Metric(
            "topo_link_online_percent",
            "Percentage of time the link was marked online by the controller.",
            metrics["topology_link_is_online"]["period_s"],
            metrics["topology_link_is_online"]["lower_threshold"],
            metrics["topology_link_is_online"]["higher_threshold"],
            False,
        )
        cls.link_alive = Metric(
            "link_alive_percent",
            "Percentage of time the link was marked alive in link stats.",
            metrics["link_alive"]["period_s"],
            metrics["link_alive"]["lower_threshold"],
            metrics["link_alive"]["higher_threshold"],
            False,
        )
        cls.link_avail_for_data = Metric(
            "link_avail_for_data_percent",
            "Percentage of time the link was available for data.",
            metrics["link_avail_for_data"]["period_s"],
            metrics["link_avail_for_data"]["lower_threshold"],
            metrics["link_avail_for_data"]["higher_threshold"],
            False,
        )
        cls.tx_byte = Metric(
            "tx_byte_gbps",
            "75th percentile of TX bytes in Gbps.",
            metrics["tx_byte"]["period_s"],
            metrics["tx_byte"]["lower_threshold"],
            metrics["tx_byte"]["higher_threshold"],
            True,
        )
        cls.analytics_foliage_factor = Metric(
            "foliage_factor",
            "75th percentile of foliage factor.",
            metrics["analytics_foliage_factor"]["period_s"],
            metrics["analytics_foliage_factor"]["lower_threshold"],
            metrics["analytics_foliage_factor"]["higher_threshold"],
            True,
        )
        cls.drs_cn_egress_routes_count = Metric(
            "cn_routes_count",
            "75th percentile of number of CNs being routed through the link.",
            metrics["drs_cn_egress_routes_count"]["period_s"],
            metrics["drs_cn_egress_routes_count"]["lower_threshold"],
            metrics["drs_cn_egress_routes_count"]["higher_threshold"],
            True,
        )
        cls.tx_ok = Metric(
            "tx_ok_total",
            "75th percentile of TX MPDUs per second.",
            metrics["tx_ok"]["period_s"],
            metrics["tx_ok"]["lower_threshold"],
            metrics["tx_ok"]["higher_threshold"],
            True,
        )
        cls.link_avail = Metric(
            "link_resets_count",
            "Number of link resets per hour.",
            metrics["link_avail"]["period_s"],
            metrics["link_avail"]["lower_threshold"],
            metrics["link_avail"]["higher_threshold"],
            True,
        )
        cls.mcs = Metric(
            "mcs",
            "75th percentile of MCS.",
            metrics["mcs"]["period_s"],
            metrics["mcs"]["lower_threshold"],
            metrics["mcs"]["higher_threshold"],
            False,
        )
        cls.mcs_diff = Metric(
            "mcs_diff",
            "75th percentile of difference in MCS for A and Z direction.",
            metrics["mcs_diff"]["period_s"],
            metrics["mcs_diff"]["lower_threshold"],
            metrics["mcs_diff"]["higher_threshold"],
            True,
        )
        cls.min_route_mcs = Metric(
            "min_route_mcs",
            "75th percentile of node's minimum upstream route MCS.",
            metrics["min_route_mcs"]["period_s"],
            metrics["min_route_mcs"]["lower_threshold"],
            metrics["min_route_mcs"]["higher_threshold"],
            False,
        )
        cls.tx_power_diff = Metric(
            "tx_power_idx_diff",
            "75th percentile of difference in TX power index for A and Z direction.",
            metrics["tx_power_diff"]["period_s"],
            metrics["tx_power_diff"]["lower_threshold"],
            metrics["tx_power_diff"]["higher_threshold"],
            True,
        )
        cls.link_health = Metric(
            "link_tput_health",
            "Health from the latest parallel/sequential throughput test.",
            None,
            Health.EXCELLENT.value,
            Health.GOOD.value,
            True,
        )
        cls.interference = Metric(
            "inr_db",
            "Interference for the link in dB.",
            metrics["interference"]["period_s"],
            metrics["interference"]["lower_threshold"],
            metrics["interference"]["higher_threshold"],
            True,
        )
        cls.analytics_cn_power_status = Metric(
            "cn_power_ok_percent",
            "Percentage of time the CN node was estimated to be powered on.",
            metrics["analytics_cn_power_status"]["period_s"],
            metrics["analytics_cn_power_status"]["lower_threshold"],
            metrics["analytics_cn_power_status"]["higher_threshold"],
            False,
        )
        cls.topology_node_is_online = Metric(
            "topo_node_online_percent",
            "Percentage of time the node was marked online by the controller.",
            metrics["topology_node_is_online"]["period_s"],
            metrics["topology_node_is_online"]["lower_threshold"],
            metrics["topology_node_is_online"]["higher_threshold"],
            False,
        )
        cls.udp_pinger_loss_ratio = Metric(
            "pinger_no_loss_perecnt",
            "Percentage of time node was reachable via pings.",
            metrics["udp_pinger_loss_ratio"]["period_s"],
            metrics["udp_pinger_loss_ratio"]["lower_threshold"],
            metrics["udp_pinger_loss_ratio"]["higher_threshold"],
            False,
        )
        cls.udp_pinger_rtt_avg = Metric(
            "pinger_rtt_avg_ms",
            "75th percentile of average ping RTT in ms.",
            metrics["udp_pinger_rtt_avg"]["period_s"],
            metrics["udp_pinger_rtt_avg"]["lower_threshold"],
            metrics["udp_pinger_rtt_avg"]["higher_threshold"],
            True,
        )
        cls.reroutes_estimate_min = Metric(
            "reroutes_estimate_min",
            "Lower bound on number of reroutes for the node per hour.",
            metrics["drs_default_routes_changed"]["period_s"],
            metrics["drs_default_routes_changed"]["lower_threshold"],
            metrics["drs_default_routes_changed"]["higher_threshold"],
            True,
        )
        cls.node_health = Metric(
            "node_tput_health",
            "Health from the latest node throughput test.",
            None,
            Health.EXCELLENT.value,
            Health.GOOD.value,
            True,
        )
