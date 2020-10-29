#!/usr/bin/env python3

# built-ins
import time

from modules.addon_misc import dump_result
from modules.addon_parser_health_check import parse_ping_output
from modules.util_logger import EmptyLogger
from modules.util_pssh import PSSH as PSSH


class AVAILABILITY(object):
    """
    Check for Sector and Link AVAILABILITY
    """

    def __init__(self, logPath=None):
        self.logger = EmptyLogger("AVAILABILITY", logPath=logPath, printout=True)

    def sector_availability(self, __vm, cmd, args, duration, pop_ip):
        """
        Check for SECTOR AVAILABILITY
        @params:
        __vm:
            default: NANO server LOCAL_TG object
            backup: controller REMOTE_TG() object
        @cmd: command to run on the sectors
        @duration: Duration of the test
        returs: output file location and sector results
        """
        ping_result = {}
        command = cmd + " " + "-c" + str(duration) + " " + pop_ip + ";sleep 5"
        my_pssh = PSSH()
        sectors_info = my_pssh.get_hop_count(__vm, args)
        output, node_to_ips = my_pssh.pssh_cmd(__vm, command, args)
        for host, host_output in output.items():
            none_found = 0
            response = parse_ping_output(host_output.stdout, self.logger)
            for sector in sectors_info:
                if host == sectors_info[sector]["ipv6_addr"]:
                    try:
                        response["wireless_hop_count"] = sectors_info[sector][
                            "wireless_hop_count"
                        ]
                        response["wired_wireless_hop_count"] = sectors_info[sector][
                            "wired_wireless_hop_count"
                        ]
                    except Exception:
                        continue
                    ping_result[str(sector)] = {}
                    ping_result[str(sector)]["controller"] = {}
                    for _key, value in response.items():
                        if value is None:
                            none_found = 1
                    if not none_found:
                        ping_result[str(sector)]["controller"] = response
        out_fp_no_suffix = "{0}/sector_availability_{1}".format(
            __vm.params["output_folder"], int(time.time() * 1000)
        )
        out_fp = dump_result(
            out_fp_no_suffix, ping_result, __vm.logger, use_pickle=True
        )
        return (out_fp, ping_result)

    def sector_availability_sequential(self, __vm, args, duration, pop_ip):
        ping_result = {}
        my_pssh = PSSH()
        iperf_dur = duration + 200
        sectors_info = my_pssh.get_hop_count(__vm, args)
        for sector in sectors_info:
            if sectors_info[sector]["ipv6_addr"]:
                ping_result[str(sector)] = {}
                ping_result[str(sector)]["controller"] = {}
                host_ip = sectors_info[sector]["ipv6_addr"]
                pop_cmd = "pkill iperf3;iperf3 -s -D"
                my_pssh.run_ssh_cmd(pop_ip, pop_cmd, "root", "facebook")
                host_cmd = "pkill iperf3;iperf3 -s -D"
                my_pssh.run_ssh_cmd(host_ip, host_cmd, "root", "facebook")
                host_cmd = "timeout {} iperf3 -i 1 -l7500 ".format(iperf_dur)
                host_cmd += "-u -b {}M -t {} -c{} > /dev/null 2>&1 &".format(
                    args["rate"], iperf_dur, pop_ip
                )
                my_pssh.run_ssh_cmd(host_ip, host_cmd, "root", "facebook")

                pop_cmd = "timeout {} iperf3 -i 1 -l7500 ".format(iperf_dur)
                pop_cmd += "-u -b {}M -t {} -c{} > /dev/null 2>&1 &".format(
                    args["rate"], iperf_dur, host_ip
                )
                my_pssh.run_ssh_cmd(pop_ip, pop_cmd, "root", "facebook")

                time.sleep(50)
                sec_cmd = "ping6 -c" + str(duration) + " " + pop_ip
                sec_output = my_pssh.pssh_per_sector(
                    [host_ip], sec_cmd, "root", "facebook"
                )
                __vm.logger.note(
                    "running latency test from {} to {}".format(host_ip, pop_ip)
                )
                for _host, host_output in sec_output.items():
                    none_found = 0
                    response = parse_ping_output(host_output.stdout, self.logger)
                    for _key, value in response.items():
                        if value is None:
                            none_found = 1
                    if not none_found:
                        ping_result[str(sector)]["controller"] = response
                try:
                    response["wireless_hop_count"] = sectors_info[sector][
                        "wireless_hop_count"
                    ]
                    response["wired_wireless_hop_count"] = sectors_info[sector][
                        "wired_wireless_hop_count"
                    ]
                except Exception:
                    continue
        out_fp_no_suffix = "{0}/sector_availability_{1}".format(
            __vm.params["output_folder"], int(time.time() * 1000)
        )
        out_fp = dump_result(
            out_fp_no_suffix, ping_result, __vm.logger, use_pickle=True
        )
        return (out_fp, ping_result)
