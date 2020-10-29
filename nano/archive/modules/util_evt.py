#!/usr/bin/env python3
from __future__ import division

import json
import subprocess
from datetime import datetime

from modules.util_pssh import PSSH as PSSH


class EVT(object):
    def _get_iperf_cpe_result(self, host_output):
        iperf_json = {}
        lines = ""
        for line in host_output.stdout:
            if "Warning" in line:
                pass
            else:
                lines = lines + line
        try:
            iperf_json = json.loads(str(lines))
        except ValueError:
            pass
        return iperf_json

    def _get_aggerated_throughput(self, args, sectors_info, cpe_rate):
        agg_thr = 0
        cpes_online = 0
        failed_test = 0
        cpe_passed = 0
        test_output = {}
        cpe_key = "cpe_ip"

        if args["tests"]["evt"]["no_cpe"]:
            cpe_key = "ipv6_addr"

        for sector in sectors_info:
            try:
                if sectors_info[sector][cpe_key]:
                    cpes_online = cpes_online + 1
                    try:
                        if sectors_info[sector]["evt_iperf_result"]:
                            cpe_passed = cpe_passed + 1
                            # print(sectors_info[sector]['evt_iperf_result'])
                            iperf_aggr = 0
                            for interval in sectors_info[sector]["evt_iperf_result"][
                                "server_output_json"
                            ]["intervals"]:
                                iperf_aggr = iperf_aggr + (
                                    interval["sum"]["bits_per_second"]
                                )
                                # print(interval['sum']['bits_per_second'])
                            print(
                                "cpe {} ip {}".format(
                                    sector, sectors_info[sector][cpe_key]
                                )
                            )
                            print("CPE COMMAND")
                            print(sectors_info[sector]["cpe_cmd"])
                            print(
                                "cpe rate {}".format(
                                    (
                                        iperf_aggr
                                        / len(
                                            sectors_info[sector]["evt_iperf_result"][
                                                "server_output_json"
                                            ]["intervals"]
                                        )
                                    )
                                    * 0.000001
                                )
                            )
                            agg_thr = (
                                agg_thr
                                + (
                                    iperf_aggr
                                    / len(
                                        sectors_info[sector]["evt_iperf_result"][
                                            "server_output_json"
                                        ]["intervals"]
                                    )
                                )
                                * 0.000001
                            )
                    except KeyError:
                        failed_test = failed_test + 1
                        continue
            except KeyError:
                continue
        run_cpe_rate = agg_thr / (cpe_passed)
        print("Caculated CPE RATE: {}".format(cpe_rate))
        print("CPE ONLINE:{}".format(cpes_online))
        print("CPE TEST PASSED:{}".format(cpe_passed))
        # excepted_aggr_throughput = (cpes_online - failed_test) * run_cpe_rate
        excepted_aggr_throughput = cpe_passed * args["tests"]["evt"]["cpe_rate"] * 4
        print("Rate Per CPE:{}".format(args["tests"]["evt"]["cpe_rate"]))
        print("Excepted Aggerated throughput: {}Mbps".format(excepted_aggr_throughput))
        print("Aggerated throughput: {}Mbps".format(agg_thr))
        print("Failed Tests:{}".format(failed_test))
        test_output["excepted_aggr_throughput"] = excepted_aggr_throughput
        test_output["agg_thr"] = agg_thr
        test_output["failed_test"] = failed_test
        test_output["cpes_online"] = cpes_online
        test_output["run_cpe_rate"] = run_cpe_rate
        return test_output

    def __get_cpe_cmd(self, sectors_info, cpe_key, args, reverse, cpe_rate, duration):
        i = 0
        host_cmds = []
        host_ips = []
        port = 5401
        for sector in sectors_info:
            if i == args["tests"]["evt"]["cpeno"]:
                break
            try:
                if sectors_info[sector][cpe_key]:
                    if "CN" not in sector:
                        cmd = "iperf3 -s -D -p{} --json".format(port)
                        print(cmd)
                        p = subprocess.Popen(cmd, stdout=subprocess.PIPE, shell=True)
                        (output, err) = p.communicate()
                        host_ips.append(sectors_info[sector][cpe_key])
                        if reverse:
                            cpe_cmd = "iperf3 -c{} -i 1 -f m -p{} ".format(
                                "2001:470:f0:3e8::c2c", port
                            )
                            cpe_cmd += "-b{}M -w 4m -t{} -P {} -R ".format(
                                cpe_rate,
                                duration,
                                args["tests"]["evt"]["iperf_process"],
                            )
                        else:
                            cpe_cmd = "iperf3 -c{} -i 1 -f m -p{} ".format(
                                "2001:470:f0:3e8::c2c", port
                            )
                            cpe_cmd += "-b{}M -w 4m -t{} -P {} ".format(
                                cpe_rate,
                                duration,
                                args["tests"]["evt"]["iperf_process"],
                            )
                            cpe_cmd += "--get-server-output --json"
                        sectors_info[sector]["cpe_cmd"] = cpe_cmd
                        host_cmds.append(cpe_cmd)
                        port = port + 1
                        i = i + 1
            except KeyError:
                continue
        return host_cmds, host_ips, sectors_info

    def test_tpe(self, args, sectors_info, cpe_rate, duration, reverse=False):
        cmd = "pkill iperf3"
        p = subprocess.Popen(cmd, stdout=subprocess.PIPE, shell=True)
        (output, err) = p.communicate()
        host_ips = []
        host_cmds = []
        if args["tests"]["evt"]["cpe_rate"]:
            cpe_rate = args["tests"]["evt"]["cpe_rate"]
        cpe_key = "cpe_ip"
        if args["tests"]["evt"]["no_cpe"]:
            cpe_key = "ipv6_addr"
        host_cmds, host_ips, sectors_info = self.__get_cpe_cmd(
            sectors_info, cpe_key, args, reverse, cpe_rate, duration
        )
        myPSSH = PSSH()
        test_start_time = datetime.now()
        if args["tests"]["evt"]["no_cpe"]:
            client_output = myPSSH.pssh_per_sector_cmd(
                host_ips, host_cmds, duration, "root", "facebook"
            )
        else:
            client_output = myPSSH.pssh_per_sector_cmd(
                host_ips, host_cmds, duration, "odroid", "odroid"
            )
        test_end_time = datetime.now()
        print("test start time:{}".format(str(test_start_time)))
        print("test end time:{}".format(str(test_end_time)))
        for host, host_output in client_output.items():
            try:
                iperf_json = self._get_iperf_cpe_result(host_output)
                print(iperf_json)
                for sector in sectors_info:
                    try:
                        if sectors_info[sector][cpe_key] == host:
                            sectors_info[sector]["evt_iperf_result"] = iperf_json
                    except KeyError:
                        continue
            except Exception:
                continue
        agg_output = self._get_aggerated_throughput(args, sectors_info, cpe_rate)
        return sectors_info, agg_output
