#!/usr/bin/env python3

import json
import os
import time
from subprocess import check_output

from base import (
    DEFAULT_ACCESS_ORIGIN,
    MULTI_THREAD_LOCK,
    app,
    is_file_allowed,
    load_geojson_topology_files,
)
from flask import jsonify, request
from modules.util_mongo_db import MongoDB
from optimization import prepare_args_for_optimizer
from perform_single_test import perform_single_test, suspend_running_test
from tool.optimizer import get_configs, optimizer_wrapper


##############################################################
############################ NOTE ############################
##############################################################
### return format is always {"status": xxx} or {"err": xxx} ##
##############################################################

# TODO: we need sanity checks for the request input to prevent security issues


@app.errorhandler(500)
def internal_error(error):
    return jsonify({}), 500, DEFAULT_ACCESS_ORIGIN


@app.route("/")
def hello_world():
    return jsonify({}), 200, DEFAULT_ACCESS_ORIGIN


@app.route("/delete_analysis_data", methods=["POST"])
def delete_analysis_data():
    """
    Delete test data from mongo collections
    @param geojson_name: the geojson collection name of the test
    @param json_name: the json collection name of the test
    @param time: the time of the test
    """
    request_info = request.get_json(force=True)
    json_name = request_info.get("json_name")
    geojson_name = request_info.get("geojson_name")
    time = request_info.get("time")
    if not json_name or not geojson_name or not time:
        return jsonify({"err", "missing param"}), 400, DEFAULT_ACCESS_ORIGIN
    try:
        mongodb = MongoDB(
            loggerTag="MongoDB_delete_analysis_data",
            logPathDir=app.config["tmp_folder"] + "/MongoDB",
        )
    except BaseException as ex:
        errmsg = "Failed to initialize mongo: {0}".format(ex)
        app.logger.error(errmsg)
        return jsonify({"err": errmsg}), 500, DEFAULT_ACCESS_ORIGIN
    result = mongodb.remove(json_name, time)
    if not result:
        # disable MongoDB logger
        mongodb.logger.disable()
        errmsg = "Failed to delete json analysis data"
        app.logger.error(errmsg)
        return jsonify({"err": errmsg}), 400, DEFAULT_ACCESS_ORIGIN
    result = mongodb.remove(geojson_name, time)
    # disable MongoDB logger
    mongodb.logger.disable()
    if not result:
        errmsg = "Failed to delete geojson analysis data"
        app.logger.error(errmsg)
        return jsonify({"err": errmsg}), 400, DEFAULT_ACCESS_ORIGIN
    else:
        return jsonify(result), 200, DEFAULT_ACCESS_ORIGIN


@app.route("/get_json_name", methods=["POST"])
def get_json_name():
    """
    Return the name of the corresponding Json collection for the input GeoJson
    collection
    @param geojson_name: the input geojson name
    """
    info = request.get_json(force=True)
    # open the config file to get the corresponding Json collection name
    try:
        with open(
            "{0}/config/geojson_to_json.json".format(
                os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
            ),
            "r",
        ) as file:
            geojson_json_dict = json.loads(file.read())
    except BaseException as ex:
        errmsg = "Cannot get json collection name due to {0}".format(ex)
        return jsonify({"err": errmsg}), 500, DEFAULT_ACCESS_ORIGIN
    geojson_name = info.pop("geojson_name", "")
    # if the geojson name is not a key of geojson_json_dict, it's invalid
    if geojson_name in geojson_json_dict:
        return jsonify(geojson_json_dict[geojson_name]), 200, DEFAULT_ACCESS_ORIGIN
    else:
        errmsg = "Invalid GeoJson collection name"
        app.logger.error(errmsg)
        return jsonify({"err": errmsg}), 400, DEFAULT_ACCESS_ORIGIN


@app.route("/survey_data", methods=["POST"])
def survey_data():
    """
    API to upload survey data
    """
    if not request.method == "POST":
        return jsonify({"err": "wrong method"}), 400, DEFAULT_ACCESS_ORIGIN
    info = request.get_json(force=True)
    surveyname = info.pop("surveyname", "")
    key = info.pop("key", "")
    value = info.pop("value", "")
    if not surveyname or not key or not value:
        return jsonify({"err", "missing param"}), 400, DEFAULT_ACCESS_ORIGIN
    mongodb = MongoDB(
        loggerTag="MongoDB_survey_data",
        logPathDir=app.config["tmp_folder"] + "/MongoDB",
    )
    is_success = mongodb.write(
        {"key": key, "value": value}, "survey_{}".format(surveyname)
    )
    if is_success:
        response = {"success": "done"}
        status_code = 200
    else:
        response = {"err": "cannot write to db"}
        status_code = 500
    mongodb.logger.disable()
    mongodb = None
    return jsonify(response), status_code, DEFAULT_ACCESS_ORIGIN


@app.route("/test_suspend", methods=["POST"])
def test_suspend():
    """
    API to suspend all network analyzer test
    """
    if not request.method == "POST":
        return jsonify({"err": "wrong method"}), 400, DEFAULT_ACCESS_ORIGIN
    if suspend_running_test():
        return (
            jsonify({"status": "success", "test_type": app.config["prev_state"]}),
            200,
            DEFAULT_ACCESS_ORIGIN,
        )
    return (
        jsonify({"err": "failed", "test_type": app.config["curr_state"]}),
        200,
        DEFAULT_ACCESS_ORIGIN,
    )


@app.route("/get_history", methods=["POST"])
def get_history():
    # initialize MongoDB
    mongodb = MongoDB(
        loggerTag="MongoDB_get_history",
        logPathDir=app.config["tmp_folder"] + "/MongoDB",
    )
    if not request.method == "POST":
        return jsonify({"err": "wrong method"}), 400, DEFAULT_ACCESS_ORIGIN
    info = request.get_json(force=True)
    history = mongodb.obtain_history(info["test"], app.config["query_limit"])
    mongodb.logger.disable()
    mongodb = None
    return jsonify(history), 200, DEFAULT_ACCESS_ORIGIN


@app.route("/perform_optimization", methods=["POST"])
def perform_optimization():
    if not request.method == "POST":
        return jsonify({"err": "wrong method"}), 400, DEFAULT_ACCESS_ORIGIN
    request_info = request.get_json(force=True)
    # need optimization type to run
    if (
        "polarity" not in request_info
        and "pathreplace" not in request_info
        and "golay" not in request_info
    ):
        return jsonify({"err", "missing param"}), 500, DEFAULT_ACCESS_ORIGIN
    # construct args as in `tool/optimizer`
    args = prepare_args_for_optimizer(request_info)
    config_args = get_configs(args)
    optimizer_wrapper(config_args)
    # read generated topology file
    if request_info.get("golay", None):
        fp = config_args["optimization"]["golay"]["fp"]
    elif request_info.get("pathreplace", None):
        fp = config_args["optimization"]["pathreplace"]["fp"]
    elif request_info.get("polarity", None):
        fp = config_args["optimization"]["polarity"]["fp"]
    else:
        fp = None
    response = json.load(open(fp)) if fp else {}
    return jsonify(response), 200, DEFAULT_ACCESS_ORIGIN


@app.route("/convert_topology_json_to_geojson", methods=["POST"])
def convert_topology_json_to_geojson():
    """
    Handle to convert topology json to geojson
    """
    # validation
    if not request.method == "POST":
        return jsonify({"err": "wrong method"}), 400, DEFAULT_ACCESS_ORIGIN
    if "file" not in request.files:
        return jsonify({"err": "no file"}), 400, DEFAULT_ACCESS_ORIGIN
    file = request.files["file"]
    if file.filename == "":
        return jsonify({"err": "no selected file"}), 400, DEFAULT_ACCESS_ORIGIN
    doPrediction = "predict" in request.form.get("predict", "")
    # only 200 runs, otherwise too long to wait
    uploadFolder = "{0}/topo_convert_{1}".format(
        app.config["tmp_folder"], int(time.time() * 200)
    )
    if not os.path.isdir(uploadFolder):
        try:
            os.makedirs(uploadFolder)
        except BaseException as ex:
            errmsg = "Cannot create directory due to {0}".format(ex)
            return jsonify({"err": errmsg}), 500, DEFAULT_ACCESS_ORIGIN
    # write uploaded json to folder
    filepath = "{0}/topology_viewer_user_topology.json".format(uploadFolder)
    if file and is_file_allowed(file.filename):
        file.save(filepath)
    # generate geojson
    if os.path.isfile(filepath):
        myCommand = "python {0}/tool/geogen.py dummy ".format(
            app.config["fp"]
        ) + "-tp {0} -o {1} --no-database".format(filepath, uploadFolder)
        if doPrediction:
            myCommand += " --predict"
        # Popen is non-blocking but we need the results after running command
        # so here we use check_output instead
        try:
            check_output(myCommand, shell=True)
        except BaseException as ex:
            errmsg = "Cannot get topology due to {0}".format(ex)
            return jsonify({"err": errmsg}), 500, DEFAULT_ACCESS_ORIGIN
    # read generated geojsons
    response = load_geojson_topology_files(uploadFolder)
    return jsonify(response), 200, DEFAULT_ACCESS_ORIGIN


@app.route("/get_data", methods=["POST"])
def get_data():
    """
    Get data from database
    @param test: the test type, the same as database.collections
    @param time: the test time in string format
    """
    if not request.method == "POST":
        return jsonify({"err": "wrong method"}), 400, DEFAULT_ACCESS_ORIGIN
    request_info = request.get_json(force=True)
    # need name of test to get data
    if "test" not in request_info:
        return jsonify({"err", "missing param"}), 500, DEFAULT_ACCESS_ORIGIN
    # if no time string (not timestamp) specified, get the latest
    if "time" not in request_info:
        request_info["time"] = ""
    # initialize MongoDB
    mongodb = MongoDB(
        loggerTag="MongoDB_get_data", logPathDir=app.config["tmp_folder"] + "/MongoDB"
    )
    result = mongodb.read(request_info["test"], request_info["time"], ui_request=True)
    mongodb.logger.disable()
    mongodb = None
    if result is None:
        return (
            jsonify(
                {
                    "err": "failed to find {0} at time {1}".format(
                        request_info["test"], request_info["time"]
                    )
                }
            ),
            404,
            DEFAULT_ACCESS_ORIGIN,
        )
    return jsonify(result), 200, DEFAULT_ACCESS_ORIGIN


@app.route("/is_test_running", methods=["GET"])
def is_test_running():
    """
    Check if test is running or not
    TODO: decide if we check upon request, or report based on state machine
          only; currently we check based on state machine, which has minimal
          overheads when users grow
    """
    if not request.method == "GET":
        return jsonify({"err": "wrong method"}), 400, DEFAULT_ACCESS_ORIGIN
    if app.config["curr_state"]:
        return (
            jsonify(
                {
                    "status": "running",
                    "start_time": app.config["curr_start_time"],
                    "test_type": app.config["curr_state"],
                }
            ),
            200,
            DEFAULT_ACCESS_ORIGIN,
        )
    return (
        jsonify(
            {
                "status": "idle",
                "start_time": app.config["prev_start_time"],
                "end_time": app.config["prev_end_time"],
                "test_type": app.config["prev_state"],
            }
        ),
        200,
        DEFAULT_ACCESS_ORIGIN,
    )


@app.route("/get_prev_test_stat", methods=["GET"])
def get_prev_test_stat():
    """
    Get the previous test information
    """
    return (
        jsonify(
            {
                "status": "done",
                "prev_start_time": app.config["prev_start_time"],
                "prev_end_time": app.config["prev_end_time"],
                "prev_test_type": app.config["prev_state"],
            }
        ),
        200,
        DEFAULT_ACCESS_ORIGIN,
    )


@app.route("/set_states", methods=["POST"])
def set_states():
    """
    Set states from NANO UI
    """
    if not request.method == "POST":
        return jsonify({"err": "wrong request"}), 400, DEFAULT_ACCESS_ORIGIN
    # get setup
    test_config = request.get_json(force=True)
    app.logger.debug("test_config = {0}".format(test_config))
    test_type = test_config.pop("test_type", "")
    try:
        priority = int(test_config.pop("priority", 0))
        if priority < 0:
            priority = 0
        ptr = int(test_config.pop("ptr", None))
        app.logger.debug("priority = {0}, ptr = {1}".format(priority, ptr))
    except BaseException:
        return jsonify({"err": "incorrect param"}), 400, DEFAULT_ACCESS_ORIGIN
    # validation
    if ptr is None or ptr >= len(app.config["states"]) or ptr < 0:
        return jsonify({"err": "invalid param"}), 400, DEFAULT_ACCESS_ORIGIN
    app.logger.debug(
        "previous state for scheduled ptr {0} is {1}".format(
            ptr, app.config["states"][ptr]
        )
    )
    # set states
    MULTI_THREAD_LOCK.acquire()
    app.config["states"][ptr] = [test_type, test_config, priority, 0, 0]
    MULTI_THREAD_LOCK.release()
    app.logger.info(
        "Scheduled {0} test at next ptr {1} with priority {2}".format(
            test_type, test_config, priority
        )
    )
    return (
        jsonify({"status": "success", "states": app.config["states"][ptr]}),
        200,
        DEFAULT_ACCESS_ORIGIN,
    )


@app.route("/get_states", methods=["POST"])
def get_states():
    """
    NANO UI to obtain states from state machine
    """
    if not request.method == "POST":
        return jsonify({"err": "wrong request"}), 400, DEFAULT_ACCESS_ORIGIN
    # allow post method to query finer-coarser grained states
    info = request.get_json(force=True)
    try:
        every = int(info.pop("every", 600))
    except BaseException:
        app.logger.error("cannot convert `every` into integer!")
        return jsonify({"err": "bad request"}), 400, DEFAULT_ACCESS_ORIGIN
    # querying state machines with 8640 (if 10s states) is too much
    # limit it to 1 min states to query
    if every < 60:
        every = 60
    num = len(app.config["states"])
    stepSize = every * num // 86400
    states = app.config["states"][::stepSize]
    return jsonify({"status": "done", "states": states}), 200, DEFAULT_ACCESS_ORIGIN


@app.route("/perform_test", methods=["POST"])
def perform_test():
    """
    Perform the test API
    """
    if not request.method == "POST":
        return jsonify({"err": "wrong request"}), 400, DEFAULT_ACCESS_ORIGIN
    testConfig = request.get_json(force=True)
    testType = testConfig.pop("testType", "")
    priority = testConfig.pop("priority", 0)
    if not testType:
        return jsonify({"err": "missing param"}), 400, DEFAULT_ACCESS_ORIGIN
    # perform single test
    app.logger.debug(
        "entering perform_test: testType=`{0}`, testConfig={1}".format(
            testType, testConfig
        )
    )
    status, msg = perform_single_test(testType, testConfig, priority, ptr=None)
    key = "status" if status else "err"
    return jsonify({key: msg}), 200, DEFAULT_ACCESS_ORIGIN


def start_flask(host, port):
    app.run(host=host, port=port)
