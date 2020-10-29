#!/usr/bin/env python3
import argparse
import datetime

# built-ins
import sys
import unittest

import numpy as np


# modules
sys.path.append("network_analyzer/")
try:
    import modules.keywords as KEY
    from modules.util_mongo_db import MongoDB, get_current_datetime, datetime2string
    from modules.util.aggregation.post_analysis import PostAnalysisAggr

except BaseException:
    raise


class TestAggregation(unittest.TestCase):
    # This function sets up test environment. classmethod specified because this
    # setup will only happen once.
    # Naming convention is not followed because this is internal function name
    # of unittest
    @classmethod
    def setUpClass(cls):
        super(TestAggregation, cls).setUpClass()
        parser = argparse.ArgumentParser()
        parser.add_argument("-v", action="store_true")
        args = parser.parse_args()
        cls.mongodb = MongoDB(loggerTag="Test", logPathDir="./")
        cls.data = cls.mongodb.obtain_history_details(
            KEY.DB_ANALYSIS_IPERF,
            100,
            datetime2string(get_current_datetime() - datetime.timedelta(days=30)),
        )
        cls.mongodb.logger.disable()
        # The next line is used if output to excel needs to be tested.
        cls.aggr = PostAnalysisAggr(visualize=args.v, foldername="/tmp/aggregation")
        # cls.aggr = PostAnalysisAggr(visualize=args.v)
        cls.overview = {}
        # generate all keys
        for each in cls.data:  # list entry
            for key in each[KEY.UDP]:  # dict entry
                if "link-" in key and key not in cls.overview:
                    cls.overview[key] = {}
        cls.test_link = next(iter(cls.overview))

    def test_feature_list(self):
        fake_overview = {"fake_link": {}}
        fake_data = [
            {"udp": {"fake_link": {"a2z": {KEY.MCS_P90: 1, KEY.MCS_STD: 2.0}}}},
            {"udp": {"fake_link": {"a2z": {KEY.MCS_P90: 2, KEY.MCS_STD: 2.0}}}},
        ]
        self.aggr.get_feature_list(fake_overview, "fake_link", fake_data)
        self.assertDictEqual(
            fake_overview,
            {"fake_link": {"a2z": {KEY.MCS_P90: [2, 1], KEY.MCS_STD: [2.0, 2.0]}}},
        )

    def test_mad_outlier(self):
        fake_data1 = [1, 1, 1, 1, 1]
        self.assertTrue(self.aggr.mad_based_outlier(fake_data1).size == 0)
        fake_data2 = [3.0, 2.0, 3.0, 2.0, 10.0]
        self.assertEqual(self.aggr.mad_based_outlier(fake_data2), np.array([4]))
        fake_data3 = [1, "Wrong"]
        with self.assertRaises(TypeError):
            self.aggr.mad_based_outlier(fake_data3)
        fake_data4 = [1, 2, 1, 2, float("nan")]
        self.assertEqual(self.aggr.mad_based_outlier(fake_data4), np.array([4]))

    def test_qualify_thresh(self):
        fake_data1 = [12.0, 12.0, 9.0, 10.0]
        self.assertTrue(self.aggr.qualify_thresh(fake_data1, lw_th=9.0).size == 0)
        fake_data2 = [12.0, 11.0, 8.0, 10.0]
        self.assertEqual(self.aggr.qualify_thresh(fake_data2, lw_th=9.0), np.array([2]))
        fake_data3 = [1, "Wrong"]
        with self.assertRaises(TypeError):
            self.aggr.qualify_thresh(fake_data3)
        fake_data4 = [1, 2, 1, 2, float("nan")]
        self.assertEqual(self.aggr.qualify_thresh(fake_data4, lw_th=0), np.array([4]))

    def test_entire_process(self):
        overview_days_sum = self.aggr.time_aggregation(self.data)
        labels, bidir_anomaly = self.aggr.link_clustering(overview_days_sum)
        # The next line is for testing writeback to mongoDB
        # self.mongodb.write(overview_days_sum, "link_clustering")
        self.assertGreater(len(labels), 0)


if __name__ == "__main__":
    unittest.main()
