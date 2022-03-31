#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved.
import asyncio
import logging
import math
import time
from collections import defaultdict
from copy import deepcopy
from typing import Dict, Optional, List, Iterable

import numpy as np
from sklearn.covariance import EllipticEnvelope
from sklearn.exceptions import NotFittedError
from sklearn.impute import KNNImputer
from sklearn.neighbors import LocalOutlierFactor
from sklearn.preprocessing import MinMaxScaler
from tglib.clients import APIServiceClient
from tglib.clients.prometheus_client import consts, PrometheusClient, PrometheusMetric
from tglib.exceptions import ClientRuntimeError


async def ad_single_metric_job(
    time_ms: int, metric: str, step_s: int, duration_s: int, period_s: int
) -> None:
    """This job loads the given link metric data from Prometheus for the past duration_s
    sampled at step_s and runs two AD algorithms on it. It generates AD samples (1 for no
    anomaly, -1 for anomaly) sampled at step_s for the past period_s (the rest of the data
    up to duration_s is historical data for anomaly detection).
    However, since samples cannot be written into Prometheus in the past, they are written
    with a delay of period_s. So an anomaly at time 0 will show up as -1 at time period_s
    in the time-series written into Prometheus."""

    end_time = math.ceil(time_ms / 1e3 / step_s) * step_s
    num_samples = math.ceil(duration_s / step_s)
    start_time = end_time - num_samples * step_s
    logging.info(
        f"Running anomaly detection job for {metric} from {start_time} to {end_time}"
    )

    # Divide time into max_prom_samples chunks because only max_prom_samples
    # can be read at one time
    max_prom_samples = 11000
    num_iterations = math.ceil(num_samples / max_prom_samples)

    time_steps = [
        [
            start_time + i * max_prom_samples * step_s + step_s,
            start_time + (i + 1) * max_prom_samples * step_s,
        ]
        for i in range(num_iterations)
    ]
    time_steps[-1][1] = end_time

    network_names = APIServiceClient.network_names()
    prom_client = PrometheusClient(timeout=15)
    network_reps = []
    coros = []

    for network_name in network_names:
        labels = {
            consts.network: network_name,
            consts.data_interval_s: str(step_s),
        }
        query = [prom_client.format_query(metric, labels)]
        for query_start_time, query_end_time in time_steps:
            coros.append(
                fetch_metrics_from_queries(
                    prom_client,
                    network_name,
                    query,
                    query_start_time,
                    query_end_time,
                    step_s,
                )
            )
            network_reps.append(network_name)

    # Load link metric data for all networks
    network_stats = zip(network_reps, await asyncio.gather(*coros))

    # Reshape data and run AD
    label_val_map = gather_data(network_stats, start_time, end_time, step_s)
    stats_to_write = analyze_data(label_val_map, metric, end_time, step_s, period_s)

    # Write AD samples back to Prometheus every step_s with a time delay
    num_write = math.ceil(period_s / step_s)
    for i in range(-num_write, 0):
        logging.info(f"Writing to Prometheus for index {i}")
        PrometheusClient.write_metrics(stats_to_write[i])
        await asyncio.sleep(step_s)

    return None


async def fetch_metrics_from_queries(
    client: PrometheusClient,
    network_name: str,
    queries: List[str],
    start_time: int,
    end_time: int,
    step: int,
) -> Optional[Dict]:
    """Fetch latest metrics for all links in the network"""
    coros = []
    for query in queries:
        coros.append(
            client.query_range(query, step=f"{step}s", start=start_time, end=end_time)
        )
    try:
        results: Dict = {}
        for query, response in zip(queries, await asyncio.gather(*coros)):
            if response["status"] != "success":
                logging.error(f"Failed to fetch {query} data for {network_name}")
                continue
            results[query] = response["data"]["result"]
        return results
    except ClientRuntimeError:
        logging.exception("Failed to fetch metrics from Prometheus.")
        return None


def gather_data(
    network_stats: Iterable, start_time: int, end_time: int, step: int
) -> Dict:
    """This function takes Prometheus data and reshapes it into a multi-level
    dictionary of network name to link name to link dir to list of values."""

    label_val_map: defaultdict = defaultdict(
        lambda: defaultdict(lambda: defaultdict(list))
    )
    for network, prom_results in network_stats:
        if prom_results is None:
            continue
        for query, values in prom_results.items():
            logging.info(f"Processing data for network {network} and metric {query}")
            if not values:
                logging.debug(f"Found no {query} results for {network}")
                continue
            for result in values:
                link_name = result["metric"][consts.link_name]
                link_dir = result["metric"][consts.link_direction]
                val_array = label_val_map[network][link_name][link_dir]
                if len(val_array) == 0:
                    # Create empty array of length equal to duration_s sampled at step_s
                    val_array = [np.nan] * int((end_time - start_time) / step)
                    label_val_map[network][link_name][link_dir] = val_array
                for timestamp, metric_value in result["values"]:
                    # Put values at the approporate index of array based on timestamp
                    val_array[int((int(timestamp) - start_time) / step - 1)] = int(
                        metric_value
                    )
    return label_val_map


def analyze_data(
    label_val_map: Dict, metric: str, end_time: int, step: int, period: int
) -> Dict[int, List]:
    """This function unpacks the label_val_map dictionary into labels of network name,
    link name and link direction. It creates new Prometheus samples that are 1 or -1
    based on running AD algorithm with these labels. The new AD stats are collected in
    the dict stats_to_write in order to be written one by one to Prometheus with a
    time delay."""

    num_write = math.ceil(period / step)
    stats_to_write: Dict[int, List] = {i: [] for i in range(-num_write, 0)}
    for network, depth1 in label_val_map.items():
        for link_name, depth2 in depth1.items():
            for link_dir, val_array in depth2.items():

                labels = {
                    consts.network: network,
                    consts.link_name: link_name,
                    consts.link_direction: link_dir,
                    "delay": f"{period}-sec",
                }

                outliers = run_ad(val_array)
                for model, pred in outliers.items():

                    labels_model = deepcopy(labels)
                    labels_model["model"] = model
                    for i in range(-num_write, 0):
                        stats_to_write[i].append(
                            PrometheusMetric(
                                f"ad_{metric}",
                                labels_model,
                                pred[i],
                                int((end_time + step * (i + num_write)) * 1000),
                            )
                        )

    return stats_to_write


def run_ad(train: List[float]) -> Dict[str, List]:
    """This function runs two AD algorithms on the input data."""
    contamination = 0.001
    anomaly_algorithms = [
        ("RobustCovariance", EllipticEnvelope(contamination=contamination)),
        (
            "LocalOutlierFactor",
            LocalOutlierFactor(contamination=contamination, n_neighbors=100),
        ),
    ]

    # Impute and scale data
    imputer = KNNImputer(missing_values=np.nan, n_neighbors=10, weights="uniform")
    scaler = MinMaxScaler()
    train = np.array(train).reshape(-1, 1)
    train_imp = imputer.fit_transform(train)
    train_scaled = scaler.fit_transform(train_imp)

    # Run anomaly detection algorithms
    y_pred = {}
    for model_name, algorithm in anomaly_algorithms:
        t0 = time.time()
        try:
            algorithm.fit(train_scaled)
            t1 = time.time()
            if model_name in ["LocalOutlierFactor"]:
                pred = algorithm.fit_predict(train_scaled)
            else:
                pred = algorithm.fit(train_scaled).predict(train_scaled)
            y_pred[model_name] = pred
            logging.debug(f"Ran {model_name} algorithm in {t1 - t0} seconds")
            logging.info(
                f"{model_name} has {sum(pred==-1)} outliers in {len(train)} samples"
            )
        except:  # noqa
            logging.info(f"Could not run {model_name} algorithm")

    return y_pred
