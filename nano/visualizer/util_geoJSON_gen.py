#!/usr/bin/env python3

import json
import logging

# built-ins
import os

# modules
import modules.keywords as KEY
from modules.addon_misc import convertNone2NaN, loadJson
from modules.util_logger import EmptyLogger
from modules.util_math import compute_angle, index2deg, mean
from modules.util_mongo_db import MongoDB


class MapGen(object):
    """
    generate geoJSON format data to support visualization
    """

    def __init__(
        self,
        myData,
        outpath,
        extraInfoFlag=False,
        loggerTag="MapGen",
        args=None,
        logPathDir=None,
        printout=False,
    ):
        if logPathDir is None:
            self.logger = EmptyLogger(loggerTag, printout=True)
        else:
            logpath_r = "{0}/log/".format(logPathDir)
            if not os.path.isdir(logpath_r):
                try:
                    os.makedirs(logpath_r)
                except BaseException:
                    logpath_r = logPathDir
            self.logger = EmptyLogger(
                loggerTag,
                logPath="{0}/log/tg_{1}.log".format(logPathDir, loggerTag),
                printout=printout,
                printlevel=logging.INFO,
            )
        # set output file path for generated GeoJSON
        self.outpath = outpath
        self.args = args
        if args is None:
            self.args = {}
        self.extra_info_flag = extraInfoFlag
        # setup topology and data
        self.__tp = myData.topology
        self.__ping = myData.get_ping_analysis()
        self.__multiphop = myData.get_multihop_data()
        self.__tcp = myData.get_iperf_analysis(udp=False)
        self.__udp = myData.get_iperf_analysis(udp=True)
        self.__foliage = myData.get_foliage_analysis()
        self.__interfer = myData.get_interference_analysis()
        self.__routes = myData.get_routes_analysis()
        # setup map
        self.map_center = "[0, 0]"
        self.local_fp = "../../network_analyzer/www"
        self.fp_visualizer_template = (
            "../../network_analyzer/visualizer/visualizer_template.html"
        )
        self.fp_visualizer_js = "../../network_analyzer/visualizer/visualizer.js"
        self.more_vars_str = ""
        self.more_map_overlay_str = ""

    def gen_js(self):
        # initialize MongoDB
        mongodb = MongoDB()
        # get sites
        self.gen_sites()  # get self.site_json_fp, self.map_center
        js = '<script src="{0}"></script>\n'.format(os.path.basename(self.site_json_fp))
        # get nodes
        self.gen_nodes()  # get self.node_json_fp
        js += '<script src="{0}"></script>\n'.format(
            os.path.basename(self.node_json_fp)
        )
        # get links
        for suffix in ["", "all", "tcp", "udp"]:
            if (suffix == "tcp" and not self.__tcp) or (
                suffix == "udp" and not self.__udp
            ):
                continue
            self.gen_links(suffix=suffix, mongo_db=mongodb)
            js += '<script src="{0}"></script>\n'.format(
                os.path.basename(self.link_json_fp)
            )
        # load Multihop
        if self.__multiphop:
            self.gen_nodes_multihop(mongo_db=mongodb)
        # load template
        js += "<script>"
        with open(self.fp_visualizer_js, "r") as f:
            js += "".join(f.readlines())
        js += "</script>\n"
        # generate addtional vars and overlay if necessary
        for suffix in ["all", "tcp", "udp"]:
            if (suffix == "tcp" and not self.__tcp) or (
                suffix == "udp" and not self.__udp
            ):
                continue
            self.more_vars_str += """
        var links{0} = L.geoJSON(linkJsonData{0}, {{
            onEachFeature: onEachFeature,
            style: function(feature) {{
                return feature.properties && feature.properties.style;
            }}
        }});
            """.format(
                suffix
            )
            self.more_map_overlay_str += "{0}: links{1},".format(
                suffix.capitalize(), suffix
            )
        # replace hooks in template
        js = (
            js.replace("CONFIG_MAP_CENTER", self.map_center)
            .replace("HOOK_ADDITIONAL_VARS", self.more_vars_str)
            .replace("CONFIG_EXTRA_MAP_OVERLAY", self.more_map_overlay_str)
        )
        # disable mongo object
        mongodb.logger.disable()
        mongodb = None
        return js

    def gen_html(self):
        if not os.path.isfile(self.fp_visualizer_template):
            self.logger.error("cannot find {0}".format(self.fp_visualizer_template))
            return None
        if not os.path.isfile(self.fp_visualizer_js):
            self.logger.error("cannot find {0}".format(self.fp_visualizer_js))
            return None
        # load template
        with open(self.fp_visualizer_template, "r") as f:
            html = "".join(f.readlines())
        html = html.replace("HOOK_ADDITIONAL_JS", self.gen_js())
        self.html_fp = "{0}/index.html".format(self.outpath)
        with open(self.html_fp, "w") as f:
            f.write(html)
        return self.html_fp

    def gen_sites(self):
        """
        generate sites layer in the format of GeoJSON
        """
        my_sites = self.__tp.get_sites()
        latitudes = []
        longitudes = []
        features = []
        for i in range(len(my_sites)):
            site = my_sites[i]
            tmp = self.__tp.get_location(site)
            if tmp is None:
                self.logger.debug("{0} has no location info".format(site))
                continue
            features.append(
                {
                    "type": "Feature",
                    "properties": {
                        "popupContent": "This is site {0}".format(site),
                        "style": {
                            "radius": 5,
                            "fillColor": "#fff",
                            "color": "#000",
                            "weight": 1.5,
                            "opacity": 0.5,
                            "fillOpacity": 0.5,
                        },
                        "highlight_style": {
                            "radius": 6,
                            "fillColor": "#FF8A65",
                            "color": "#283593",
                            "weight": 2,
                        },
                    },
                    "info": {
                        "content": "<ul><li>GPS accuracy: {0:.3f}m</li></ul>".format(
                            tmp.get("accuracy", float("nan"))
                        )
                    },
                    "id": site,
                    "geometry": {
                        "type": "Point",
                        "coordinates": [tmp["longitude"], tmp["latitude"]],
                    },
                }
            )
            latitudes.append(tmp["latitude"])
            longitudes.append(tmp["longitude"])
        siteJsonData = {"type": "FeatureCollection", "features": features}
        content = "var siteJsonData = {0};\n".format(json.dumps(siteJsonData))
        self.site_json_fp = "{0}/siteJsonData.js".format(self.outpath)
        with open(self.site_json_fp, "w") as f:
            f.write(content)
        if os.path.isdir(self.local_fp):
            site_json_fp = "{0}/siteJsonData.js".format(self.local_fp)
            with open(site_json_fp, "w") as f_link:
                f_link.write(content)
                self.logger.info(
                    "siteJsonData.json written to {}".format(self.local_fp)
                )
        # derive center of our map
        self.map_center = "[{0}, {1}]".format(mean(latitudes), mean(longitudes))

    def _get_link_content(self, link, key_A_to_Z, key_Z_to_A, suffix):
        if suffix == "all":
            alive_msg = "<li>Alive: {0}</li>".format(self.__tp.is_alive(link))
            foliage_msg = ""
            if self.__foliage:
                status = None
                if key_A_to_Z in self.__foliage:
                    status = self.__foliage[key_A_to_Z].get(KEY.LB_FOLIAGE, None)
                elif key_Z_to_A in self.__foliage:
                    status = self.__foliage[key_Z_to_A].get(KEY.LB_FOLIAGE, None)
                if status is KEY.STATUS_FOLIAGE:
                    foliage_msg = "<li>This is a foliage link</li>"
                elif status is KEY.STATUS_NON_FOLIAGE:
                    foliage_msg = "<li>This is not a foliage link</li>"
            return "<ul>{0}</ul>".format("\n".join([alive_msg, foliage_msg]))
        content = '<ul class="link_content">'
        data = None
        if self.__ping and not suffix:
            data = self.__ping
            unit = "ms"
        elif (self.__tcp and suffix == "tcp") or (self.__udp and suffix == "udp"):
            data = self.__tcp
            if suffix == "udp":
                data = self.__udp
            key_distance = "distance"
            key_mcs_p90 = KEY.MCS_P90
            key_iperf_avg = KEY.IPERF_AVG
            key_iperf_loss = KEY.IPERF_PER_AVG
            key_iperf_std = KEY.IPERF_STD
            key_interference = KEY.LB_INTERF
            key_foliage = KEY.LB_FOLIAGE
            key_pathloss = "pathlossAvg"
            key_pathloss_std = "pathlossStd"
            key_tx_power = "txPowerAvg"
            key_rssi = "rssiAvg"
            key_snr = "snrAvg"
            key_link_health = "healthiness"
            unit = "Mbps"
            key_rssiStd = "rssiStd"
            key_snrStd = "snrStd"
            key_txPowerStd = "txPowerStd"
            key_dashboard = "dashboard"
        if data is not None:
            content += "<li></li><li>{0}</li><li>{1}</li>\n".format(
                key_A_to_Z.replace("__", " -> "), key_Z_to_A.replace("__", " -> ")
            )
            alignment = ""
            if self.extra_info_flag is True:
                alignment = self._get_alignment(link)
            content += alignment
            health_A_Z = data[key_A_to_Z].get(key_link_health, "nan")
            health_Z_A = data[key_Z_to_A].get(key_link_health, "nan")
            color_A_Z = self._gen_link_font_color(health_A_Z)
            color_Z_A = self._gen_link_font_color(health_Z_A)
            health_indicator_A_Z = '<font color="{0}">{1}</font>'.format(
                color_A_Z, health_A_Z
            )
            health_indicator_Z_A = '<font color="{0}">{1}</font>'.format(
                color_Z_A, health_Z_A
            )
            content += "<li>healthiness</li><li>{0}</li><li>{1}</li>\n".format(
                health_indicator_A_Z, health_indicator_Z_A
            )
            content += "<li>distance</li><li>{0:.1f}</li><li>{1:.1f}</li>\n".format(
                float(data[key_A_to_Z].get(key_distance, float("nan"))),
                float(data[key_Z_to_A].get(key_distance, float("nan"))),
            )
            content += "<li>MCS</li><li>{0:.1f}</li><li>{1:.1f}</li>\n".format(
                float(data[key_A_to_Z].get(key_mcs_p90, float("nan"))),
                float(data[key_Z_to_A].get(key_mcs_p90, float("nan"))),
            )
            content += "<li>PER</li><li>{0:.1f}%</li><li>{1:.1f}%</li>\n".format(
                float(data[key_A_to_Z].get(key_iperf_loss, float("nan"))),
                float(data[key_Z_to_A].get(key_iperf_loss, float("nan"))),
            )
            rate_avg = "<li>rate_avg</li>"
            rate_avg += "<li>{0:.1f} {2}</li><li>{1:.1f} {2}</li>\n".format(
                float(data[key_A_to_Z].get(key_iperf_avg, float("nan"))),
                float(data[key_Z_to_A].get(key_iperf_avg, float("nan"))),
                unit,
            )
            content += rate_avg
            rate_std = "<li>rate_std</li>"
            rate_std += "<li>{0:.1f} {2}</li><li>{1:.1f} {2}</li>\n".format(
                float(data[key_A_to_Z].get(key_iperf_std, float("nan"))),
                float(data[key_Z_to_A].get(key_iperf_std, float("nan"))),
                unit,
            )
            content += rate_std
            rssi = "<li>rssi</li>"
            rssi += "<li>{0:.1f}</li><li>{1:.1f}</li>\n".format(
                float(data[key_A_to_Z].get(key_rssi, float("nan"))),
                float(data[key_Z_to_A].get(key_rssi, float("nan"))),
            )
            content += rssi
            txpower = "<li>txPower</li>"
            txpower += "<li>{0:.1f}</li><li>{1:.1f}</li>\n".format(
                float(data[key_A_to_Z].get(key_tx_power, float("nan"))),
                float(data[key_Z_to_A].get(key_tx_power, float("nan"))),
            )
            content += txpower
            snr = "<li>SNR(dB)</li>"
            snr += "<li>{0:.1f}</li><li>{1:.1f}</li>\n".format(
                float(data[key_A_to_Z].get(key_snr, float("nan"))),
                float(data[key_Z_to_A].get(key_snr, float("nan"))),
            )
            content += snr
            pathloss = "<li>Pathloss(dB)</li>"
            pathloss += "<li>{0:.1f}</li><li>{1:.1f}</li>\n".format(
                float(data[key_A_to_Z].get(key_pathloss, float("nan"))),
                float(data[key_Z_to_A].get(key_pathloss, float("nan"))),
            )
            content += pathloss
            rssi_var = "<li>rssi(&sigma;)</li>"
            rssi_var += "<li>{0:.2f}</li><li>{1:.2f}</li>\n".format(
                float(data[key_A_to_Z].get(key_rssiStd, float("nan"))),
                float(data[key_Z_to_A].get(key_rssiStd, float("nan"))),
            )
            content += rssi_var
            txpower_var = "<li>txPower(&sigma;)</li>"
            txpower_var += "<li>{0:.2f}</li><li>{1:.2f}</li>\n".format(
                float(data[key_A_to_Z].get(key_txPowerStd, float("nan"))),
                float(data[key_Z_to_A].get(key_txPowerStd, float("nan"))),
            )
            content += txpower_var
            snr_var = "<li>SNR(&sigma;)</li>"
            snr_var += "<li>{0:.2f}</li><li>{1:.2f}</li>\n".format(
                float(data[key_A_to_Z].get(key_snrStd, float("nan"))),
                float(data[key_Z_to_A].get(key_snrStd, float("nan"))),
            )
            content += snr_var
            pathloss_var = "<li>Path-loss (&sigma;)</li>"
            pathloss_var += "<li>{0:.2f}</li><li>{1:.2f}</li>\n".format(
                float(data[key_A_to_Z].get(key_pathloss_std, float("nan"))),
                float(data[key_Z_to_A].get(key_pathloss_std, float("nan"))),
            )
            content += pathloss_var
            dashboard = ""
            self.logger.info(
                "fb_internal_data={}".format(self.args["fb_internal_data"])
            )
            if self.args.get("fb_internal_data", False):
                dashboard = "<li>Link_stats</li>"
                dashboard_A_Z = data[key_A_to_Z].get(key_dashboard, "nan")
                dashboard_Z_A = data[key_Z_to_A].get(key_dashboard, "nan")
                dashboard += '<li><a href={0} target="_blank">'.format(dashboard_A_Z)
                dashboard += "dashboard</a></li>"
                dashboard += '<li><a href={0} target="_blank">'.format(dashboard_Z_A)
                dashboard += "dashboard</a></li>"
            content += dashboard
            interference_A_Z = int(
                data[key_A_to_Z].get(key_interference, KEY.STATUS_UNKNOWN)
            )
            interference_Z_A = int(
                data[key_Z_to_A].get(key_interference, KEY.STATUS_UNKNOWN)
            )
            foliage_A_Z = int(data[key_A_to_Z].get(key_foliage, KEY.STATUS_UNKNOWN))
            foliage_Z_A = int(data[key_Z_to_A].get(key_foliage, KEY.STATUS_UNKNOWN))
            indicator_A_Z = ""
            indicator_Z_A = ""
            tag = "<li>Anomaly</li>"
            if interference_A_Z == KEY.STATUS_INTERF:
                indicator_A_Z += '<font color="{0}">{1}</font>'.format(
                    "#F44336", "interference "
                )
            if interference_Z_A == KEY.STATUS_INTERF:
                indicator_Z_A += '<font color="{0}">{1}</font>'.format(
                    "#F44336", "interference "
                )
            if foliage_A_Z == KEY.STATUS_FOLIAGE:
                indicator_A_Z += '<font color="{0}">{1}</font>'.format(
                    "#4CAF50", "foliage"
                )
            if foliage_Z_A == KEY.STATUS_FOLIAGE:
                indicator_Z_A += '<font color="{0}">{1}</font>'.format(
                    "#4CAF50", "foliage"
                )
            if foliage_A_Z == KEY.STATUS_FOLIAGE_LIKELY:
                indicator_A_Z += '<font color="{0}">{1}</font>'.format(
                    "#9957CD", "foliage_likely"
                )
            if foliage_Z_A == KEY.STATUS_FOLIAGE_LIKELY:
                indicator_Z_A += '<font color="{0}">{1}</font>'.format(
                    "#9957CD", "foliage_likely"
                )
            tag += "<li><strong>{0}</strong></li>".format(indicator_A_Z)
            tag += "<li><strong>{0}</strong></li>\n".format(indicator_Z_A)
            content += tag
        content += '<div class="clear"></div></ul>'
        return content

    def _get_link_style(self, key_A_to_Z, key_Z_to_A, suffix):
        def _get_link_color(data, status_key):
            if key_A_to_Z not in data or not data[key_A_to_Z]:
                data[key_A_to_Z] = {}
            if key_Z_to_A not in data or not data[key_Z_to_A]:
                data[key_Z_to_A] = {}
            a2z = data[key_A_to_Z].get(status_key, -1)
            z2a = data[key_Z_to_A].get(status_key, -1)
            if a2z is KEY.STATUS_UNKNOWN and z2a is KEY.STATUS_UNKNOWN:
                color = "#212121"  # black
            elif a2z is KEY.STATUS_BAD_OCCASION or z2a is KEY.STATUS_BAD_OCCASION:
                color = "#F44336"  # warning - red
            elif a2z is KEY.STATUS_WARNING or z2a is KEY.STATUS_WARNING:
                color = "#FFC107"  # marginal - yellow
            elif a2z is KEY.STATUS_HEALTHY or z2a is KEY.STATUS_HEALTHY:
                color = "#67C8FF"  # blue
            elif a2z is KEY.STATUS_EXCELLENT and z2a is KEY.STATUS_EXCELLENT:
                color = "#4CAF50"  # green
            else:
                color = "#C0C0C0"  # silver
            return color

        style = {"weight": 3, "opacity": 1, "color": "#90A4AE"}
        if self.__ping and not suffix:
            my_status_key = KEY.LB_PING_STATUS
            style["color"] = _get_link_color(self.__ping, my_status_key)
        elif self.__tcp and suffix == "tcp":
            my_status_key = KEY.LB_TCP_STATUS
            style["color"] = _get_link_color(self.__tcp, my_status_key)
        elif self.__udp and suffix == "udp":
            my_status_key = KEY.LB_UDP_STATUS
            style["color"] = _get_link_color(self.__udp, my_status_key)
        return style

    def gen_links(self, suffix="", mongo_db=None):
        """
        generate links layer in the format of GeoJSON
        """
        my_links = self.__tp.get_links(isWireless=True)
        features = []
        for i in range(len(my_links)):
            link = my_links[i]
            A_node = self.__tp.get_a_node(link)
            Z_node = self.__tp.get_z_node(link)
            A_node_loc = self.__tp.get_location(A_node)
            Z_node_loc = self.__tp.get_location(Z_node)
            if A_node_loc is None or Z_node_loc is None:
                self.logger.debug("Link {0} has no location info".format(link))
                self.logger.debug("{0} loc {1}".format(A_node, A_node_loc))
                self.logger.debug("{0} loc {1}".format(Z_node, Z_node_loc))
                continue
            if not self.__tp.is_alive(link) and not (suffix == "all"):
                self.logger.debug("Link {0} is not alive".format(link))
                continue
            key_A_to_Z = "{0}__{1}".format(A_node, Z_node)
            key_Z_to_A = "{1}__{0}".format(A_node, Z_node)
            features.append(
                {
                    "type": "Feature",
                    "properties": {
                        "popupContent": "Link {0} -- {1} ({2})".format(
                            A_node, Z_node, suffix
                        ),
                        "style": self._get_link_style(key_A_to_Z, key_Z_to_A, suffix),
                        "highlight_style": {"weight": 6},
                    },
                    "info": {
                        "content": self._get_link_content(
                            link, key_A_to_Z, key_Z_to_A, suffix
                        )
                    },
                    "id": link,
                    "geometry": {
                        "type": "LineString",
                        "coordinates": [
                            [A_node_loc["longitude"], A_node_loc["latitude"]],
                            [Z_node_loc["longitude"], Z_node_loc["latitude"]],
                        ],
                    },
                }
            )
        linkJsonData = {"type": "FeatureCollection", "features": features}
        if not os.path.isdir(self.local_fp):
            local_fp = self.outpath
        else:
            local_fp = self.local_fp
        if suffix == "udp" or suffix == "tcp":
            content = "{0}\n".format(json.dumps(linkJsonData))
            self.link_json_fp = "{0}/linkJsonData{1}.json".format(self.outpath, suffix)
            if suffix == "udp":
                mcs_json_fp = "{0}/mcsHistogram{1}.json".format(local_fp, "udp")
            elif suffix == "tcp":
                mcs_json_fp = "{0}/mcsHistogram{1}.json".format(local_fp, "tcp")
            link_health_json_fp = "{0}/linkHealthSummary{1}.json".format(
                local_fp, suffix
            )
            try:
                mcsHistogram = loadJson(mcs_json_fp)
                linkHealthSummary = loadJson(link_health_json_fp)
                databaseData = {
                    "mcs_histogram": mcsHistogram,
                    "link_health_summary": linkHealthSummary,
                    "link_health_geojson": linkJsonData,
                }
                if mongo_db is not None:
                    mongo_db.write(databaseData, "Link healthiness")
                    self.logger.info("Link health data is written to mongo DB")
            except BaseException as ex:
                print(ex)
        else:
            content = "var linkJsonData{0} = {1};\n".format(
                suffix, json.dumps(linkJsonData)
            )
            self.link_json_fp = "{0}/linkJsonData{1}.js".format(self.outpath, suffix)

        with open(self.link_json_fp, "w") as f:
            f.write(content)

        # copy json files which include test results to /network_analyzer/www
        self.logger.info("suffix={0}, writing data to {1}".format(suffix, local_fp))
        if (suffix == "udp") or (suffix == ""):
            content = "{0}\n".format(json.dumps(linkJsonData))
            link_json_fp = "{0}/linkJsonData{1}.json".format(local_fp, suffix)
            self.logger.info("link_json_fp={}".format(link_json_fp))
            with open(link_json_fp, "w") as f_link:
                f_link.write(content)
                self.logger.info(
                    "linkJsonData{0}.json written to {1}".format(suffix, local_fp)
                )
            contentJS = "var linkJsonData{0} = {1};\n".format(
                suffix, json.dumps(linkJsonData)
            )
            link_js_fp = "{0}/linkJsonData{1}.js".format(local_fp, suffix)
            self.logger.info("link_js_fp={}".format(link_js_fp))
            with open(link_js_fp, "w") as f:
                f.write(contentJS)
                self.logger.info(
                    "linkJsonData{0}.js written to {1}".format(suffix, local_fp)
                )

    def _get_node_content(self, node):
        content = "<ul>\n"
        # beam idx and power
        linked_nodes = self.__tp.get_linked_sector(node)
        if linked_nodes is None:
            content += "<li>It is not connected to any other nodes</li>\n"
        else:
            for node_l in linked_nodes:
                if self.extra_info_flag is True:
                    txIdx, rxIdx = self.__tp.get_current_beam(node, towards_node=node_l)
                    txPowerIdx = self.__tp.get_current_power(node, towards_node=node_l)
                    content += "<li>BeamIdx towards {0}: ".format(
                        node_l
                    ) + "tx {0} rx {1}</li>\n".format(
                        convertNone2NaN(txIdx), convertNone2NaN(rxIdx)
                    )
                    content += "<li>TxPower towards {0}: {1}</li>\n".format(
                        node_l, convertNone2NaN(txPowerIdx)
                    )
        # polarity
        polarity = self.__tp.get_polarity(node)
        content += "<li>Polarity: {0}</li>\n".format(convertNone2NaN(polarity))
        # ip
        inbandip = self.__tp.get_ip(node, inband=True)
        content += "<li>InBand IP: {0}</li>\n".format(convertNone2NaN(inbandip))
        # mac
        mac_addr = self.__tp.get_mac(node)
        content += "<li>MAC Addr: {0}</li>\n".format(convertNone2NaN(mac_addr))
        # interference
        if node in self.__interfer:
            data = self.__interfer[node]
            content += "<li>Got overall INR: {0:.2f}dB\n".format(data[0])
            content += "<ul>\n"
            for tx, inr in data[1]:
                content += "<li>{0:.2f}dB by {1}</li>\n".format(inr, tx)
            content += "</ul></li>\n"
        # micro/macro routes
        if node in self.__routes:
            content += "<li>Can connect to:\n<ul>\n"
            for node_l in self.__routes[node]:
                if node_l in self.__tp.get_linked_sector(node):
                    content += "<li>(desired) {0} via\n<ul>\n".format(node_l)
                else:
                    content += "<li>{0} via\n<ul>\n".format(node_l)
                for txIdx, rxIdx, snr in self.__routes[node][node_l]:
                    content += "<li>txIdx: {0}; rxIdx: {1} w/ SNR {2}</li>\n".format(
                        txIdx, rxIdx, snr
                    )
                content += "</ul></li>\n"
            content += "</ul></li>\n"
        content += "</ul>\n"
        return content

    def gen_nodes(self):
        """
        generate nodes layer in the format of GeoJSON
        """
        my_nodes = self.__tp.get_all_nodes()
        features = []
        features_no_direction = []
        for i in range(len(my_nodes)):
            node = my_nodes[i]
            node_loc = self.__tp.get_location(node)
            if node_loc is None:
                self.logger.debug("{0} has no location info".format(node))
                continue
            if self.__tp.get_status(node) == "OFFLINE":
                self.logger.debug("{0} is offline".format(node))
                continue
            # caculate angle
            directions = []
            linked_nodes = self.__tp.get_linked_sector(node)
            if linked_nodes is None:
                continue
            for node_l in linked_nodes:
                directions.append(0)
                ref_node_loc = self.__tp.get_location(node_l)
                if ref_node_loc is None:
                    self.logger.debug("{0} has no location".format(node_l))
                    continue
                directions[-1] = compute_angle(
                    (node_loc["longitude"], node_loc["latitude"]),
                    (ref_node_loc["longitude"], ref_node_loc["latitude"]),
                )
            # construct content previous fillcolor = FF8A65
            single_feature = {
                "type": "Feature",
                "properties": {
                    "popupContent": "This is node {0}".format(node),
                    "style": {
                        "radius": 19,
                        "fillColor": "#A7D8E8",
                        "color": "#1A237E",
                        "weight": 0.5,
                        "opacity": 1,
                        "fillOpacity": 1,
                    },
                    "highlight_style": {
                        "radius": 20,
                        "fillColor": "#A7D8E8",
                        "color": "#283593",
                        "weight": 2,
                    },
                },
                "info": {"content": self._get_node_content(node)},
                "id": node,
                "geometry": {
                    "type": "Point",
                    "coordinates": [node_loc["longitude"], node_loc["latitude"]],
                },
            }
            if directions:
                direction = -mean(directions) - 90
                if abs(direction) < 0.1:
                    direction = 360
                single_feature["properties"]["direction"] = direction
                single_feature["properties"]["size"] = 20
                features.append(single_feature)
            # get interfering node
            if self.__tp.get_linked_sector(node) is not None:
                single_feature["towards"] = self.__tp.get_linked_sector(node)
        nodeJsonData = {
            "type": "FeatureCollection",
            "features": features_no_direction + features,
        }
        content = "var nodeJsonData = {0};\n".format(json.dumps(nodeJsonData))
        self.node_json_fp = "{0}/nodeJsonData.js".format(self.outpath)
        with open(self.node_json_fp, "w") as f:
            f.write(content)
        if os.path.isdir(self.local_fp):
            node_json_fp = "{0}/nodeJsonData.js".format(self.local_fp)
            with open(node_json_fp, "w") as f_link:
                f_link.write(content)
                self.logger.info("nodeJsonData.js written to {0}".format(self.local_fp))

    def _get_node_content_multihop(self, node_name, multihop):
        content = "<ul><li><strong>"
        node, pop_temp = node_name.split("__")
        print("node={0}, pop_temp={1}".format(node, pop_temp))
        if self.args.get("downlink", False):
            content += "Downlink</strong>: PoP -> {0}</li>\n".format(node)
        else:
            content += "Uplink</strong>: {0} -> PoP</li>\n".format(node)
        content += "<li>Wireless hop count: {0} </li>\n".format(
            multihop["wireless_hop_count"]
        )
        content += "<li>Iperf result: {0} Mbps</li>\n".format(
            int(multihop["iperf_result"])
        )
        content += "</ul>"
        return content

    def _get_multihop_node_style(self, data):
        style = {"radius": 19, "weight": 0.5, "opacity": 1, "fillOpacity": 1}
        rate_target = KEY.THROUGHPUT_KPI
        if self.args.get("rate", ""):
            rate_target = self.args["rate"]
            rate_target = rate_target.replace("M", "")
            rate_target = int(float(rate_target))
        if int(data["iperf_result"]) > (rate_target - (0.1 * rate_target)):
            color = "#4CAF50"  # green
        elif (int(data["iperf_result"]) <= (rate_target - (0.1 * rate_target))) and (
            int(data["iperf_result"]) > (rate_target - (0.25 * rate_target))
        ):
            color = "#67C8Ff"  # blue
        elif (int(data["iperf_result"]) <= (rate_target - (0.25 * rate_target))) and (
            int(data["iperf_result"]) > (rate_target - (0.5 * rate_target))
        ):
            color = "#FFC107"  # yellow
        elif int(data["iperf_result"]) <= (rate_target - (0.5 * rate_target)):
            color = "#F44336"  # red
        style["color"] = color
        return style

    def gen_nodes_multihop(self, mongo_db=None):
        """
        generate nodes multihop layer in the format of GeoJSON
        """
        my_nodes = self.__tp.get_all_nodes()
        features = []
        features_no_direction = []
        for i in range(len(my_nodes)):
            node = my_nodes[i]
            node_loc = self.__tp.get_location(node)
            if node_loc is None:
                self.logger.debug("{0} has no location info".format(node))
                continue
            if self.__tp.get_status(node) == "OFFLINE":
                self.logger.debug("{0} is offline".format(node))
                continue
            # caculate angle
            directions = []
            linked_nodes = self.__tp.get_linked_sector(node)
            if linked_nodes is None:
                continue
            for node_l in linked_nodes:
                directions.append(0)
                ref_node_loc = self.__tp.get_location(node_l)
                if ref_node_loc is None:
                    self.logger.debug("{0} has no location".format(node_l))
                    continue
                directions[-1] = compute_angle(
                    (node_loc["longitude"], node_loc["latitude"]),
                    (ref_node_loc["longitude"], ref_node_loc["latitude"]),
                )
            # construct content
            json_test_data = json.loads(json.dumps(self.__multiphop))
            for multihop in json_test_data:
                if node == multihop.replace("__pop", ""):
                    single_feature = {
                        "type": "Feature",
                        "properties": {
                            "popupContent": "This is node {0}".format(node),
                            "style": self._get_multihop_node_style(
                                json_test_data[multihop]
                            ),
                            "highlight_style": {"weight": 2},
                        },
                        "info": {
                            "content": self._get_node_content_multihop(
                                multihop, json_test_data[multihop]
                            )
                        },
                        "id": node,
                        "geometry": {
                            "type": "Point",
                            "coordinates": [
                                node_loc["longitude"],
                                node_loc["latitude"],
                            ],
                        },
                    }
                    if directions:
                        direction = -mean(directions) - 90
                        if abs(direction) < 0.1:
                            direction = 360
                        single_feature["properties"]["direction"] = direction
                        single_feature["properties"]["size"] = 20
                        features.append(single_feature)

                    # get interfering node
                    if self.__tp.get_linked_sector(node) is not None:
                        single_feature["towards"] = self.__tp.get_linked_sector(node)
        nodeJsonDataMultihop = {
            "type": "FeatureCollection",
            "features": features_no_direction + features,
        }
        databaseData = {"multihop_geojson": nodeJsonDataMultihop}
        if mongo_db is not None:
            mongo_db.write(databaseData, "Multihop")

        contentJS = "var nodeJsonDataMultihop = {0};\n".format(
            json.dumps(nodeJsonDataMultihop)
        )
        self.multihop_json_fp = "{0}/nodeJsonDataMultihop.js".format(self.outpath)
        with open(self.multihop_json_fp, "w") as f:
            f.write(contentJS)
        if os.path.isdir(self.local_fp):
            local_fp = self.local_fp
            multihop_js_fp = "{0}/nodeJsonDataMultihop.js".format(local_fp)
            with open(multihop_js_fp, "w") as f_link:
                f_link.write(contentJS)
                self.logger.info(
                    "nodeJsonDataMultihop.js written to {0}".format(local_fp)
                )
            multihop_json_fp = "{0}/nodeJsonDataMultihop.json".format(local_fp)
            content = "{0}\n".format(json.dumps(nodeJsonDataMultihop))
            with open(multihop_json_fp, "w") as f_link:
                f_link.write(content)
                self.logger.info(
                    "nodeJsonDataMultihop.json written to {0}".format(local_fp)
                )

    def _analyze_tx_rx_alignment(self, tx_deg, rx_deg):
        misalignment = KEY.STATUS_TX_RX_HEALTHY  # 0
        if tx_deg == "nan" or rx_deg == "nan":
            misalignment = KEY.STATUS_UNKNOWN
        else:
            if (abs(tx_deg) > KEY.MISALIGN_THRESH_DEG) or (
                abs(rx_deg) > KEY.MISALIGN_THRESH_DEG
            ):
                misalignment += KEY.STATUS_LARGE_ANGLE  # 2
            if abs(tx_deg - rx_deg) > KEY.TX_RX_DIFF_THRESH_DEG:
                misalignment += KEY.STATUS_TX_RX_DIFF  # 1

        if misalignment is (KEY.STATUS_LARGE_ANGLE + KEY.STATUS_TX_RX_DIFF):
            color = "#F44336"  # red
            health = "misalign,tx/rx diff."
        elif misalignment is KEY.STATUS_LARGE_ANGLE:
            color = "#FFC107"  # yellow
            health = "misaligned"
        elif misalignment is KEY.STATUS_TX_RX_DIFF:
            color = "#8A2BE2"  # purple
            health = "tx/rx diff."
        elif misalignment is KEY.STATUS_TX_RX_HEALTHY:
            color = "#4CAF50"  # green
            health = "okay"
        elif misalignment is KEY.STATUS_UNKNOWN:
            color = "#212121"
            health = "unknown"
        return health, color

    def _get_alignment(self, link):
        # re-use analyze_alignment
        node_a = self.__tp.get_a_node(link)
        node_z = self.__tp.get_z_node(link)
        try:
            txIdx_a, rxIdx_a = self.__tp.get_current_beam(node_a, towards_node=node_z)
            tx_deg_a = index2deg(txIdx_a)
            rx_deg_a = index2deg(rxIdx_a)
        except BaseException:
            tx_deg_a = rx_deg_a = "nan"
        try:
            txIdx_z, rxIdx_z = self.__tp.get_current_beam(node_z, towards_node=node_a)
            tx_deg_z = index2deg(txIdx_z)
            rx_deg_z = index2deg(rxIdx_z)
        except BaseException:
            tx_deg_z = rx_deg_z = "nan"
        health_a, color_a = self._analyze_tx_rx_alignment(tx_deg_a, rx_deg_a)
        health_z, color_z = self._analyze_tx_rx_alignment(tx_deg_z, rx_deg_z)
        self.logger.info(
            "node_a={0}, tx_deg={1}, rx_deg={2}, health={3}".format(
                node_a, tx_deg_a, rx_deg_a, health_a
            )
        )
        self.logger.info(
            "node_z={0}, tx_deg={1}, rx_deg={2}, health={3}".format(
                node_z, tx_deg_z, rx_deg_z, health_z
            )
        )
        health_indicator_a = '<font color="{0}">{1}</font>'.format(color_a, health_a)
        health_indicator_z = '<font color="{0}">{1}</font>'.format(color_z, health_z)
        # html content
        alignment = "<li>alignment</li>"
        alignment += "<li>{0}</li><li>{1}</li>\n".format(
            health_indicator_a, health_indicator_z
        )
        alignment += "<li>tx/rx deg</li>"
        alignment += "<li>{0:.1f}/{1:.1f}</li>".format(float(tx_deg_a), float(rx_deg_a))
        alignment += "<li>{0:.1f}/{1:.1f}</li>\n".format(
            float(tx_deg_z), float(rx_deg_z)
        )
        return alignment

    def _gen_link_font_color(self, health):
        if health == "excellent":
            # green
            color = "#4CAF50"
        elif health == "healthy":
            # blue
            color = "#67C8FF"
        elif health == "marginal":
            # yellow
            color = "#FFC107"
        elif health == "warning":
            # red
            color = "#F44336"
        else:
            color = "black"
        return color
