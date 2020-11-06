#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved.

from typing import DefaultDict, Dict, Tuple

from ..models import Health
from .metrics import Metric, Metrics


def get_health(value: float, metric: Metric) -> int:
    if metric.reverse:
        if value <= metric.lower_threshold:
            return Health.EXCELLENT.value
        elif value <= metric.higher_threshold:
            return Health.GOOD.value
        return Health.POOR.value

    if value >= metric.higher_threshold:
        return Health.EXCELLENT.value
    elif value >= metric.lower_threshold:
        return Health.GOOD.value
    return Health.POOR.value


def get_link_stats_health(  # noqa: C901
    link_stats_map: DefaultDict, period_s: int
) -> Tuple[str, Dict]:
    """Evaluate health of link stats and generate corresponding bitmap."""
    stats_health: Dict = {"overall_health": Health.UNKNOWN.value, "stats": {}}
    link_labels_bitmap = ""

    # Evaluate analytics alignment status
    alignment_status_label = 0
    total_tx_rx_healthy = link_stats_map.get("analytics_alignment_status")
    if total_tx_rx_healthy is not None:
        tx_rx_healthy_percentage = (
            total_tx_rx_healthy
            * Metrics.analytics_alignment_status.interval_s
            / period_s
            * 100
        )
        stats_health["stats"]["analytics_alignment_status"] = {
            "health": get_health(
                tx_rx_healthy_percentage, Metrics.analytics_alignment_status
            ),
            "value": tx_rx_healthy_percentage,
        }
        alignment_status_label = int(
            tx_rx_healthy_percentage
            < Metrics.analytics_alignment_status.lower_threshold
        )
    link_labels_bitmap += f"{alignment_status_label}"

    # Evaluate link availability using 'topology_link_is_online'
    link_online_label = 0
    total_link_online = link_stats_map.get("topology_link_is_online")
    if total_link_online is not None:
        link_online_percentage = (
            total_link_online
            * Metrics.topology_link_is_online.interval_s
            / period_s
            * 100
        )
        stats_health["stats"]["topology_link_is_online"] = {
            "health": get_health(
                link_online_percentage, Metrics.topology_link_is_online
            ),
            "value": link_online_percentage,
        }
        link_online_label = int(
            link_online_percentage < Metrics.topology_link_is_online.lower_threshold
        )
    link_labels_bitmap += f"{link_online_label}"

    # Evaluate link availability using 'link_alive'
    link_alive_label = 0
    link_alive_percentage = link_stats_map.get("link_alive")
    if link_alive_percentage is not None:
        stats_health["stats"]["link_alive"] = {
            "health": get_health(link_alive_percentage, Metrics.link_alive),
            "value": link_alive_percentage,
        }
        link_alive_label = int(
            link_alive_percentage < Metrics.link_alive.lower_threshold
        )
    link_labels_bitmap += f"{link_alive_label}"

    # Evaluate link availability using 'link_avail_for_data'
    link_avail_for_data_label = 0
    link_avail_for_data_percentage = link_stats_map.get("link_avail_for_data")
    if link_avail_for_data_percentage is not None:
        stats_health["stats"]["link_avail_for_data"] = {
            "health": get_health(
                link_avail_for_data_percentage, Metrics.link_avail_for_data
            ),
            "value": link_avail_for_data_percentage,
        }
        link_avail_for_data_label = int(
            link_avail_for_data_percentage < Metrics.link_avail_for_data.lower_threshold
        )
    link_labels_bitmap += f"{link_avail_for_data_label}"

    # Evaluate link traffic using 'tx_byte'
    tx_byte_label = 0
    tx_byte = link_stats_map.get("tx_byte")
    if tx_byte is not None:
        tx_byte = tx_byte * 8 / 1e9 / 30
        stats_health["stats"]["tx_byte"] = {
            "health": get_health(tx_byte, Metrics.tx_byte),
            "value": tx_byte,
        }
        tx_byte_label = int(tx_byte > Metrics.tx_byte.higher_threshold)
    link_labels_bitmap += f"{tx_byte_label}"

    # Evaluate foliage using 'analytics_foliage_factor'
    foliage_label = 0
    foliage = link_stats_map.get("analytics_foliage_factor")
    if foliage is not None:
        stats_health["stats"]["analytics_foliage_factor"] = {
            "health": get_health(foliage, Metrics.analytics_foliage_factor),
            "value": foliage,
        }
        foliage_label = int(foliage > Metrics.analytics_foliage_factor.higher_threshold)
    link_labels_bitmap += f"{foliage_label}"

    # Evaluate link importance using 'drs_cn_egress_routes_count'
    link_importance_label = 0
    link_imp = link_stats_map.get("drs_cn_egress_routes_count")
    if link_imp is not None:
        stats_health["stats"]["drs_cn_egress_routes_count"] = {
            "health": get_health(link_imp, Metrics.drs_cn_egress_routes_count),
            "value": link_imp,
        }
        link_importance_label = int(
            link_imp > Metrics.drs_cn_egress_routes_count.higher_threshold
        )
    link_labels_bitmap += f"{link_importance_label}"

    # Evaluate link traffic using 'tx_ok'
    tx_ok_label = 0
    tx_ok = link_stats_map.get("tx_ok")
    if tx_ok is not None:
        stats_health["stats"]["tx_ok"] = {
            "health": get_health(tx_ok, Metrics.tx_ok),
            "value": tx_ok,
        }
        tx_ok_label = int(tx_ok > Metrics.tx_ok.higher_threshold)
    link_labels_bitmap += f"{tx_ok_label}"

    # Evaluate link availability using 'link_avail'
    link_avail_label = 0
    link_avail = link_stats_map.get("link_avail")
    if link_avail is not None:
        # Normalize to number of resets per hour
        link_avail = link_avail * 3600 / period_s
        stats_health["stats"]["link_avail"] = {
            "health": get_health(link_avail, Metrics.link_avail),
            "value": link_avail,
        }
        link_avail_label = int(link_avail > Metrics.link_avail.higher_threshold)
    link_labels_bitmap += f"{link_avail_label}"

    # Evaluate mcs using "mcs"
    mcs_label = 0
    mcs = link_stats_map.get("mcs")
    if mcs is not None:
        stats_health["stats"]["mcs"] = {
            "health": get_health(mcs, Metrics.mcs),
            "value": mcs,
        }
        mcs_label = int(mcs < Metrics.mcs.lower_threshold)
    link_labels_bitmap += f"{mcs_label}"

    # Evaluate mismatch in mcs of both link directions
    mcs_diff_label = 0
    mcs_diff = link_stats_map.get("mcs_diff")
    if mcs_diff is not None:
        stats_health["stats"]["mcs_diff"] = {
            "health": get_health(mcs_diff, Metrics.mcs_diff),
            "value": mcs_diff,
        }
        mcs_diff_label = int(mcs_diff > Metrics.mcs_diff.higher_threshold)
    link_labels_bitmap += f"{mcs_diff_label}"

    # Evaluate mismatch in tx_power of both link directions
    tx_power_diff_label = 0
    tx_power_diff = link_stats_map.get("tx_power_diff")
    if tx_power_diff is not None:
        stats_health["stats"]["tx_power_diff"] = {
            "health": get_health(tx_power_diff, Metrics.tx_power_diff),
            "value": tx_power_diff,
        }
        tx_power_diff_label = int(
            tx_power_diff > Metrics.tx_power_diff.higher_threshold
        )
    link_labels_bitmap += f"{tx_power_diff_label}"

    # Evaluate link health from latest network test
    link_health_label = 0
    link_health = link_stats_map.get("link_health")
    if link_health is not None:
        stats_health["stats"]["link_health"] = {
            "health": get_health(link_health, Metrics.link_health),
            "value": link_health,
        }
        link_health_label = int(link_health >= Health.POOR.value)
    link_labels_bitmap += f"{link_health_label}"

    # Evaluate link interference using 'inr_curr_power'
    inr_curr_power_label = 0
    inr_curr_power = link_stats_map.get("interference")
    if inr_curr_power is not None:
        stats_health["stats"]["interference"] = {
            "health": get_health(inr_curr_power, Metrics.interference),
            "value": inr_curr_power,
        }
        inr_curr_power_label = int(
            inr_curr_power > Metrics.interference.higher_threshold
        )
    link_labels_bitmap += f"{inr_curr_power_label}"

    # Calculate overall link health
    if (
        stats_health["stats"].get("link_avail") is not None
        and stats_health["stats"].get("link_avail_for_data") is not None
        and stats_health["stats"].get("link_health") is not None
    ):
        if (
            stats_health["stats"]["link_avail"]["health"] == Health.POOR.value
            or stats_health["stats"]["link_avail_for_data"]["health"]
            == Health.POOR.value
            or stats_health["stats"]["link_health"]["health"] == Health.POOR.value
        ):
            stats_health["overall_health"] = Health.POOR.value
        elif (
            stats_health["stats"]["link_avail"]["health"] == Health.EXCELLENT.value
            and stats_health["stats"]["link_avail_for_data"]["health"]
            == Health.EXCELLENT.value
            and stats_health["stats"]["link_health"]["health"] == Health.EXCELLENT.value
        ):
            stats_health["overall_health"] = Health.EXCELLENT.value
        else:
            stats_health["overall_health"] = Health.GOOD.value

    return link_labels_bitmap, stats_health


def get_node_stats_health(
    node_stats_map: DefaultDict, period_s: int
) -> Tuple[str, Dict]:
    """Evaluate health of node stats and generate corresponding bitmap."""
    stats_health: Dict = {"overall_health": Health.UNKNOWN.value, "stats": {}}
    node_labels_bitmap = ""

    # Evaluate analytics cn powered off count
    cn_power_status_label = 0
    total_cn_powered_off = node_stats_map.get("analytics_cn_power_status")
    if total_cn_powered_off is not None:
        cn_powered_off_percentage = (
            total_cn_powered_off
            * Metrics.analytics_cn_power_status.interval_s
            / period_s
            * 100
        )
        stats_health["stats"]["analytics_cn_power_status"] = {
            "health": get_health(
                cn_powered_off_percentage, Metrics.analytics_cn_power_status
            ),
            "value": cn_powered_off_percentage,
        }
        cn_power_status_label = int(
            cn_powered_off_percentage
            < Metrics.analytics_cn_power_status.lower_threshold
        )
    node_labels_bitmap += f"{cn_power_status_label}"

    # Evaluate node availability using 'topology_node_is_online'
    node_online_label = 0
    total_node_online = node_stats_map.get("topology_node_is_online")
    if total_node_online is not None:
        node_online_percentage = (
            total_node_online
            * Metrics.topology_node_is_online.interval_s
            / period_s
            * 100
        )
        stats_health["stats"]["topology_node_is_online"] = {
            "health": get_health(
                node_online_percentage, Metrics.topology_node_is_online
            ),
            "value": node_online_percentage,
        }
        node_online_label = int(
            node_online_percentage < Metrics.topology_node_is_online.lower_threshold
        )
    node_labels_bitmap += f"{node_online_label}"

    # Evaluate node availability using 'udp_pinger_loss_ratio'
    pinger_loss_ratio_label = 0
    pinger_loss_ratio = node_stats_map.get("udp_pinger_loss_ratio")
    if pinger_loss_ratio is not None:
        pinger_loss_ratio_percentage = (
            pinger_loss_ratio
            * Metrics.udp_pinger_loss_ratio.interval_s
            / period_s
            * 100
        )
        stats_health["stats"]["udp_pinger_loss_ratio"] = {
            "health": get_health(
                pinger_loss_ratio_percentage, Metrics.udp_pinger_loss_ratio
            ),
            "value": pinger_loss_ratio_percentage,
        }
        pinger_loss_ratio_label = int(
            pinger_loss_ratio_percentage < Metrics.udp_pinger_loss_ratio.lower_threshold
        )
    node_labels_bitmap += f"{pinger_loss_ratio_label}"

    # Evaluate node availability using 'node_online'
    node_online_label = 0
    node_online = node_stats_map.get("node_online")
    if node_online is not None:
        node_online_percentage = (
            node_online * Metrics.node_online.interval_s / period_s * 100
        )
        stats_health["stats"]["node_online"] = {
            "health": get_health(node_online_percentage, Metrics.node_online),
            "value": node_online_percentage,
        }
        node_online_label = int(
            node_online_percentage < Metrics.node_online.lower_threshold
        )
    node_labels_bitmap += f"{node_online_label}"

    # Evaluate node delay using 'udp_pinger_rtt_avg'
    pinger_rtt_avg_label = 0
    pinger_rtt_avg = node_stats_map.get("udp_pinger_rtt_avg")
    if pinger_rtt_avg is not None:
        stats_health["stats"]["udp_pinger_rtt_avg"] = {
            "health": get_health(pinger_rtt_avg, Metrics.udp_pinger_rtt_avg),
            "value": pinger_rtt_avg,
        }
        pinger_rtt_avg_label = int(
            pinger_rtt_avg > Metrics.udp_pinger_rtt_avg.higher_threshold
        )
    node_labels_bitmap += f"{pinger_rtt_avg_label}"

    # Evaluate node health from latest network test
    node_health_label = 0
    node_health = node_stats_map.get("node_health")
    if node_health is not None:
        stats_health["stats"]["node_health"] = {
            "health": get_health(node_health, Metrics.node_health),
            "value": node_health,
        }
        node_health_label = int(node_health >= Health.POOR.value)
    node_labels_bitmap += f"{node_health_label}"

    # Calculate overall node health
    if (
        stats_health["stats"].get("udp_pinger_loss_ratio") is not None
        and stats_health["stats"].get("udp_pinger_rtt_avg") is not None
        and stats_health["stats"].get("node_health") is not None
    ):
        if (
            stats_health["stats"]["udp_pinger_loss_ratio"]["health"]
            == Health.POOR.value
            or stats_health["stats"]["udp_pinger_rtt_avg"]["health"]
            == Health.POOR.value
            or stats_health["stats"]["node_health"]["health"] == Health.POOR.value
        ):
            stats_health["overall_health"] = Health.POOR.value
        elif (
            stats_health["stats"]["udp_pinger_loss_ratio"]["health"]
            == Health.EXCELLENT.value
            and stats_health["stats"]["udp_pinger_rtt_avg"]["health"]
            == Health.EXCELLENT.value
            and stats_health["stats"]["node_health"]["health"] == Health.EXCELLENT.value
        ):
            stats_health["overall_health"] = Health.EXCELLENT.value
        else:
            stats_health["overall_health"] = Health.GOOD.value

    return node_labels_bitmap, stats_health
