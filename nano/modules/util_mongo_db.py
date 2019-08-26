#!/usr/bin/env python3

import datetime
import logging
import math

# built-ins
import os

from dateutil import tz
from gridfs import GridFS

# modules
from modules.util_logger import EmptyLogger
from pymongo import ASCENDING, DESCENDING, MongoClient


# make python2 and python3 compatible to check string type
try:
    basestring
except NameError:
    basestring = str

# global variables
TIME_FORMAT = "%Y-%m-%d %H:%M:%S"
UTC_ZONE = tz.tzutc()
LOCAL_ZONE = tz.tzlocal()  # obtain local time


def encodeForMongoDB(olddata):
    """
    mongodB does not support . or $ or \ as keys;
    so here we transform those into unicode
    """
    if not isinstance(olddata, dict):
        return olddata
    newdata = {}
    for key in olddata:
        newkey = key
        if not isinstance(key, basestring):
            newkey = "{0}".format(key)
        newkey = (
            newkey.replace("\\", "\\\\")
            .replace("\$", "\\u0024")
            .replace(".", "\\u002e")
        )
        newdata[newkey] = encodeForMongoDB(olddata[key])
    return newdata


def decodeForMongoDB(olddata, ui_request=False):
    """
    mongodB does not support . or $ or \ as keys;
    so here we transform those back
    """
    if not isinstance(olddata, dict):
        # When there are nan values in the data, replace it with null since
        # nan is invalid in json
        if ui_request and isinstance(olddata, float) and math.isnan(olddata):
            return None
        return olddata
    newdata = {}
    for key in olddata:
        newkey = (
            key.replace("\\\\", "\\").replace("\\u002e", ".").replace("\\u0024", "\$")
        )
        newdata[newkey] = decodeForMongoDB(olddata[key], ui_request=ui_request)
    return newdata


def get_current_datetime():
    """
    get current time in datetime format
    """
    t = datetime.datetime.utcnow()
    t = t.replace(microsecond=0)
    return t.replace(tzinfo=UTC_ZONE)  # set timezone in the timestamp


def datetime2string(utc_time, logger=None):
    """
    translate datetime to string (from utc zone to local zone)
    """
    try:
        # convert time zone
        utc_time = utc_time.replace(tzinfo=UTC_ZONE)
        local_time = utc_time.astimezone(LOCAL_ZONE)
        return local_time.strftime(TIME_FORMAT)
    except BaseException as ex:
        if logger is not None:
            logger.error("Failed to convert datetime to string")
            logger.error(ex)
    return ""


def string2datetime(timestamp, logger=None):
    """
    translate datetime to string (from utc zone to local zone)
    """
    try:
        local_time = datetime.datetime.strptime(timestamp, TIME_FORMAT)
        local_time = local_time.replace(tzinfo=LOCAL_ZONE)
        test_utc_time = local_time.astimezone(UTC_ZONE)
        return test_utc_time.replace(tzinfo=None)
    except BaseException as ex:
        if logger is not None:
            logger.error("Failed to convert string to datetime")
            logger.error(ex)
    return get_current_datetime()


def fetch_closest_data(test_utc_time, collection):
    """
    from collection, fetch the data closesnt in time to test_utc_timep
    @param collection: the collection from which to get data
    """
    # find the closest test data before and after test_utc_time and
    # determine which test data is closer to test_utc_time
    result_after = (
        collection.find({"time": {"$gte": test_utc_time}})
        .sort("time", ASCENDING)
        .limit(1)
    )
    result_before = (
        collection.find({"time": {"$lte": test_utc_time}})
        .sort("time", DESCENDING)
        .limit(1)
    )
    # only consider the data query that returns nonempty result
    if result_after.count() and result_before.count():
        result_after_data = next(result_after)
        result_before_data = next(result_before)
        test_result = (
            result_after_data
            if (
                test_utc_time - result_before_data["time"]
                > result_after_data["time"] - test_utc_time
            )
            else result_before_data
        )
    elif result_after.count():
        test_result = next(result_after)
    elif result_before.count():
        test_result = next(result_before)
    else:
        test_result = None
    return test_result


class MongoDB:
    """
    MongoDB provides interface to interact with the MongoDB in the server
    """

    def __init__(self, loggerTag="MongoDB", logPathDir=None, printout=True):
        """
        @param loggerTag: logger identifier
        @param logPathDir: path of where log stays
        @param printout: whether we print out the process, default True
        """
        if logPathDir is None:
            self.logger = EmptyLogger(loggerTag, printout=True)
        else:
            logpath_r = "{0}/log/".format(logPathDir)
            if not os.path.isdir(logpath_r):
                try:
                    os.makedirs(logpath_r)
                except BaseException:
                    logpath_r = logPathDir
            self.logger = EmptyLogger(
                loggerTag,
                logPath="{0}/log/tg_{1}.log".format(logPathDir, loggerTag),
                printout=printout,
                printlevel=logging.INFO,
            )
        # variables config
        self.client = MongoClient()
        self.db = self.client.analyzer

    def _write_parser(self, data, test):
        """
        parse data before write to database
        """
        output = {"test_type": test, "time": get_current_datetime()}
        # for ease of database queries, reformat the first layer data
        # if we use {linkName: {data}} structure
        # change to [{"name": linkName, data}] structure
        reformatData = []
        for key in data:
            if "link-" not in key:
                # reset as this is not the expected data structure
                # we still store it as it is
                reformatData = []
                break
            data[key]["name"] = key
            reformatData.append(encodeForMongoDB(data[key]))
        if reformatData:
            output["rdata"] = encodeForMongoDB(reformatData)
        else:
            # add key/value pairs in data to the output dict
            output.update(encodeForMongoDB(data))
        return output

    def write(self, data, test):
        """
        write data into MongoDB
        """
        self.logger.debug("writing test={0} to database".format(test))
        try:
            if test == "Link healthiness":
                collection = self.db.link_test
            elif test == "Multihop":
                collection = self.db.multihop_test
            elif test == "Ignition":
                collection = self.db.ignition_test
            else:
                collection = self.db[test]
        except BaseException as ex:
            self.logger.error(ex)
            return None
        # create indexing to avoid in-memory sort
        try:
            if "time_-1" not in collection.index_information():
                collection.create_index([("time", DESCENDING)], unique=True)
            output = self._write_parser(data, test)
            insertId = collection.insert_one(output).inserted_id
            self.logger.debug("Insert document to DB, id = {0}".format(insertId))
            return insertId
        except BaseException as ex:
            self.logger.error("Unable to insert document, due to {0}".format(ex))
            return None

    def gridfs_write(self, data, test):
        """
        write data (larger than 16MB) into MongoDB with GridFS
        GridFS is a specification for storing and retrieving files
            that exceed the BSON-document size limit of 16 MB
        """
        self.logger.debug("writing test={0} to database".format(test))
        try:
            fs = GridFS(self.db, test)
        except BaseException as ex:
            self.logger.error("Unable to get GridFS object, due to {0}".format(ex))
            return None
        try:
            output = encodeForMongoDB(data)
            insert_id = fs.put(output)
            self.logger.debug(
                "Insert document with GridFS to DB, id = {0}".format(insert_id)
            )
            return insert_id
        except BaseException as ex:
            self.logger.error(
                "Unable to insert document with GridFS, due to {0}".format(ex)
            )
            return None

    def gridfs_read(self, test, timestamp=""):
        """
        read one result from MongoDB with GridFS
        @param test: the name of the test (bucket name with GridFS)
        @param timestamp: in string format (output of datetime2string)
                          if not specified, will try to get the latest one
        """
        self.logger.debug("read {0} at {1}".format(test, timestamp))
        try:
            fs = GridFS(self.db, test)
            bucket = self.db[test]
        except BaseException:
            self.logger.error("Not able to load {0} from mongoDB".format(test))
            return None
        try:
            if timestamp:
                # convert timestamp from a string value to a datetime object
                utc_time = string2datetime(timestamp, self.logger)
                # GridFS uses two collections with a bucket named fs
                #   fs.files (files stores the file metadata) and
                #   fs.chunks (chunks stores the binary chunks)
                metadata = bucket.files.find_one({"uploadDate": utc_time})
                id = metadata["_id"]
            else:
                self.logger.debug("In gridfs_read, bucket = {0}".format(bucket))
                # find the latest one in the fs.files collection
                metadata = (
                    bucket.files.find().sort("uploadDate", DESCENDING).limit(1)[0]
                )
                # limit(1) -> limit(n) will enable the query for the last n entries
                id = metadata["_id"]
            self.logger.debug("With GridFS for {0}, id = {1}".format(test, id))
            result = fs.get(id).read()
            return decodeForMongoDB(result)
        except IndexError:
            return None

    def obtain_history_details(self, test, testNumLimit, timestampLimit=""):
        """
        obtain test history with details from MongoDB
        @param test: the name of the test type to fetch (in database)
        @param testNumLimit: the limit of query number
        @param timestampLimit: string, the limit of oldest query time
        """
        self.logger.debug(
            "get history {0}, num={1}, timebefore={2}".format(
                test, testNumLimit, timestampLimit
            )
        )
        timestampLimit = string2datetime(timestampLimit, self.logger)
        try:
            collection = self.db[test]
        except BaseException:
            self.logger.error("failed to get {} history".format(test))
            return []
        # create indexing to avoid in-memory sort
        if "time_-1" not in collection.index_information():
            collection.create_index([("time", DESCENDING)], unique=True)
        results = (
            collection.find({"test_type": test})
            .sort("time", DESCENDING)
            .limit(testNumLimit)
        )
        history = []
        if results is not None:
            for each in results:
                if "time" not in each:
                    continue
                if timestampLimit and each["time"] < timestampLimit:
                    break
                history.append(self._read_parser(each))
        return history

    def obtain_history(self, test, testNumLimit):
        """
        obtain test history (with time only) from MongoDB
        @param test: the name of test type to fetch (in database)
        @param testNumLimit: the limit of query number
        """
        self.logger.debug("get history {0}, limit={1}".format(test, testNumLimit))
        try:
            if test == "Link healthiness":
                collection = self.db.link_test
            elif test == "Multihop":
                collection = self.db.multihop_test
            elif test == "Ignition":
                collection = self.db.ignition_test
            else:
                collection = self.db[test]
        except BaseException:
            self.logger.error("fail to get {} history".format(test))
            return {}
        # create indexing to avoid in-memory sort
        if "time_-1" not in collection.index_information():
            collection.create_index([("time", DESCENDING)], unique=True)
        query_results = (
            collection.find({"test_type": test}, {"time": 1, "_id": 0})
            .sort("time", DESCENDING)
            .limit(testNumLimit)
        )
        history = {}
        if not query_results:
            return history
        index = 1
        for item in query_results:
            history["Test {}".format(index)] = datetime2string(item["time"])
            index += 1
        return history

    def remove(self, collection_name, timestamp):
        """
        remove analysis data from the collections

        @param collection_name: name of the collection to delete data from
        @param timestamp: the time of the test
        """
        try:
            collection = self.db[collection_name]
        except BaseException:
            self.logger.error(
                "Not able to load {0} from mongoDB".format(collection_name)
            )
            return False
        try:
            test_utc_time = string2datetime(timestamp, self.logger)
            test_result = fetch_closest_data(test_utc_time, collection)
            if not test_result:
                self.logger.error(
                    "Can't fetch data from collection {0}".format(collection_name)
                )
            collection.remove({"time": test_result["time"]})
        except BaseException:
            self.logger.error("Can't remove test data from {0}".format(collection_name))
            return False
        return True

    def _read_parser(self, result, excludeFields=None, ui_request=False):
        """
        parse data after read from database
        """
        if not result:
            return result
        # dealing with format change for ease of database queries
        # if we have {"rdata": [{"name": linkName, data}]} structure
        # change back to {linkName: {data}} structure
        if "rdata" in result:
            data = result.pop("rdata", [])
            for each in data:
                linkName = each.pop("name", "")
                if not linkName:
                    continue
                result[linkName] = each
        result.pop("_id", None)  # remove ObjectId for valid js parsing
        if "time" in result:
            result["time"] = datetime2string(result["time"], self.logger)
        if excludeFields and isinstance(excludeFields, list):
            for each in excludeFields:
                if each in result:
                    result.pop(each, None)
        return decodeForMongoDB(result, ui_request=ui_request)

    def read(self, test, timestamp="", excludeFields=None, ui_request=False):
        """
        read one test result from MongoDB
        @param test: the name of the test (collection name)
        @param timestamp: in string format (output of datetime2string)
                          if not specified, will try to get the latest one
        @param excludeFields: list, if set to None, do not exclude any
                              if is a list, loop over items (string of keys)
                              to remove the fields before turning
        """
        self.logger.debug("read {0} at {1}".format(test, timestamp))
        try:
            if test == "Link healthiness":
                collection = self.db.link_test
            elif test == "Multihop":
                collection = self.db.multihop_test
            elif test == "Ignition":
                collection = self.db.ignition_test
            else:
                collection = self.db[test]
        except BaseException:
            self.logger.error("Not able to load {0} from mongoDB".format(test))
            return None
        # create indexing to avoid in-memory sort
        if "time_-1" not in collection.index_information():
            collection.create_index([("time", DESCENDING)], unique=True)
        try:
            if timestamp:
                # convert timestamp from a string value to a datetime object
                test_utc_time = string2datetime(timestamp, self.logger)
                test_result = fetch_closest_data(test_utc_time, collection)
                if not test_result:
                    self.logger.error("Can't fetch data from Mongo")
            else:
                test_result = (
                    collection.find({"test_type": test})
                    .sort("time", DESCENDING)
                    .limit(1)[0]
                )
        except BaseException as ex:
            self.logger.error("Error in fetching data from MongoDB: {0}".format(ex))
            test_result = None
        return self._read_parser(test_result, excludeFields, ui_request)
