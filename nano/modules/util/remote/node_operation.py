#!/usr/bin/env python3

# modules
import time

from modules.addon_parser_health_check import parse_ping_output, parse_traceroute_output
from modules.addon_parser_kernlog import (
    parse_kern_beam_index,
    parse_kern_channel,
    parse_kern_per_stats,
    parse_r2d2_fw_stats,
)
from modules.util_ssh import SSH


# global params
TIMEOUT_MULTIPLIER = 1.2
TIMEOUT_MULTIPLIER2 = 1.3  # must be strictly larger than TIMEOUT_MULTIPLIER


class REMOTE(SSH):
    """
    It extends SSH object and implements basic remote commands:
    * file existence check
    * folder existence check
    * change permission
    * reboot device (self.reboot)
    * oob connection
    * change to rootfs
    * enable/disable/clear/fetch (dhd) kernel log
    * iperf
    * ping
    """

    def enable_logging(self, clear_log=True):
        """
        enable logging
        """
        resp = self.write("wl-dhd msglevel +bh")
        if resp[0] == "err":
            return False
        return (not clear_log) or self.clear_kern_log()

    def disable_logging(self):
        """
        disable logging
        """
        resp = self.write("wl-dhd msglevel -bh")
        return not resp[0] == "err"

    def get_per_info_kernel(self):
        """
        get PER info and txPower etc. from kernel log
        """
        resp = self.write("cat /var/log/kern.log | grep MCS | grep txPower | tail")
        if resp[0] == "err":
            self.logger.error(resp)
        return parse_kern_per_stats(resp[1:], self.logger)

    def get_channel_info_kernel(self):
        """
        get snr etc. channel info from kernel log
        """
        # send commands
        resp = self.write("cat /var/log/kern.log | grep snrEst")
        if resp[0] == "err":
            self.logger.error(resp)
        return parse_kern_channel(resp[1:], self.logger)

    def get_beam_info_kernel(self, target_mac=None):
        """
        get current beam directions from kernel log
        """
        # send commands
        resp = self.write('cat /var/log/kern.log | grep "Beam:" -B 3 | tail')
        if resp[0] == "err":
            self.logger.error(resp)
        beams = parse_kern_beam_index(resp[1:], self.logger, target_mac)
        return beams

    def fw_stats_to_file(self, timeout, suffix="", noExpect=False):
        """
        dump fw stats to file on device via r2d2 for a fixed time period
        @param timeout: integer in seconds
        """
        if timeout > 3600:  # cap at 1hr to prevent too large file dump
            self.logger.error("Please do not do test over 2hrs.")
            return False
        resp = self.write(
            "nohup timeout {0} r2d2 fw_stats ".format(timeout)
            + "> /tmp/r2d2_fw_stats{0}.log 2>&1 &".format(suffix),
            noExpect=noExpect,
        )
        self.logger.debug(
            "Success. Please come back for results after {0}sec".format(timeout)
        )
        return not resp[0] == "err"

    def get_fw_stats(self, filter_kw, suffix="", compress=False):
        """
        Read the file from fw_stats_to_file and get results
        @param filter_kw: a list of keywords
        @param compress: (by default), no fw stats compression
        @return a list of stats
        """
        # TODO: use this for passive monitoring
        self.logger.debug(
            "Collecting data for {0} from r2d2 fw_stats..".format(filter_kw)
        )
        fp = "/tmp/r2d2_fw_stats{0}.log".format(suffix)
        if not self.isfile(fp):
            self.logger.info("{} does not exist".format(fp))
            return []
        self.logger.debug(
            "network={0}, {1} exists".format(self.params["network_name"], fp)
        )
        cmd = "cat {0} ".format(fp)
        for kw in filter_kw:
            cmd += "| grep {0} ".format(kw)
        resp = self.write(cmd)
        self.logger.debug("In get_fw_stats, len of resp is {0}".format(len(resp)))
        if len(resp) < 10:
            self.logger.debug("In get_fw_stats, resp={0}".format(resp))
        if resp[0] == "err":
            self.logger.error("r2d2 fw_stats is empty!")
            return []
        return parse_r2d2_fw_stats(resp[1:], filter_kw, self.logger, compress=compress)

    def change_to_rootfs(self):
        """
        swtich to rootfs
        """
        self.logger.info("Switching to rootfs...")
        resp = self.write("./chroot.bash rootfs")
        if resp[0] == "err":
            self.logger.error(resp[1:])
            return False
        # no such file
        if len(resp) > 1 and "No such file" in resp[1]:
            for item in resp[1:]:
                self.logger.info(item)
            return False
        self.isConnected.append("rootfs")
        return True

    def oob_login(self, odroid_name):
        """
        Connect to odroid
        """
        self.logger.info("Login to odroid {0}...".format(odroid_name))
        resp = self.write("oob login {0}".format(odroid_name))
        if resp[0] == "err":
            self.logger.error(resp[1:])
            return False
        # wrong login name
        if len(resp) > 1 and "valid sites" in resp[1].lower():
            for item in resp[1:]:
                self.logger.info(item)
            return False
        # success
        self.isConnected.append("oob_login {0}".format(odroid_name))
        return True

    def oob_tglogin(self, oob_name):
        """
        connect to sector
        """
        self.logger.info("Login to {0}...".format(oob_name))
        resp = self.write("oob tglogin {0}".format(oob_name))
        if resp[0] == "err":
            self.logger.error(resp[1:])
            return False
        # wrong login name
        if len(resp) > 1 and "valid sites" in resp[1].lower():
            for item in resp[1:]:
                self.logger.info(item)
            return False
        # success
        self.isConnected.append("oob_tglogin {0}".format(oob_name))
        return True

    def clear_kern_log(self):
        """
        clear kern.log
        """
        self.logger.info("Clearing kernel log")
        resp = self.write("echo '' > /var/log/kern.log")
        return not resp[0] == "err"

    def restart_minion(self, sleepT=3):
        """
        restart e2e_minion
        """
        self.logger.info("Delay {0} sec & restart minion..".format(sleepT))
        if sleepT > 0:
            resp = self.write(
                "(sleep {0} && sv restart e2e_minion)&".format(sleepT),
                timeout=(sleepT - 1),
                noExpect=True,
            )
        else:
            resp = self.write("sv restart e2e_minion &", noExpect=True)
        if resp[0] == "err":
            return False
        return True

    def restart_systemd_logind(self):
        """
        to fix slow login problem
        """
        self.logger.info("Restarting systemd-logind.")
        resp = self.write("sudo systemctl restart systemd-logind")
        if resp[0] == "err":
            return False
        return True

    def reboot(self, forcing=False, sleepT=10):
        """
        Reboot the device
        """
        self.logger.info("Rebooting...")
        cmd = "(sleep {0} && reboot ".format(sleepT)
        if forcing:
            cmd += "-f "
        cmd += ")&"
        self.logger.info("... w/ normal reboot")
        resp = self.write(cmd, noExpect=True)
        if resp[0] == "err":
            return False
        return True

    def untar(self, filepath, nonblocking=False):
        """
        run 'tar xzf filename' remotely
        @param filepath: the file path in the remote device
        @param nonblocking:
          by default False, meaning we wait for the foreground process
        """
        if not self.isfile(filepath):
            self.logger.error("file does not exist: {0}".format(filepath))
            return False
        self.logger.info("untar file {0}".format(filepath))
        if nonblocking:
            resp = self.write("tar xzf {0} &".format(filepath))
            if resp[0] == "err":
                return False
            self.logger.debug("remember to sleep for enough time so it finishes")
        else:
            resp = self.write("tar xzf {0}".format(filepath))
            if resp[0] == "err":
                return False
        return True

    def chmod(self, filepath, permission, recursive=False):
        """
        run chmod on remote server
        """
        self.logger.info(
            "Changing permission {0} for {1}...".format(permission, filepath)
        )
        tags = ""
        if recursive:
            tags += " -R"
        resp = self.write("chmod{0} {1} {2}".format(tags, permission, filepath))
        if resp[0] == "err":
            return False
        return True

    def enable_rw_root(self):
        """
        remount root directory / to be writable
        """
        resp = self.write("mount -o remount, rw /")
        if resp[0] == "err":
            return False
        return True

    """
    iperf related
    """

    def iperf_reset(self, iperf3=True):
        """
        Kill all iperf2/3 process
        """
        self.logger.debug("Killing iPerf3 process (slave)")
        if iperf3:
            resp = self.write("pkill -f iperf3")
        else:
            resp = self.write("pkill -f iperf")
        return not resp[0] == "err"

    def iperf_client(
        self,
        target=None,
        port=5201,
        client_port=None,
        bind=None,
        flow_label=None,
        numStreams=None,
        bitrate="1G",
        timeout=None,
        iperf3=True,
        udp=True,
        congestion_ctl_algo="reno",
        suffix="",
        getServerOutput=False,
    ):
        """
        Run iperf client (reverse) so it receives data instead
        ## Changed to run in background to save resources
        destination server port -p:
        The server port for the server to listen on and the client to connect to
        source client port --cport: Option to specify the client-side port
        """
        self.logger.debug(
            "Running iPerf for {0}sec at {1} towards {2}...".format(
                timeout, bitrate, target
            )
        )
        if timeout is None:
            timeout = 9999.0
        if target is None:
            self.logger.error("Target ip is None!")
            return False, None
        # iperf command
        iperf = "iperf3"
        if not iperf3:
            iperf = "iperf"
        # give 1.2x grace period of waiting time to run command
        cmd = "nohup timeout {0} {1} -c {2} ".format(
            int(timeout * TIMEOUT_MULTIPLIER), iperf, target
        )
        if udp:
            cmd += "-u "
        else:
            # with congestion_ctl_algo configuration
            cmd += "-C {0} ".format(congestion_ctl_algo)
            self.logger.debug(
                "TCP iperf traffic with {0} congestion control".format(
                    congestion_ctl_algo
                )
            )
        # interval and format locked to every 1 second and Mbits/second
        # -R means reverse traffic, for acc
        cmd += "-i 1 -f m "
        # port
        cmd += "-p {0} ".format(port)
        # cport
        if client_port and bind:
            # --bind must be specified to use --cport
            cmd += " --cport {0} --bind {1} ".format(client_port, bind)
        if flow_label:
            cmd += " --flowlabel {0} ".format(flow_label)

        if numStreams:
            cmd += " -P {0} ".format(numStreams)
        # target bitrate
        cmd += "-b {0} ".format(bitrate)
        # add window size constraint
        cmd += "-w 6m "
        # config packet size to minimize CPU consumption
        # TODO: different packet size for single-hop versus multi-hop traffic
        cmd += "-l 7500 "  # 7500
        # transmit time
        if timeout is None:
            cmd += "-t 0 "
        else:
            cmd += "-t {0} ".format(timeout)
        # get server output
        if getServerOutput:
            cmd += "--get-server-output "
        else:
            # otherwise we need to reverse the traffic
            cmd += "-R "
        cmd += "> /tmp/iperf_client_{0}.log 2>&1 &".format(suffix)
        self.logger.info(cmd)
        # record iperf start time
        start_time = int(time.time())
        # to be safe, 1.2x grace period of time to get response
        resp = self.write(cmd)
        self.logger.debug(
            "Success. Please come back for results after {0}sec".format(timeout)
        )
        return not resp[0] == "err", start_time

    def iperf_server(self, port=5201, timeout=None, iperf3=True):
        """
        enable iperf2/3 as server to passive listen until timeout
        @param server port: which port we use, default port is 5201
        @param timeout: in seconds. If set None, will run forever till kill it
        """
        self.logger.debug("Running iPerf3 server...")
        iperf = "iperf3"
        if not iperf3:
            iperf = "iperf"
        if timeout is None:
            cmd = "nohup {0} -s -p {1} ".format(iperf, port)
        else:
            cmd = "nohup timeout {0} {1} -s -p {2} ".format(timeout, iperf, port)
        cmd += "> /dev/null 2>&1 &"
        resp = self.write(cmd)
        if resp[0] == "err":
            return False
        if "already in use" not in resp[1] and "unable" in resp[1]:
            self.logger.error(resp[1:])
            return False
        # DEBUG: print iperf process
        self.write("ps aux | grep iperf")
        self.logger.debug("iperf_server success")
        return True

    def get_neigh_linklayer_ip(self, target_mac):
        """
        get neighboring ip address with target mac address
        """
        resp = self.write("ip -6 neigh | grep terra " + "| grep {0}".format(target_mac))
        if resp[0] == "err" or len(resp[1:]) is not 1:
            self.logger.error(
                "Cannot find neighbor ip with mac {0}?".format(target_mac)
            )
            self.logger.debug(self.write("ip -6 neigh"))
            return None
        tmp = resp[1].split()
        ip_w_interface = "{0}%{1}".format(tmp[0], tmp[2])
        self.logger.info("Got neighbor link layer ip {0}".format(ip_w_interface))
        return ip_w_interface

    def ping(self, target, count=150, interval=0.2):
        """
        ping through lo target, or through terra
        @param target: target ip address
        @param count: default run for 30sec (150 * 0.2sec)
        @param interval: ping frequency, default is minimum 0.2 second per ping
        @return dictionary of ping result
        """
        if target is None:
            self.logger.error("Target ip is None!")
            return {}
        self.logger.info("Pinging towards {0}...".format(target))
        if ":" in target:  # is ipv6
            cmd = "ping6 "
        else:
            cmd = "ping "
        cmd += "{0} ".format(target)
        cmd += "-i {0} ".format(interval)
        cmd += "-c {0} ".format(count)
        # change timeout to suit the need of ping
        # give additional 20 sec margin
        resp = self.write(cmd, timeout=(count * interval + 20))
        if (
            resp[0] == "err"
            or "unknown" in resp[1].lower()
            or "unreachable" in resp[1].lower()
        ):
            self.logger.debug(resp[1:])
            return {}
        self.logger.debug("ping success")
        return parse_ping_output(resp[1:], self.logger)

    def launch_ping6(
        self,
        target=None,
        timeout=None,
        suffix="",
        count=150,
        interval=0.2,
        interface=None,
        flow_label=None,
    ):
        """
        Launch ping6 to target
        """
        # record ping start time
        start_time = int(time.time())
        # give 1.2x grace period of waiting time to run command
        ping6_cmd = "nohup timeout {0} {1} {2} ".format(
            int(timeout * TIMEOUT_MULTIPLIER), "ping6", target
        )
        ping6_cmd += "-i {0} ".format(interval)
        ping6_cmd += "-c {0} ".format(count)
        if flow_label:
            ping6_cmd += "-F {0} ".format(flow_label)
        if interface:
            # Set source address to specified interface address
            ping6_cmd += "-I {0} ".format(interface)
        ping6_cmd += "> /tmp/ping6_{0}.log 2>&1 &".format(suffix)
        self.logger.info(ping6_cmd)
        resp = self.write(ping6_cmd)
        self.logger.info(
            "ping6 success. Please come back for results after {0}sec".format(timeout)
        )
        return not resp[0] == "err", start_time

    def launch_traceroute(
        self, target=None, tcp=True, dest_port=None, source_port=None, flow_label=None
    ):
        """
        Launch traceroute to target
        traceroute config: https://www.computerhope.com/unix/utracero.htm
        -F: Do not fragment probe packets
        -N squeries: Specifies the number of probe packets sent out simultaneously.
        -q nqueries: Sets the number of probe packets per hop. The default is 3
        -p dport: For TCP specifies just the (constant) destination port to connect.
        -T Use TCP SYN for probes
        --sport: source port
        -l: flow label
        """
        cmd = "traceroute -6 {} -F -N 2 -q 1 -m 50".format(target)
        if tcp:
            cmd += " -T"
        else:
            cmd += " -U"
        if dest_port is not None:
            cmd += " -p {}".format(dest_port)
        if source_port is not None:
            cmd += " --sport={}".format(source_port)
        if flow_label is not None:
            cmd += " -l {}".format(flow_label)
        self.logger.debug(cmd)
        startTime = int(time.time())
        # give additional 25 sec margin
        resp = self.write(cmd, timeout=25)
        if (
            resp[0] == "err"
            or "unknown" in resp[1].lower()
            or "unreachable" in resp[1].lower()
        ):
            self.logger.debug(resp[1:])
            return {}
        self.logger.debug("traceroute success to {}".format(target))
        return parse_traceroute_output(resp[1:], self.logger, startTime)
