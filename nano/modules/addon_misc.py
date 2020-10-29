#!/usr/bin/env python3

import collections
import json

# built-ins
import os
import time
from datetime import datetime
from subprocess import check_output

import modules.keywords as KEY
import numpy as np
import requests
from modules.util_math import max
from modules.util_mongo_db import MongoDB


try:
    import cPickle as pickle
except ModuleNotFoundError:
    import pickle


# global param
# beamwidth of the broadside beam (in terms of index)
BORESIDE_BW = 10
# minimum reporeted RSSI
RSSI_MINIMUM = -80
# minimum reporeted SNR in dB
SNR_MINIMUM = -10
# threshold to judge if SNR is saturated
SNR_SATURATE_THRESH = 25
# threshold to judge if RSSI is saturated
RSSI_SATURATE_THRESH = -40
# how far two identified routes should be (in idx)
SIMILAR_BEAM_SEPERATE = 6
SECONDS_DAY = 86400
SECONDS_HOUR = 3600


def _generate_normalized_data(data, values):
    normalize_data = data
    for s_key, s_val in values.items():
        try:
            if str(s_key) == "dashboard":
                normalize_data["normal"][s_key] = str(s_val)
            elif str(s_key) == "healthiness":
                normalize_data["normal"][s_key] = str(s_val)
            else:
                normalize_data["int"][s_key] = int(s_val)
        except ValueError:
            normalize_data["int"][s_key] = int(0)
        except TypeError:
            normalize_data["int"][s_key] = int(0)
    return normalize_data


def write_data_to_scuba(fieldname, args, result, logger=None, normalize=True):
    """
    write data to scuba graph.facebook.com/scribe_logs
    """
    if not args["write_tests_to_scuba"]:
        return
    if logger is not None:
        logger.note("Writing data to scuba")
    now_time = int(time.time())
    for f_key, f_value in result.items():
        normalize_data = {}
        normalize_data["normal"] = {}
        normalize_data["normal"]["deployment_site"] = args["network_name"]
        tag = ""
        if args["tests"]["iperf_p2p"]["do_it"]:
            tag = "iperf"
            if "udp" in args["tests"]["iperf_p2p"]["type"]:
                tag += "_udp"
            if "tcp" in args["tests"]["iperf_p2p"]["type"]:
                tag += "_tcp"
        elif args["tests"]["ping_p2p"]["do_it"]:
            tag = "ping"
        elif args["tests"]["ping_sa"]["do_it"]:
            tag = "sector_availability"
        elif args["tests"]["iperf_multihop"]["do_it"]:
            tag = "multihop"
            if "udp" in args["tests"]["iperf_multihop"]["type"]:
                tag += "_udp"
            if "tcp" in args["tests"]["iperf_multihop"]["type"]:
                tag += "_tcp"
        normalize_data["normal"]["test_tag"] = tag
        normalize_data["normal"]["ping_layer"] = args["tests"]["ping_p2p"]["layer"]
        normalize_data["normal"]["rate"] = args["tests"]["iperf_p2p"]["rate"]
        normalize_data["normal"]["duration"] = args["tests"]["iperf_p2p"]["rate"]
        normalize_data["int"] = {}
        normalize_data["int"]["time"] = now_time
        normalize_data["normal"]["link"] = f_key
        if normalize is True:
            normalize_data = _generate_normalized_data(normalize_data, f_value)
        else:
            ## only one entry for each item, no need for normalization
            normalize_data["int"][f_key] = int(f_value)
        normalize_data = str(normalize_data).replace("'", '\\"')
        scribe_data = (
            '[{"message":"'
            + normalize_data
            + '", "category":"perfpipe_terragraph_network_analyzer"}]'
        )
        payload = (
            ("access_token", "1006525856036161|926a09b493836a08e9d91093a5ca9f23"),
            ("logs", [scribe_data]),
        )
        r = requests.post("https://graph.facebook.com/scribe_logs", data=payload)
        if logger is not None:
            logger.debug(r.json())


def load_result(fp, logger=None):
    try:
        if ".pickle" in fp:
            try:
                with open(fp, "rb") as inf:
                    result = pickle.load(inf, encoding="latin1")
            except TypeError:
                with open(fp, "rb") as inf:
                    result = pickle.load(inf)
        else:
            try:
                with open(fp, "r") as inf:
                    result = json.load(inf)
            except BaseException:
                # hard-code to handle
                # `SSH_AUTH_SOCK missing` error for dog fooding
                check_output("sed -i '1d' {}".format(fp), shell=True)
                with open(fp, "r") as inf:
                    result = json.load(inf)
    except BaseException as ex:
        if logger is None:
            print(ex)
        else:
            logger.error(ex)
        return {}
    return result


def dump_result(
    out_fp_no_suffix,
    result,
    logger=None,
    use_pickle=False,
    use_JSON=False,
    to_mongo_db=False,
    output_folder=None,
    mongo_logger_name=None,
    use_gridfs=False,
):
    """
    Dump results to local folder and mongoDB:
    @param out_fp_no_suffix: output filepath without json and pickle suffix
    @param result: result to be dumpped
    @param logger: input logger
    @param use_pickle: whether to dump in pickle format, if failed, use JSON
    @param use_JSON: whether to dump in JSON format
    @param to_mongo_db: whether to dump into mongoDB
    @param output_folder: output_folder for the entire result + log files
    @param mongo_logger_name: name for the mongoDB logger
    @param use_gridfs: whether to use GridFS operation
           for large file (> 16MB) during mongoDB storage
    """
    logger and logger.note(
        "Dumping data into {0}; "
        "use_pickle= {1}, use_JSON = {2}, to_mongo_db = {3}".format(
            out_fp_no_suffix, use_pickle, use_JSON, to_mongo_db
        )
    )

    # validate results
    if not result:
        logger and logger.error("Got nothing to dump")
        return ""

    if use_pickle:
        try:
            out_fp = out_fp_no_suffix + ".pickle"
            with open(out_fp, "wb") as of:
                pickle.dump(result, of, protocol=pickle.HIGHEST_PROTOCOL)
        except BaseException:
            use_JSON = True

    if use_JSON:
        try:
            out_fp = (
                out_fp_no_suffix
                if ".json" in out_fp_no_suffix
                else out_fp_no_suffix + ".json"
            )
            with open(out_fp, "w") as of:
                json.dump(result, of, indent=2)
        except BaseException as err:
            logger and logger.error("Got BaseException: {0}".format(err))
            return ""

    if to_mongo_db:
        _dump_to_mongodb(
            out_fp_no_suffix,
            result,
            mongo_logger_name,
            output_folder,
            use_gridfs,
            logger,
        )
    return out_fp


def _dump_to_mongodb(
    out_fp_no_suffix,
    result,
    mongo_logger_name=None,
    output_folder=None,
    use_gridfs=False,
    logger=None,
):
    try:
        # initialize MongoDB
        mongodb = MongoDB(
            loggerTag=mongo_logger_name if mongo_logger_name else "MongoDB",
            logPathDir=output_folder if output_folder else None,
        )
        mongodb_logger = mongodb.logger if not logger else logger

        mongodb_logger.debug(
            "Prepare to dump data written to {0} collection".format(
                os.path.basename(out_fp_no_suffix)
            )
        )
        if use_gridfs:
            # convert to object with string before mongodb.gridfs_write operation
            #   due to GridFS requirement of strings of file-like object
            string_result = json.dumps(result)
            insert_id = mongodb.gridfs_write(
                string_result, os.path.basename(out_fp_no_suffix)
            )
        else:
            insert_id = mongodb.write(result, os.path.basename(out_fp_no_suffix))
        mongodb_logger.info(
            "Data written to {0} collection, insertId = {1}, "
            "use_gridfs = {2}".format(
                os.path.basename(out_fp_no_suffix), insert_id, use_gridfs
            )
        )

        # disable MongoDB logger
        mongodb.logger.disable()
        mongodb = None
    except BaseException as ex:
        logger and logger.error("Got BaseException: {0}".format(ex))


def get_range(start="", end="", duration=-1, offset=-1):
    """
    Either use start/end OR use duration/offset
    Input start/end are strings time, output is int
    (e.g. '2017-10-30 16:36:46' --> 1509406606)
    If start/end are not used (set to ''), use duration/offset
    offset: offset in past from current time
    duration: is duration around that offset
    """
    fmt = "%Y-%m-%d %H:%M:%S"
    if start:
        start = int(datetime.strptime(start, fmt).strftime("%s"))
    if end:
        end = int(datetime.strptime(end, fmt).strftime("%s"))

    if start and end:
        pass
    elif start and duration >= 0:
        end = start + duration
    elif end and duration >= 0:
        start = end - duration
    else:
        if duration < 0:
            duration = 100
        if offset < 0:
            offset = duration / 2
        now = time()
        start = now - offset - (duration / 2)
        end = now - offset + (duration / 2)
    return int(start), int(end)


def get_emails(args, field=""):
    """
    get email address
    @return list
    """
    if args["enable_per_test_emailing"]:
        if field in args["tests"]:
            return args["tests"][field]["emails"]
    elif args["global_email_lists"]:
        return args["global_email_lists"]
    return []


def epoch2readable(epoch):
    """
    convert epoch time (in seconds) to readable format
    """
    return time.strftime("%H:%M:%S, %a, %b %d, %Y", time.localtime(epoch))


def convertNone2NaN(stuff):
    """
    convert None result to nan, otherwise no change
    """
    if stuff is None:
        return "nan"
    return stuff


def convert2Bool(stuff):
    """
    convert string or integer 0/1 to bool
    """
    return stuff.lower() in ["true", "yes", "y", "yea", "1", 1]


def is_equal_lists(list_a, list_b):
    return True if set(list_a) == set(list_b) else False


def _get_cluster_beam_idx_compute(data_map, results, s_thresh, t_thresh, beamIdx2Idx):
    myMax = np.int(max(data_map))
    # check if saturated
    is_saturated = myMax > s_thresh
    while myMax >= t_thresh:
        tmp = np.unravel_index(data_map.argmax(), data_map.shape)
        results.append(
            (beamIdx2Idx[np.int(tmp[0])], beamIdx2Idx[np.int(tmp[1])], myMax)
        )
        # clear up map for finished cross
        txLeft = max([tmp[0] - int(BORESIDE_BW / 2), 0])
        txRight = min([tmp[0] + int(BORESIDE_BW / 2), 63])
        rxLeft = max([tmp[1] - int(BORESIDE_BW / 2), 0])
        rxRight = min([tmp[1] + int(BORESIDE_BW / 2), 63])
        for i in range(txLeft, txRight + 1):
            for j in range(0, 64):
                # check if sidelobe less than 12dB (+-1dB variation),
                # or is saturated, or map idx for rx is on the left/right
                if (
                    is_saturated
                    or (data_map[i, j] < myMax - 12)
                    or (j >= rxLeft and j <= rxRight)
                ):
                    data_map[i, j] = t_thresh - 1
        for j in range(rxLeft, rxRight + 1):
            for i in range(0, 64):
                # check if sidelobe less than 12dB (+-1dB variation),
                # or is saturated, or map idx for rx is on the left/right
                if (
                    is_saturated
                    or (data_map[i, j] < myMax - 12)
                    or (i >= txLeft and i <= txRight)
                ):
                    data_map[i, j] = t_thresh - 1
        myMax = np.int(max(data_map))


def get_cluster_beam_idx(data, use_rssi=True, target=None):
    """
    derive a list of beam index pairs for tx and rx
    @return [(txIdx, rxIdx, signal strength - either SNR or RSSI)]
    """
    # TODO: assume 64-by-64 beam choices
    data_map = np.array([[0] * 64] * 64)
    # easy conversion between beam index and actual map index
    beamIdx2Idx = list(range(31, -1, -1)) + list(range(32, 64))
    results = []
    # set threshold: stop reporting if all lower than it
    saturation_threshhold = SNR_SATURATE_THRESH
    if use_rssi:
        saturation_threshhold = RSSI_SATURATE_THRESH
    tolerate_threshhold = target
    if target is None:
        tolerate_threshhold = 1
        if use_rssi:
            tolerate_threshhold = RSSI_MINIMUM + 10
    for i in range(0, 64):
        for j in range(0, 64):
            tx__rx = "{0}_{1}".format(beamIdx2Idx[i], beamIdx2Idx[j])
            if use_rssi:
                data_pt = RSSI_MINIMUM
                if tx__rx in data:
                    data_pt = data[tx__rx][KEY.RSSI]
            else:
                data_pt = SNR_MINIMUM
                if tx__rx in data:
                    data_pt = data[tx__rx][KEY.SNR]
            data_map[i][j] = data_pt
    _get_cluster_beam_idx_compute(
        data_map, results, saturation_threshhold, tolerate_threshhold, beamIdx2Idx
    )
    #  remove sidelobes based on rank assuming they share similar
    #  rxBeam or txBeam idx
    for i in range(len(results) - 1, -1, -1):
        for j in range(len(results) - 1, i, -1):
            diff_tx = abs(beamIdx2Idx[results[i][0]] - beamIdx2Idx[results[j][0]])
            diff_rx = abs(beamIdx2Idx[results[i][1]] - beamIdx2Idx[results[j][1]])
            if diff_tx < SIMILAR_BEAM_SEPERATE or diff_rx < SIMILAR_BEAM_SEPERATE:
                del results[j]
    return results


def get_link_log_url(node_a_mac, node_z_mac, startT, endT):
    """
    Generate link_log URL for email notification/reporting
    """
    if node_a_mac is None or node_z_mac is None:
        return ""

    url = "https://our.intern.facebook.com/intern/network/terragraph/link_log/?"
    node_a = "node_a={0}".format(node_a_mac)
    node_z = "node_z={0}".format(node_z_mac)

    startT_temp = startT
    endT_temp = endT
    local_time = datetime.now()
    local_time = time.mktime(local_time.timetuple())
    utc_time = datetime.utcnow()
    utc_time = time.mktime(utc_time.timetuple())
    # 7 for day-light saving period, and 8 for the rest
    # hour_diff = int(round(abs(utc_time - local_time) / SECONDS_HOUR))
    hour_diff = 7
    start_time = (startT - hour_diff * SECONDS_HOUR) % SECONDS_DAY
    start_date = "start_date={0}000".format(startT_temp - start_time)  # ms
    start_time = "start_time={0}".format(start_time)
    # local time display
    start_time_local = time.strftime("%I:%M:%S%p", time.localtime(startT))
    start_time_display = "start_time_display=" + start_time_local

    end_time = (endT - hour_diff * SECONDS_HOUR) % SECONDS_DAY
    end_date = "end_date={0}000".format(endT_temp - end_time)
    end_time = "end_time={0}".format(end_time)
    # local time display
    end_time_local = time.strftime("%I:%M:%S%p", time.localtime(endT))
    end_time_display = "end_time_display=" + end_time_local

    # Calculate configs based on (startT - endT): sample ratio and sample num
    sampling_ratio = 1
    total_sample_num = endT - startT
    # assume 1 sample/second
    sample_num = int(total_sample_num / sampling_ratio)
    sample = "sample=" + "{}".format(sample_num)
    sampling_ratio = "sampling_ratio=" + "{}".format(sampling_ratio)
    url += "&".join(
        [
            node_a,
            start_date,
            start_time_display,
            start_time,
            sample,
            sampling_ratio,
            node_z,
            end_date,
            end_time_display,
            end_time,
        ]
    )
    return url


def update_nested_dict(base_dict, overwrite_dict):
    """
    recursively update nested dictionaries
    """
    for key, value in overwrite_dict.items():
        if isinstance(value, collections.Mapping):
            base_dict[key] = update_nested_dict(base_dict.get(key, {}), value)
        else:
            base_dict[key] = value
    return base_dict


def align_timeseries_data(data1, data2, useMicroSec=True):
    """
    align the input pair of two timeseries data piece
    @param data1 & data2: both [(time in us, val), ...] data
                          here we assume data is not compressed and will not
                          perform interpolation (get_fw_stats has comrpession
                          disabled by default); if not, passed in data should
                          be already exptrapolated
    @return aligned data1 & data2
    """
    factor = 1
    alignedData1 = []
    alignedData2 = []
    if useMicroSec:
        factor = 1000000.0
    if not data1 or not data2:
        return alignedData1, alignedData2
    data1dict = dict([int(round(each[0] / factor)), each[-1]] for each in data1)
    data2dict = dict([int(round(each[0] / factor)), each[-1]] for each in data2)
    tData1 = list(data1dict.keys())
    tData2 = list(data2dict.keys())
    # find the start/end of the max overlapped time
    tStart = max([min(tData1), min(tData2)])
    tEnd = min([max(tData1), max(tData2)])
    # align
    for t in range(tStart, tEnd + 1):
        if t not in data1dict or t not in data2dict:
            continue
        alignedData1.append((t, data1dict[t]))
        alignedData2.append((t, data2dict[t]))
    return alignedData1, alignedData2


def loadJson(fp):
    # load mcsHistogramudp.json and write to mongoDB
    with open(fp, "r") as of:
        data = json.load(of)
    return data
