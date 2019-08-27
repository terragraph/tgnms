#!/usr/bin/env python3
import logging
import os
from collections import Mapping, defaultdict

from modules.addon_misc import dump_result
from modules.util_logger import EmptyLogger


class Aggregation:
    """
    aggregation class to aggregate analyzed iperf results
    """

    def __init__(self, logger_tag="AGGREGATOR", log_path_dir=None, printout=True):
        self.aggregated_data = defaultdict(list)
        if log_path_dir is None:
            self.logger = EmptyLogger(logger_tag, printout=True)
        else:
            logpath_r = "{0}/log/".format(log_path_dir)
            if not os.path.isdir(logpath_r):
                try:
                    os.makedirs(logpath_r)
                except BaseException:
                    logpath_r = log_path_dir
            self.logger = EmptyLogger(
                logger_tag,
                logPath="{0}/log/tg_{1}.log".format(log_path_dir, logger_tag),
                printout=printout,
                printlevel=logging.INFO,
            )

    def update_aggregated_data(self, analyzed_data):
        """
        update aggregated_data with analyzed_data
        """
        self.logger.note("Updating aggregated data with analyzed results.")
        self.aggregated_data = self._merge_data(self.aggregated_data, analyzed_data)

    def _merge_data(self, aggregated_data, analyzed_data):
        """
        recursively update two identical dictionaries
        e.g: {"mcs": 11} + {"mcs": 12} -> {"mcs": [11, 12]}
        """
        for key, value in analyzed_data.items():
            if isinstance(value, Mapping):
                aggregated_data[key] = self._merge_data(
                    aggregated_data.get(key, defaultdict(list)), value
                )
            else:
                aggregated_data[key].append(value)
        return aggregated_data

    def dump_aggregated_data(self, file_path, file_name="aggregated_iperf"):
        """
        dump aggregated result to local file path and MongoDB
        """
        self.logger.note("Starting aggregated data dump.")
        out_fp_no_suffix = file_path + file_name
        dump_result(
            out_fp_no_suffix,
            self.aggregated_data,
            self.logger,
            use_JSON=True,
            to_mongo_db=True,
        )
