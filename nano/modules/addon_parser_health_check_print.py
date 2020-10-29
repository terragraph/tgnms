#!/usr/bin/env python3

# modules
import modules.keywords as KEY
from modules.addon_parser_health_check import sort_based_hopcount, sort_each_status
from modules.addon_terminal_color import colorString


def show_connectivity_graph(result, count_micro=-1, count_macro=-1):
    """
    just print out the graph line by line
    """
    print("{0}".format("-" * 86))
    print("{0}".format("-" * 86))
    print("{0} Connectivity Results {0}".format("-" * 32))
    print("{0}".format("-" * 86))
    for tx in result:
        print("- Tx: {0}".format(tx))
        for rx in result[tx]:
            print("|- Rx: {0}".format(rx))
            for each in result[tx][rx]:
                txIdx, rxIdx, txSnr = each
                print(
                    "|-|- Route: txIdx {0} rxIdx {1} Snr {2}".format(
                        txIdx, rxIdx, txSnr
                    )
                )
    perc_micro = perc_macro = 0
    if count_micro > -1:
        if len(result) > 0:
            perc_micro = 100.0 * count_micro / len(result)
            perc_macro = 100.0 * count_macro / len(result)
        print(
            "{0} links ({1:.2f}%) have one or more micro routes".format(
                count_micro, perc_micro
            )
        )
        print("{0} nodes ({1:.2f}%) have macro routes".format(count_macro, perc_macro))


def show_alignment_analysis(result):
    """
    just print out the analysis result of alignment
    """
    if not result:
        return
    keys = sorted(
        result.keys(), key=lambda x: result[x][KEY.LB_MISALIGNMENT], reverse=True
    )
    print("{0}".format("-" * 86))
    print("{0}".format("-" * 86))
    print(
        "{0:16}{1:33}: {2:>8} {3:>8} {4:>8} {5:>8}".format(
            "", "Node [towards Node]", "txIdx", "rxIdx", "txAng", "rxAng"
        )
    )
    print("{0}".format("-" * 86))
    for tx__rx in keys:
        tx, rx = tx__rx.split("__")
        if KEY.ODS_PERIOD_TX_BEAM not in result[tx__rx]:
            print(
                colorString("{0:>20} towards {1:<20}: ".format(tx, rx), color="black")
            )
            continue
        my_str = "{0:>20} towards {1:<20}: ".format(
            tx, rx
        ) + "{0:8d} {1:8d} {2:8.3f} {3:8.3f}".format(
            result[tx__rx][KEY.ODS_PERIOD_TX_BEAM],
            result[tx__rx][KEY.ODS_PERIOD_RX_BEAM],
            result[tx__rx]["txAng"],
            result[tx__rx]["rxAng"],
        )
        if result[tx__rx][KEY.LB_MISALIGNMENT] is KEY.STATUS_LARGE_ANGLE:
            print(colorString(my_str, color="purple"))
        elif result[tx__rx][KEY.LB_MISALIGNMENT] is KEY.STATUS_TX_RX_DIFF:
            print(colorString(my_str, color="yellow"))
        elif result[tx__rx][KEY.LB_MISALIGNMENT] is (
            KEY.STATUS_LARGE_ANGLE + KEY.STATUS_TX_RX_DIFF
        ):
            print(colorString(my_str, color="red"))
        elif result[tx__rx][KEY.LB_MISALIGNMENT] is KEY.STATUS_TX_RX_HEALTHY:
            print(colorString(my_str, color="green"))
        elif result[tx__rx][KEY.LB_MISALIGNMENT] is KEY.STATUS_UNKNOWN:
            print(colorString(my_str, color="black"))
        else:
            print("???" + my_str)


def show_interference(rxINRList):
    """
    just print out the analysis result of interference
    """
    print("")
    print("{0}".format("-" * 86))
    print("{0} Interference Results {0}".format("-" * 32))
    print("{0}".format("-" * 86))
    for rx in rxINRList:
        print("* Rx {0} (overall INR: {1:0.1f} dB)".format(rx, rxINRList[rx][0]))
        for tx, inr, txTowards in rxINRList[rx][1]:
            print(
                "** affected by Tx {0} (towards {1}), creating INR {2:0.1f} dB".format(
                    tx, txTowards, inr
                )
            )


def show_link_status_analysis(result, udp=False, monitor=False):
    """
    just print out the analysis result of link status
    """
    if not result:
        return
    if monitor:
        key_of_status = "monitor"
    else:
        key_of_status = KEY.LB_TCP_STATUS
        if udp:
            key_of_status = KEY.LB_UDP_STATUS
    print("{0}".format("-" * 200))
    print(key_of_status)
    print("{0}".format("-" * 200))
    print(
        "{0:>20}{1:5}{2:<15}: ".format("From", " -> ", "To")
        + "{0:>10} {1:>15}".format("PER%", "rxPlcpFail(Z)")
        + " {0:>10} {1:>10} {2:>10} {3:>10}".format(
            "txOk(A)", "rxOk(Z)", "txFail(A)", "rxFail(Z)"
        )
        + " {0:>10} {1:>10} {2:>10} {3:>10}".format(
            "txTotal(A)", "rxTotal(Z)", "txPpdu(A)", "rxPpdu(Z)"
        )
        + " {0:>10} {1:>10} {2:>12}".format("txBa(Z)", "rxBa(A)", "status")
    )
    # sort result based on link state and PER in each state
    keys = sort_each_status(result, KEY.LB_LINK, KEY.IPERF_PER_AVG)

    print("{0}".format("-" * 200))
    for node_a_z in keys:
        node_a, node_z = node_a_z.split("__")
        if result[node_a_z][KEY.LB_LINK] is KEY.STATUS_DATA_BA_LOSS:
            color = "red"
            status = "data_BA_loss"
        elif result[node_a_z][KEY.LB_LINK] is KEY.STATUS_DATA_LOSS:
            color = "purple"
            status = "data_loss"
        elif result[node_a_z][KEY.LB_LINK] is KEY.STATUS_BA_LOSS:
            color = "yellow"
            status = "BA_loss"
        elif result[node_a_z][KEY.LB_LINK] is KEY.STATUS_NO_LOSS:
            color = "green"
            status = "no_loss"
        elif result[node_a_z][KEY.LB_LINK] is KEY.STATUS_UNKNOWN:
            color = "black"
            status = "Unknown"
        my_str = (
            "{0:>20}{1:5}{2:<15}: ".format(node_a, " -> ", node_z)
            + "{0:10.3f} {1:15.0f}".format(
                float(result[node_a_z][KEY.IPERF_PER_AVG]),
                float(result[node_a_z]["rxPlcpFailAvgZ"]),
            )
            + "{0:10.0f} {1:10.0f} {2:10.0f} {3:10.0f}".format(
                float(result[node_a_z]["txOkAvgA"]),
                float(result[node_a_z]["rxOkAvgZ"]),
                float(result[node_a_z]["txFailAvgA"]),
                float(result[node_a_z]["rxFailAvgZ"]),
            )
            + "{0:>10.0f} {1:>10.0f} {2:10.0f} {3:10.0f}".format(
                float(result[node_a_z]["txTotalAvgA"]),
                float(result[node_a_z]["rxTotalAvgZ"]),
                float(result[node_a_z]["txPpduAvgA"]),
                float(result[node_a_z]["rxPpduAvgZ"]),
            )
            + "{0:>10.0f} {1:>10.0f} {2:>15}".format(
                float(result[node_a_z]["txBaAvgZ"]),
                float(result[node_a_z]["rxBaAvgA"]),
                status,
            )
        )
        print(colorString(my_str, color=color))


def show_foliage_analysis(result, udp=False, monitor=False):
    """
    just print out the analysis result of foliage status
    """
    if not result:
        return
    if monitor:
        key_of_status = "monitor"
    else:
        key_of_status = KEY.LB_TCP_STATUS
        if udp:
            key_of_status = KEY.LB_UDP_STATUS
    print("{0}".format("-" * 180))
    print(key_of_status)
    print("{0}".format("-" * 180))
    print(
        "{0:>20}{1:3}{2:<15}: ".format("NodeA", "<->", "NodeZ")
        + "{0:>12} {1:>12} {2:>12} {3:>12}".format(
            "rssi_avg(A)", "rssi_avg(Z)", "rssi_std(A)", "rssi_std(Z)"
        )
        + "{0:>12} {1:>12} {2:>12} {3:>12}".format(
            "snr_avg(A)", "snr_avg(Z)", "snr_std(A)", "snr_std(Z)"
        )
        + " {0:>14} {1:>12} {2:>12} {3:>12} {4:>12}".format(
            "txPower_avg(A)",
            "txPower_avg(Z)",
            "txPower_std(A)",
            "txPower_std(Z)",
            "foliage",
        )
    )
    # sort result based on foliage and non-foliage status
    keys = sorted(result.keys(), key=lambda x: result[x][KEY.LB_FOLIAGE], reverse=True)
    print("{0}".format("-" * 180))
    for node_a_z in keys:
        node_a, node_z = node_a_z.split("__")
        if result[node_a_z][KEY.LB_FOLIAGE] is KEY.STATUS_FOLIAGE_LIKELY:
            color = "purple"
            status = "foliage_likely"
        elif result[node_a_z][KEY.LB_FOLIAGE] is KEY.STATUS_NON_FOLIAGE:
            color = "blue"
            status = "non_foliage"
        elif result[node_a_z][KEY.LB_FOLIAGE] is KEY.STATUS_UNKNOWN:
            color = "black"
            status = "not tested"
        else:
            color = "black"
            status = "unknown"
        my_str = (
            "{0:>20}{1:3}{2:<15}: ".format(node_a, "<->", node_z)
            + "{0:12.3f} {1:12.3f} {2:12.3f} {3:12.3f}".format(
                float(result[node_a_z]["rssiAvgA"]),
                float(result[node_a_z]["rssiAvgZ"]),
                float(result[node_a_z]["rssiStdA"]),
                float(result[node_a_z]["rssiStdZ"]),
            )
            + "{0:>12.3f} {1:12.3f} {2:12.3f} {3:12.3f}".format(
                float(result[node_a_z]["snrAvgA"]),
                float(result[node_a_z]["snrAvgZ"]),
                float(result[node_a_z]["snrStdA"]),
                float(result[node_a_z]["snrStdZ"]),
            )
            + "{0:>14.3f} {1:12.3f} {2:>12.3f} {3:>12.3f} {4:>20}".format(
                float(result[node_a_z]["txPowerAvgA"]),
                float(result[node_a_z]["txPowerAvgZ"]),
                float(result[node_a_z]["txPowerStdA"]),
                float(result[node_a_z]["txPowerStdZ"]),
                status,
            )
        )
        print(colorString(my_str, color=color))


def show_iperf_analysis(result, udp=False):
    """
    just print out the analysis result of iperf
    """
    if not result:
        return
    key_of_status = KEY.LB_TCP_STATUS
    if udp:
        key_of_status = KEY.LB_UDP_STATUS

    keys = sort_each_status(result, key_of_status, KEY.IPERF_AVG)
    print("{0}".format("-" * 120))
    print(key_of_status)
    print("{0}".format("-" * 120))
    print(
        "{0:16}{1:28}: {2:>8} {3:>8} {4:>8} {5:>8} ".format(
            "", "From -> To (Mbps)", "avg", "min", "max", "std"
        )
        + "{0:>8} {1:>8}".format("avg_mcs", "avg_PER%")
    )
    print("{0}".format("-" * 120))
    for tx__rx in keys:
        tx, rx = tx__rx.split("__")
        if KEY.IPERF_AVG not in result[tx__rx]:
            print(colorString("{0:>20} -> {1:<20}: ".format(tx, rx), color="black"))
            continue
        my_str = "{0:>20} -> {1:<20}: ".format(
            tx, rx
        ) + "{0:8.3f} {1:8.3f} {2:8.3f} {3:8.3f} {4:8.3f} {5:8.3f}".format(
            result[tx__rx][KEY.IPERF_AVG],
            result[tx__rx][KEY.IPERF_MIN],
            result[tx__rx][KEY.IPERF_MAX],
            result[tx__rx][KEY.IPERF_STD],
            float(result[tx__rx][KEY.MCS_AVG]),
            float(result[tx__rx][KEY.IPERF_PER_AVG]),
        )
        if result[tx__rx][key_of_status] is KEY.STATUS_BAD_CONSTANT:
            print(colorString(my_str, color="red"))
        elif result[tx__rx][key_of_status] is KEY.STATUS_BAD_OCCASION:
            print(colorString(my_str, color="purple"))
        elif result[tx__rx][key_of_status] is KEY.STATUS_WARNING:
            print(colorString(my_str, color="yellow"))
        elif result[tx__rx][key_of_status] is KEY.STATUS_HEALTHY:
            print(colorString(my_str, color="green"))
        elif result[tx__rx][key_of_status] is KEY.STATUS_UNKNOWN:
            print(colorString(my_str, color="black"))
        else:
            print(my_str)


def show_ping_analysis(result):
    """
    just print out the analysis result of ping
    """
    if not result:
        return
    keys = sort_each_status(result, KEY.LB_PING_STATUS, KEY.PING_AVG)

    print("{0}".format("-" * 120))
    print("{0}".format("-" * 120))
    print(
        "{0:16}{1:28}: {2:>8} {3:>8} {4:>8} {5:>8} {6:>10} {7:>10} {8:>10}".format(
            "",
            "From -> To (ms)",
            "avg",
            "min",
            "max",
            "std",
            "ping_pkt_tx",
            "ping_pkt_rx",
            "ping_loss",
        )
    )
    print("{0}".format("-" * 120))
    for tx__rx in keys:
        tx, rx = tx__rx.split("__")
        if KEY.PING_AVG not in result[tx__rx]:
            print(colorString("{0:>20} -> {1:<20}: ".format(tx, rx), color="black"))
            continue
        my_str = "{0:>20} -> {1:<20}: ".format(
            tx, rx
        ) + "{0:8.3f} {1:8.3f} {2:8.3f} {3:8.3f} {4:10.3f} {5:10.3f} {6:10.3f}".format(
            result[tx__rx][KEY.PING_AVG],
            result[tx__rx][KEY.PING_MIN],
            result[tx__rx][KEY.PING_MAX],
            result[tx__rx][KEY.PING_STD],
            result[tx__rx][KEY.PING_PKT_TRANS],
            result[tx__rx][KEY.PING_PKT_RECV],
            result[tx__rx][KEY.PING_LOSS],
        )
        if result[tx__rx][KEY.LB_PING_STATUS] is KEY.STATUS_BAD_CONSTANT:
            print(colorString(my_str, color="red"))
        elif result[tx__rx][KEY.LB_PING_STATUS] is KEY.STATUS_BAD_OCCASION:
            print(colorString(my_str, color="purple"))
        elif result[tx__rx][KEY.LB_PING_STATUS] is KEY.STATUS_WARNING:
            print(colorString(my_str, color="yellow"))
        elif result[tx__rx][KEY.LB_PING_STATUS] is KEY.STATUS_HEALTHY:
            print(colorString(my_str, color="green"))
        elif result[tx__rx][KEY.LB_PING_STATUS] is KEY.STATUS_UNKNOWN:
            print(colorString(my_str, color="black"))
        else:
            print("???")


def show_multihop_analysis(result, tcp=True):
    """
    just print out the analysis result of multihop performance
    """
    if not result:
        return
    key_of_status = KEY.LB_UDP_STATUS
    if tcp:
        key_of_status = KEY.LB_TCP_STATUS

    keys = sort_each_status(result, key_of_status, KEY.IPERF_AVG)

    print("{0}".format("-" * 120))
    print(key_of_status)
    print("{0}".format("-" * 120))
    print("{0:16}{1:28}: {2:>15} {3:>15}".format("", "From -> To (Mbps)", "avg", "std"))
    print("{0}".format("-" * 120))
    for tx__rx in keys:
        tx, rx = tx__rx.split("__")
        if KEY.IPERF_AVG not in result[tx__rx]:
            print(colorString("{0:>20} -> {1:<20}: ".format(tx, rx), color="black"))
            continue
        my_str = "{0:>20} -> {1:<20}: ".format(tx, rx) + "{0:8.3f} {1:8.3f}".format(
            result[tx__rx][KEY.IPERF_AVG], result[tx__rx][KEY.IPERF_STD]
        )
        if result[tx__rx][key_of_status] is KEY.STATUS_BAD_CONSTANT:
            print(colorString(my_str, color="red"))
        elif result[tx__rx][key_of_status] is KEY.STATUS_BAD_OCCASION:
            print(colorString(my_str, color="purple"))
        elif result[tx__rx][key_of_status] is KEY.STATUS_WARNING:
            print(colorString(my_str, color="yellow"))
        elif result[tx__rx][key_of_status] is KEY.STATUS_HEALTHY:
            print(colorString(my_str, color="green"))
        elif result[tx__rx][key_of_status] is KEY.STATUS_UNKNOWN:
            print(colorString(my_str, color="black"))
        else:
            print(my_str)


def show_reciprocal_im_analysis(result):
    """
    print to screen about the reciprocal analysis results
    """
    if not result:
        return
    print("{0}".format("-" * 86))
    print("{0}".format("-" * 86))
    print("{0:49}: {1}".format("linkName", "infos"))
    print("{0}".format("-" * 86))
    for link in result:
        my_str = (
            "{0:<49}".format(link)
            + "{0:<20}".format(result[link][KEY.A2Z_BEST])
            + "{0:<20}".format(result[link][KEY.Z2A_BEST])
        )
        if result[link][KEY.LB_RECIPROCAL_IM] is KEY.STATUS_MATCH:
            print(colorString(my_str, color="green"))
        elif result[link][KEY.LB_RECIPROCAL_IM] is KEY.STATUS_MISMATCH:
            print(colorString(my_str, color="red"))
        elif result[link][KEY.LB_RECIPROCAL_IM] is KEY.STATUS_UNKNOWN:
            print(colorString(my_str, color="yellow"))
        else:
            print("???" + my_str)


def printout_analysis(fieldname, myresult):
    """
    print the result to screen
    """
    if fieldname == "box_alignment":
        show_alignment_analysis(myresult)
    elif fieldname == "interference":
        show_interference(myresult)
    elif fieldname == "monitoring":
        if "link_status" in myresult:
            show_link_status_analysis(myresult["link_status"], monitor=True)
        if "foliage_pathloss" in myresult:
            show_foliage_analysis(myresult["foliage_pathloss"], monitor=True)
    elif fieldname == "iperf_p2p":
        if "iperf_result" in myresult:
            show_iperf_analysis(
                myresult["iperf_result"], udp=(myresult["traffic"] == "udp")
            )
    elif fieldname == "ping_p2p" or fieldname == "ping_sa":
        show_ping_analysis(myresult)
    elif fieldname == "iperf_multihop":
        show_multihop_analysis(myresult, tcp=("tcp" in myresult))
    elif fieldname == "connectivity":
        show_connectivity_graph(myresult)
    elif fieldname == "reciprocal_im":
        show_reciprocal_im_analysis(myresult)
