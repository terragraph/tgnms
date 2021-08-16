#!/usr/bin/env python3

"""
Copyright (c) Facebook, Inc. and its affiliates.
All rights reserved.
"""

"""
Script to analyze various crash logs
"""

import argparse
import glob
import logging
import os
import re
import sys

from crash_analyzer import CrashAnalyzer
from vpp_crash_analyzer import VppCrashAnalyzer
from crash_details import CrashDetails
from crash_key import CrashKey
from typing import AnyStr, Dict, List, Optional, Tuple

logging.basicConfig(filename="crash_analysis_output.log")
LOG = logging.getLogger(__name__)

APPLICATION_TYPES: Dict[str, CrashAnalyzer] = {
  "vpp": VppCrashAnalyzer(),
  "vnet": VppCrashAnalyzer(),
  "e2e_minion": CrashAnalyzer(),
  "openr": CrashAnalyzer(),
  "stats_agent": CrashAnalyzer()
}

def get_args() -> (str, CrashKey):
  """Process the sys args and return the file or
  directory paths, groupings, and flags. If the path is invalid,
  program will terminate.
  """
  path: str = ""
  base_key: CrashKey = CrashKey()
  parser = argparse.ArgumentParser()
  parser.add_argument("-v", "--verbose", help="display verbose output for crashes",
                      action="store_true")
  parser.add_argument("-i", "--crash-time", help="group by crash time",
                      action="store_true")
  parser.add_argument("-y", "--crash-type", help="group by crash type",
                      action="store_true")
  parser.add_argument("-n", "--node-id", help="group by node ID",
                      action="store_true")
  parser.add_argument("-a", "--application", help="group by application",
                      action="store_true")
  parser.add_argument("path", help="file or directory path of logs to analyze")
  args = parser.parse_args()
  if args.verbose:
    LOG.setLevel(logging.DEBUG)
  else:
    LOG.setLevel(logging.INFO)
  if args.crash_time:
    base_key.crash_time = ""
  if args.crash_type:
    base_key.crash_type = ""
  if args.node_id:
    base_key.node_id = ""
  if args.application:
    base_key.application = ""
  if not os.path.isfile(args.path) and not os.path.isdir(args.path):
    LOG.error(f"{args.path} is not a valid file or directory path.")
    sys.exit(2)
  path = args.path
  return path, base_key

def extract_application_type(log_path: str) -> str:
  """Given a valid log path, extract the application
  type information from it. If found,
  return the app type, empty string otherwise."""
  # Iterate through possible application types
  # to process more general log name formats
  for app_type in APPLICATION_TYPES:
    if re.search(app_type, log_path, re.IGNORECASE) is not None:
      return app_type
  return ""

def analyze_log(log_lines: List[str], log_path: str) -> List[CrashDetails]:
  """Analyze the log based on application type.
  Return a list of all found crashes for the application
  type and log. If the application type is unknown, return an empty
  list.
  """
  app_type: str = extract_application_type(log_path)
  node_id: str = ""
  return APPLICATION_TYPES[app_type].run_error_parsers(
          log_path=log_path, log_lines=log_lines, node_id=node_id, application=app_type) if app_type in APPLICATION_TYPES else []

def display_grouped_crashes(grouped_crashes: Dict[str, List[CrashDetails]]) -> None:
  """Given the grouped crashes, display a summary of the crashes.
  If the verbose flag is set, also display the details of the crashes.
  """
  for group in grouped_crashes:
    LOG.info(group)
    LOG.info(f"{len(grouped_crashes[group])} crashes with the above crash signature\n")
    for crash in grouped_crashes[group]:
      LOG.debug(crash)

def group_crashes(crashes: List[CrashDetails], base_key: CrashKey) -> Dict[CrashKey, List[CrashDetails]]:
  """Given a list of crashes and the base key with fields to group by,
  group the crashes and return a map from the specific group key to the
  list of crashes that belong in the group.
  """
  grouped_crashes: Dict[str, List[CrashDetails]] = {}
  for crash in crashes:
    key = base_key.create_key_from_base(crash)
    grouped_crashes.setdefault(key, []).append(crash)
  return grouped_crashes

def main():
  """Given a file or directory path as a command line argument,
  analyze all found files and output any found errors.
  """
  analyzed_crash_details: List[CrashDetails] = []
  path, base_key = get_args()
  # Analyze each file in the provided path and add to analyzed_crash_details
  for filepath in glob.glob(path+"/*", recursive=True):
    with open(filepath, 'r') as crash_file:
      file_lines: List[str] = crash_file.readlines()
      found_crashes = analyze_log(file_lines, filepath)
      analyzed_crash_details.extend(found_crashes)

  # summarize the crash details
  grouped_crashes: Dict[CrashKey, List[CrashDetails]] = group_crashes(analyzed_crash_details, base_key)
  display_grouped_crashes(grouped_crashes)

  return 0

if __name__ == "__main__":
  sys.exit(main())
