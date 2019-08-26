#!/usr/bin/env python3

import json
import os
import sys
from threading import Lock

from flask import Flask


# one and only place we do sys magic inside /api_server/
sys.path.append("../")
try:
    from modules.addon_misc import update_nested_dict
except BaseException:
    raise

#####################
# global configs
#####################
MULTI_THREAD_LOCK = Lock()
DEFAULT_ACCESS_ORIGIN = {"Access-Control-Allow-Origin": "*"}
app = Flask("NANO API")
nano_base_config_file = "{0}/config/nano_base.json".format(
    os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
)


def is_file_allowed(filename):
    """
    check if file format is allowed
    """
    return "." in filename and filename.rsplit(".", 1)[1].lower() == "json"


def load_geojson_topology_files(uploadFolder):
    """
    load geojson files
    """
    response = {"status": "success"}
    for key in ["site", "node", "link"]:
        fp = "{0}/geojson_topology_{1}.json".format(uploadFolder, key)
        response[key] = {}
        if os.path.isfile(fp):
            try:
                response[key] = json.load(open(fp))
            except BaseException as ex:
                print("Cannot read file due to {0}".format(ex))
    return response


def get_config_args(base_config_file=None, config_file=None, overwrite_args=None):
    """
    This function returns a dictionary with params from three layers:
        1. Base config params: loaded from /config/nano_base.json, unless specified
        2. Trial specific config file params
        3. Any additional params that need to be overwritten

    @param base_config: Absolute path of base config file. Will choose
        config/nano_base.json if not specified
    @param config_file: Path to config file that will be loaded
        and overwritten on top of the base config params
    @param overwrite_args: dictionary that has params that will be
        overwritten on top of the base config params
    """
    base_config_file = base_config_file if base_config_file else nano_base_config_file
    config_file = config_file if config_file and os.path.isfile(config_file) else None
    overwrite_args = overwrite_args if overwrite_args else {}

    # load base config params
    try:
        config_args = json.load(open(base_config_file))
    except BaseException:
        app.logger.error("Cannot load the base config file. Exiting.")
        sys.exit(1)

    if config_file:
        try:
            # load config_file
            diff_args = json.load(open(config_file, "r"))

            # overwrite config_file params on top of base config params
            app.logger.debug("Update config_args from {0}".format(config_file))
            update_nested_dict(config_args, diff_args)
        except BaseException:
            app.logger.error("Cannot load {0}!".format(config_file))

    # overwrite overwrite_args on top of base config params and
    #  config params from trial specific config_file
    if overwrite_args:
        update_nested_dict(config_args, overwrite_args)

    return config_args
