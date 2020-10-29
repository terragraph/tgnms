#!/usr/bin/env python3

"""
   Provide absolute paths to commonly used files and dirs.
"""

import os


class PathStore(object):
    """
    Provide PathStore class for finding the absolute file and dir paths.
    """

    ANALYTICS_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    ANALYTICS_CONFIG_FILE = os.path.abspath(
        os.path.join(os.path.dirname(__file__), "AnalyticsConfig.json")
    )
    PIPELINE_CONFIG_FILE = "/analytics/config/PipelineConfig.json"
