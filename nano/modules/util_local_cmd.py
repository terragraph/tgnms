#!/usr/bin/env python3

# built-ins
import subprocess
import time

# modules
import modules.keywords as KEY
from modules.addon_parser_health_check import parse_traceroute_output


def vm_route_measurement_each(
    rx_info,
    logger,
    traffic="tcp",
    dest_port=5201,
    source_port=None,
    flow_label=None,
    per_hop_num_query=1,
    parallel_num_query=16,
):
    """
    Launch traceroute from NANO VM
    @param rx_info: rx name and inband ip
    @param traffic: "tcp", "udp" or "icmp"
    @param dest_port: destination port number
    @param source_port: source port number
    @param flow_label: flow label number
    """
    rx, rx_ip = rx_info
    logger.info(
        "Traceroute measurement from vm -> {},".format(rx)
        + " dport = {}, sport = {}, flowLabel = {}".format(
            dest_port, source_port, flow_label
        )
    )
    traceroute_details = []
    logger.info("From vm -> {1}, perform one traceroute measurement".format(rx))
    traceroute_cmd = _build_traceroute_cmd(
        target=rx_ip,
        traffic=traffic,
        dest_port=dest_port,
        source_port=source_port,
        flow_label=flow_label,
        per_hop_num_query=per_hop_num_query,
        parallel_num_query=parallel_num_query,
    )
    if not traceroute_cmd:
        logger.debug("Fail to build traceroute cmd")
        return {}

    p = subprocess.Popen(
        traceroute_cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, shell=True
    )
    start_time = int(time.time())
    (traceroute_output, error) = p.communicate()
    logger.debug(
        "traceroute output = {0}, error = {1}".format(traceroute_output, error)
    )
    if (
        error
        or not traceroute_output
        or "unknown" in traceroute_output[1].lower()
        or "unreachable" in traceroute_output[1].lower()
    ):
        logger.debug("Fail to obtain traceroute response")
        return {}
    # TODO: to build dynamic parser w.r.t. per_hop_num_query
    #   to derive average latency info
    traceroute_details = parse_traceroute_output(traceroute_output, logger, start_time)
    try:
        if traceroute_details[KEY.TRACEROUTE_IPS] is not None:
            logger.debug("traceroute from vm to {} success!".format(rx))
    except BaseException:
        logger.debug("traceroute from vm to {} fails!".format(rx))
    return {KEY.TRACEROUTE_DETAILS: traceroute_details}


def _build_traceroute_cmd(
    target=None,
    traffic="tcp",
    dest_port=None,
    source_port=None,
    flow_label=None,
    per_hop_num_query=1,
    parallel_num_query=16,
):
    """
    Launch traceroute to target
    -F: Do not fragment probe packets
    -N parallel_num_query:
        Specifies the number of probe packets sent out simultaneously
    -q per_hop_num_query: Sets the number of probe packets per hop. The default is 3
    -p dport: For TCP specifies just the (constant) destination port to connect
    -T Use TCP SYN for probes
    -l: flow label
    """
    cmd = "traceroute -6 {} -F -N 2 -q 1 -n".format(target)

    if traffic == "tcp":
        cmd += " -T"
    elif traffic == "udp":
        cmd += " -U"
    elif traffic == "icmp":
        cmd += " -I"
    else:
        return None
    cmd += " -q {0} -N {1}".format(per_hop_num_query, parallel_num_query)
    if dest_port is not None:
        cmd += " -p {}".format(dest_port)
    if source_port is not None:
        cmd += " --sport={}".format(source_port)
    if flow_label is not None:
        cmd += " -l {}".format(flow_label)
    return cmd
