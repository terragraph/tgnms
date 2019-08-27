#!/usr/bin/env python3

from datetime import datetime

import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
import requests
from matplotlib.ticker import MultipleLocator
from sklearn.cluster import KMeans
from sklearn.decomposition import PCA
from sklearn.metrics import silhouette_score


url = "http://prometheus:9090/api/v1/"
marker_list = ["*", "x", ".", "o", "+"]
color_list = ["r", "g", "b", "y", "k"]


def query_generator(
    metric,
    rate=None,
    aggr_over_time=None,
    interval=None,
    avg=False,
    sum=False,
    **kwargs
):
    """
    Helper function that generates a Prometheus query.
    @param metric: string, metric name.
    @param kwargs, labels inside metrics.
    @param aggr_over_time: string, method of aggregation over time, viable
    options are "avg", "min", "max", "sum", "count", "stddev", "stdvar"
    @return string, query that would work in grafana dashboard.
    """
    label_list = [] if "intervalSec" in kwargs else ['intervalSec="30"']
    for name, val in kwargs.items():
        if "." in val or "*" in val or "\\" in val or "?" in val:
            label_list.append('{0}=~"{1}"'.format(name, val))
        else:
            label_list.append('{0}="{1}"'.format(name, val))
    label_query = ", ".join(label_list)
    query = "{0}{{{1}}}".format(metric, label_query)
    if rate:
        query = "rate({0} [{1}])".format(query, rate)
    if aggr_over_time:
        query = "{0}_over_time({1} [{2}])".format(aggr_over_time, query, interval)
    if sum:
        query = "sum({0})".format(query)
    if avg:
        query = "avg({0})".format(query)
    return query


def resolution_checker(iso1, iso2, step_str):
    """
    Tool to check if each time series exceeds 11,000 data instances. 11,000 is
    an internal limit set by Prometheus.
    @param iso1, iso2: string, time in iso format.
    @param step_str: string, time interval, format as "5m" or "1h".
    @return boolean: whether the query will be accepted by Prometheus.
    """
    if step_str.endswith("s"):
        step = int(step_str.strip("s"))
    elif step_str.endswith("m"):
        step = int(step_str.strip("m")) * 60
    elif step_str.endswith("h"):
        step = int(step_str.strip("h")) * 3600
    elif step_str.endswith("d"):
        step = int(step_str.strip("d")) * 86400
    sec1 = datetime.strptime(iso1, "%Y-%m-%dT%H:%M:%S.000Z")
    sec2 = datetime.strptime(iso2, "%Y-%m-%dT%H:%M:%S.000Z")
    diff = (sec2 - sec1).total_seconds()
    return diff / float(step) <= 11000


def make_query(query, start, end, step):
    """
    Accepts output from query_generator and makes query.
    @param query: string, output from query_generator
    @param start, end: string, time in iso format.
    @param step: string, time interval, format as "5m" or "1h".
    @return dictionary: json format object.
    """
    end_point = "query_range"
    payload = {
        "query": query,
        # format: YYYY-MM-DDTHH:MM:SS.000Z
        "start": start,
        # format: YYYY-MM-DDTHH:MM:SS.000Z"
        "end": end,
        # numeric value followed by time unit, like 5s, 1h
        "step": step,
    }
    response = requests.get(url + end_point, params=payload)
    output = response.json()
    json_fp = "/tmp/temp.json"
    content = "{}\n".format(output)
    with open(json_fp, "w") as f_link:
        f_link.write(content)
    return output


def all_link_traffic_count(start_time, end_time, interval, metric):
    """
    Aggregate traffic from all link in a certain period of time.
    @param start_time, end_time: string, time in iso format.
    @param interval: string, time interval, format as "5m" or "1h"
    @param metric: string, name of the metric
    @return dictionary: json format object.
    """
    if not resolution_checker(start_time, end_time, interval):
        print("Increase step to decrease resolution.")
        return None
    if metric.endswith("_bytes") or metric.endswith("_pps"):
        cn_query = query_generator(
            metric, intervalSec="30", aggr_over_time="avg", interval=interval
        )
    elif metric.endswith("_ok") or metric.endswith("_ppdu"):
        cn_query = query_generator(metric, intervalSec="30", rate=interval)
    else:
        print("Metric not available")
        return
    cn_result = make_query(cn_query, start_time, end_time, interval)
    output_dict = {}
    for link in cn_result["data"]["result"]:
        output_dict[link["metric"]["linkName"]] = link["values"]
    return output_dict


def repeat_pattern(series, interval):
    """
    overlay periodic time data on top of each other to observe recurring pattern,
    displays the plot for now. Can add correlation latter on.
    @params series: 2d np.array, output from pop_cn_traffic_count function
    @params interval: int, time interval desired in seconds.
    @return 3d np.array, each item is one day of aggregation in 2d array format.
    """
    result = []
    last_time = None
    for pair in series:
        timestamp = int(pair[0])
        value = float(pair[1])
        if not last_time:
            last_time = timestamp
            interval_list = []
        if timestamp >= last_time + interval:
            last_time += interval
            result.append(np.array(interval_list))
            interval_list = []
        interval_list.append([timestamp - last_time, value])
    result.append(np.array(interval_list))
    result = np.array(result)
    plt.figure(figsize=(20, 4))
    for index in range(len(result)):
        plt.plot(
            result[index][:, 0], result[index][:, 1], label="day {0}".format(index + 1)
        )
    plt.legend()
    return result


def influx_efflux_count(start_time, end_time, interval):
    """
    Counts influx and efflux difference on all sites.
    @param start_time, end_time: string, time in iso format.
    @param interval: string, time interval, format as "5m" or "1h"
    @return dict, key is sitename, value is 2d array of timestamp and data.
    Currently, only works on SJC Prometheus, as YTL doesn't have ppdu stat.
    """
    influx_query = query_generator("rx_ppdu", intervalSec="1", rate="1h")
    efflux_query = query_generator("tx_ppdu", intervalSec="1", rate="1h")
    diff_query = "sum({0}-{1}) by (siteName)".format(influx_query, efflux_query)
    diff = make_query(diff_query, start_time, end_time, interval)
    output_dict = {}
    for link in diff["data"]["result"]:
        output_dict[link["metric"]["siteName"]] = np.array(link["values"])
    return output_dict


def choose_k_silhouette(df, low_cluster, high_cluster):
    """
    Silhouette analysis on clustering number selection
    The higher the analysis score, the more suitable the cluster number.
    @param df: pd.DataFrame, contains data instances with parameters
    @param low_cluster, high_cluster: int, number of clusters to test on, low
    inclusive and high non-inclusive.
    @return optimal number of clusters
    """
    high_score = 0
    k_num = 2
    for num_cluster in range(low_cluster, high_cluster):
        kmeans = KMeans(n_clusters=num_cluster)
        labels = kmeans.fit_predict(df)

        silhouette_avg = silhouette_score(df, labels)
        if silhouette_avg > high_score:
            high_score = silhouette_avg
            k_num = num_cluster
    return k_num


def visualize_cluster(df, labels):
    """
    Legacy function from network_analyzer/modules/util/aggregation/post_analysis.py
    """
    pca = PCA()
    # ldim_df: The dataframe after PCA transform, the columns are sorted by
    # variance.
    ldim_df = pca.fit_transform(df)
    # Choose the first 2 columns for visualization. Can also choose 3 columns.
    score = ldim_df[:, 0:2]
    # Correlation between original features and new components.
    coeff = np.transpose(pca.components_[0:2, :])
    plt.figure(figsize=(8, 6))
    plt.xlim(-1, 1)
    plt.ylim(-1, 1)
    plt.xlabel("PC{}".format(1))
    plt.ylabel("PC{}".format(2))
    plt.grid()

    xs = score[:, 0]
    ys = score[:, 1]
    n = coeff.shape[0]
    scalex = 1.0 / (xs.max() - xs.min())
    scaley = 1.0 / (ys.max() - ys.min())
    for num in range(len(xs)):
        plt.scatter(
            xs[num] * scalex,
            ys[num] * scaley,
            c=color_list[labels[num]],
            marker=marker_list[labels[num]],
        )
    for i in range(n):
        plt.arrow(0, 0, coeff[i, 0], coeff[i, 1], color="r", alpha=0.5)
        plt.text(
            coeff[i, 0] * 1.15,
            coeff[i, 1] * 1.15,
            df.columns[i],
            color="g",
            ha="center",
            va="center",
        )
    plt.show()


def cn_pop_site_traffic_count(start_time, end_time, interval, metric, pop=False):
    """
    Count egress traffic of each site and classify sites based on their traffic
    pattern.
    @param start_time, end_time: string, time in iso format.
    @param interval: string, time interval, format as "5m" or "1h"
    @param direction: string, direction of traffic flow, "tx" or "rx"
    @param pop: boolean, False for CN traffic, True for PoP traffic
    """
    aggr = "avg"
    if not resolution_checker(start_time, end_time, interval):
        print("Increase step to decrease resolution.")
        return None
    if pop:
        if metric.endswith("_bytes") or metric.endswith("_pps"):
            query = query_generator(
                metric,
                siteName="POP(.+)|SITE_9004(.+)?|SITE_9005(.+)?",
                intervalSec="30",
                aggr_over_time=aggr,
                interval=interval,
            )
            # Specific operation to return correct value
            query = "{0}*8/1e9".format(query)
        elif metric.endswith("_ok") or metric.endswith("_ppdu"):
            query = query_generator(
                metric,
                siteName="POP(.+)|SITE_9004(.+)?|SITE_9005(.+)?",
                intervalSec="30",
                rate=interval,
            )
        else:
            print("Metric not available")
            return
    else:
        if metric.endswith("_bytes") or metric.endswith("_pps"):
            query = query_generator(
                metric,
                nodeName=".+CN$",
                intervalSec="30",
                aggr_over_time=aggr,
                interval=interval,
            )
            # Specific operation to return correct value
            query = "{0}*8/1e9".format(query)
        elif metric.endswith("_ok") or metric.endswith("_ppdu"):
            query = query_generator(
                metric, nodeName=".+CN$", intervalSec="30", rate=interval
            )
        else:
            print("Metric not available")
            return
    query_result = make_query(query, start_time, end_time, interval)
    df_dict = {}
    for site in query_result["data"]["result"]:
        df_dict[site["metric"]["nodeName"]] = np.array(site["values"])[:, 1].astype(
            np.float
        )
    site_df = pd.DataFrame.from_dict(df_dict, orient="index")
    # Drop site if the site has more than 10 percent data missing, drop site.
    # Currently doesn't show which links.
    site_df = site_df[site_df.isnull().sum(axis=1) / len(site_df.columns) < 0.1]
    if aggr == "avg":
        site_traffic_mean = site_df.mean(axis=1)
    else:
        site_traffic_mean = site_df.max(axis=1)
    plt.figure(figsize=(20, 4))
    plt.title(metric)
    if metric.endswith("_bytes"):
        plt.ylabel("{0} Mbps in {1}".format(aggr, interval))
    elif metric.endswith("_ok"):
        plt.ylabel("avg packets per second in {}".format(interval))
    site_traffic_mean = site_traffic_mean.sort_values(ascending=True, kind="quicksort")
    site_traffic_mean.plot(kind="bar")


def cn_site_classification():
    """
    Classifies CN sites based on 8h traffic aggregation on weekday and weekend.
    Currently only works with one week aggregation of 8h interval.
    """
    query = query_generator("tx_ok", nodeName=".+CN$", intervalSec="1", rate="8h")
    # The start and end time has to be hardcoded for now.
    result = make_query(
        query, "2019-07-29T09:00:00.000Z", "2019-08-05T01:00:00.000Z", "8h"
    )
    df_dict = {}
    for site in result["data"]["result"]:
        # If one site is lacking data in one interval, report error and remove
        # site from classification/
        if len(site["values"]) != 21:
            print("Missing data for link {}".format(site["metric"]["siteName"]))
            continue
        stat = np.array(np.array_split(np.array(site["values"])[:, 1], 7)).astype(
            np.float
        )
        # Getting mean of weekday and weekends.
        weekday_stat = stat[0:5].mean(axis=0)
        weekday_stat = weekday_stat / np.sum(weekday_stat)
        weekend_stat = stat[5:7].mean(axis=0)
        weekend_stat = weekend_stat / np.sum(weekend_stat)
        df_dict[site["metric"]["siteName"]] = np.concatenate(
            (weekday_stat, weekend_stat)
        )
    site_df = pd.DataFrame.from_dict(df_dict, orient="index")
    k_num = choose_k_silhouette(site_df, 4, 8)
    kmeans = KMeans(n_clusters=k_num)
    labels = kmeans.fit_predict(site_df)
    label_dict = {}
    for index in range(len(labels)):
        if labels[index] not in label_dict:
            label_dict[labels[index]] = []
        label_dict[labels[index]].append(site_df.index.values[index])
    for label in label_dict:
        print(color_list[label], label_dict[label])
        print("\n")
    visualize_cluster(site_df, labels)


def network_traffic_count(start_time, end_time, interval, metric, pop=False):
    """
    Sums up traffic from all the cn nodes and all the pop nodes.
    @param start_time, end_time: time in iso format.
    @param interval: string, time interval, format as "5m" or "1h".
    @param direction: string, direction of traffic flow, "tx" or "rx"
    @return tuple of np.array, a tuple of array containing data from cn nodes
    and pop nodes
    """
    if not resolution_checker(start_time, end_time, interval):
        print("Increase step to decrease resolution.")
        return None
    if pop:
        if metric.endswith("_bytes") or metric.endswith("_pps"):
            query = query_generator(
                metric,
                siteName="POP(.+)|SITE_9004(.+)?|SITE_9005(.+)?",
                intervalSec="30",
                aggr_over_time="avg",
                interval=interval,
                sum=True,
            )
            # Specific operation to return correct value
            query = "{0}*8/1e9".format(query)
        elif metric.endswith("_ok") or metric.endswith("_ppdu"):
            query = query_generator(
                metric,
                siteName="POP(.+)|SITE_9004(.+)?|SITE_9005(.+)?",
                intervalSec="1",
                rate=interval,
                sum=True,
            )
        else:
            print("Metric not available")
            return
    else:
        if metric.endswith("_bytes") or metric.endswith("_pps"):
            query = query_generator(
                metric,
                nodeName=".+CN$",
                intervalSec="30",
                aggr_over_time="avg",
                interval=interval,
                sum=True,
            )
            # Specific operation to return correct bps value
            query = "{0}*8/1e9".format(query)
        elif metric.endswith("_ok") or metric.endswith("_ppdu"):
            query = query_generator(
                metric, nodeName=".+CN$", intervalSec="30", rate=interval, sum=True
            )
        else:
            print("Metric not available")
            return
    result = make_query(query, start_time, end_time, interval)
    return np.array(result["data"]["result"][0]["values"])


def network_traffic_visualization(start, end, interval):
    """
    Visualization of network-wide traffic aggregation.
    @param start, end: time in iso format.
    @param interval: string, time interval, format as "5m" or "1h".
    """
    cn_sum = network_traffic_count(start, end, interval, "rx_bytes")
    pop_sum = network_traffic_count(start, end, interval, "tx_bytes", pop=True)
    repeat_pattern(cn_sum, 86400)
    cn_sum_x, cn_sum_y = cn_sum[:, 0].astype(np.int32), cn_sum[:, 1].astype(np.float)
    pop_sum_x, pop_sum_y = (
        pop_sum[:, 0].astype(np.int32),
        pop_sum[:, 1].astype(np.float),
    )
    plt.figure(figsize=(20, 4))
    plt.title("CN and PoP traffic")
    ax = plt.subplot(111)
    lines = ax.plot(cn_sum_x, cn_sum_y, pop_sum_x, pop_sum_y)
    ax.xaxis.set_major_locator(MultipleLocator(86400))
    plt.xticks(rotation=90)
    plt.ylabel("avg Mbps in {}".format(interval))
    plt.legend(iter(lines), ("cn_traffic", "pop_traffic"))
    plt.show()


def main():
    cn_site_classification()
    cn_pop_site_traffic_count(
        "2019-07-26T00:00:00.000Z", "2019-08-02T00:00:00.000Z", "1d", "tx_bytes"
    )
    cn_pop_site_traffic_count(
        "2019-07-26T00:00:00.000Z", "2019-08-02T00:00:00.000Z", "1d", "rx_bytes"
    )
    cn_pop_site_traffic_count(
        "2019-07-26T00:00:00.000Z",
        "2019-08-02T00:00:00.000Z",
        "1d",
        "tx_bytes",
        pop=True,
    )
    cn_pop_site_traffic_count(
        "2019-07-26T00:00:00.000Z",
        "2019-08-02T00:00:00.000Z",
        "1d",
        "rx_bytes",
        pop=True,
    )
    network_traffic_visualization(
        "2019-07-29T01:00:00.000Z", "2019-08-03T00:00:00.000Z", "1h"
    )


main()
