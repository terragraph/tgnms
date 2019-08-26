#!/usr/bin/env python3

import random
import time

import modules.keywords as KEY
from modules.addon_parser_health_check import (
    parse_iperf_output,
    parse_ping_output,
    record_iperf_details,
)
from modules.util.remote.base import (
    MULTI_THREAD_LOCK,
    action_to_server,
    batch_action_to_nodes,
    spawn_new_login,
)


def _get_nodes_for_multihop_test(__vm, targets, sector_num="all", option=None):
    """
    Get nodes that need to run multihop tests
    @param __vm:
        default: NANO server LOCAL_TG object
        backup: controller REMOTE_TG() object
    @param targets: list of nodes, set None for all
    @sector_num: num of sectors to test
    @option: selective option to overwrite sector_num configuration
    @return (sector list to test, sector pairs to ignore)
    """
    __vm.logger.info("prepare sector list for the multihop test")
    topology = __vm.topology
    available_sectors, sectors_to_skip = _skip_or_add_sector_for_multihop(
        targets, topology, option
    )
    if len(available_sectors) < 1:
        __vm.logger.error("No matched targets in specified topology network!")
        __vm.logger.debug("Specified targets: {0}".format(targets))
        __vm.logger.debug("Invalid Nodes: {0}".format(sectors_to_skip))
    __vm.logger.info(
        "Valid sectors: {0}, to select {1} sectors; {2} invalid sectors".format(
            len(available_sectors), sector_num, len(sectors_to_skip)
        )
    )
    __vm.logger.info(
        "Select {0} out of {1} sectors for multihop test".format(
            sector_num, len(available_sectors)
        )
    )
    # choose the test sector set based on
    # sector_num and multihop test/analysis option
    selected_sectors = _select_sectors_for_multihop(
        __vm.logger, available_sectors, sector_num
    )
    if option:
        __vm.logger.note(
            "Option {0}, num of sectors = {1}, select {2}".format(
                option, sector_num, selected_sectors
            )
        )
    return selected_sectors, sectors_to_skip


def _select_sectors_for_multihop(logger, sectors_to_test, selected_sector_num="all"):
    try:
        total_sector_num = len(sectors_to_test)
        logger.info(
            "Select {0} out of {1} sectors".format(
                selected_sector_num, total_sector_num
            )
        )
        if selected_sector_num != "all" and (
            int(selected_sector_num) < total_sector_num
        ):
            sectors_to_test = list(sectors_to_test)
            selected_sectors = [
                sectors_to_test[i]
                for i in sorted(
                    random.sample(range(total_sector_num), int(selected_sector_num))
                )
            ]
            selected_sectors = set(selected_sectors)
            logger.info("Select sectors: {0}".format(selected_sectors))
        else:
            selected_sectors = sectors_to_test
        return selected_sectors
    except BaseException as ex:
        logger.error(str(ex))


def _skip_or_add_sector_for_multihop(targets, topology, option=None):
    available_sectors = set()
    sectors_to_skip = set()
    sites_to_test = set()
    for sector in topology.get_all_nodes():
        if not topology.is_connected(sector):
            sectors_to_skip.add(sector)
            continue
        # skip node in the pop site:
        if topology.is_node_in_pop_site(sector):
            sectors_to_skip.add(sector)
            continue
        # skip if not specified targets:
        if targets is not None and sector not in targets:
            pass
        # skip if tx or rx is offline
        if topology.get_status(sector) == "OFFLINE":
            sectors_to_skip.add(sector)
        # skip if cannot find inband ip for the tx node
        elif topology.get_ip(sector, inband=True) is None:
            sectors_to_skip.add(sector)
        else:
            if option:
                # includes all CN nodes
                if option == KEY.CN_ONLY and topology.get_node_type(sector) == "CN":
                    available_sectors.add(sector)
                # pick one dn node per site
                elif option == KEY.DN_SITE and topology.get_node_type(sector) == "DN":
                    site = topology.get_site_name(sector)
                    if site not in sites_to_test:
                        sites_to_test.add(site)
                        available_sectors.add(sector)
            else:
                available_sectors.add(sector)
    return available_sectors, sectors_to_skip


def _multihop_test_launch_rx(__vm, tx_info, rx_info, port=5201):
    status = True
    tx, tx_ip = tx_info
    rx, rx_ip = rx_info
    if rx == "vm":
        destination = "server"
    else:
        destination = "sector"
    # login to the desired rx node to run iperf3 client
    __i = spawn_new_login(
        __vm.params,
        loggerTag="{0}__{1}.iperf_multihop".format(tx, rx),
        destination=destination,
        sectorIP=rx_ip,
    )
    if __i is None:
        __vm.logger.error("cannot log onto {0} to launch rx iperf".format(rx))
        return False
    # run iperf server (in the background, non-blocking)
    __vm.logger.debug("Run multihop iperf server on {0}.".format(rx_ip))
    if not __i.iperf_server(port=port):
        __i.logger.error("Could not setup iperf server.")
        status = False
    # get out of rx
    __i.close_all()
    __i.logger.disable()
    __i = None
    return status


def _multihop_test_launch_tx(
    __vm,
    tx_info,
    rx_info,
    duration,
    tcp=True,
    dest_port=5201,
    source_port=None,
    flow_label=None,
    bitrate="500M",
    congestion_ctl_algo="reno",
):
    """
    Launch iperf client, launch ping and test traceroute from tx
    @param __vm:
        default: NANO server LOCAL_TG object
        backup: controller REMOTE_TG() object
    @param tx_info: tx name, inband ip, and its MAC
    @param rx_info: rx name, inband ip, and its MAC
    @param duration: for how long the test should be
    @param tcp: whether run tcp; by default true
    @param dest_port: destination port number
    @param source_port: source port number
    @param flow_label: flow label number
    @param bitrate: source bit rate; by default 500Mbps
    @param congestion_ctl_algo: TCP congestion control algorithms
        default: reno, options: westwood cubic htcp vegas
    """
    tx, tx_ip = tx_info
    rx, rx_ip = rx_info
    if tx == "vm":
        destination = "server"
    else:
        destination = "sector"
    # login to the desired tx node to run iperf3 client
    __i = spawn_new_login(
        __vm.params,
        loggerTag="{0}__{1}.iperf_multihop".format(tx, rx),
        destination=destination,
        sectorIP=tx_ip,
    )
    if __i is None:
        __vm.logger.error("cannot spawn onto {0} to launch tx iperf".format(tx))
        return False, False, None, None, None
    else:
        __vm.logger.info(
            "Multihop from {0} -> {1},".format(tx, rx)
            + " dest_port = {0}, source_port = {1}, flow_label = {2}".format(
                dest_port, source_port, flow_label
            )
        )
    # run iperf client with server output feedback
    iperf_duration = (
        KEY.MUTLIHOP_WARM_UP_DELAY + duration + KEY.MUTLIHOP_COOL_DOWN_DELAY
    )
    iperf_status, iperf_start_time = __i.iperf_client(
        target=rx_ip,
        timeout=iperf_duration,
        suffix=rx,
        udp=(not tcp),
        port=dest_port,
        client_port=source_port,
        bind=tx_ip,
        flow_label=flow_label,
        bitrate=bitrate,
        congestion_ctl_algo=congestion_ctl_algo,
        getServerOutput=True,
    )
    if not iperf_status:
        __i.logger.error("Fail to initialize iperf client!")

    # Launch ping6 on tx for the given durtation, decide interval and count first
    ping_count = int(iperf_duration / KEY.PING_INTERVAL)
    # TODO multihop: 5-tuple ping to correlate with iperf probing traffic
    ping_status, ping_start_time = __i.launch_ping6(
        target=rx_ip,
        timeout=iperf_duration,
        suffix=rx,
        count=ping_count,
        interval=KEY.PING_INTERVAL,
        interface=tx_ip,
        flow_label=flow_label,
    )
    if not ping_status:
        __i.logger.error("Fail to initialize ping6!")

    traceroute_start_time = int(time.time())
    traceroute_details = []
    traceroute_index = 1
    __i.logger.info("From {0} -> {1}, starts traceroute measurements".format(tx, rx))
    time.sleep(KEY.TRACEROUTE_INTERVAL)
    while int(time.time()) - traceroute_start_time < duration:
        traceroute_output = __i.launch_traceroute(
            target=rx_ip,
            tcp=tcp,
            dest_port=dest_port,
            source_port=source_port + 1,
            flow_label=flow_label + 1,
        )
        try:
            if traceroute_output[KEY.TRACEROUTE_IPS] is not None:
                __i.logger.debug(
                    "index = {0}, traceroute from {1} to {2} success!".format(
                        traceroute_index, tx, rx
                    )
                )
                traceroute_details.append(traceroute_output)
                traceroute_index += 1
        except BaseException:
            __i.logger.debug(
                "index = {0}, traceroute from {1} to {2} fails!".format(
                    traceroute_index, tx, rx
                )
            )
        time.sleep(KEY.TRACEROUTE_INTERVAL)
    __i.logger.info(
        "From {0} -> {1}, {2} rounds traceroute measurements".format(
            tx, rx, traceroute_index
        )
    )
    # get out of tx
    __i.close_all()
    __i.logger.disable()
    __i = None
    return (
        iperf_status,
        ping_status,
        iperf_start_time,
        ping_start_time,
        {KEY.TRACEROUTE_DETAILS: traceroute_details},
    )


def _run_multihop(
    __vm,
    tx,
    tx_ip,
    rx,
    rx_ip,
    duration,
    tcp,
    bitrate,
    multihop_result,
    congestion_ctl_algo,
):
    for i in range(len(tx)):
        # FlowLabel and 5-Tuple: source/destination IPs, source/destination port
        source_port = random.randint(4000, 49151)
        dest_port = random.randint(4000, 49151)
        while source_port == dest_port:
            dest_port = random.randint(4000, 49151)
        flow_label = random.randint(1, 1023)  # 65535
        # login to the desired rx node to run iperf3 server
        if not _multihop_test_launch_rx(
            __vm, (tx[i], tx_ip[i]), (rx[i], rx_ip[i]), port=dest_port
        ):
            __vm.logger.error("failed to launch iperf multihop server")
            return False
        __vm.logger.info(
            "succeeded to launch iperf multihop server at {}".format(rx[i])
        )

        """
        run iperf3 client without -R option
        iperf3 client with getServerOutput: iperf client -> iperf server
        iperf server output is also available at iperf client
        """
        (
            iperf_status,
            ping_status,
            iperf_start_time,
            __,
            route_response,
        ) = _multihop_test_launch_tx(
            __vm,
            (tx[i], tx_ip[i]),
            (rx[i], rx_ip[i]),
            duration=duration,
            tcp=tcp,
            dest_port=dest_port,
            source_port=source_port,
            flow_label=flow_label,
            bitrate=bitrate,
            congestion_ctl_algo=congestion_ctl_algo,
        )
        if not iperf_status or not ping_status:
            __vm.logger.error("failed to launch iperf client and/or derive latency")
            return False
        __vm.logger.info(
            "succeeded to launch iperf client at {0} for {1}s".format(tx[i], duration)
        )
        if tcp:
            __vm.logger.info(
                "multi-hop TCP iperf with {0} congestion control".format(
                    congestion_ctl_algo
                )
            )
        # with continuous traceroute, need to re-decide the sleep period
        time.sleep(
            KEY.MUTLIHOP_WARM_UP_DELAY
            + KEY.MUTLIHOP_COOL_DOWN_DELAY
            + random.randint(1, 10)
        )
        # get iperf, traceroute hop counts and ping latency from tx node
        if tx[i] == "vm":
            destination = "server"
        else:
            destination = "sector"
        __i = spawn_new_login(
            __vm.params,
            loggerTag="{0}__{1}.iperf_multihop".format(tx[i], rx[i]),
            destination=destination,
            sectorIP=tx_ip[i],
        )
        if __i is None:
            __vm.logger.error("cannot log onto {0} to fetch results".format(tx[i]))
            return False
        ping_response = {}
        iperf_response = {}
        # get multihop iperf
        resp = __i.write("cat /tmp/iperf_client_{0}.log".format(rx[i]), timeout=60)
        if resp[0] != "err":
            iperf_response = parse_iperf_output(
                resp[1:], iperf_start_time, __i.logger, serverOutputOnly=True
            )
            __i.write("rm /tmp/iperf_client_{0}.log".format(rx[i]))
            # to prepare for printing/logging purpose
            resp_temp = "\n".join(resp)
            __i.logger.debug(
                "multihop iperf response for {0}->{1}: {2}".format(
                    tx[i], rx[i], resp_temp
                )
            )
            __i.logger.debug(
                "parsed iperf result for {0}->{1}: {2}".format(
                    tx[i], rx[i], iperf_response
                )
            )
            # to record detailed iperf results for debugging
            record_iperf_details(
                tx=tx[i],
                rx=rx[i],
                logpath=__vm.params["output_folder"],
                result=resp_temp,
            )

            __vm.logger.note(
                "succeeded to parse multihop iperf result for {0}->{1}".format(
                    tx[i], rx[i]
                )
            )

        # get multihop ping
        resp = __i.write("cat /tmp/ping6_{0}.log".format(rx[i]), timeout=60)
        if resp[0] != "err":
            ping_response = parse_ping_output(resp[1:], __i.logger)
            __i.write("rm /tmp/ping6_{0}.log".format(rx[i]))
            __vm.logger.note(
                "succeeded to parse multihop ping result for {0}->{1}".format(
                    tx[i], rx[i]
                )
            )
        mode = "udp"
        if tcp:
            mode = "tcp"
        # get out of tx node
        __i.close_all()
        __i.logger.disable()
        __i = None
        # prevent simultaneously write access in multithreading
        MULTI_THREAD_LOCK.acquire()
        __vm.logger.info("tx={0}, rx={1}, mode={2}".format(tx[i], rx[i], mode))
        if mode in multihop_result[tx[i]][rx[i]]:
            multihop_result[tx[i]][rx[i]][mode].update(iperf_response)
            multihop_result[tx[i]][rx[i]][mode].update(ping_response)
            multihop_result[tx[i]][rx[i]][mode].update(route_response)
        else:
            multihop_result[tx[i]][rx[i]][mode] = iperf_response
            multihop_result[tx[i]][rx[i]][mode].update(ping_response)
            multihop_result[tx[i]][rx[i]][mode].update(route_response)
        MULTI_THREAD_LOCK.release()


def _iperf_multihop_test_each(
    __vm,
    server_location,
    sector_info,
    direction,
    duration,
    multihop_result,
    tcp=True,
    bitrate="500M",
    congestion_ctl_algo="reno",
):
    """
    Don't call this directly
    @param __vm:
        default: NANO server LOCAL_TG object
        backup: controller REMOTE_TG() object
    @param server_location: server locates on a outside VM or on one PoP node
    @param sector_info: rx name, inband ip, and its MAC
    @param direction: northbound - sector->server or southbound - server->sector
    @param duration: test duration
    @param multihop_result: dictionary to hold the result
    @param tcp: whether run tcp; by default yes
    @param bitrate: source bit rate; by default 500Mbps
    @param congestion_ctl_algo: TCP congestion control algorithms
        default: reno, options: westwood cubic htcp vegas
    """
    sector, sector_mac, sector_ip = sector_info
    # get server ip
    if server_location == "vm":
        server_ip = __vm.params["server"]["ip"]
    elif server_location == "pop":
        # get the pop node from the topology object - 1st element
        # write server_ip into result
        pop_nodes = __vm.topology.get_pop_nodes()
        if len(pop_nodes) > 0:
            __vm.logger.info("pop_nodes list is {}".format(pop_nodes))
            server_ip = __vm.topology.get_ip(pop_nodes[0])
            __vm.logger.info("selected pop node is {}".format(pop_nodes[0]))
        else:
            __vm.logger.error("pop_nodes list is empty!")
            raise BaseException
    else:
        raise BaseException
    if direction == KEY.NORTHBOUND:
        tx = [sector]
        rx = [server_location]
        tx_ip = [sector_ip]
        rx_ip = [server_ip]
    elif direction == KEY.SOUTHBOUND:
        tx = [server_location]
        rx = [sector]
        tx_ip = [server_ip]
        rx_ip = [sector_ip]
    elif direction == KEY.BIDIRECTION:
        tx = [sector, server_location]
        rx = [server_location, sector]
        tx_ip = [sector_ip, server_ip]
        rx_ip = [server_ip, sector_ip]
    else:
        raise BaseException

    if isinstance(tx, list) or isinstance(tx, tuple):
        _run_multihop(
            __vm,
            tx,
            tx_ip,
            rx,
            rx_ip,
            duration,
            tcp,
            bitrate,
            multihop_result,
            congestion_ctl_algo,
        )
    return True


def multihop_test_each_wrapper(
    __vm,
    server_location,
    sector,
    multihop_result,
    direction="southbound",
    duration=100,
    traffic=None,
):
    """
    Run each multihop test from server->sector or from sector->server
    @param __vm:
        default: NANO server LOCAL_TG object
        backup: controller REMOTE_TG() object
    @param server_location: server locates on a outside VM or on one PoP node
    @param sector: sector name
    @param multihop_result: dictionary to hold the throughput/latency result
    @param direction: northbound - sector -> server
                      southbound - server -> sector
                      bidirection - sector < - > server
    @param duration: for how long the test should be; default is 10 seconds
    @param traffic: example ["tcp", "udp"]
    """
    sector_ip = __vm.topology.get_ip(sector, inband=True)
    sector_mac = __vm.topology.get_mac(sector)
    if sector_ip is None or sector_mac is None:
        __vm.logger.error(
            "Cannot find ip for sector {0} ip {1} mac {2}".format(
                sector, sector_ip, sector_mac
            )
        )
        return
    # create random port to use
    if isinstance(traffic, list) or isinstance(traffic, tuple):
        for each in traffic:
            # TODO multihop: plan to handle bi-directional multihop traffic
            __vm.logger.info(
                "multihop starts for {0} between {1} and {2}".format(
                    direction, sector, server_location
                )
            )
            _iperf_multihop_test_each(
                __vm,
                server_location,
                (sector, sector_mac, sector_ip),
                direction,
                duration,
                multihop_result,
                tcp=(each == "tcp"),
                bitrate=__vm.params["tests"]["iperf_multihop"]["rate"],
                congestion_ctl_algo=__vm.params["tests"]["iperf_multihop"][
                    "congest_ctrl_algo"
                ],
            )


def prepare_multihop_test_set(__vm, targets=None, pnum="inf"):
    # iperf_reset action shall be parallel by default
    batch_action_to_nodes(
        __vm, {}, "iperf_reset", clear_known_host=False, parallel=True, pnum=pnum
    )
    # iperf_reset on the server (NA VM)
    if __vm.params["tests"]["iperf_multihop"]["server_location"] == "vm":
        action_to_server(__vm, "iperf_reset", clear_known_host=True)
    multihop_sector_num = __vm.params["tests"]["iperf_multihop"]["sessions"]
    option = __vm.params["tests"]["iperf_multihop"]["option"]
    __vm.logger.info(
        "To select {0} sectors for multihop iperf".format(multihop_sector_num)
    )
    # get sectors to test, consider selective options
    set_sectors, _skipped_sectors = _get_nodes_for_multihop_test(
        __vm, targets, multihop_sector_num, option
    )
    return set_sectors


def prepare_multihop_test_pair(
    __vm, direction, sector, server_location, multihop_result
):
    if direction == KEY.NORTHBOUND:
        __vm.logger.note(
            "Starting {0} multihop from {1}->{2}".format(
                direction, sector, server_location
            )
        )
        rx = [server_location]
        tx = [sector]
    elif direction == KEY.SOUTHBOUND:
        __vm.logger.note(
            "Starting {0} multihop from {1}->{2}".format(
                direction, server_location, sector
            )
        )
        tx = [server_location]
        rx = [sector]
    # sequential bidirection
    elif direction == KEY.BIDIRECTION:
        __vm.logger.note(
            "Starting {0} multihop from {1}<->{2}".format(
                direction, server_location, sector
            )
        )
        tx = [server_location, sector]
        rx = [sector, server_location]
    else:
        return None, None
    if isinstance(tx, list) or isinstance(tx, tuple):
        for i in range(len(tx)):
            if tx[i] not in multihop_result:
                multihop_result[tx[i]] = {}
            if rx[i] not in multihop_result[tx[i]]:
                multihop_result[tx[i]][rx[i]] = {}
    return tx, rx
