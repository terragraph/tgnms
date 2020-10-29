#!/usr/bin/env python3

import argparse
import datetime

# built-ins
import sys


# modules
sys.path.append("../")
try:
    import modules.keywords as KEY
    from modules.util_topology import Topology
    from modules.util_mongo_db import MongoDB
    from modules.util_mongo_db import get_current_datetime
    from modules.util_mongo_db import string2datetime, datetime2string
    from modules.addon_misc import dump_result
    from modules.comparator_overview import derive_latest_overview
    from modules.comparator_overview import compute_overivew_histogram
    from modules.comparator_overview import derive_overview_sum_days
except BaseException:
    raise


def update_latest_overview(args, mongodb, latestTopology):
    """
    fetch the latest analysis and latest labels, compare, and update the labels
    @param args: dict, holds `output_folder` and `debug`
    @param mongodb: MongoDB() object
    @param latestTopology: Topology() object
    """
    # get the latest labels
    latestOverview = {}
    latestOverviewTime = datetime.datetime.min
    latestOverviewHistory = mongodb.read(KEY.DB_OVERVIEW)
    mongodb.logger.debug("latestOverviewHistory = {}".format(latestOverviewHistory))
    if latestOverviewHistory:
        latestOverview = latestOverviewHistory
        tmpT = string2datetime(latestOverview.get("time", latestOverviewTime))
        mongodb.logger.info("overview latest t: {0}".format(tmpT))
        latestOverviewTime = tmpT
        latestOverview.pop("time", None)  # remove time for summary
        latestOverview.pop("test_type", None)  # remove test_type for summary
    # obtain collection names beginning with `analysis_`
    analysisNamesAll = []
    for name in mongodb.db.collection_names():
        if "analysis_" in name:
            analysisNamesAll.append(name)
    # get all latest analysis
    latestAnalysis = {}
    mongodb.logger.debug(
        "Update overview based on {} analysis".format(analysisNamesAll)
    )
    for analysisName in analysisNamesAll:
        analysisHistory = mongodb.read(analysisName)
        if not analysisHistory:
            continue
        tmpT = string2datetime(analysisHistory.get("time", latestOverviewTime))
        mongodb.logger.info("{0} latest t: {1}".format(analysisName, tmpT))
        mongodb.logger.info("It is newer? {0}".format(latestOverviewTime < tmpT))
        if analysisHistory and latestOverviewTime < tmpT:
            analysisHistory.pop("time", None)  # remove time for summary
            analysisHistory.pop("test_type", None)  # remove test_type for summary
            latestAnalysis[analysisName] = analysisHistory
    # only update if has new analysis
    if not latestAnalysis and not args.get("debug", False):
        return
    mongodb.logger.debug(
        "got {0} entries, deriving latest overview".format(len(latestAnalysis))
    )
    mongodb.logger.debug(
        "before derive_latest_overview function, latestOverview = {}".format(
            latestOverview
        )
    )
    derive_latest_overview(
        latestOverview, latestAnalysis, latestTopology, logger=mongodb.logger
    )
    dump_result(
        "{0}/{1}".format(args["output_folder"], KEY.DB_OVERVIEW),
        latestOverview,
        logger=mongodb.logger,
        use_JSON=True,
        to_mongo_db=True and not args.get("debug", False),
    )
    mongodb.logger.debug("deriving latest overview histogram")
    hist = compute_overivew_histogram(latestOverview)
    dump_result(
        "{0}/{1}".format(args["output_folder"], KEY.DB_OVERVIEW_HISTOGRAM),
        hist,
        logger=mongodb.logger,
        use_JSON=True,
        to_mongo_db=True and not args.get("debug", False),
    )


def update_30daysum_overview(args, mongodb, days=30):
    """
    fetch the latest [days] day overview and derive moving average result
    """
    data = mongodb.obtain_history_details(
        KEY.DB_OVERVIEW,
        100,
        datetime2string(get_current_datetime() - datetime.timedelta(days=days)),
    )
    if not data:
        return
    mongodb.logger.debug(
        "got {0} data, computing summary over {1} days".format(len(data), days)
    )
    overviewDaysSum = derive_overview_sum_days(data)
    dump_result(
        "{0}/{1}_{2}".format(args["output_folder"], KEY.DB_OVERVIEW_DAYS, days),
        overviewDaysSum,
        logger=mongodb.logger,
        use_JSON=True,
        to_mongo_db=True and not args.get("debug", False),
    )
    mongodb.logger.debug("deriving moving average overview histogram")
    hist = compute_overivew_histogram(overviewDaysSum)
    dump_result(
        "{0}/{1}_{2}".format(
            args["output_folder"], KEY.DB_OVERVIEW_HISTOGRAM_DAYS, days
        ),
        hist,
        logger=mongodb.logger,
        use_JSON=True,
        to_mongo_db=True and not args.get("debug", False),
    )


def compare_wrapper(args):
    """
    end-to-end wrapper for comparison
    """
    mongodb = MongoDB(loggerTag="MongoDB_Comparator", logPathDir=args["output_folder"])
    # initialize topology (get it from database)
    topologyName = "topology_{}".format(args.get("network_name", ""))
    topologyJson = mongodb.read(topologyName)
    if not topologyJson:
        mongodb.logger.error("cannot load `{}` from database".format(topologyName))
        return
    topology = Topology(topologyJson)
    # update labels
    if args.get("update_overview", False):
        update_latest_overview(args, mongodb, topology)
    # update 30day average
    if args.get("update_30daysum", False):
        update_30daysum_overview(args, mongodb, days=30)
    # close mongodb
    mongodb.logger.disable()
    mongodb = None


def main():
    """
    Data Comparison (MongoDB Based)
    """
    parser = argparse.ArgumentParser(description="Data Comparison")
    parser.add_argument("name", help="network name")
    parser.add_argument(
        "--update-overview",
        dest="update_overview",
        action="store_true",
        default=False,
        help="update the latest overview of the network links/nodes to database",
    )
    parser.add_argument(
        "--update-daysum",
        dest="update_30daysum",
        action="store_true",
        default=False,
        help="update the 30day overview of the network to database",
    )
    parser.add_argument(
        "--debug", action="store_true", default=False, help="debugging mode"
    )
    # the following arguments, if specified, will
    # overwrite the config file (if loaded)
    parser.add_argument(
        "--outfolder",
        "-o",
        dest="output_folder",
        action="store",
        default="/tmp/",
        help="output folder path for analysis results (overwrite configs)",
    )
    try:
        args = vars(parser.parse_args())
        # if we run the tool directly,
        # we need to specify the correct network name
        args["network_name"] = args["name"]
    except BaseException:
        sys.exit()
    compare_wrapper(args)


if __name__ == "__main__":
    main()
