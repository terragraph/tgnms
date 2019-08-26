#!/usr/bin/env python3

import logging

# built-ins
import os
import re
import socket

# modules
import modules.keywords as KEY
from modules.util_logger import EmptyLogger
from modules.util_math import get_histogram, max, mean, min, std


tcp_each_matcher = re.compile(
    r"(\d+\.?\d*)\-(\d+\.?\d*) +sec"
    " +(\d+\.?\d*) [KMG]*Bytes +(\d+\.?\d*) [KMG]*bits\/sec"
)
tcp_retrans_matcher = re.compile(
    r"(\d+\.?\d*)\-(\d+\.?\d*) +sec"
    " +(\d+\.?\d*) [KMG]*Bytes +(\d+\.?\d*) [KMG]*bits\/sec"
    " +(\d+\.?\d*) "
)
udp_each_matcher = re.compile(
    r"(\d+\.?\d*)\-(\d+\.?\d*) +sec"
    " +(\d+\.?\d*) [KMG]*Bytes +(\d+\.?\d*) [KMG]*bits\/sec"
    ".*\((\d+\.?\d*)%"
)
ping_each_matcher = re.compile(r"icmp_seq=(\d+) ttl=(\d+) time=(\d+\.?\d*) ms")
stat_matcher = re.compile(
    r"(\d+) packets transmitted, "
    "(\d+) (?:packets )?received, "
    "(\d+\.?\d*)% packet loss, "
    "time (\d+)ms"
)
rtt_matcher = re.compile(r"(\d+.\d+)/(\d+.\d+)/(\d+.\d+)/(\d+.\d+)")


def _get_matches(line, regex):
    """
    get match
    """
    match = regex.search(line)
    if not match:
        return None
    return match.groups()


def get_keys_w_two_sorts(result, level1, level2=None):
    """
    sort keys based on values first on level1, then on level2
    level1 is link key or bi-directional key
    level2 is node key or uni-directional key (taking the max a2z & z2a)
    """
    keys = list(result.keys())
    try:
        keys = sorted(keys, key=lambda x: result[x][level1], reverse=True)
    except BaseException as ex:
        print("err1: ", ex)
    if level2 is None:
        return keys
    try:
        prevLevel1Val = result[keys[0]][level1]
        prevLevel1Idx = 0
        for i in range(len(keys)):
            if prevLevel1Val == result[keys[i]][level1]:
                continue
            keys[prevLevel1Idx:i] = sorted(
                keys[prevLevel1Idx:i],
                key=lambda x: max(
                    [
                        result[x][KEY.A2Z].get(level2, float("nan")),
                        result[x][KEY.Z2A].get(level2, float("nan")),
                    ]
                ),
                reverse=True,
            )
            prevLevel1Val = result[keys[i]][level1]
            prevLevel1Idx = i
        if prevLevel1Idx < len(keys) - 1:
            keys[prevLevel1Idx:] = sorted(
                keys[prevLevel1Idx:],
                key=lambda x: max(
                    [
                        result[x][KEY.A2Z].get(level2, float("nan")),
                        result[x][KEY.Z2A].get(level2, float("nan")),
                    ]
                ),
                reverse=True,
            )
    except BaseException as ex:
        print("err2: ", ex)
    return keys


def record_iperf_details(tx, rx, logpath, result):
    """
    record detailed iperf results
    """
    _iperf_details_logger_tag = "tx_{0}_rx_{1}_iperf_details".format(tx, rx)
    logpath_r = "{0}/log/iperf_log/".format(logpath)
    # open a folder with makedir if necessary
    if not os.path.isdir(logpath_r):
        try:
            os.makedirs(logpath_r)
        except BaseException:
            logpath_r = logpath
    log_file_postfix = "/{0}.log".format(_iperf_details_logger_tag)
    logpath = logpath_r + log_file_postfix

    _iperf_details_logger = EmptyLogger(
        loggerTag=_iperf_details_logger_tag, logPath=logpath, printlevel=logging.INFO
    )
    _iperf_details_logger.debug(result)
    _iperf_details_logger.disable()


def parse_iperf_output(resp, start_time, logger, serverOutputOnly=False):
    """
    parse iperf result
    @param resp: a list of response (as lines) from iperf
    @param start_time: iperf start time
    @param logger: EmptyLogger() object
    @return dictionary
    """
    iperf_details, iperf_udp_loss, iperf_tcp_retrans = _parse_iperf_line_by_line(
        resp, serverOutputOnly, logger
    )
    try:
        end_time = start_time + int(iperf_details[-1][0])
    except BaseException:
        logger.error("cannot get iperf duration from resp: {0}".format(resp))
        end_time = start_time + 1
    logger.debug("iperf starts at {0}, ends at {1}".format(start_time, end_time))
    # iperf_details format: [[t timestamp, a (Mbytes), b (Mbits/sec)], ...]
    # x[2] = a is the actual Bandwidth in Mbits/sec measurement
    tmp_bandwidth_list = [iperf_output[2] for iperf_output in iperf_details]
    iperf_min = min(tmp_bandwidth_list)
    iperf_max = max(tmp_bandwidth_list)
    iperf_std = std(tmp_bandwidth_list)
    iperf_avg = mean(tmp_bandwidth_list)
    return {
        KEY.IPERF_DETAILS: iperf_details,
        KEY.IPERF_AVG: iperf_avg,
        KEY.IPERF_MAX: iperf_max,
        KEY.IPERF_MIN: iperf_min,
        KEY.IPERF_STD: iperf_std,
        KEY.IPERF_START: start_time,
        KEY.IPERF_END: end_time,
        KEY.IPERF_UDP_LOSS: iperf_udp_loss,
        KEY.IPERF_TCP_RETRANS: iperf_tcp_retrans,
    }


def _parse_iperf_line_by_line(resp, serverOutputOnly, logger):
    iperf_details = []
    iperf_udp_loss = None
    iperf_tcp_retrans = None
    iperf_tcp_retrans_store_flag = False
    # handle if we only care about get-server-output server end message
    skip_these = serverOutputOnly
    for line in resp:
        line_elements, traffic = _parse_iperf_each_line(line)
        if not line_elements:
            if skip_these:
                if "Server output" in line:
                    skip_these = False
            continue
        # iperf_udp_loss is not included in "Server output"
        if ("receiver" in line) and ("%" in line):
            iperf_udp_loss = float(line_elements[4])
        # sender side summary for tcp retrans count
        if (
            ("sender" in line)
            and (traffic == "tcp")
            and (not iperf_tcp_retrans_store_flag)
        ):
            tcp_retrans_line = _get_matches(line, tcp_retrans_matcher)
            # tcp_retrans has been recorded
            iperf_tcp_retrans_store_flag = True
            if tcp_retrans_line is not None:
                iperf_tcp_retrans = float(tcp_retrans_line[4])
            else:
                iperf_tcp_retrans = float("nan")
        # the following summary is not included in "Server output"
        if ("sender" in line or "receiver" in line) or (
            float(line_elements[1]) - float(line_elements[0]) > 2
        ):
            # tcp traffic always has `sender` or `receiver` in the summary line
            logger.debug(
                "iperf duration: {0}".format(
                    float(line_elements[1]) - float(line_elements[0])
                )
            )
            continue
        if skip_these:
            if "Server output" in line:
                skip_these = False
            continue
        try:
            iperf_details.append(
                (
                    float(line_elements[1]),
                    float(line_elements[2]),
                    float(line_elements[3]),
                )
            )
        except Exception:
            logger.error("Could not append {0} to iperf_details".format(line_elements))
    logger.debug("lines={0},iperf_len={1}".format(len(resp), len(iperf_details)))
    return iperf_details, iperf_udp_loss, iperf_tcp_retrans


def _parse_iperf_each_line(line):
    # udp has %, tcp doesn't
    return (
        (_get_matches(line, udp_each_matcher), "udp")
        if "%" in line
        else (_get_matches(line, tcp_each_matcher), "tcp")
    )


def parse_ping_output(resp, logger):
    """
    parse ping result for latency and packet loss
    @param resp: a list of response (as lines) from ping
    @param logger: EmptyLogger() object
    @return dictionary of latency and packet loss
    """
    logger.debug("Parsing ping output..")
    ping_details = []
    latency_array = []
    loss_perc = pkt_trans = pkt_recv = ping_dur = None
    rtt_min = rtt_max = rtt_avg = rtt_std = None
    if resp is None:
        return {
            KEY.PING_DETAILS: ping_details,
            KEY.PING_LOSS: loss_perc,
            KEY.PING_PKT_TRANS: pkt_trans,
            KEY.PING_PKT_RECV: pkt_recv,
            KEY.PING_DURATION: ping_dur,
            KEY.PING_MAX: rtt_max,
            KEY.PING_MIN: rtt_min,
            KEY.PING_AVG: rtt_avg,
            KEY.PING_STD: rtt_std,
        }

    for line in resp:
        each = _get_matches(line, ping_each_matcher)
        if each is not None:
            latency_array.append(float(each[2]))
            ping_details.append((int(each[0]), int(each[1]), float(each[2])))
            continue
        if loss_perc is None:
            stat = _get_matches(line, stat_matcher)
            if stat is not None:
                pkt_trans = int(stat[0])
                pkt_recv = int(stat[1])
                loss_perc = float(stat[2])
                ping_dur = int(stat[3])
                continue
        if rtt_avg is None:
            rtt = _get_matches(line, rtt_matcher)
            if rtt is not None:
                rtt_min = float(rtt[0])
                rtt_avg = float(rtt[1])
                rtt_max = float(rtt[2])
                rtt_std = float(rtt[3])
    if not ping_details:
        return {}
    # multihop: PING_MAX - PING_STD will be re-calculated in analysis
    return {
        KEY.PING_DETAILS: ping_details,
        # important for result reporting
        KEY.PING_LOSS: loss_perc,
        KEY.PING_PKT_TRANS: pkt_trans,
        KEY.PING_PKT_RECV: pkt_recv,
        KEY.PING_DURATION: ping_dur,
        KEY.PING_MAX: rtt_max,
        KEY.PING_MIN: rtt_min,
        KEY.PING_AVG: rtt_avg,
        KEY.PING_STD: rtt_std,
    }


def parse_traceroute_output(resp, logger, start_time):
    """
    parse traceroute result for routing path and hop counts
    @param resp: a list of response (as lines) from traceroute
    @param logger: EmptyLogger() object
    @param start_time: traceroute start time
    @return dictionary of routing path and hop counts
    """
    traceroute_info = []
    ipv6_array = []
    hop_num = None
    if resp is None:
        return {
            KEY.START_TIME: start_time,
            KEY.TRACEROUTE_INFO: traceroute_info,
            KEY.TRACEROUTE_IPS: ipv6_array,
            KEY.TRACEROUTE_HOP: hop_num,
        }
    hop_num = 0
    logger.debug("Parsing traceroute output, resp={}".format(resp))
    for line in resp:
        if "traceroute" in line:
            continue
        try:
            each = line.split()
        except Exception:
            logger.error(
                "Parsing traceroute output, this line {} is empty!".format(line)
            )
        # TODO: how to handle star * results in the line
        # each line shall have more than 2 elements to start with
        if len(each) >= 2 and is_valid_ipv6_address(each[1]):
            ipv6_array.append(each[1])
            hop_num += 1
            rtt = None
            idx = 2
            # from each, find one pair of rtt ms
            while 1:
                if idx + 1 < len(each):
                    if each[idx].replace(".", "").isdigit() and each[idx + 1] == "ms":
                        rtt = float(each[idx])
                        break
                    else:
                        idx += 1
                else:
                    logger.error("Can not find rtt in {}".format(each))
                    break
            # traceroute_info format: [[hop_index, ipv6, Rtt_1 (ms)] ...]
            traceroute_info.append((int(each[0]), each[1], rtt))
            logger.debug(
                "parse_traceroute_output, to append {}".format(
                    (int(each[0]), each[1], rtt)
                )
            )
        else:
            logger.error(
                "parse_traceroute_output, this line has no ipv6, {}".format(each)
            )
            traceroute_info.append((each))
    return {
        KEY.START_TIME: start_time,
        KEY.TRACEROUTE_INFO: traceroute_info,
        KEY.TRACEROUTE_IPS: ipv6_array,
        KEY.TRACEROUTE_HOP: hop_num,
    }


def is_valid_ipv6_address(address):
    try:
        socket.inet_pton(socket.AF_INET6, address)
    except socket.error:
        # not a valid address
        return False
    return True


def wrap_with_table_thead(fields, maincontent):
    """
    generate table headers in the table
    @param fields: list of (fieldname str, isMinimal bool) tuples
    @return str
    """
    if not maincontent:
        return maincontent
    content = "<table cellspacing='0' cellpadding='0'>\n"
    content += "<thead><tr>\n"
    for each, isMinimal in fields:
        if isMinimal:
            content += "<th class='minimal'>{0}</th>\n".format(each)
        else:
            content += "<th>{0}</th>\n".format(each)
    content += "</tr></thead>\n"
    content += "<tbody>\n"
    content += maincontent
    content += "</tbody>\n</table>"
    return content


def convert_iperf_monitor_to_html_txpwr_hist(result):
    """
    here we summarize txpower into html histogram tables
    """

    def get_txpwr_hist_content(txpowerHist):
        if txpowerHist["total_count"] is 0:
            return ""
        txPwrs = sorted(txpowerHist["details_num"].keys())
        content = "<tr class='color_{color} clear'>\n".format(color="purple")
        for txPwr in txPwrs:
            count = txpowerHist["details_num"][txPwr]
            perc = 100.0 * count / txpowerHist["total_count"]
            content += "<td>{0}<br>{1:.2f}%</td>".format(count, perc)
        content += "</tr>\n"
        return wrap_with_table_thead(
            [["pwrIdx {}".format(txPwr), False] for txPwr in txPwrs], content
        )

    if not result:
        return ""
    txPwrKey = KEY.ODS_STA_TX_PWR.replace("{}.".format(KEY.ODS_STA_PRE), "") + "_p90"
    txpowerHist = get_histogram(result, txPwrKey, perDirection=True, roundDigit=0)
    return (
        "<div>Among {0} uni-directional links, ".format(2 * len(result.keys()))
        + "{0} failed to grab txPowerIndex. ".format(txpowerHist["nan_count"])
        + "TxPwrIdx P90 histogram for the remaining {0} links shown below.</div>\n".format(
            txpowerHist["total_count"]
        )
        + get_txpwr_hist_content(txpowerHist)
    )


def convert_iperf_monitor_to_html_snr_hist(result):
    """
    here we summarize txpower into html histogram tables
    """

    def get_snr_hist_content(snrHist):
        if snrHist["total_count"] is 0:
            return ""
        snrVals = sorted(snrHist["details_num"].keys())
        content = "<tr class='color_{color} clear'>\n".format(color="purple")
        for snrVal in snrVals:
            count = snrHist["details_num"][snrVal]
            perc = 100.0 * count / snrHist["total_count"]
            content += "<td>{0}<br>{1:.2f}%</td>".format(count, perc)
        content += "</tr>\n"
        return wrap_with_table_thead(
            [["SNR {}".format(snrVal), False] for snrVal in snrVals], content
        )

    if not result:
        return ""
    snrKey = KEY.ODS_SNR + "_p90"
    snrHist = get_histogram(result, snrKey, perDirection=True, roundDigit=0)
    return (
        "<div>Among {0} uni-directional links, ".format(2 * len(result.keys()))
        + "{0} failed to grab SNR. ".format(snrHist["nan_count"])
        + "SNR P90 histogram for the remaining {0} links shown below.</div>\n".format(
            snrHist["total_count"]
        )
        + get_snr_hist_content(snrHist)
    )


def convert_iperf_monitor_to_html_mcs_hist(result):
    """
    here we summarize mcs into html histogram tables
    """

    def get_each_mcs_hist_content(mcsHistDict):
        """
        create table for mcs historgram
        we skip MCS 5 so it does not appear
        """
        if mcsHistDict["total_count"] is 0:
            return ""
        mcsLvls = sorted(mcsHistDict["details_num"].keys())
        content = "<tr class='color_{color} clear'>\n".format(color="purple")
        for mcsVal in mcsLvls:
            if mcsVal == 5:
                continue
            count = mcsHistDict["details_num"][mcsVal]
            perc = 100.0 * count / mcsHistDict["total_count"]
            content += "<td>{0}<br>{1:.2f}%</td>".format(count, perc)
        content += "</tr>\n"
        return wrap_with_table_thead(
            [["MCS {}".format(mcsLvl), False] for mcsLvl in mcsLvls if not mcsLvl == 5],
            content,
        )

    if not result:
        return ""
    tableContent = ""
    mcsKey = KEY.ODS_STA_MCS.replace("{}.".format(KEY.ODS_STA_PRE), "") + "_p90"
    mcsOverall = get_histogram(result, mcsKey, perDirection=True, roundDigit=0)
    mcs200m = get_histogram(
        {k: result[k] for k in result if result[k][KEY.DISTANCE] > 200},
        mcsKey,
        perDirection=True,
        roundDigit=0,
    )
    mcs100m = get_histogram(
        {
            k: result[k]
            for k in result
            if result[k][KEY.DISTANCE] > 100 and result[k][KEY.DISTANCE] <= 200
        },
        mcsKey,
        perDirection=True,
        roundDigit=0,
    )
    mcs50m = get_histogram(
        {
            k: result[k]
            for k in result
            if result[k][KEY.DISTANCE] > 50 and result[k][KEY.DISTANCE] <= 100
        },
        mcsKey,
        perDirection=True,
        roundDigit=0,
    )
    mcs0m = get_histogram(
        {k: result[k] for k in result if result[k][KEY.DISTANCE] < 50},
        mcsKey,
        perDirection=True,
        roundDigit=0,
    )
    tableContent = (
        "<div>Among {0} uni-directional links, ".format(2 * len(result.keys()))
        + "{0} failed to grab MCS. ".format(mcsOverall["nan_count"])
        + "MCS P90 histogram for the remaining {0} links shown below.</div>\n".format(
            mcsOverall["total_count"]
        )
        + get_each_mcs_hist_content(mcsOverall)
    )
    if mcs200m["total_count"] > 0:
        tableContent += "<div>Among {0} >200m links:</div>\n".format(
            mcs200m["total_count"]
        ) + get_each_mcs_hist_content(mcs200m)
    if mcs100m["total_count"] > 0:
        tableContent += "<div>Among {0} 100--200m links:</div>\n".format(
            mcs100m["total_count"]
        ) + get_each_mcs_hist_content(mcs100m)
    if mcs50m["total_count"] > 0:
        tableContent += "<div>Among {0} 50--100m links:</div>\n".format(
            mcs50m["total_count"]
        ) + get_each_mcs_hist_content(mcs50m)
    if mcs0m["total_count"] > 0:
        tableContent += "<div>Among {0} <50m links:</div>\n".format(
            mcs0m["total_count"]
        ) + get_each_mcs_hist_content(mcs0m)
    return tableContent


def get_unilink_status_importance(status):
    """
    translate unidirectional importance status to string
    """
    if status == KEY.STATUS_IMPORTANCE_TIER_1:
        return "tier_1", "red"
    elif status == KEY.STATUS_IMPORTANCE_TIER_2:
        return "tier_2", "yellow"
    elif status == KEY.STATUS_IMPORTANCE_TIER_3:
        return "tier_3", "blue"
    elif status == KEY.STATUS_IMPORTANCE_TIER_4:
        return "tier_4", "green"
    return "unknown", "black"


def get_bilink_status_importance(status):
    """
    translate bidirectional importance status to string
    """
    return get_unilink_status_importance(status)


def get_unilink_status_health(status):
    """
    translate node status to string (throughput)
    """
    if status == KEY.STATUS_BAD_CONSTANT or status == KEY.STATUS_BAD_OCCASION:
        return "warning", "red"
    elif status == KEY.STATUS_WARNING:
        return "marginal", "yellow"
    elif status == KEY.STATUS_HEALTHY:
        return "healthy", "blue"
    elif status == KEY.STATUS_EXCELLENT:
        return "excellent", "green"
    return "unknown", "black"


def get_bilink_status_health(status):
    """
    translate link status to string (throughput)
    """
    return get_unilink_status_health(status)


def convert_iperf_monitor_to_html_healthiness(result, myLabel, monitor=False):
    """
    here we convert throughput analysis into html tables
    """

    def get_unilink_stats(linkResult):
        """
        return link stats in a dict
        """
        keyMCS = KEY.ODS_STA_MCS.replace(KEY.ODS_STA_PRE + ".", "")
        keyTxPwrIdx = KEY.ODS_STA_TX_PWR.replace(KEY.ODS_STA_PRE + ".", "")
        keyUtilizationRatio = KEY.ODS_STA_TX_EFF.replace(KEY.ODS_STA_PRE + ".", "")
        return {
            "thrpt_avg": linkResult.get(KEY.IPERF_DETAILS + "_avg", float("nan")),
            "target_rate": linkResult.get(KEY.TARGET_BITRATE, float("nan")),
            "thrpt_std": linkResult.get(KEY.IPERF_DETAILS + "_std", float("nan")),
            "ping_avg": linkResult.get(KEY.PING_DETAILS + "_avg", float("nan")),
            "ping_std": linkResult.get(KEY.PING_DETAILS + "_std", float("nan")),
            "ping_p90": linkResult.get(KEY.PING_DETAILS + "_p90", float("nan")),
            "ping_p10": linkResult.get(KEY.PING_DETAILS + "_p90b", float("nan")),
            "ping_min": linkResult.get(KEY.PING_DETAILS + "_min", float("nan")),
            "ping_max": linkResult.get(KEY.PING_DETAILS + "_max", float("nan")),
            "pl_avg": linkResult.get(KEY.PATHLOSS + "_avg", float("nan")),
            "per_avg": linkResult.get(KEY.PER + "_avg", float("nan")),
            "mcs_avg": linkResult.get(keyMCS + "_avg", float("nan")),
            "mcs_std": linkResult.get(keyMCS + "_std", float("nan")),
            "mcs_p90": linkResult.get(keyMCS + "_p90", float("nan")),
            "txpwridx_avg": linkResult.get(keyTxPwrIdx + "_avg", float("nan")),
            "snr_avg": linkResult.get(KEY.ODS_SNR + "_avg", float("nan")),
            "rssi_avg": linkResult.get(KEY.ODS_RSSI + "_avg", float("nan")),
            "txeff_avg": linkResult.get(keyUtilizationRatio + "_avg", float("nan")),
        }

    def get_uni_table_content(
        unilink, status, txStats, rxStats, distance, monitor, dof
    ):
        """
        generate table content for unilink
        """
        content = "<td>{0}</td>\n".format(unilink)
        content += "<td>{0}</td>\n".format(status)
        content += "<td>{0}</td>\n".format(dof)
        content += "<td>{0:.1f}</td>\n".format(distance)
        content += "<td>{0:.0f}</td>\n".format(txStats["mcs_p90"])
        content += (
            "<td>{0:.1f}</td>\n".format(txStats["pl_avg"])
            + "<td>{0:.3f}%</td>\n".format(txStats["per_avg"])
            + "<td>{0:.1f}<br>{1:.1f}<br>{2:.0f}</td>\n".format(
                txStats["mcs_avg"], txStats["mcs_std"], txStats["mcs_p90"]
            )
            + "<td class='minimal'>{0:.1f}</td>\n".format(txStats["txpwridx_avg"])
            # use rxStats for SNR and RSSI
            + "<td class='minimal'>{0:.1f}<br>{1:.1f}</td>\n".format(
                rxStats["snr_avg"], rxStats["rssi_avg"]
            )
        )
        if not monitor:
            content += "<td>{0:.1f}<br>{1:.1f}</td>\n".format(
                txStats["thrpt_avg"], txStats["thrpt_std"]
            )
            content += "<td>{0}</td>\n".format(txStats["target_rate"])
            content += "<td>{0:.1f}<br>{1:.1f}</td>\n".format(
                txStats["ping_avg"], txStats["ping_std"]
            )
            content += "<td>{0:.1f}<br>{1:.1f}<br>{2:.1f}<br>{3:.1f}</td>\n".format(
                txStats["ping_max"],
                txStats["ping_p10"],
                txStats["ping_p90"],
                txStats["ping_min"],
            )
        content += "<td class='minimal'>{0:.1f}%</td>\n".format(txStats["txeff_avg"])
        return content

    if not result:
        return ""
    myColorsBidir = []
    myColorsUnidir = []
    keys = get_keys_w_two_sorts(result, myLabel, KEY.PER + "_avg")
    tableContent = ""
    for link in keys:
        linkStatus, linkColor = get_bilink_status_health(result[link][myLabel])
        myColorsBidir.append(linkColor)
        dof = result[link].get(KEY.DOF, float("nan"))
        distance = result[link].get(KEY.DISTANCE, float("nan"))
        url = result[link].get(KEY.DASHBOARD, "")
        aStatus, aColor = get_unilink_status_health(result[link][KEY.A2Z][myLabel])
        zStatus, zColor = get_unilink_status_health(result[link][KEY.Z2A][myLabel])
        myColorsUnidir += [aColor, zColor]
        # skip to show if both directions are excellent
        aStats = get_unilink_stats(result[link][KEY.A2Z])
        zStats = get_unilink_stats(result[link][KEY.Z2A])
        # format content
        tableContent += (
            "<tr class='color_{color} clear'>\n".format(color=aColor)
            + "<td>{linkName}</td>\n".format(linkName=link)
            + get_uni_table_content(
                "&rarr;", aStatus, aStats, zStats, distance, monitor, dof
            )
            + "</tr>\n<tr class='color_{color} same clear'>\n".format(color=zColor)
            + "<td>({1:.1f} m, <a href='{0}'>dashboard</a>)</td>\n".format(
                url, distance
            )
            + get_uni_table_content(
                "&larr;", zStatus, zStats, aStats, distance, monitor, dof
            )
            + "</tr>\n"
        )
    uniExCounts = myColorsUnidir.count("green")
    uniOkCounts = myColorsUnidir.count("blue")
    uniMehCounts = myColorsUnidir.count("yellow")
    uniWarnCounts = myColorsUnidir.count("purple") + myColorsUnidir.count("red")
    lenColorsUniDir = len(myColorsUnidir)
    # avoid divide by 0 error
    if lenColorsUniDir is 0:
        lenColorsUniDir = 1
    if monitor:
        tableContent = wrap_with_table_thead(
            [
                ["Link<br>distance, dashboard", False],
                ["&nbsp;", False],
                ["Status", False],
                ["Path<br>Loss<br>(dB)", False],
                ["PER", False],
                ["MCS<br>avg/<br>std/<br>p90", False],
                ["txPwr<br>Idx", True],
                ["SNR<br>RSSI<br>(dB)", True],
                ["txUtilRatio", True],
            ],
            tableContent,
        )
    else:
        tableContent = wrap_with_table_thead(
            [
                ["Link<br>distance, dashboard", False],
                ["&nbsp;", False],
                ["Status", False],
                ["DOF", False],
                ["Distance", False],
                ["MCS p90", False],
                ["Path<br>Loss<br>(dB)", False],
                ["PER", False],
                ["MCS avg/<br>std/<br>p90)", False],
                ["txPwr<br>Idx", True],
                ["SNR<br>RSSI<br>(dB)", True],
                ["Thrpt avg/<br>std (Mbps)", False],
                ["Target<br>Rate", False],
                ["Ping avg/<br>std (ms)", False],
                ["Ping max/<br>p10<br>p90<br>min (ms)", False],
                ["txUtilRatio", True],
            ],
            tableContent,
        )
    # separate the contents and return two variables as a hack to show details
    # before mcs histogram
    return (
        (
            "<div>Among {0} uni-directional links, ".format(lenColorsUniDir)
            + "{0} ({1:.1f}%) are excellent, ".format(
                uniExCounts, 100.0 * uniExCounts / lenColorsUniDir
            )
            + "{0} ({1:.1f}%) are healthy, ".format(
                uniOkCounts, 100.0 * uniOkCounts / lenColorsUniDir
            )
            + "{0} ({1:.1f}%) are marginal, ".format(
                uniMehCounts, 100.0 * uniMehCounts / lenColorsUniDir
            )
            + "{0} ({1:.1f}%) are warning, ".format(
                uniWarnCounts, 100.0 * uniWarnCounts / lenColorsUniDir
            )
            + "and {0} ".format(myColorsUnidir.count("black"))
            + "are failed to probe.</div>"
        ),
        ("<div>More details below.</div>\n" + "<div>{0}</div>".format(tableContent)),
    )


def convert_multihop_to_html_healthiness(result, myLabel, direction):
    """
    here we convert multihop analysis into html tables
    """

    def get_unilink_stats(linkResult, myLabel):
        """
        return link stats in a dict
        """
        unilinkStats = {
            "thrpt_avg": linkResult.get(KEY.IPERF_DETAILS + "_avg", float("nan")),
            "thrpt_std": linkResult.get(KEY.IPERF_DETAILS + "_std", float("nan")),
            "thrpt_min": linkResult.get(KEY.IPERF_DETAILS + "_min", float("nan")),
            "ping_avg": linkResult.get(KEY.PING_DETAILS + "_avg", float("nan")),
            "ping_std": linkResult.get(KEY.PING_DETAILS + "_std", float("nan")),
            "ping_max": linkResult.get(KEY.PING_DETAILS + "_min", float("nan")),
            "ping_loss": linkResult.get(KEY.PING_LOSS, float("nan")),
            "total_hop_num": linkResult.get(KEY.HOP_COUNT, float("nan")),
            "wireless_hop_num": linkResult.get(KEY.WIRELESS_HOP_COUNT, float("nan")),
            "wireless_path_num": linkResult.get(KEY.WIRELESS_PATH_NUM, float("nan")),
            "valid_route_measure_num": linkResult.get(
                KEY.NUM_VALID_ROUTE_PATHS, float("nan")
            ),
            "dominant_path": linkResult.get(KEY.DOMINANT_WIRELESS_PATH, []),
            "dominant_path_occurrence": linkResult.get(
                KEY.DOMINANT_WIRELESS_PATH_OCCURRENCE, float("nan")
            ),
            "per_hop_ping": linkResult.get(KEY.PER_HOP_LATENCY, float("nan")),
        }
        if myLabel == KEY.LB_TCP_STATUS:
            unilinkStats.update(
                {"tcp_retrans": linkResult.get(KEY.IPERF_TCP_RETRANS, float("nan"))}
            )
        return unilinkStats

    # TODO multihop: shall we break the get_uni_table_content to an outside function
    def get_uni_table_content(unilink, status, stats, myLabel):
        """
        generate table content for unilink
        """
        content = "<td>{0}</td>\n".format(unilink)
        content += "<td>{0}</td>\n".format(status)
        content += "<td>{0:.1f}<br>{1:.1f}</td>\n".format(
            stats["wireless_hop_num"], stats["total_hop_num"]
        )
        print("dominant_path = {}".format(stats["dominant_path"]))
        if stats["dominant_path"] is not None:
            content += "<td>"
            # dominant_path includes multiple wireless links
            for route in stats["dominant_path"]:
                content += "{0}<br>".format(route)
            content += "</td>\n"
        if stats["dominant_path_occurrence"] is not None:
            content += "<td>{0:.0f}</td>\n".format(stats["dominant_path_occurrence"])
        if stats["valid_route_measure_num"] is not None:
            content += "<td>{0}</td>\n".format(stats["valid_route_measure_num"])
        if stats["wireless_path_num"] is not None:
            content += "<td>{0}</td>\n".format(stats["wireless_path_num"])
        content += "<td>{0:.1f}</td>\n".format(
            stats["thrpt_avg"]
        ) + "<td>{0:.1f}<br>{1:.1f}</td>\n".format(
            stats["thrpt_std"], stats["thrpt_min"]
        )
        if myLabel == KEY.LB_TCP_STATUS:
            content += "<td>{0:.1f}</td>\n".format(stats["tcp_retrans"])
        content += (
            "<td>{0:.1f}</td>\n".format(stats["per_hop_ping"])
            + "<td>{0:.1f}<br>{1:.1f}</td>\n".format(
                stats["ping_avg"], stats["ping_std"]
            )
            + "<td>{0:.1f}</td>\n".format(stats["ping_loss"])
        )
        return content

    if not result:
        return ""
    myColorsBidir = []
    myColorsUnidir = []
    keys = get_keys_w_two_sorts(result, myLabel, KEY.IPERF_DETAILS + "_avg")
    tableContent = ""
    for link in keys:
        linkStatus, linkColor = get_bilink_status_health(result[link][myLabel])
        myColorsBidir.append(linkColor)
        aStatus, aColor = get_unilink_status_health(result[link][KEY.A2Z][myLabel])
        zStatus, zColor = get_unilink_status_health(result[link][KEY.Z2A][myLabel])
        aStats = get_unilink_stats(result[link][KEY.A2Z], myLabel)
        zStats = get_unilink_stats(result[link][KEY.Z2A], myLabel)
        # uni-directional multihop config
        if direction in [KEY.NORTHBOUND, KEY.SOUTHBOUND]:
            myColorsUnidir += [aColor]
            tableContent += (
                "<tr class='color_{color} clear'>\n".format(color=aColor)
                + "<td>{linkName}</td>\n".format(linkName=link)
                + get_uni_table_content("&rarr;", aStatus, aStats, myLabel)
                + "</tr>\n"
            )
        # bi-directional multihop config
        elif direction == "bidirection":
            myColorsUnidir += [aColor, zColor]
            tableContent += (
                "<tr class='color_{color} clear'>\n".format(color=aColor)
                + "<td>{linkName}</td>\n".format(linkName=link)
                + get_uni_table_content("&rarr;", aStatus, aStats, myLabel)
                + "</tr>\n<tr class='color_{color} same clear'>\n".format(color=zColor)
                + "<td>reverse link</td>\n"
                + get_uni_table_content("&larr;", zStatus, zStats, myLabel)
                + "</tr>\n"
            )
        else:
            print("weird value for direction = {}".format(direction))

    uniExCounts = myColorsUnidir.count("green")
    uniOkCounts = myColorsUnidir.count("blue")
    uniMehCounts = myColorsUnidir.count("yellow")
    uniWarnCounts = myColorsUnidir.count("red")
    lenColorsUniDir = len(myColorsUnidir)
    # avoid divide by 0 error
    if lenColorsUniDir is 0:
        lenColorsUniDir = 1
    if myLabel == KEY.LB_TCP_STATUS:
        tableContent = wrap_with_table_thead(
            [
                ["Direction", False],
                ["&nbsp;", False],
                ["Status", False],
                ["Wireless hops<br>Total hops", False],
                ["Dominant <br> wireless path", False],
                ["Wireless path <br> occurrence", False],
                ["Total valid <br> route measure", False],
                ["Unique path num", False],
                ["R_avg<br>(Mbps)", False],
                ["R_std<br>R_min", False],
                ["TCP Retrans.", False],
                ["Per-hop <br>ping avg(ms)", False],
                ["Ping avg<br>Ping std", False],
                ["Ping loss<br>(%)", False],
            ],
            tableContent,
        )
    elif myLabel == KEY.LB_UDP_STATUS:
        tableContent = wrap_with_table_thead(
            [
                ["Direction", False],
                ["&nbsp;", False],
                ["Status", False],
                ["Wireless hops<br>Total hops", False],
                ["Dominant <br> wireless path", False],
                ["Wireless path <br> occurrence", False],
                ["Total valid <br> route measure", False],
                ["Unique path number", False],
                ["R_avg<br>(Mbps)", False],
                ["R_std<br>R_min", False],
                ["Per-hop <br>ping avg(ms)", False],
                ["Ping avg<br>Ping std", False],
                ["Ping loss<bf>(%)", False],
            ],
            tableContent,
        )
    return (
        (
            "<div>Among {0} uni-directional multihop, ".format(lenColorsUniDir)
            + "<strong>{0} ({1:.1f}%) are excellent, ".format(
                uniExCounts, 100.0 * uniExCounts / lenColorsUniDir
            )
            + "{0} ({1:.1f}%) are healthy, ".format(
                uniOkCounts, 100.0 * uniOkCounts / lenColorsUniDir
            )
            + "{0} ({1:.1f}%) are marginal, ".format(
                uniMehCounts, 100.0 * uniMehCounts / lenColorsUniDir
            )
            + "{0} ({1:.1f}%) are warning, ".format(
                uniWarnCounts, 100.0 * uniWarnCounts / lenColorsUniDir
            )
            + "and {0} ".format(myColorsUnidir.count("black"))
            + "are failed to get tested</strong>.</div>"
        ),
        ("<div>More details below.</div>\n" + "<div>{0}</div>".format(tableContent)),
    )


def convert_link_importance_to_html_healthiness(result, myLabel):
    """
    here we convert multihop analysis into html tables
    """

    def get_unilink_stats(linkResult):
        """
        return link importance stats in a dict
        """
        unilinkStats = {
            # KEY.MULTIHOP_ROUTE entry is a list of remote routes
            KEY.MULTIHOP_ROUTE: linkResult.get(KEY.MULTIHOP_ROUTE, []),
            KEY.LINK_ROUTE_NUM: linkResult.get(KEY.LINK_ROUTE_NUM, float("nan")),
        }
        return unilinkStats

    def get_uni_table_content(unilink, status, stats):
        """
        generate table content for unilink importance
        """
        content = "<td>{0}</td>\n".format(unilink)
        content += "<td>{0}</td>\n".format(status)
        content += "<td>{0}</td>\n".format(stats[KEY.LINK_ROUTE_NUM])
        # loop over the list stats[KEY.MULTIHOP_ROUTE]
        if stats[KEY.MULTIHOP_ROUTE] is not None:
            content += "<td>"
            for route in stats[KEY.MULTIHOP_ROUTE]:
                content += "{0}<br>".format(route)
            content += "</td>\n"
        return content

    if not result:
        return ""
    myColorsBidir = []
    myColorsUnidir = []
    # myLabel here is KEY.LB_LINK_IMPORTANCE
    keys = get_keys_w_two_sorts(result, myLabel, KEY.LINK_ROUTE_NUM)
    tableContent = ""
    for link in keys:
        linkStatus, linkColor = get_bilink_status_importance(result[link][myLabel])
        myColorsBidir.append(linkColor)
        aStatus, aColor = get_unilink_status_importance(result[link][KEY.A2Z][myLabel])
        zStatus, zColor = get_unilink_status_importance(result[link][KEY.Z2A][myLabel])
        aStats = get_unilink_stats(result[link][KEY.A2Z])
        zStats = get_unilink_stats(result[link][KEY.Z2A])
        myColorsUnidir += [aColor, zColor]
        tableContent += (
            "<tr class='color_{color} clear'>\n".format(color=aColor)
            + "<td>{linkName}</td>\n".format(linkName=link)
            + get_uni_table_content("&rarr;", aStatus, aStats)
            + "</tr>\n<tr class='color_{color} same clear'>\n".format(color=zColor)
            + "<td>reverse link</td>\n"
            + get_uni_table_content("&larr;", zStatus, zStats)
            + "</tr>\n"
        )
    uniImportance4Counts = myColorsUnidir.count("green")
    uniImportance3Counts = myColorsUnidir.count("blue")
    uniImportance2Counts = myColorsUnidir.count("yellow")
    uniImportance1Counts = myColorsUnidir.count("red")
    lenColorsUniDir = len(myColorsUnidir)
    # avoid divide by 0 error
    if lenColorsUniDir is 0:
        lenColorsUniDir = 1
    tableContent = wrap_with_table_thead(
        [
            ["Direction", False],
            ["&nbsp;", False],
            ["Status", False],
            ["Route <br>nums", False],
            ["Route<br>details", False],
        ],
        tableContent,
    )
    return (
        (
            "<div>Among {0} uni-directional TG links, ".format(lenColorsUniDir)
            + "<strong>{0} ({1:.1f}%) are within 1st importance level, ".format(
                uniImportance1Counts, 100.0 * uniImportance1Counts / lenColorsUniDir
            )
            + "{0} ({1:.1f}%) are within 2nd importance level, ".format(
                uniImportance2Counts, 100.0 * uniImportance2Counts / lenColorsUniDir
            )
            + "{0} ({1:.1f}%) are within 3rd importance level, ".format(
                uniImportance3Counts, 100.0 * uniImportance3Counts / lenColorsUniDir
            )
            + "{0} ({1:.1f}%) are within 4th importance level, ".format(
                uniImportance4Counts, 100.0 * uniImportance4Counts / lenColorsUniDir
            )
            + "and {0} ".format(myColorsUnidir.count("black"))
            + "are failed to get tested</strong>.</div>"
        ),
        ("<div>More details below.</div>\n" + "<div>{0}</div>".format(tableContent)),
    )


def convert_iperf_result_to_html(result, udp, logger):
    """
    here we convert iperf analysis into html tables
    """
    if not result:
        return ""
    mcsHistContent = convert_iperf_monitor_to_html_mcs_hist(result)
    txPwrHistContent = convert_iperf_monitor_to_html_txpwr_hist(result)
    snrHistContent = convert_iperf_monitor_to_html_snr_hist(result)
    hackContent, thrptContent = convert_iperf_monitor_to_html_healthiness(
        result, myLabel=KEY.LB_UDP_STATUS if udp else KEY.LB_TCP_STATUS
    )
    return (
        hackContent + mcsHistContent + txPwrHistContent + snrHistContent + thrptContent
    )


def convert_monitor_result_to_html(result, logger):
    """
    here we convert monitor analysis into html tables
    """
    myLabel = KEY.LB_MON_STATUS
    mcsHistContent = convert_iperf_monitor_to_html_mcs_hist(result, myLabel)
    monitorContent = convert_iperf_monitor_to_html_healthiness(
        result, myLabel, monitor=True
    )
    return mcsHistContent + monitorContent


def get_link_status_reciprocal_im(status):
    """
    translate link status to string
    """
    if status == KEY.STATUS_MATCH:
        return "yes", "green"
    elif status == KEY.STATUS_MISMATCH:
        return "no", "red"
    return "unknown", "black"


def convert_reciprocal_im_to_html(result, logger):
    """
    here we convert reciprocal analysis (based on IM scans) into html tables
    """
    if not result:
        return ""
    tableContent = ""
    linkColorSummary = []
    links = get_keys_w_two_sorts(result, KEY.LB_RECIPROCAL_IM, None)
    for link in links:
        status, color = get_link_status_reciprocal_im(
            result[link][KEY.LB_RECIPROCAL_IM]
        )
        linkColorSummary.append(color)
        # skip if it is healthy
        if color == "green":
            continue
        tableContent += (
            "<tr class='color_{0} clear'>\n".format(color)
            + "<td>{0}</td>\n".format(link)
            + "<td>{0}</td>\n".format(status)
            + "<td>{0}</td>\n".format(result[link][KEY.A2Z][KEY.A2Z_BEST])
            + "<td>{0}</td>\n".format(result[link][KEY.Z2A][KEY.Z2A_BEST])
            + "</tr>\n"
        )
    tableContent = wrap_with_table_thead(
        [
            ["Link Name", False],
            ["Is Link Reciprocal?", False],
            ["A Node<br>(Idx as TX, as RX, SNR dB)", False],
            ["Z Node<br>(Idx as TX, as RX, SNR dB)", False],
        ],
        tableContent,
    )
    healthRatio = 100.0 * linkColorSummary.count("green") / len(linkColorSummary)
    return (
        "<div>Among {0} links, ".format(len(links))
        + "{0:.2f}% are reciprocal, ".format(healthRatio)
        + "and {0} links failed</div>\n".format(linkColorSummary.count("black"))
        + "<div>{0}</div>".format(tableContent)
    )


def convert_connectivity_result_to_html(result, logger):
    """
    generate html tables to display connectivity results
    """
    table_content = ""
    counter = 0
    for txNode in result:
        for rxNode in result[txNode]:
            counter += 1
            if counter % 2 == 0:
                span_color = "color_black"
            else:
                span_color = "color_white"
            table_content += (
                "<tr class='{0} clear'>\n".format(span_color)
                + "<td>{0}</td>\n".format(txNode)
                + "<td>{0}</td>\n".format(rxNode)
                + "<td>{0}</td>\n".format(result[txNode][rxNode][0][0])
                + "<td>{0}</td>\n".format(result[txNode][rxNode][0][1])
                + "<td>{0}</td>\n".format(result[txNode][rxNode][0][2])
                + "</tr>\n"
            )
            for txIdx, rxIdx, potentialSNR in result[txNode][rxNode][1:]:
                more_content = (
                    "<tr class='{0} clear'>\n".format(span_color)
                    + "<td></td>\n<td></td>\n"
                    + "<td>{0}</td>\n".format(txIdx)
                    + "<td>{0}</td>\n".format(rxIdx)
                    + "<td>{0}</td>\n".format(potentialSNR)
                    + "</tr>\n"
                )
                table_content += more_content
    table_content = wrap_with_table_thead(
        [
            ["TxNode", False],
            ["RxNode", False],
            ["txIdx", False],
            ["rxIdx", False],
            ["potentialSNR (dB)", False],
        ],
        table_content,
    )
    main_content = (
        "<div>The connectivity graph is listed in the table below.</div>\n"
        + "<div>"
        + table_content
        + "</div>"
    )
    return main_content


def convert_interference_scan_result_to_html(result, logger):
    """
    generate html tables to display interference results
    """
    table_content = ""
    keys = sorted(result.keys(), key=lambda x: result[x][0], reverse=True)
    for i in range(len(keys)):
        rx, rxTowards = keys[i].split("__")
        rxSite = rx.split(".")[0]
        if not (rxTowards == "nan"):
            rx = "{0} (towards {1})".format(rx, rxTowards)
        if i % 2 == 0:
            span_color = "color_black"
        else:
            span_color = "color_white"
        table_content += (
            "<tr class='{0} clear'>\n".format(span_color)
            + "<td>{0}</td>\n".format(rx)
            + "<td>{0:.2f}</td>\n".format(result[keys[i]][0])
            + "<td>{0} (towards {1})</td>\n".format(
                result[keys[i]][1][0][0], result[keys[i]][1][0][2]
            )
            + "<td>{0}</td>\n".format(result[keys[i]][1][0][1])
            + "</tr>\n"
        )
        for tx, inr, txTowards in result[keys[i]][1][1:]:
            txSite = tx.split(".")[0]
            more_content = (
                "<tr class='{0} clear'>\n".format(span_color) + "<td></td>\n<td></td>\n"
            )
            # highlight if there is self site interference
            if txSite == rxSite:
                more_content += "<td class='{0}'>{1} (towards {2})</td>\n".format(
                    "color_red", tx, txTowards
                )
            else:
                more_content += "<td>{0} (towards {1})</td>\n".format(tx, txTowards)
            more_content += "<td>{0:.2f}</td>\n".format(inr) + "</tr>\n"
            table_content += more_content
    table_content = wrap_with_table_thead(
        [
            ["RxNode", False],
            ["Overall INR (dB)", False],
            ["Interfered by", False],
            ["Itemized INR (dB)", False],
        ],
        table_content,
    )
    main_content = (
        "<div>We find the interference summarized below.</div>\n"
        + "<div>"
        + table_content
        + "</div>"
    )
    return main_content


def get_link_status_alignment(status):
    """
    translate link status to string
    """
    if status == KEY.STATUS_TX_RX_DIFF:
        return "node has problem", "red"
    elif status == KEY.STATUS_TX_RX_HEALTHY:
        return "okay", "green"
    return "unknown", "black"


def get_node_status_alignment(status):
    """
    translate node status to string
    """
    if status == KEY.STATUS_LARGE_ANGLE + KEY.STATUS_TX_RX_DIFF:
        return "misalign & large tx/rx diff", "red"
    elif status == KEY.STATUS_LARGE_ANGLE:
        return "misalign", "purple"
    elif status == KEY.STATUS_TX_RX_DIFF:
        return "large tx/rx diff", "yellow"
    elif status == KEY.STATUS_TX_RX_HEALTHY:
        return "okay", "green"
    return "unknown", "black"


def convert_alignment_result_to_html(result):
    """
    generate html tables to display box alignment results
    """
    if not result:
        return ""
    myStatusColors = []
    keys = get_keys_w_two_sorts(result, KEY.LB_MISALIGNMENT, None)
    tableContent = ""
    for link in keys:
        linkStatus, linkColor = get_link_status_alignment(
            result[link][KEY.LB_MISALIGNMENT]
        )
        aNodeStatus, aNodeColor = get_node_status_alignment(
            result[link][KEY.A2Z][KEY.LB_MISALIGNMENT]
        )
        zNodeStatus, zNodeColor = get_node_status_alignment(
            result[link][KEY.Z2A][KEY.LB_MISALIGNMENT]
        )
        myStatusColors += [aNodeColor, zNodeColor]
        aNodeTxAng = result[link][KEY.A2Z].get(KEY.BEAM_TX_ANG, float("nan"))
        aNodeRxAng = result[link][KEY.A2Z].get(KEY.BEAM_RX_ANG, float("nan"))
        zNodeTxAng = result[link][KEY.Z2A].get(KEY.BEAM_TX_ANG, float("nan"))
        zNodeRxAng = result[link][KEY.Z2A].get(KEY.BEAM_RX_ANG, float("nan"))
        tableContent += (
            "<tr class='color_{color} clear'>\n".format(color=linkColor)
            + "<td>{linkName}</td>".format(linkName=link)
            + "<td>{linkStatus}</td>".format(linkStatus=linkStatus)
            + "<td class='color_{3}'>{0}<br>(tx {1:.2f}&deg; & rx {2:.2f}&deg;)</td>".format(
                aNodeStatus, aNodeTxAng, aNodeRxAng, aNodeColor
            )
            + "<td class='color_{3}'>{0}<br>(tx {1:.2f}&deg; & rx {2:.2f}&deg;)</td>".format(
                zNodeStatus, zNodeTxAng, zNodeRxAng, zNodeColor
            )
            + "</tr>\n"
        )
    healthRatio = 100.0 * myStatusColors.count("green") / len(myStatusColors)
    tableContent = wrap_with_table_thead(
        [
            ["Link", False],
            ["Overall<br>Status", False],
            ["A Node", False],
            ["Z Node", False],
        ],
        tableContent,
    )
    return (
        "<div>Among {0} nodes, ".format(len(myStatusColors))
        + "{0:.2f}% are healthy, ".format(healthRatio)
        + "and {0} nodes failed</div>\n".format(myStatusColors.count("black"))
        + "<div>{0}</div>".format(tableContent)
    )


def sort_based_hopcount(result):
    """
    sort based on hop count
    """
    keys = sorted(
        result.keys(), key=lambda x: result[x]["wireless_hop_count"], reverse=True
    )
    return keys


def sort_each_status(result, status, field, field_reverse=True):
    """
    sort based on average value in each status
    """
    # 1st sort based on status
    keys = sorted(result.keys(), key=lambda x: result[x][status], reverse=True)

    # 2nd sort based on average value in each status
    keys_by_value = []
    for val in KEY.STATUS_VALUE:
        if val is not KEY.STATUS_VALUE[-1]:
            keys_temp = sorted(
                [x for x in keys if result[x][status] is val],
                key=lambda x: result[x][field],
                reverse=field_reverse,
            )
        else:
            keys_temp = [x for x in keys if result[x][status] is val]
        keys_by_value += keys_temp
    keys = keys_by_value
    return keys


def convert_multihop_result_to_html(result, tcp, logger, args=None):
    """
    Convert multihop analysis into html tables
    """
    if not result:
        return ""
    myLabel = KEY.LB_TCP_STATUS
    if not tcp:
        myLabel = KEY.LB_UDP_STATUS
    traffic_direction = args["tests"]["iperf_multihop"]["direction"]
    overviewContent, thrptContent = convert_multihop_to_html_healthiness(
        result, myLabel, direction=traffic_direction
    )
    return overviewContent + thrptContent


def convert_link_importance_result_to_html(result, logger):
    """
    Convert link importance analysis from multihop measurements to html table
    """
    if not result:
        return ""
    myLabel = KEY.LB_LINK_IMPORTANCE
    overviewContent, linkImportanceContent = convert_link_importance_to_html_healthiness(
        result, myLabel
    )
    return overviewContent + linkImportanceContent


def get_node_status_ping(status):
    """
    translate node status to string
    """
    if status == KEY.STATUS_BAD_OCCASION or status == KEY.STATUS_BAD_CONSTANT:
        return "warning", "red"
    elif status == KEY.STATUS_WARNING:
        return "marginal", "yellow"
    elif status == KEY.STATUS_HEALTHY:
        return "healthy", "blue"
    elif status == KEY.STATUS_EXCELLENT:
        return "excellent", "green"
    return "unknown", "black"


def get_link_status_ping(status):
    """
    translate link status to string
    """
    return get_node_status_ping(status)


def convert_ping_result_to_html(result, logger, args):
    """
    here we convert ping/sector availability analysis result into html tables
    """
    if not result:
        return ""
    linkColorSummary = []
    keys = get_keys_w_two_sorts(result, KEY.LB_PING_STATUS, KEY.PING_DETAILS + "_avg")
    tableContent = ""
    for link in keys:
        linkStatus, linkColor = get_link_status_ping(result[link][KEY.LB_PING_STATUS])
        linkColorSummary.append(linkColor)
        # skip to show if both directions are ok
        if linkColor == "green":
            continue
        aNodeStatus, aNodeColor = get_node_status_ping(
            result[link][KEY.A2Z][KEY.LB_PING_STATUS]
        )
        zNodeStatus, zNodeColor = get_node_status_ping(
            result[link][KEY.Z2A][KEY.LB_PING_STATUS]
        )
        aNodeDelay = result[link][KEY.A2Z].get(KEY.PING_DETAILS + "_p90b", float("nan"))
        zNodeDelay = result[link][KEY.Z2A].get(KEY.PING_DETAILS + "_p90b", float("nan"))
        tableContent += (
            "<tr class='color_{color} clear'>\n".format(color=linkColor)
            + "<td>{linkName}</td>".format(linkName=link)
            + "<td>{linkStatus}</td>".format(linkStatus=linkStatus)
            + "<td class='color_{2}'>{0}<br>(90% below {1:.2f}ms)</td>".format(
                aNodeStatus, aNodeDelay, aNodeColor
            )
            + "<td class='color_{2}'>{0}<br>(90% below {1:.2f}ms)</td>".format(
                zNodeStatus, zNodeDelay, zNodeColor
            )
            + "</tr>\n"
        )
    healthRatio = 100.0 * linkColorSummary.count("green") / len(linkColorSummary)
    tableContent = wrap_with_table_thead(
        [
            ["Link", False],
            ["Overall<br>Status", False],
            ["A Node -> Z", False],
            ["Z Node -> A", False],
        ],
        tableContent,
    )
    return (
        "<div>Among {0} links, ".format(len(linkColorSummary))
        + "{0:.2f}% are healthy, ".format(healthRatio)
        + "and {0} links failed</div>\n".format(linkColorSummary.count("black"))
        + "<div>{0}</div>".format(tableContent)
    )


def convert_to_html(fieldname, myresult, logger, misc=None):
    if not myresult:
        return ""
    if fieldname == "box_alignment":
        return convert_alignment_result_to_html(myresult)
    elif fieldname == "reciprocal_im":
        return convert_reciprocal_im_to_html(myresult, logger)
    elif fieldname == "connectivity":
        return convert_connectivity_result_to_html(myresult, logger)
    elif fieldname == "interference":
        return convert_interference_scan_result_to_html(myresult, logger)
    elif fieldname == "ping_p2p" or fieldname == "ping_sa":
        return convert_ping_result_to_html(myresult, logger, misc)
    elif fieldname == "iperf_multihop":
        return convert_multihop_result_to_html(
            myresult, tcp=(misc[1] == "tcp"), logger=logger, args=misc[2]
        )
    elif fieldname == "link_importance":
        return convert_link_importance_result_to_html(myresult, logger=logger)
    elif fieldname == "monitoring":
        return convert_monitor_result_to_html(myresult, logger=logger)
    elif fieldname in ["iperf_p2p", "iperf_p2mp"]:
        return convert_iperf_result_to_html(
            myresult, udp=(misc[1] == "udp"), logger=logger
        )
    return ""
