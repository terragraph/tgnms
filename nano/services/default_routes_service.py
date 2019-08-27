#!/usr/bin/env python3

from datetime import datetime

from base import app, get_config_args
from modules.addon_misc import dump_result
from modules.util_local_tg import LOCAL_TG


def get_default_routes(ptr):
    """
    Fetch default routes for all nodes and store in MongoDB
    @param ptr: state-machine state pointer
        - relative value w.r.t. app.config["time_gap"]
    """
    default_routes_interval = app.config["get_default_routes"]
    time_gap = app.config["time_gap"]

    if ptr and isinstance(ptr, int):
        if default_routes_interval % time_gap:
            app.logger.error(
                "default_routes_interval must be divisible by time_gap; "
                "ptr = {0}, default routes not fetched, "
                "due to weird value in {1}".format(ptr, default_routes_interval)
            )
            return
        relative_time_elapsed = ptr % (default_routes_interval // time_gap)
        if not relative_time_elapsed:
            app.logger.note("Starting default routes fetch for all nodes.")
            fetch_and_store_default_routes()
        else:
            msg = "Default routes not fetched."
            next_update_time = default_routes_interval // time_gap
            app.logger.debug(
                "ptr = {0}, relative_time_elapsed = {1}, "
                "next_update_time = {2}, {3}".format(
                    ptr, relative_time_elapsed, next_update_time, msg
                )
            )
    else:
        msg = "ptr is not an integer. Failed to get default routes."
        app.logger.error("ptr = {0}; {1}".format(ptr, msg))


def fetch_and_store_default_routes():
    # get config args
    args = _prepare_args_for_default_routes()

    # get LOCAL_TG object
    my_server = LOCAL_TG(
        args,
        loggerTag="default_route_service",
        logPathDir=args["output_folder"],
        logFilePostfix=args["output_file_postfix"],
    )

    # obtain topology from E2E API call, do not store in MongoDB
    my_server.get_topology(to_mongo_db=False)

    # get default routes for all nodes using E2E API service
    app.logger.note("Fetching default routes for all nodes via E2E API service")
    default_routes = my_server.get_e2e_attribute(
        attribute="get_default_routes", nodes=my_server.topology.node.keys()
    )
    if default_routes:
        my_server.logger.info(
            "Number of nodes with default routes: {0}; "
            "Number of nodes in topology: {1}".format(
                len(default_routes.get("defaultRoutes", {})),
                len(my_server.topology.node),
            )
        )
        # add time field to default_routes data
        # datetime is not JSON serializable
        default_routes["time"] = "{0}".format(datetime.now())

    # dump default_routes to "default_routes" collection in MongoDB and disk
    dump_result(
        out_fp_no_suffix=args["output_folder"] + args["collection_name"],
        result=default_routes,
        logger=app.logger,
        use_JSON=True,
        to_mongo_db=True,
    )

    # disable LOCAL_TG logger and object
    my_server.logger.disable()
    my_server = None


def _prepare_args_for_default_routes():
    config_file = "{0}/config/{1}.json".format(
        app.config["fp"], app.config["network_name"]
    )
    args = {
        "name": app.config["network_name"],
        "collection_name": "default_routes",
        "output_folder": "{0}/network_default_routes/".format(app.config["tmp_folder"]),
        "output_file_postfix": "{0}".format(app.config["network_name"]),
    }
    app.logger.debug(
        "Prepare args for default route service, "
        "config = {0}, output_folder = {1}".format(config_file, args["output_folder"])
    )
    # get base config args + config file args + custom args
    return get_config_args(config_file=config_file, overwrite_args=args)
