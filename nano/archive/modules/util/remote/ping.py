#!/usr/bin/env python3

import time

# dumpy imports to silence lint errors
import dump_result
import get_nodes_for_link_test
import parse_ping_output
import PSSH


def ping_test_wrapper_pssh(__c, targets=None, parallel=False, pnum="inf", duration=15):
    """
    Ping Test Wrapper
    @param __c: controller REMOTE_TG() object
    @param targets:
        a list of target tx nodes to test; set None to test all valid nodes
    @param parallel: use parallel threading to speed up/run things fast
    @param pnum: number of parallel processes, default infinity
    @param layer: default on `link` layer
    @return (output file path, result dictionary)
    """
    pnum = float(pnum)
    ping_result = {}
    host_args = []
    inband_ips = []
    # calculate number of packets given interval 0.2 sec
    interval = 0.2
    count = int(duration / interval)
    # restart systemd-logind just in case
    __c.restart_systemd_logind()
    # get what sectors to test
    sector_pair_to_test, skipped_sectors = get_nodes_for_link_test(__c, targets)
    # ping on defined network layer for each target
    for tx, rx in sector_pair_to_test:
        if tx not in ping_result:
            ping_result[tx] = {}
        if rx not in ping_result[tx]:
            ping_result[tx][rx] = {}
        tx_ip = __c.topology.get_ip(tx, inband=True)
        rx_ip = __c.topology.get_ip(rx, inband=True)
        rx_mac = __c.topology.get_mac(rx)
        if __c.params["ping_layer"] == "link":
            # __c.logger.info('terra ping on {}__{}'.format(tx, rx))
            cmd = "ip -6 neigh | grep terra | grep {0}".format(rx_mac)
            cmd += "| awk '{print $1\"%\"$3}' | xargs -iCLIENT sh -c 'ping6 "
            cmd += "-i {0} ".format(interval)
            cmd += "-c {0} ".format(count)
            cmd += " CLIENT'"
        elif __c.params["ping_layer"] == "network":
            # __c.logger.info('lo ping on {}__{}'.format(tx, rx))
            cmd = "ping6 "
            cmd += "{0} ".format(rx_ip)
            cmd += "-i {0} ".format(interval)
            cmd += "-c {0} ".format(count)
        else:
            raise BaseException
        inband_ips.append(tx_ip)
        host_args.append(cmd)
    myPSSH = PSSH()
    output = myPSSH.pssh_per_sector_cmd(
        inband_ips, host_args, duration, "root", "facebook"
    )
    for host, host_output in output.items():
        None_found = 0
        response = parse_ping_output(host_output.stdout, __c.logger)
        for tx, rx in sector_pair_to_test:
            tx_ip = __c.topology.get_ip(tx, inband=True)
            if tx_ip == host:
                for _key, value in response.items():
                    if value is None:
                        None_found = 1
                if not None_found:
                    ping_result[tx][rx] = response
    out_fp_no_suffix = "{0}/ping_{1}_layer_{2}".format(
        __c.params["output_folder"], __c.params["ping_layer"], int(time.time() * 1000)
    )
    out_fp = dump_result(out_fp_no_suffix, ping_result, __c.logger)
    return (out_fp, ping_result)
