#!/usr/bin/env python3

# dumpy imports to silence lint errors
import KEY
import sort_based_hopcount
import sort_each_status


def create_mcs_histogram_table(mcs_histogram, num_links):
    mcs_table_1 = "<table cellspacing='0' cellpadding='0'>\n"
    mcs_table_1 += "<thead><tr>\n"
    mcs_table_2 = "<tr class='{0} clear'>\n".format("color_purple")
    for mcs_idx in mcs_histogram:
        # display non_zeor mcs levels
        if mcs_histogram[mcs_idx] != 0:
            percent = "nan"
            if num_links > 0:
                percent = 1.0 * mcs_histogram[mcs_idx] / num_links * 100
            mcs_table_1 += "<th>mcs {0}</th>\n".format(mcs_idx)
            mcs_table_2 += "<td>{0}<br>{1:.2f}%</td>\n".format(
                mcs_histogram[mcs_idx], percent
            )
    mcs_table_1 += "</tr></thead>\n"
    mcs_table_1 += "<tbody>\n"
    mcs_table_2 += "</tr>\n"
    mcs_table_2 += "</tbody>\n</table>"
    mcs_table = mcs_table_1 + mcs_table_2
    return mcs_table


def create_monitoring_table(result, topology, logger, args):
    status_key = "monitor"
    excellent_link_count = 0
    healthy_link_count = 0
    warning_link_count = 0
    bad_link_count = 0
    failed_test_count = 0
    keys = sort_each_status(result, status_key, KEY.IPERF_PER_AVG, field_reverse=True)
    stats_entry = ""
    if not "mikebuda" == args["network_name"].lower():
        stats_entry = "<th class='minimal'>Stats</th>\n"
    table_content = "<table cellspacing='0' cellpadding='0'>\n"
    table_content += (
        "<thead><tr>\n"
        + "<th>From<br>To</th>\n"
        + "<th>Health<br>Tag</th>\n"
        + "<th>Distance</th>\n"
        + "<th> PER </th>\n"
        "<th>MCS<br>P90</th>\n"
        + "<th class='minimal'>MCS<br>Avg</th>\n"
        + "<th> txPower </th>\n"
        + "<th> SNR </th>\n"
        + "<th> RSSI </th>\n"
        + "<th> Pathloss</th>\n"
        + stats_entry
    )
    table_content += "</tr></thead>\n"
    table_content += "<tbody>\n"
    idx = 0
    for tx__rx in keys:
        idx += 1
        tx, rx = tx__rx.split("__")
        tx_mac = topology.get_mac(tx)
        rx_mac = topology.get_mac(rx)
        distance = topology.get_distance(tx, rx)
        link_log_td = ""
        if not "mikebuda" == args["network_name"].lower():
            if tx_mac is None or rx_mac is None:
                # set link to empty if mac is None
                link_log_td = "<td class='minimal'>nan</td>\n"
            else:
                # link dashboard URL creation for all links
                link_log = result[tx__rx][KEY.DASHBOARD]
                link_log_td = "<td class='minimal'>"
                link_log_td += "<a href={0}>dashboard</a></td>\n".format(link_log)
        healthiness = "unknown"
        span_color = "color_green"
        if result[tx__rx][status_key] == KEY.STATUS_BAD_OCCASION:
            span_color = "color_purple"
            healthiness = "warning"
            bad_link_count += 1
        elif result[tx__rx][status_key] == KEY.STATUS_WARNING:
            span_color = "color_yellow"
            healthiness = "marginal"
            warning_link_count += 1
        elif result[tx__rx][status_key] == KEY.STATUS_HEALTHY:
            span_color = "color_blue"
            healthiness = "healthy"
            healthy_link_count += 1
        elif result[tx__rx][status_key] == KEY.STATUS_EXCELLENT:
            span_color = "color_green"
            healthiness = "excellent"
            excellent_link_count += 1
        elif result[tx__rx][status_key] == KEY.STATUS_UNKNOWN:
            span_color = "color_black"
            healthiness = "not tested"
            failed_test_count += 1
        else:
            logger.debug(
                "link {0} has unrecognized status {1}".format(
                    tx__rx, result[tx__rx][status_key]
                )
            )
        result[tx__rx]["healthiness"] = healthiness
        foliage_tag = ""
        interf_tag = ""
        if (KEY.LB_FOLIAGE in result[tx__rx]) and (
            result[tx__rx][KEY.LB_FOLIAGE] is KEY.STATUS_FOLIAGE_LIKELY
        ):
            foliage_tag = "foliage_likely"
        if (KEY.LB_FOLIAGE in result[tx__rx]) and (
            result[tx__rx][KEY.LB_FOLIAGE] is KEY.STATUS_FOLIAGE
        ):
            foliage_tag = "foliage"
        if (KEY.LB_INTERF in result[tx__rx]) and (
            result[tx__rx][KEY.LB_INTERF] is KEY.STATUS_INTERF
        ):
            if (foliage_tag == "foliage") or (foliage_tag == "foliage_likely"):
                interf_tag = "& interf."
            else:
                interf_tag = "interference"
        mcs_p90 = mcs_avg = tx_power = snr_avg = rssi_avg = pathloss_avg = "nan"
        if "txPowerAvg" in result[tx__rx]:
            tx_power = "{0:2.1f}".format(float(result[tx__rx]["txPowerAvg"]))
            snr_avg = "{0:2.1f}".format(float(result[tx__rx]["snrAvg"]))
            rssi_avg = "{0:2.1f}".format(float(result[tx__rx]["rssiAvg"]))
        if "pathlossAvg" in result[tx__rx]:
            pathloss_avg = "{0:2.1f}".format(float(result[tx__rx]["pathlossAvg"]))
        mcs_avg = "{0:.2f}".format(float(result[tx__rx][KEY.MCS_AVG]))
        mcs_p90 = "{0:.2f}".format(float(result[tx__rx][KEY.MCS_P90]))
        per_avg = "{0:.3f}".format(float(result[tx__rx][KEY.IPERF_PER_AVG]))
        if int(result[tx__rx][KEY.MCS_P90]) > 0:
            table_content += (
                "<tr class='{0} clear'>\n".format(span_color)
                + "<td>{0}<br>{1}</td>\n".format(tx, rx)
                + "<td><i>{0}</i><br><b>{1} {2}</b></td>\n".format(
                    healthiness, foliage_tag, interf_tag
                )
                + "<td>{0:.2f}</td>\n".format(distance)
                + "<td>{0}%</td>\n".format(per_avg)
                + "<td>{0}</td>\n".format(mcs_p90)
                + "<td class='minimal'>{0}</td>\n".format(mcs_avg)
                + "<td>{0}</td>\n".format(tx_power)
                + "<td>{0}</td>\n".format(snr_avg)
                + "<td>{0}</td>\n".format(rssi_avg)
                + "<td>{0}</td>\n".format(pathloss_avg)
                + link_log_td
            )
            table_content += "</tr>\n"
    table_content += "</tbody>\n</table>"
    return (
        table_content,
        excellent_link_count,
        healthy_link_count,
        warning_link_count,
        bad_link_count,
        failed_test_count,
    )


def create_iperf_table(result, topology, udp, logger, args):
    if udp:
        iperf_key = KEY.LB_UDP_STATUS
    else:
        iperf_key = KEY.LB_TCP_STATUS
    excellent_link_count = 0
    healthy_link_count = 0
    warning_link_count = 0
    bad_link_count = 0
    failed_test_count = 0
    keys = sort_each_status(result, iperf_key, KEY.MCS_P90, field_reverse=False)
    stats_entry = ""
    if not "mikebuda" == args["network_name"].lower():
        stats_entry = "<th class='minimal'>Stats</th>\n"
    table_content = "<table cellspacing='0' cellpadding='0'>\n"
    if not args["for_ieee"]:
        table_content += (
            "<thead><tr>\n"
            + "<th>From<br>To</th>\n"
            + "<th>Health<br>Tag</th>\n"
            + "<th>Distance<br>Pathloss</th>\n"
            + "<th>PER</th>\n"
            + "<th>MCS<br>P90</th>\n"
            + "<th class='minimal'>MCS Avg<br>MCS Std</th>\n"
            + "<th>txPower</th>\n"
            + "<th>SNR<br><RSSI></th>\n"
            + "<th>Avg<br>(Mbps)</th>\n"
            + "<th class='minimal'>Std<br>(Mbps)</th>\n"
            + "<th>txUtilRatio</th>\n"
            + stats_entry
        )
    else:
        table_content += (
            "<thead><tr>\n"
            + "<th>link_id</th>\n"
            + "<th>source</th>\n"
            + "<th>destination</th>\n"
            + "<th>Distance</th>\n"
            + "<th>txPower</th>\n"
            + "<th>SNR</th>\n"
            + "<th>RSSI</th>\n"
        )
    table_content += "</tr></thead>\n"
    table_content += "<tbody>\n"
    idx = 0
    for tx__rx in keys:
        idx += 1
        tx, rx = tx__rx.split("__")
        healthiness = "unknown"
        tx_mac = topology.get_mac(tx)
        rx_mac = topology.get_mac(rx)
        logger.debug(
            "idx={}, link={}, healthiness={}".format(
                idx, tx__rx, result[tx__rx][iperf_key]
            )
        )
        link_log_td = ""
        if not "mikebuda" == args["network_name"].lower():
            if tx_mac is None or rx_mac is None:
                # set link to empty if mac is None
                link_log_td = "<td class='minimal'>nan</td>\n"
            else:
                # link dashboard URL creation for all links
                link_log = result[tx__rx][KEY.DASHBOARD]
                link_log_td = "<td class='minimal'>"
                link_log_td += "<a href={0}>dashboard</a></td>\n".format(link_log)
        if result[tx__rx][iperf_key] == KEY.STATUS_BAD_OCCASION:
            span_color = "color_purple"
            healthiness = "warning"
            bad_link_count += 1
        elif result[tx__rx][iperf_key] == KEY.STATUS_WARNING:
            span_color = "color_yellow"
            healthiness = "marginal"
            warning_link_count += 1
        elif result[tx__rx][iperf_key] == KEY.STATUS_HEALTHY:
            span_color = "color_blue"
            healthiness = "healthy"
            healthy_link_count += 1
        elif result[tx__rx][iperf_key] == KEY.STATUS_EXCELLENT:
            span_color = "color_green"
            healthiness = "excellent"
            excellent_link_count += 1
        elif result[tx__rx][iperf_key] == KEY.STATUS_UNKNOWN:
            span_color = "color_black"
            healthiness = "not tested"
            failed_test_count += 1
        else:
            logger.debug(
                "link {0} has unrecognized status {1}".format(
                    tx__rx, result[tx__rx][iperf_key]
                )
            )
        result[tx__rx]["healthiness"] = healthiness
        foliage_tag = ""
        interf_tag = ""
        if (KEY.LB_FOLIAGE in result[tx__rx]) and (
            result[tx__rx][KEY.LB_FOLIAGE] is KEY.STATUS_FOLIAGE_LIKELY
        ):
            foliage_tag = "foliage_likely"
        if (KEY.LB_FOLIAGE in result[tx__rx]) and (
            result[tx__rx][KEY.LB_FOLIAGE] is KEY.STATUS_FOLIAGE
        ):
            foliage_tag = "foliage"
        if (KEY.LB_INTERF in result[tx__rx]) and (
            result[tx__rx][KEY.LB_INTERF] is KEY.STATUS_INTERF
        ):
            if (foliage_tag == "foliage") or (foliage_tag == "foliage_likely"):
                interf_tag = "& interf."
            else:
                interf_tag = "interference"
        # get iperf avg etc.
        iperf_avg = iperf_std = "nan"
        mcs_p90 = mcs_avg = iperf_per = mcs_std = tx_power = snr_avg = "nan"
        pathloss_avg = rssi_avg = tx_util_ratio = "nan"
        if KEY.IPERF_AVG in result[tx__rx]:
            distance = "{0}".format(result[tx__rx][KEY.DISTANCE])
            iperf_avg = "{0}".format(result[tx__rx][KEY.IPERF_AVG])
            iperf_std = "{0}".format(result[tx__rx][KEY.IPERF_STD])
            iperf_per = "{0}".format(float(result[tx__rx][KEY.IPERF_PER_AVG]))
            if "txPowerAvg" in result[tx__rx]:
                tx_power = "{0:2.1f}".format(float(result[tx__rx]["txPowerAvg"]))
                rssi_avg = "{0:2.1f}".format(float(result[tx__rx]["rssiAvg"]))
            if "pathlossAvg" in result[tx__rx]:
                pathloss_avg = "{0:2.1f}".format(float(result[tx__rx]["pathlossAvg"]))
            if "snrAvg" in result[tx__rx]:
                snr_avg = "{0:2.1f}".format(float(result[tx__rx]["snrAvg"]))
            if "txEffAvgA" in result[tx__rx]:
                tx_util_ratio = "{0:.1f}".format(float(result[tx__rx]["txEffAvgA"]))
            mcs_avg = "{0:.2f}".format(float(result[tx__rx][KEY.MCS_AVG]))
            mcs_p90 = "{0:.0f}".format(float(result[tx__rx][KEY.MCS_P90]))
            mcs_std = "{0:.1f}".format(float(result[tx__rx][KEY.MCS_STD]))
        if not args["for_ieee"]:
            if int(result[tx__rx][KEY.MCS_P90]) > 0:
                logger.info(
                    "link {0}, tx_util_ratio = {1}".format(tx__rx, tx_util_ratio)
                )
                table_content += (
                    "<tr class='{0} clear'>\n".format(span_color)
                    + "<td>{0}<br>{1}</td>\n".format(tx, rx)
                    + "<td><i>{0}</i><br><b>{1}{2}</b></td>\n".format(
                        healthiness, foliage_tag, interf_tag
                    )
                    + "<td>{0} m<br>{1} dB</td>\n".format(distance, pathloss_avg)
                    + "<td>{0}%</td>\n".format(iperf_per)
                    + "<td>{0}</td>\n".format(mcs_p90)
                    + "<td class='minimal'>{0}<br>{1}</td>\n".format(mcs_avg, mcs_std)
                    + "<td>{0}</td>\n".format(tx_power)
                    + "<td>{0} dB<br>{1} dB</td>\n".format(snr_avg, rssi_avg)
                    + "<td>{0}</td>\n".format(iperf_avg)
                    + "<td class='minimal'>{0}</td>\n".format(iperf_std)
                    + "<td>{0}%</td>".format(tx_util_ratio)
                    + link_log_td
                )
        else:
            # only display healthy and excellent links for IEEE contributions
            if (healthiness == "healthy") or (healthiness == "excellent"):
                table_content += (
                    "<tr class='{0} clear'>\n".format(span_color)
                    + "<td>{0}__{1}</td>\n".format(tx, rx)
                    + "<td>{0}</td>\n".format(tx)
                    + "<td>{0}</td>\n".format(rx)
                    + "<td>{0}</td>\n".format(distance)
                    + "<td>{0}</td>\n".format(tx_power)
                    + "<td>{0}</td>\n".format(snr_avg)
                    + "<td>{0}</td>\n".format(rssi_avg)
                )
        table_content += "</tr>\n"
    table_content += "</tbody>\n</table>"
    return (
        table_content,
        excellent_link_count,
        healthy_link_count,
        warning_link_count,
        bad_link_count,
        failed_test_count,
    )


def convert_mcs_histogram_to_html(mcs_histogram, topology, num_links, logger):
    # mcs histogram related
    mcs_table = create_mcs_histogram_table(mcs_histogram, num_links)
    main_content = (
        "<div> MCS histogram for {0} uni-directional terra links: ".format(num_links)
        + "</div>"
        + "<div>"
        + mcs_table
        + "</div>"
    )
    return main_content


def convert_monitoring_result_to_html(result, mcs_histogram, topology, logger, args):
    total_link_count = len(result)
    logger.debug("network mcs histogram = {}".format(mcs_histogram))
    mcs_table = create_mcs_histogram_table(mcs_histogram, total_link_count)
    (
        monitoring_table,
        excellent_link_count,
        okay_link_count,
        warning_link_count,
        bad_link_count,
        failed_test_count,
    ) = create_monitoring_table(result, topology, logger, args)

    total_effect_link_count = int(total_link_count - failed_test_count)
    health_perc = 0
    excellent_perc = 0
    warning_perc = 0
    bad_perc = 0
    if total_link_count > 0 and total_effect_link_count > 0:
        health_perc = 1.0 * okay_link_count / total_effect_link_count * 100
        warning_perc = 1.0 * warning_link_count / total_effect_link_count * 100
        bad_perc = 1.0 * bad_link_count / total_effect_link_count * 100
        excellent_perc = float(
            1.0 * excellent_link_count / total_effect_link_count * 100
        )
    main_content = (
        "<div>Among {0} uni-directional terra links".format(total_link_count)
        + ", {0} links failed, ".format(failed_test_count)
        + "MCS histogram for {} active links".format(total_effect_link_count)
        + "</div>\n"
        + "<div>"
        + mcs_table
        + "</div>\n"
        + "<div>Among {0} terra links, <b>{1} are excellent</b> ".format(
            total_link_count, excellent_link_count
        )
        + "(<b>{0:.2f}%</b>), ".format(excellent_perc)
        + "<b>{0} are healthy</b> (<b>{1:.2f}%</b>), ".format(
            okay_link_count, health_perc
        )
        + "<b>{0} are marginal</b> (<b>{1:.2f}%</b>), ".format(
            warning_link_count, warning_perc
        )
        + "<b>{0} are warning</b> (<b>{1:.2f}%</b>), ".format(bad_link_count, bad_perc)
        + "{0} tests failed".format(failed_test_count)
        + "</div>\n"
        + "<div>"
        + monitoring_table
        + "</div>"
    )
    return main_content


def convert_iperf_result_to_html_old(
    result, link_status, link_health_summary, mcs_histogram, topology, udp, logger, args
):
    total_link_count = len(result)
    # mcs histogram related
    logger.debug("network mcs histogram = {}".format(mcs_histogram))
    mcs_table = create_mcs_histogram_table(mcs_histogram, total_link_count)
    (
        iperf_table,
        excellent_link_count,
        okay_link_count,
        warning_link_count,
        bad_link_count,
        failed_test_count,
    ) = create_iperf_table(result, topology, udp, logger, args)

    # divide the analysis into 4 different link distance categories:
    if link_status["200+"]["total"] > 0:
        mcs_table_200 = create_mcs_histogram_table(
            link_status["200+"]["mcs_hist"], link_status["200+"]["total"]
        )
    else:
        mcs_table_200 = ""
    if link_status["100_200"]["total"] > 0:
        mcs_table_100_200 = create_mcs_histogram_table(
            link_status["100_200"]["mcs_hist"], link_status["100_200"]["total"]
        )
    else:
        mcs_table_100_200 = ""
    if link_status["50_100"]["total"] > 0:
        mcs_table_50_100 = create_mcs_histogram_table(
            link_status["50_100"]["mcs_hist"], link_status["50_100"]["total"]
        )
    else:
        mcs_table_50_100 = ""
    if link_status["0_50"]["total"] > 0:
        mcs_table_0_50 = create_mcs_histogram_table(
            link_status["0_50"]["mcs_hist"], link_status["0_50"]["total"]
        )
    else:
        mcs_table_0_50 = ""

    health_perc = 0
    excellent_perc = 0
    warning_perc = 0
    bad_perc = 0
    total_effect_link_count = int(total_link_count - failed_test_count)
    if total_link_count > 0 and total_effect_link_count > 0:
        health_perc = 1.0 * okay_link_count / total_effect_link_count * 100
        warning_perc = 1.0 * warning_link_count / total_effect_link_count * 100
        bad_perc = 1.0 * bad_link_count / total_effect_link_count * 100
        excellent_perc = float(
            1.0 * excellent_link_count / total_effect_link_count * 100
        )

    # Counters for Scuba presentation
    link_health = {}
    link_health["excellent"] = excellent_link_count
    link_health["healthy"] = okay_link_count
    link_health["marginal"] = warning_link_count
    link_health["warning"] = bad_link_count
    link_health["excellent percentage"] = excellent_perc
    link_health["healthy percentage"] = health_perc
    link_health["marginal percentage"] = warning_perc
    link_health["warning percentage"] = bad_perc

    link_health["excellent 200+"] = link_status["200+"]["excellent"]["total"]
    link_health["excellent 200+ percentage"] = float(
        1.0
        * link_status["200+"]["excellent"]["total"]
        / max([link_status["200+"]["total"], 1])
        * 100
    )
    link_health["healthy 200+"] = link_status["200+"]["healthy"]["total"]
    link_health["healthy 200+ percentage"] = float(
        1.0
        * link_status["200+"]["healthy"]["total"]
        / max([link_status["200+"]["total"], 1])
        * 100
    )

    link_health["marginal 200+"] = link_status["200+"]["marginal"]["total"]
    link_health["marginal 200+ percentage"] = float(
        1.0
        * link_status["200+"]["marginal"]["total"]
        / max([link_status["200+"]["total"], 1])
        * 100
    )

    link_health["warning 200+"] = link_status["200+"]["warning"]["total"]
    link_health["warning 200+ percentage"] = float(
        1.0
        * link_status["200+"]["warning"]["total"]
        / max([link_status["200+"]["total"], 1])
        * 100
    )

    link_health["excellent 100-200"] = link_status["100_200"]["excellent"]["total"]
    link_health["excellent 100-200 percentage"] = float(
        1.0
        * link_status["100_200"]["excellent"]["total"]
        / max([link_status["100_200"]["total"], 1])
        * 100
    )
    link_health["healthy 100-200"] = link_status["100_200"]["healthy"]["total"]
    link_health["healthy 100-200 percentage"] = float(
        1.0
        * link_status["100_200"]["healthy"]["total"]
        / max([link_status["100_200"]["total"], 1])
        * 100
    )

    link_health["marginal 100-200"] = link_status["100_200"]["marginal"]["total"]
    link_health["marginal 100-200 percentage"] = float(
        1.0
        * link_status["100_200"]["marginal"]["total"]
        / max([link_status["100_200"]["total"], 1])
        * 100
    )

    link_health["warning 100-200"] = link_status["100_200"]["warning"]["total"]
    link_health["warning 100-200 percentage"] = float(
        1.0
        * link_status["100_200"]["warning"]["total"]
        / max([link_status["100_200"]["total"], 1])
        * 100
    )

    link_health["excellent 50-100"] = link_status["50_100"]["excellent"]["total"]
    link_health["excellent 50-100 percentage"] = float(
        1.0
        * link_status["50_100"]["excellent"]["total"]
        / max([link_status["50_100"]["total"], 1])
        * 100
    )
    link_health["healthy 50-100"] = link_status["50_100"]["healthy"]["total"]
    link_health["healthy 50-100 percentage"] = float(
        1.0
        * link_status["50_100"]["healthy"]["total"]
        / max([link_status["50_100"]["total"], 1])
        * 100
    )

    link_health["marginal 50-100"] = link_status["50_100"]["marginal"]["total"]
    link_health["marginal 50-100 percentage"] = float(
        1.0
        * link_status["50_100"]["marginal"]["total"]
        / max([link_status["50_100"]["total"], 1])
        * 100
    )

    link_health["warning 50-100"] = link_status["50_100"]["warning"]["total"]
    link_health["warning 50-100 percentage"] = float(
        1.0
        * link_status["50_100"]["warning"]["total"]
        / max([link_status["50_100"]["total"], 1])
        * 100
    )

    link_health["excellent 0-50"] = link_status["0_50"]["excellent"]["total"]
    link_health["excellent 0-50 percentage"] = float(
        1.0
        * link_status["0_50"]["excellent"]["total"]
        / max([link_status["0_50"]["total"], 1])
        * 100
    )
    link_health["healthy 0-50"] = link_status["0_50"]["healthy"]["total"]
    link_health["healthy 0-50 percentage"] = float(
        1.0
        * link_status["0_50"]["healthy"]["total"]
        / max([link_status["0_50"]["total"], 1])
        * 100
    )

    link_health["marginal 0-50"] = link_status["0_50"]["marginal"]["total"]
    link_health["marginal 0-50 percentage"] = float(
        1.0
        * link_status["0_50"]["marginal"]["total"]
        / max([link_status["0_50"]["total"], 1])
        * 100
    )

    link_health["warning 0-50"] = link_status["0_50"]["warning"]["total"]
    link_health["warning 0-50 percentage"] = float(
        1.0
        * link_status["0_50"]["warning"]["total"]
        / max([link_status["0_50"]["total"], 1])
        * 100
    )
    link_health_summary["network_summary"] = link_health

    link_status_content = (
        "<br>{0} healthy links, ".format(okay_link_count)
        + "compared to excellent, "
        + "{0} have PER issues, ".format(link_status["overview"]["healthy"]["per"])
        + "{0} have MCS issues, ".format(link_status["overview"]["healthy"]["mcs"])
        + "{0} have throughput issues".format(link_status["overview"]["healthy"]["tp"])
        + "<br>{0} marginal links, ".format(warning_link_count)
        + "compared to healthy, "
        + "{0} have PER issues, ".format(link_status["overview"]["marginal"]["per"])
        + "{0} have MCS issues, ".format(link_status["overview"]["marginal"]["mcs"])
        + "{0} have throughput issues".format(link_status["overview"]["marginal"]["tp"])
        + "<br>{0} warning links, ".format(bad_link_count)
        + "compared to marginal, "
        + "{0} have PER issues, ".format(link_status["overview"]["warning"]["per"])
        + "{0} have MCS issues, ".format(link_status["overview"]["warning"]["mcs"])
        + "{0} have throughput issues".format(link_status["overview"]["warning"]["tp"])
    )
    logger.debug("network link status overview = {}".format(link_status_content))
    logger.debug("mcs_table_200={}".format(mcs_table_200))
    link_200_link_content = (
        "<br>Among {0} links (> 200m), ".format(link_status["200+"]["total"])
        + "{0} are excellent ({1:.2f}%), ".format(
            link_status["200+"]["excellent"]["total"],
            float(
                1.0
                * link_status["200+"]["excellent"]["total"]
                / max([link_status["200+"]["total"], 1])
                * 100
            ),
        )
        + "{0} are healthy ({1:.2f}%), ".format(
            link_status["200+"]["healthy"]["total"],
            float(
                1.0
                * link_status["200+"]["healthy"]["total"]
                / max([link_status["200+"]["total"], 1])
                * 100
            ),
        )
        + "{0} are marginal ({1:.2f}%), ".format(
            link_status["200+"]["marginal"]["total"],
            float(
                1.0
                * link_status["200+"]["marginal"]["total"]
                / max([link_status["200+"]["total"], 1])
                * 100
            ),
        )
        + "{0} are warning ({1:.2f}%)".format(
            link_status["200+"]["warning"]["total"],
            float(
                1.0
                * link_status["200+"]["warning"]["total"]
                / max([link_status["200+"]["total"], 1])
                * 100
            ),
        )
        + mcs_table_200
    )
    link_100_200_link_content = (
        "<br>Among {0} links (100m <= d < 200m), ".format(
            link_status["100_200"]["total"]
        )
        + "{0} are excellent ({1:.2f}%), ".format(
            link_status["100_200"]["excellent"]["total"],
            float(
                1.0
                * link_status["100_200"]["excellent"]["total"]
                / max([link_status["100_200"]["total"], 1])
                * 100
            ),
        )
        + "{0} are healthy ({1:.2f}%), ".format(
            link_status["100_200"]["healthy"]["total"],
            float(
                1.0
                * link_status["100_200"]["healthy"]["total"]
                / max([link_status["100_200"]["total"], 1])
                * 100
            ),
        )
        + "{0} are marginal ({1:.2f}%), ".format(
            link_status["100_200"]["marginal"]["total"],
            float(
                1.0
                * link_status["100_200"]["marginal"]["total"]
                / max([link_status["100_200"]["total"], 1])
                * 100
            ),
        )
        + "{0} are warning ({1:.2f}%)".format(
            link_status["100_200"]["warning"]["total"],
            float(
                1.0
                * link_status["100_200"]["warning"]["total"]
                / max([link_status["100_200"]["total"], 1])
                * 100
            ),
        )
        + mcs_table_100_200
    )
    link_50_100_link_content = (
        "<br>Among {0} links (50m <= d < 100m), ".format(link_status["50_100"]["total"])
        + "{0} are excellent ({1:.2f}%), ".format(
            link_status["50_100"]["excellent"]["total"],
            float(
                1.0
                * link_status["50_100"]["excellent"]["total"]
                / max([link_status["50_100"]["total"], 1])
                * 100
            ),
        )
        + "{0} are healthy ({1:.2f}%), ".format(
            link_status["50_100"]["healthy"]["total"],
            float(
                1.0
                * link_status["50_100"]["healthy"]["total"]
                / max([link_status["50_100"]["total"], 1])
                * 100
            ),
        )
        + "{0} are marginal ({1:.2f}%), ".format(
            link_status["50_100"]["marginal"]["total"],
            float(
                1.0
                * link_status["50_100"]["marginal"]["total"]
                / max([link_status["50_100"]["total"], 1])
                * 100
            ),
        )
        + "{0} are warning ({1:.2f}%)".format(
            link_status["50_100"]["warning"]["total"],
            float(
                1.0
                * link_status["50_100"]["warning"]["total"]
                / max([link_status["50_100"]["total"], 1])
                * 100
            ),
        )
        + mcs_table_50_100
    )
    link_0_50_link_content = (
        "<br>Among {0} links (d < 50m), ".format(link_status["0_50"]["total"])
        + "{0} are excellent ({1:.2f}%), ".format(
            link_status["0_50"]["excellent"]["total"],
            float(
                1.0
                * link_status["0_50"]["excellent"]["total"]
                / max([link_status["0_50"]["total"], 1])
                * 100
            ),
        )
        + "{0} are healthy ({1:.2f}%), ".format(
            link_status["0_50"]["healthy"]["total"],
            float(
                1.0
                * link_status["0_50"]["healthy"]["total"]
                / max([link_status["0_50"]["total"], 1])
                * 100
            ),
        )
        + "{0} are marginal ({1:.2f}%), ".format(
            link_status["0_50"]["marginal"]["total"],
            float(
                1.0
                * link_status["0_50"]["marginal"]["total"]
                / max([link_status["0_50"]["total"], 1])
                * 100
            ),
        )
        + "{0} are warning ({1:.2f}%)".format(
            link_status["0_50"]["warning"]["total"],
            float(
                1.0
                * link_status["0_50"]["warning"]["total"]
                / max([link_status["0_50"]["total"], 1])
                * 100
            ),
        )
        + mcs_table_0_50
    )
    link_distance_content = "<div></div>"
    if not "mikebuda" == args["network_name"].lower():
        link_distance_content = (
            link_200_link_content
            + link_100_200_link_content
            + link_50_100_link_content
            + link_0_50_link_content
        )
    main_content = (
        "<div>Among {0} uni-directional terra links, {1} tests failed, ".format(
            total_link_count, failed_test_count
        )
        + "MCS P90 histogram for {0} active terra links: ".format(
            (total_link_count - failed_test_count)
        )
        + "</div>\n"
        + "<div>"
        + mcs_table
        + "</div>"
        + "<div>Among {0} terra links, <b>{1} are excellent</b> ".format(
            total_link_count, excellent_link_count
        )
        + "(<b>{0:.2f}%</b>), ".format(excellent_perc)
        + "<b>{0} are healthy</b> (<b>{1:.2f}%</b>), ".format(
            okay_link_count, health_perc
        )
        + "<b>{0} are marginal</b> (<b>{1:.2f}%</b>), ".format(
            warning_link_count, warning_perc
        )
        + "<b>{0} are warning</b> (<b>{1:.2f}%</b>), ".format(bad_link_count, bad_perc)
        + "{0} tests failed".format(failed_test_count)
        + link_distance_content
        + "</div>\n"
        + "<div>"
        + iperf_table
        + "</div>"
    )
    return main_content


def convert_foliage_result_to_html(result, logger, monitor=True):
    total_link_count = len(result)
    failed_count = 0
    foliage_likely_count = 0
    non_foliage_count = 0
    table_content = "<table cellspacing='0' cellpadding='0'>\n"
    table_content += (
        "<thead><tr>\n"
        + "<th>NodeA<br>NodeZ</th>\n"
        + "<th>mcs<br>(Z->A)</th>\n"
        + "<th>mcs<br>(A->Z)</th>\n"
        + "<th>rssi(&sigma;)<br>(A)</th>\n"
        + "<th>rssi(&sigma;)<br>(Z)</th>\n"
        + "<th>snr(&sigma;)<br>(A)</th>\n"
        + "<th>snr(&sigma;)<br>(Z)</th>\n"
        + "<th>power(&sigma;)<br>(A)</th>\n"
        + "<th>power(&sigma;)<br>(Z)</th>\n"
        + "<th>foliage</th>\n"
    )
    table_content += "</tr></thead>\n"
    table_content += "<tbody>\n"
    # sort result based on foliage and non-foliage status
    keys = sorted(result.keys(), key=lambda x: result[x][KEY.LB_FOLIAGE], reverse=True)
    for node_a_z in keys:
        node_a, node_z = node_a_z.split("__")
        if result[node_a_z][KEY.LB_FOLIAGE] is KEY.STATUS_FOLIAGE_LIKELY:
            span_color = "color_yellow"
            status = "foliage_likely"
            foliage_likely_count += 1
        elif result[node_a_z][KEY.LB_FOLIAGE] is KEY.STATUS_FOLIAGE:
            span_color = "color_purple"
            status = "foliage"
            foliage_likely_count += 1
        elif result[node_a_z][KEY.LB_FOLIAGE] is KEY.STATUS_NON_FOLIAGE:
            span_color = "color_green"
            status = "non_foliage"
            non_foliage_count += 1
        elif result[node_a_z][KEY.LB_FOLIAGE] is KEY.STATUS_UNKNOWN:
            span_color = "color_black"
            status = "unknown"
            failed_count += 1
        else:
            logger.debug(
                "link {0} has unrecognized status {1}".format(
                    node_a_z, result[node_a_z][KEY.LB_FOLIAGE]
                )
            )
        nodeArssiStd = "{0:5.2f}".format(float(result[node_a_z]["rssiStdA"]))
        nodeZrssiStd = "{0:5.2f}".format(float(result[node_a_z]["rssiStdZ"]))
        nodeAsnrStd = "{0:5.2f}".format(float(result[node_a_z]["snrStdA"]))
        nodeZsnrStd = "{0:5.2f}".format(float(result[node_a_z]["snrStdZ"]))
        nodeAtxPowerStd = "{0:5.2f}".format(float(result[node_a_z]["txPowerStdA"]))
        nodeZtxPowerStd = "{0:5.2f}".format(float(result[node_a_z]["txPowerStdZ"]))
        mcsAvgA = "{0:2.1f}".format(float(result[node_a_z]["mcsAvgA"]))
        mcsAvgZ = "{0:2.1f}".format(float(result[node_a_z]["mcsAvgZ"]))
        # Turn off non-foliage reporting during monitoring mode
        if (result[node_a_z][KEY.LB_FOLIAGE] is KEY.STATUS_FOLIAGE_LIKELY) or (
            result[node_a_z][KEY.LB_FOLIAGE] is KEY.STATUS_FOLIAGE
        ):
            table_content += (
                "<tr class='{0} clear'>\n".format(span_color)
                + "<td>{0}<br>{1}</td>\n".format(node_a, node_z)
                + "<td>{0}</td>\n".format(mcsAvgA)
                + "<td>{0}</td>\n".format(mcsAvgZ)
                + "<td>{0}</td>\n".format(nodeArssiStd)
                + "<td>{0}</td>\n".format(nodeZrssiStd)
                + "<td>{0}</td>\n".format(nodeAsnrStd)
                + "<td>{0}</td>\n".format(nodeZsnrStd)
                + "<td>{0}</td>\n".format(nodeAtxPowerStd)
                + "<td>{0}</td>\n".format(nodeZtxPowerStd)
                + "<td>{0}</td>\n".format(status)
            )
            table_content += "</tr>\n"
    table_content += "</tbody>\n</table>"
    non_foliage_perc = 0
    foliage_likely_perc = 0
    if foliage_likely_count > 0:
        foliage_likely_perc = 1.0 * foliage_likely_count / total_link_count * 100
    if non_foliage_count > 0:
        non_foliage_perc = 1.0 * non_foliage_count / total_link_count * 100

    main_content = (
        "<div>Among {0} <b>bi-directional</b> terra links, ".format(total_link_count)
        + "{0} are potential foliage ({1:.2f}%), ".format(
            foliage_likely_count, foliage_likely_perc
        )
        + "{0} are non-foliage ({1:.2f}%), ".format(non_foliage_count, non_foliage_perc)
        + "{0} links failed</div>\n".format(failed_count)
        + "<div>"
        + table_content
        + "</div>"
    )
    return main_content


def convert_interf_detection_result_to_html(result, logger, monitor=True):
    total_link_count = len(result)
    failed_count = 0
    interf_count = 0
    no_interf_count = 0
    table_content = "<table cellspacing='0' cellpadding='0'>\n"
    table_content += (
        "<thead><tr>\n"
        + "<th>NodeA<br>NodeZ</th>\n"
        + "<th>snr(&sigma;)<br>(A)</th>\n"
        + "<th>snr(&sigma;)<br>(Z)</th>\n"
        + "<th class='minimal'>snr<br>(A)</th>\n"
        + "<th class='minimal'>snr<br>(Z)</th>\n"
        + "<th class='minimal'>power(&sigma;)<br>(A)</th>\n"
        + "<th class='minimal'>power(&sigma;)<br>(Z)</th>\n"
        + "<th>power<br>(A)</th>\n"
        + "<th>power<br>(Z)</th>\n"
        + "<th>interf.</th>\n"
    )
    table_content += "</tr></thead>\n"
    table_content += "<tbody>\n"
    keys = sort_each_status(result, KEY.LB_INTERF, KEY.LB_POWER)
    for node_a_z in keys:
        node_a, node_z = node_a_z.split("__")
        if result[node_a_z][KEY.LB_INTERF] is KEY.STATUS_INTERF_A:
            span_color = "color_purple"
            status = "interf.@A"
            interf_count += 1
        elif result[node_a_z][KEY.LB_INTERF] is KEY.STATUS_INTERF_Z:
            span_color = "color_yellow"
            status = "interf.@Z"
            interf_count += 1
        elif result[node_a_z][KEY.LB_INTERF] is KEY.STATUS_NO_INTERF:
            span_color = "color_green"
            status = "no interf."
            no_interf_count += 1
        elif result[node_a_z][KEY.LB_INTERF] is KEY.STATUS_UNKNOWN:
            span_color = "color_black"
            status = "unknown"
            failed_count += 1
        else:
            logger.debug(
                "link {0} has unrecognized status {1}".format(
                    node_a_z, result[node_a_z][KEY.LB_INTERF]
                )
            )
        snrStdA = "{0:5.2f}".format(float(result[node_a_z]["snrStdA"]))
        snrStdZ = "{0:5.2f}".format(float(result[node_a_z]["snrStdZ"]))
        snrAvgA = "{0:5.2f}".format(float(result[node_a_z]["snrAvgA"]))
        snrAvgZ = "{0:5.2f}".format(float(result[node_a_z]["snrAvgZ"]))
        txPowerAvgA = "{0:5.2f}".format(float(result[node_a_z]["txPowerAvgA"]))
        txPowerAvgZ = "{0:5.2f}".format(float(result[node_a_z]["txPowerAvgZ"]))
        txPowerStdA = "{0:5.2f}".format(float(result[node_a_z]["txPowerStdA"]))
        txPowerStdZ = "{0:5.2f}".format(float(result[node_a_z]["txPowerStdZ"]))
        if (result[node_a_z][KEY.LB_INTERF] is KEY.STATUS_INTERF_A) or (
            result[node_a_z][KEY.LB_INTERF] is KEY.STATUS_INTERF_Z
        ):
            table_content += (
                "<tr class='{0} clear'>\n".format(span_color)
                + "<td>{0}<br>{1}</td>\n".format(node_a, node_z)
                + "<td>{0}</td>\n".format(snrStdA)
                + "<td>{0}</td>\n".format(snrStdZ)
                + "<td class='minimal'>{0}</td>\n".format(snrAvgA)
                + "<td class='minimal'>{0}</td>\n".format(snrAvgZ)
                + "<td class='minimal'>{0}</td>\n".format(txPowerStdA)
                + "<td class='minimal'>{0}</td>\n".format(txPowerStdZ)
                + "<td>{0}</td>\n".format(txPowerAvgA)
                + "<td>{0}</td>\n".format(txPowerAvgZ)
                + "<td>{0}</td>\n".format(status)
            )
            table_content += "</tr>\n"
    table_content += "</tbody>\n</table>"
    no_interf_perc = 0
    interf_perc = 0
    if no_interf_count > 0:
        no_interf_perc = 1.0 * no_interf_count / total_link_count * 100
    if interf_count > 0:
        interf_perc = 1.0 * interf_count / total_link_count * 100

    main_content = (
        "<div>Among {0} <b>bi-directional</b> terra links, ".format(total_link_count)
        + "{0} have interference ({1:.2f}%), ".format(interf_count, interf_perc)
        + "{0} are free from interference ({1:.2f}%), ".format(
            no_interf_count, no_interf_perc
        )
        + "{0} links failed</div>\n".format(failed_count)
        + "<div>"
        + table_content
        + "</div>"
    )
    return main_content


def convert_pathloss_result_to_html(result, logger, monitor=True):
    total_link_count = len(result)
    failed_count = 0
    mcs_mismatch_count = 0
    mcs_match_count = 0
    table_content = "<table cellspacing='0' cellpadding='0'>\n"
    table_content += (
        "<thead><tr>\n"
        + "<th>NodeA<br>NodeZ</th>\n"
        + "<th>mcs P90<br>(Z->A)</th>\n"
        + "<th>mcs P90<br>(A->Z)</th>\n"
        + "<th>&nbsp pathloss &nbsp;<br>(Z->A)</th>\n"
        + "<th>&nbsp pathloss &nbsp;<br>(A->Z)</th>\n"
        + "<th class='minimal'>rssi &nbsp;<br>(A)</th>\n"
        + "<th class='minimal'>rssi &nbsp;<br>(Z)</th>\n"
        + "<th class='minimal'>snr &nbsp;<br>(A)</th>\n"
        + "<th class='minimal'>snr &nbsp;<br>(Z)</th>\n"
        + "<th class='minimal'>&nbsp power &nbsp;<br>(A)</th>\n"
        + "<th class='minimal'>&nbsp power &nbsp;<br>(Z)</th>\n"
        + "<th>mcs</th>\n"
    )
    table_content += "</tr></thead>\n"
    table_content += "<tbody>\n"
    # sort result based on mcs mismatch status
    keys = sorted(result.keys(), key=lambda x: result[x][KEY.LB_MCS], reverse=True)
    for node_a_z in keys:
        node_a, node_z = node_a_z.split("__")
        if result[node_a_z][KEY.LB_MCS] is KEY.STATUS_MCS_MISMATCH:
            span_color = "color_yellow"
            status = "mcs mismatch"
            mcs_mismatch_count += 1
        elif result[node_a_z][KEY.LB_MCS] is KEY.STATUS_MCS_MATCH:
            span_color = "color_green"
            status = "mcs okay"
            mcs_match_count += 1
        elif result[node_a_z][KEY.LB_MCS] is KEY.STATUS_MCS_LOW:
            span_color = "color_purple"
            status = "mcs low"
            mcs_match_count += 1
        elif result[node_a_z][KEY.LB_MCS] is KEY.STATUS_UNKNOWN:
            span_color = "color_black"
            status = "unknown"
            failed_count += 1
        else:
            logger.debug(
                "link {0} has unrecognized status {1}".format(
                    node_a_z, result[node_a_z][KEY.LB_FOLIAGE]
                )
            )
        # mcsAvgA = '{0:2.2f}'.format(float(result[node_a_z]['mcsAvgA']))
        # mcsAvgZ = '{0:2.2f}'.format(float(result[node_a_z]['mcsAvgZ']))
        mcsP90A = "{0:2.2f}".format(float(result[node_a_z]["mcsP90A"]))
        mcsP90Z = "{0:2.2f}".format(float(result[node_a_z]["mcsP90Z"]))
        nodeArssiAvg = "{0:5.2f}".format(float(result[node_a_z]["rssiAvgA"]))
        nodeZrssiAvg = "{0:5.2f}".format(float(result[node_a_z]["rssiAvgZ"]))
        nodeAsnrAvg = "{0:5.2f}".format(float(result[node_a_z]["snrAvgA"]))
        nodeZsnrAvg = "{0:5.2f}".format(float(result[node_a_z]["snrAvgZ"]))
        nodeAtxPowerAvg = "{0:5.2f}".format(float(result[node_a_z]["txPowerAvgA"]))
        nodeZtxPowerAvg = "{0:5.2f}".format(float(result[node_a_z]["txPowerAvgZ"]))
        pathLossAvgZtoA = "{0:5.2f}".format(float(result[node_a_z]["Z->A Avg"]))
        pathLossAvgAtoZ = "{0:5.2f}".format(float(result[node_a_z]["A->Z Avg"]))
        if (status == "mcs mismatch") or (status == "mcs low"):
            table_content += (
                "<tr class='{0} clear'>\n".format(span_color)
                + "<td>{0}<br>{1}</td>\n".format(node_a, node_z)
                + "<td>{0}</td>\n".format(mcsP90A)
                + "<td>{0}</td>\n".format(mcsP90Z)
                + "<td>{0}</td>\n".format(pathLossAvgZtoA)
                + "<td>{0}</td>\n".format(pathLossAvgAtoZ)
                + "<td class='minimal'>{0}</td>\n".format(nodeArssiAvg)
                + "<td class='minimal'>{0}</td>\n".format(nodeZrssiAvg)
                + "<td class='minimal'>{0}</td>\n".format(nodeAsnrAvg)
                + "<td class='minimal'>{0}</td>\n".format(nodeZsnrAvg)
                + "<td class='minimal'>{0}</td>\n".format(nodeAtxPowerAvg)
                + "<td class='minimal'>{0}</td>\n".format(nodeZtxPowerAvg)
                + "<td>{0}</td>\n".format(status)
            )
            table_content += "</tr>\n"
    table_content += "</tbody>\n</table>"
    mcs_match_perc = 0
    mcs_mismatch_perc = 0
    if mcs_mismatch_count > 0:
        mcs_mismatch_perc = 1.0 * mcs_mismatch_count / total_link_count * 100
    if mcs_match_count > 0:
        mcs_match_perc = 1.0 * mcs_match_count / total_link_count * 100

    main_content = (
        "<div>Among {0} <b>bi-directional</b> terra links, ".format(total_link_count)
        + "{0} have mcs mismatch ({1:.2f}%), ".format(
            mcs_mismatch_count, mcs_mismatch_perc
        )
        + "{0} are clean from mcs mismatch ({1:.2f}%), ".format(
            mcs_match_count, mcs_match_perc
        )
        + "{0} links failed</div>\n".format(failed_count)
        + "<div>"
        + table_content
        + "</div>"
    )
    return main_content


def convert_link_directional_result_to_html(result, logger, monitor=True):
    total_link_count = len(result)
    failed_count = 0
    lossless_link_count = 0
    table_content = "<table cellspacing='0' cellpadding='0'>\n"
    table_content += (
        "<thead><tr>\n"
        + "<th>From (A)<br>To (Z)</th>\n"
        + "<th>PER<br>(%)</th>\n"
        + "<th class='minimal'>rxPlcpFail<br>(Z)</th>\n"
        + "<th>txOk<br>(A)</th>\n"
        + "<th>rxOk<br>(Z)</th>\n"
        + "<th class='minimal'>txFail<br>(A)</th>\n"
        + "<th class='minimal'>rxFail<br>(Z)</th>\n"
        + "<th class='minimal'>txTotal<br>(A)</th>\n"
        + "<th class='minimal'>rxTotal<br>(Z)</th>\n"
        + "<th>txPPDU<br>(A)</th>\n"
        + "<th>rxPPDU<br>(Z)</th>\n"
        + "<th>txBA<br>(Z)</th>\n"
        + "<th>rxBA<br>(A)</th>\n"
        + "<th>txUtilRatio<br>(A)</th>\n"
        + "<th>status</th>\n"
    )
    table_content += "</tr></thead>\n"
    table_content += "<tbody>\n"
    # sort result based on link status and PER in each status
    logger.debug("In convert_link_directional_result_to_html")
    for tx__rx in result:
        logger.debug(
            "link {}, link_condition={}".format(tx__rx, result[tx__rx][KEY.LB_LINK])
        )
    keys = sort_each_status(result, KEY.LB_LINK, KEY.IPERF_PER_AVG)
    logger.debug(
        "In link_directional_result_to_html, keys.len = {}, result.size = {}".format(
            len(keys), len(result)
        )
    )
    for node_a_z in keys:
        logger.debug(
            "In convert_link_directional_result_to_html, parse stats for {}, ".format(
                node_a_z
            )
        )
        node_a, node_z = node_a_z.split("__")
        if result[node_a_z][KEY.LB_LINK] is KEY.STATUS_DATA_BA_LOSS:
            span_color = "color_red"
            status = "data/BA loss"
        elif result[node_a_z][KEY.LB_LINK] is KEY.STATUS_DATA_LOSS:
            span_color = "color_purple"
            status = "data loss"
        elif result[node_a_z][KEY.LB_LINK] is KEY.STATUS_BA_LOSS:
            span_color = "color_yellow"
            status = "BA loss"
        elif result[node_a_z][KEY.LB_LINK] is KEY.STATUS_NO_LOSS:
            span_color = "color_green"
            status = "no loss"
            lossless_link_count += 1
        elif result[node_a_z][KEY.LB_LINK] is KEY.STATUS_UNKNOWN:
            span_color = "color_black"
            status = "Unknown"
            failed_count += 1
        else:
            logger.debug(
                "link {0} has unrecognized status {1}".format(
                    node_a_z, result[node_a_z][KEY.LB_LINK]
                )
            )
        iperf_per = "{0:.3f}".format(float(result[node_a_z][KEY.IPERF_PER_AVG]))
        rxPlcpFail = "{0:.0f}".format(float(result[node_a_z]["rxPlcpFailAvgZ"]))
        txOk = "{0:.0f}".format(float(result[node_a_z]["txOkAvgA"]))
        rxOk = "{0:.0f}".format(float(result[node_a_z]["rxOkAvgZ"]))
        txFail = "{0:.0f}".format(float(result[node_a_z]["txFailAvgA"]))
        rxFail = "{0:.0f}".format(float(result[node_a_z]["rxFailAvgZ"]))
        txTotal = "{0:.0f}".format(float(result[node_a_z]["txTotalAvgA"]))
        rxTotal = "{0:.0f}".format(float(result[node_a_z]["rxTotalAvgZ"]))
        txPpdu = "{0:.0f}".format(float(result[node_a_z]["txPpduAvgA"]))
        rxPpdu = "{0:.0f}".format(float(result[node_a_z]["rxPpduAvgZ"]))
        txBa = "{0:.0f}".format(float(result[node_a_z]["txBaAvgZ"]))
        rxBa = "{0:.0f}".format(float(result[node_a_z]["rxBaAvgA"]))
        txUtilRatio = "nan"
        if "txEffAvgA" in result[node_a_z]:
            txUtilRatio = "{0:.1f}".format(float(result[node_a_z]["txEffAvgA"]))
        if (
            (status == "data/BA loss")
            or (status == "data loss")
            or (status == "BA loss")
            or (monitor is False)
        ):
            logger.info("link {0}, txEff = {1}".format(node_a_z, txUtilRatio))
            table_content += (
                "<tr class='{0} clear'>\n".format(span_color)
                + "<td>{0}<br>{1}</td>\n".format(node_a, node_z)
                + "<td>{0}</td>\n".format(iperf_per)
                + "<td class='minimal'>{0}</td>\n".format(rxPlcpFail)
                + "<td>{0}</td>\n".format(txOk)
                + "<td>{0}</td>\n".format(rxOk)
                + "<td class='minimal'>{0}</td>\n".format(txFail)
                + "<td class='minimal'>{0}</td>\n".format(rxFail)
                + "<td class='minimal'>{0}</td>\n".format(txTotal)
                + "<td class='minimal'>{0}</td>\n".format(rxTotal)
                + "<td>{0}</td>\n".format(txPpdu)
                + "<td>{0}</td>\n".format(rxPpdu)
                + "<td>{0}</td>\n".format(txBa)
                + "<td>{0}</td>\n".format(rxBa)
                + "<td>{0}%</td>\n".format(txUtilRatio)
                + "<td>{0}</td>\n".format(status)
            )
            table_content += "</tr>\n"
    table_content += "</tbody>\n</table>"
    loseless_perc = 0
    if lossless_link_count > 0:
        loseless_perc = 1.0 * lossless_link_count / total_link_count * 100
    main_content = (
        "<div>Among {0} terra links, {1} have no loss ({2:.2f}%), ".format(
            total_link_count, lossless_link_count, loseless_perc
        )
        + "{0} links failed</div>\n".format(failed_count)
        + "<div>"
        + table_content
        + "</div>"
    )
    return main_content


def convert_multihop_result_to_html_old(result, logger, args):
    total_sector_count = len(result)
    table_content = "<table cellspacing='0' cellpadding='0'>\n"
    table_content += (
        "<thead><tr>\n"
        + "<th>From</th>\n"
        + "<th>To</th>\n"
        + "<th>Hop Count</th>\n"
        + "<th>Throughput (Mbps)</th>\n"
        + "<th>CPE Throughput (Mbps)</th>\n"
        + "</tr></thead>\n"
    )
    table_content += "<tbody>\n"
    keys = sort_based_hopcount(result)

    for tx__rx in keys:
        tx, rx = tx__rx.split("__")
        hopcount = result[tx__rx]["wireless_hop_count"]
        iperf_result = result[tx__rx]["iperf_result"]
        try:
            iperf_result_cpe = result[tx__rx]["iperf_cpe_result"]
        except Exception:
            iperf_result_cpe = 0
        span_color = "color_green"
        if args["tests"]["iperf_multihop"]["downlink"]:
            table_content += (
                "<tr class='{0} clear'>\n".format(span_color)
                + "<td>{0}</td>\n".format(rx)
                + "<td>{0}</td>\n".format(tx)
                + "<td>{0}</td>\n".format(hopcount)
                + "<td>{0}</td>\n".format(iperf_result)
                + "<td>{0}</td>\n".format(iperf_result_cpe)
                + "</tr>\n"
            )
        else:
            table_content += (
                "<tr class='{0} clear'>\n".format(span_color)
                + "<td>{0}</td>\n".format(tx)
                + "<td>{0}</td>\n".format(rx)
                + "<td>{0}</td>\n".format(hopcount)
                + "<td>{0}</td>\n".format(iperf_result)
                + "<td>{0}</td>\n".format(iperf_result_cpe)
                + "</tr>\n"
            )

    table_content += "</tbody>\n</table>"
    main_content = (
        "<div>Among {0} TG sectors".format(total_sector_count)
        + "</div>"
        + "<div>"
        + table_content
        + "</div>"
    )
    return main_content


def result_summary_html(
    test_name,
    main_content,
    link_content,
    foliage_content,
    pathloss_content,
    interf_content,
    monitor=False,
):
    table_content = """"""
    if monitor is False:
        table_content += """
            <div class="show_self">
                <a href="#tab-iperf">""" + "{} ".format(
            test_name
        )
        table_content += """
                iPerf Analysis</a>
            </div>"""
        table_content += main_content
    else:
        table_content += """
            <div class="show_self">
                <a href="#tab-mcs">""" + "{} ".format(
            test_name
        )
        table_content += """
                MCS Histogram</a>
            </div>"""
        table_content += main_content
    table_content += """
            <div class="show_self">
                <a href="#tab-pl">""" + "{} ".format(
        test_name
    )
    table_content += """
                Pathloss Analysis</a>
            </div>"""
    table_content += pathloss_content
    table_content += """
            <div class="show_self">
                <a href="#tab-foliage">""" + "{} ".format(
        test_name
    )
    table_content += """
                Foliage Analysis</a>
            </div>"""
    table_content += (
        foliage_content
        + """
            <div class="show_self">
                <a href="#tab-interf">"""
        + "{} ".format(test_name)
    )
    table_content += """
                Interference Detection</a>
            </div>"""
    table_content += (
        interf_content
        + """
            <div class="show_self">
                <a href="#tab-link">"""
        + "{} ".format(test_name)
    )
    table_content += """
                Link Directional Analysis</a>"""
    table_content += link_content
    return table_content


def convert_to_hover_format(test_name, email_content):
    content = (
        """
        <div class="show_self">
            <a href="#x">"""
        + "{}".format(test_name)
        + "</a>"
    )
    content += """<div id="tab-iperf" class="show_content">"""
    content += email_content + """</div></div>"""
    return content
