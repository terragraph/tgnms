#!/usr/bin/env python3
from __future__ import division

import json
import random
import subprocess
import time

from modules.addon_misc import dump_result


try:
    from pssh.pssh_client import ParallelSSHClient
except ImportError:
    pass


class PSSH(object):
    def __init__(self):
        self.inband_ips = []
        self.node_to_ips = []

    def _fetch_iband_ips(self, __vm, args):
        node_to_ips_full = []
        multihop_node_num = 50
        for node in __vm.topology.node:
            data = []
            if "inband_ip" in __vm.topology.node[node]:
                self.inband_ips.append(__vm.topology.node[node]["inband_ip"])
                data.append(node)
                data.append(__vm.topology.node[node]["inband_ip"])
                node_to_ips_full.append(data)
        __vm.logger.info(
            "multihop_session={}".format(args["tests"]["iperf_multihop"]["sessions"])
        )
        if args["tests"]["iperf_multihop"]["sessions"]:
            if args["tests"]["iperf_multihop"]["sessions"] == "all":
                multihop_node_num = len(node_to_ips_full)
            else:
                multihop_node_num = int(args["tests"]["iperf_multihop"]["sessions"])
        if args["tests"]["iperf_multihop"]["do_it"] and args.get("custom", {}).get(
            "fetch_iband_ips", False
        ):
            self.node_to_ips = [
                node_to_ips_full[i]
                for i in sorted(
                    random.sample(range(len(node_to_ips_full)), multihop_node_num)
                )
            ]
        elif args["tests"]["ping_sa"]["do_it"] and args.get("custom", {}).get(
            "fetch_iband_ips", False
        ):
            self.node_to_ips = [
                node_to_ips_full[i]
                for i in sorted(
                    random.sample(range(len(node_to_ips_full)), multihop_node_num)
                )
            ]
        elif args["tests"]["iperf_multihop"]["do_it"] and args.get("custom", {}).get(
            "fetch_iband_ips", False
        ):
            self.node_to_ips = [
                node_to_ips_full[i]
                for i in sorted(
                    random.sample(range(len(node_to_ips_full)), multihop_node_num)
                )
            ]
        else:
            self.node_to_ips = node_to_ips_full

    def get_cpe_ips(self, list_sites, args):
        cpe_cmd = (
            "ip -6 neigh ls dev nic0| grep 6ff | grep 2001 | awk "
            + "'{print $1}' | xargs -iCLIENT sh -c 'ping6 -c1 CLIENT' | "
            + "grep '64 bytes from' 2>/dev/null | grep icmp_seq | "
            + "awk '{print $4}' | cut -c 1-34"
        )
        host_ips = []
        host_cmds = []
        for site in list_sites:
            host_ips.append(list_sites[site]["ipv6_addr"])
            host_cmds.append(cpe_cmd)
        cpe_output = self.pssh_per_sector_cmd(
            host_ips, host_cmds, args["duration"], "root", "facebook"
        )
        for host, host_output in cpe_output.items():
            try:
                for line in host_output.stdout:
                    for site in list_sites:
                        if list_sites[site]["ipv6_addr"] == host:
                            if "2001" in line:
                                list_sites[site]["cpe_ip"] = line
            except TypeError:
                continue
        return list_sites

    def __get_node_hop(self, list_sites, host, host_output):
        wired_wireless_hop_count = 0
        wireless_hop_count = 0
        new_lines = 0
        path = []
        try:
            for line in host_output.stdout:
                if "fe80" in line:
                    wired_wireless_hop_count = wired_wireless_hop_count + 1
                    if "terra" in line:
                        wireless_hop_count = wireless_hop_count + 1
                    path.append(line)
                elif "" in line:
                    new_lines = new_lines + 1

                if new_lines == 6:
                    for site in list_sites:
                        if list_sites[site]["ipv6_addr"] == host:
                            list_sites[site][
                                "wired_wireless_hop_count"
                            ] = wired_wireless_hop_count
                            list_sites[site]["wireless_hop_count"] = wireless_hop_count
                            list_sites[site]["path"].append(path)
                    break
        except Exception:
            for site in list_sites:
                if list_sites[site]["ipv6_addr"] == host:
                    list_sites[site][
                        "wired_wireless_hop_count"
                    ] = wired_wireless_hop_count
                    list_sites[site]["wireless_hop_count"] = wireless_hop_count
        return list_sites

    def __get_node_hop_trace(self, list_sites, host, host_output, downlink=False):
        wired_wireless_hop_count = 0
        wireless_hop_count = 0
        hop_counts = 0
        hop_details = []
        for line in host_output.stdout:
            if "traceroute" in line:
                continue
            hop_counts += 1
            hop_details.append(line)
        try:
            for site in list_sites:
                if list_sites[site]["ipv6_addr"] == host:
                    wireless_hop_count = int(int(hop_counts) / 2)
                    wired_wireless_hop_count = int(hop_counts)
                    list_sites[site][
                        "wired_wireless_hop_count"
                    ] = wired_wireless_hop_count
                    list_sites[site]["wireless_hop_count"] = wireless_hop_count
                    list_sites[site]["path"] = hop_details
                    list_sites[site]["downlink"] = downlink
                    break
        except Exception:
            for site in list_sites:
                if list_sites[site]["ipv6_addr"] == host:
                    list_sites[site]["wired_wireless_hop_count"] = 0
                    list_sites[site]["wireless_hop_count"] = 0
                    list_sites[site]["downlink"] = downlink
        return list_sites

    def get_hop_count(self, __vm, args, pop_ip):
        hop_cmd = "traceroute6 " + pop_ip
        output, sites = self.pssh_cmd(__vm, hop_cmd, args)
        list_sites = {}
        for site in sites:
            list_sites[site[0]] = {}
            list_sites[site[0]]["path"] = []
            list_sites[site[0]]["ipv6_addr"] = site[1]
            list_sites[site[0]]["wired_wireless_hop_count"] = 0
            list_sites[site[0]]["wireless_hop_count"] = 0

        for host, host_output in output.items():
            list_sites = self.__get_node_hop_trace(
                list_sites,
                host,
                host_output,
                args["tests"]["iperf_multihop"]["downlink"],
            )
        list_sites = self.get_cpe_ips(list_sites, args)
        return list_sites

    def _get_iperf_cpe_result(
        self,
        myController,
        sectors_info,
        sector,
        host_output,
        iperf_json,
        iperf_tehcloud,
    ):
        lines = ""
        for line in host_output.stdout:
            if "Warning" in line:
                pass
            else:
                lines = lines + line
        try:
            iperf_json = json.loads(str(lines))
            sectors_info[sector]["iperf_cpe_status"] = "Passed"
        except ValueError:
            myController.logger.error(
                "Value error for {} to {}".format(sector, iperf_tehcloud)
            )
            sectors_info[sector]["iperf_cpe_status"] = "Failed"
            pass
        return sectors_info, iperf_json

    def iperf_multihop_cpe(
        self,
        myController,
        sectors_info,
        duration,
        iperf_tehcloud="web1.tehcloud.net",
        udp=False,
        downlink=False,
        bitrate="1G",
        port=5201,
    ):
        link = 0
        iperf_json = {}
        for sector in sectors_info:
            myController.logger.info(
                "link number: {} ( sector:{} )".format(link, sector)
            )
            cmd = ["iperf3 -s -D --json"]
            pop_host = [iperf_tehcloud]
            self.pssh_per_sector_cmd(pop_host, cmd, duration, "odroid", "odroid")

            _cmd = "iperf3 "
            if udp:
                _cmd += "-u "
            if downlink:
                _cmd += "-R "
            _cmd += "-c {0} ".format(iperf_tehcloud)
            # interval and format locked to every 1 second and Mbits/second
            # -R means reverse traffic, for acc
            # _cmd += '-i 5 -P 11 -J '
            _cmd += "-i 1 -P 7 -b 100M -w 4m -l 1400 --get-server-output --json "
            # port
            _cmd += "-p {0} ".format(port)
            # transmit time
            if duration is None:
                _cmd += "-t 0"
            else:
                _cmd += "-t {0}".format(duration)
            try:
                host_ip = [sectors_info[sector]["cpe_ip"]]
                myController.logger.info(host_ip)
            except KeyError:
                link = link + 1
                sectors_info[sector]["iperf_cpe_result"] = iperf_json
                continue
            cmd_client = ["pkill iperf3"]
            self.pssh_per_sector_cmd(host_ip, cmd_client, duration, "odroid", "odroid")
            myController.logger.info(
                "starting multihop iperf (cpe)" + "in pssh_per_sector_cmd"
            )
            cmd_client = [_cmd]
            client_output = self.pssh_per_sector_cmd(
                host_ip, cmd_client, duration, "odroid", "odroid"
            )
            myController.logger.info(
                "Finished multihop iperf (cpe)" + "in pssh_per_sector_cmd"
            )
            try:
                for _host, host_output in client_output.items():
                    sectors_info, iperf_json = self._get_iperf_cpe_result(
                        myController,
                        sectors_info,
                        sector,
                        host_output,
                        iperf_json,
                        iperf_tehcloud,
                    )
            except Exception:
                sectors_info[sector]["iperf_cpe_result"] = iperf_json
                sectors_info[sector]["iperf_cpe_status"] = "Failed"
            link = link + 1
            sectors_info[sector]["iperf_cpe_result"] = iperf_json
            myController.logger.note(
                "multihop result for {} to {}".format(sector, iperf_tehcloud)
            )
            myController.logger.note(json.dumps(sectors_info[sector], sort_keys=True))
        out_fp_no_suffix = "{0}/multihop_cpe_{1}".format(
            myController.params["output_folder"], int(time.time() * 1000)
        )
        out_fp = dump_result(
            out_fp_no_suffix, sectors_info, myController.logger, use_pickle=True
        )
        return (out_fp, sectors_info)

    def _get_iperf_result(
        self, myController, sectors_info, sector, client_output, pop_node_ip
    ):
        lines = ""
        try:
            for line in client_output.stdout:
                if "Warning" in line:
                    pass
                elif "Error" in line:
                    raise Exception("Error running client")
                else:
                    lines = lines + line
            try:
                iperf_json = json.loads(str(lines))
                sectors_info[sector]["iperf_status"] = "Passed"
            except ValueError:
                myController.logger.error(
                    "Value error for {} to {}".format(sector, pop_node_ip)
                )
                sectors_info[sector]["iperf_status"] = "Failed"
                pass
        except Exception:
            sectors_info[sector]["iperf_result"] = iperf_json
            sectors_info[sector]["iperf_status"] = "Failed"
        return sectors_info, iperf_json

    def iperf_multihop(
        self,
        myController,
        sectors_info,
        duration,
        pop_node_ip,
        udp=True,
        downlink=False,
        bitrate="1G",
        port=5201,
    ):
        link = 0
        no_process = 5
        for sector in sectors_info:
            iperf_json = {}
            myController.logger.note(
                "link number: {} ( sector: {} )".format(link, sector)
            )
            cmd = ["iperf3 -s -D --json"]
            pop_host = [pop_node_ip]
            myController.logger.info("Starting iperf -s" + " in pssh_per_sector_cmd")
            self.pssh_per_sector_cmd(pop_host, cmd, duration, "root", "facebook")
            myController.logger.info(
                "Started multihop iperf -s" + " in pssh_per_sector_cmd"
            )
            cmd_ps = ["ps -ef | grep iperf3"]
            server_lines = self.pssh_per_sector_cmd(
                pop_host, cmd_ps, duration, "root", "facebook"
            )
            lines = ""
            try:
                for _host, host_output in server_lines.items():
                    for line in host_output.stdout:
                        lines = lines + line
            except Exception:
                sectors_info[sector]["iperf_result"] = iperf_json
                sectors_info[sector]["iperf_status"] = "Failed"
                continue
            myController.logger.debug("Lines:{}".format(lines))
            if "iperf3 -s -D --json" in lines:
                pass
            else:
                myController.logger.error(
                    "iperf server not running on pop: {}".format(pop_node_ip)
                )
                myController.logger.error(lines)
            _cmd = "iperf3 "
            if udp:
                _cmd += "-u "
            _cmd += "-c {0} ".format(pop_node_ip)
            # interval and format locked to every 1 second and Mbits/second
            # -R means reverse traffic, for acc
            if downlink:
                _cmd += "-R "
            _cmd += "-i 1 -f m -P {} ".format(no_process)
            # port
            _cmd += "-p {0} ".format(port)
            rate = str(int(bitrate.split("M")[0]) / no_process) + "M"
            # target bitrate is
            _cmd += "-b {0} ".format(rate)
            # add window size constraint
            _cmd += "-w 4m "
            # config packet size to minimize CPU consumption
            _cmd += "-l 7500 "
            # transmit time
            if duration is None:
                _cmd += "-t 0"
            else:
                _cmd += "-t {0} ".format(duration)
            if downlink:
                _cmd += "--json; sleep 1;"
            else:
                _cmd += "--get-server-output --json; sleep 1;"
            host_ip = [sectors_info[sector]["ipv6_addr"]]
            cmd_client = ["pkill iperf3"]
            self.pssh_per_sector_cmd(host_ip, cmd_client, duration, "root", "facebook")
            cmd_client = [_cmd]
            myController.logger.info(
                "Starting multihop iperf" + " in pssh_per_sector_cmd"
            )
            myController.logger.info(cmd_client)
            client_output = self.pssh_per_sector_cmd(
                host_ip, cmd_client, duration, "root", "facebook"
            )
            myController.logger.info(
                "Finished multihop iperf" + " in pssh_per_sector_cmd"
            )
            try:
                for _host, host_output in client_output.items():
                    sectors_info, iperf_json = self._get_iperf_result(
                        myController, sectors_info, sector, host_output, pop_node_ip
                    )
            except Exception:
                sectors_info[sector]["iperf_result"] = iperf_json
                sectors_info[sector]["iperf_status"] = "Failed"
            link = link + 1
            sectors_info[sector]["iperf_result"] = iperf_json
            myController.logger.note(
                "multihop result for {} to pop {}".format(sector, pop_node_ip)
            )
            myController.logger.debug(json.dumps(sectors_info[sector], sort_keys=True))
        out_fp_no_suffix = "{0}/multihop_{1}".format(
            myController.params["output_folder"], int(time.time() * 1000)
        )
        out_fp = dump_result(
            out_fp_no_suffix, sectors_info, myController.logger, use_pickle=True
        )
        return (out_fp, sectors_info)

    def pssh_cmd(self, __vm, cmd, args):
        self._fetch_iband_ips(__vm, args)
        client = ParallelSSHClient(
            self.inband_ips,
            user="root",
            password="facebook",
            num_retries=3,
            timeout=100,
            channel_timeout=args["duration"],
            pool_size=1000,
        )
        output = client.run_command(cmd, stop_on_errors=False)
        client.join(output)
        return output, self.node_to_ips

    def pssh_per_sector_cmd(
        self, ips, host_cmds, duration, user="root", password="facebook"
    ):
        channel_timeout = 60 + duration
        # try:
        client = ParallelSSHClient(
            ips,
            user=user,
            password=password,
            num_retries=3,
            timeout=100,
            channel_timeout=channel_timeout,
            pool_size=1000,
        )
        if "iperf3 -s" in host_cmds[0]:
            print("created client for iperf3 server at {}".format(ips))
        if "iperf3 -c" in host_cmds[0]:
            print("created client for iperf3 sender at {}".format(ips))
        # TODO: how to obtain output during the run_command operation
        output = client.run_command("%s", host_args=host_cmds, stop_on_errors=False)
        if "iperf3 -s" in host_cmds[0]:
            print("ran iperf3 command for iperf3 server at {}".format(ips))
        if "iperf3 -c" in host_cmds[0]:
            print("ran iperf3 sender command at {}".format(ips))
        client.join(output)
        # TODO:
        # client.join(client.run_command('echo blah; sleep 15'), timeout=16)
        # from https://github.com/ParallelSSH/parallel-ssh/issues/104
        return output

    def run_ssh_cmd(self, ip, cmd, username, password):
        command = "sshpass -p'{}' ssh {}@{} '{}'".format(password, username, ip, cmd)
        subprocess.call([command], shell=True)

    def pssh_per_sector(self, ips, host_cmd, user="root", password="facebook"):
        client = ParallelSSHClient(ips, user=user, password=password)
        output = client.run_command(host_cmd)
        return output
