#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved.


import logging
import json
import time
from typing import Dict, List, Union, Optional

from api.alias import (
    ParsedNetworkInfoType,
    ParsedReceivedJsonDataType,
    ParsedSchedulerDataType,
    ValidatedMultiHopParametersType,
)
from api.models import TestRunExecution, TestSchedule, TestStatus
from django.db import transaction
from django.db.models import Count
from django.forms.models import model_to_dict
from logger import Logger


# class of functions to access mysql using django ORM

_log = Logger(__name__, logging.DEBUG).get_logger()


class MySqlHelper:
    """
        Set of functions used to abstract mysql access.  This class is using
        the django ORM.
    """

    def __init__(self, topology_id: int = 0, topology_name: str = "") -> None:
        self.topology_id = topology_id
        self.topology_name = topology_name

    # read test_schedule rows with variable filter input
    def read_test_schedule(self, **kwargs) -> List[Dict]:
        if self.topology_id:
            ts_obj = TestSchedule.objects.filter(
                **kwargs, test_run_execution__topology_id=self.topology_id
            )
        else:
            ts_obj = TestSchedule.objects.filter(**kwargs)
        ts_dict = {}
        for obj in ts_obj:
            ts_dict[obj.id] = model_to_dict(obj)
        return ts_dict

    def delete_test_run_execution(self, **kwargs) -> None:
        tre = TestRunExecution.objects.filter(**kwargs)
        if tre:
            # this deletes from all foreign tables too
            tre.delete()

    def update_test_run_execution(self, id, **kwargs) -> None:
        TestRunExecution.objects.filter(id=id).update(**kwargs)

    def delete_test_schedule(self, **kwargs) -> None:
        ts = TestSchedule.objects.filter(**kwargs)
        if ts:
            ts.delete()

    def read_test_run_execution(self, **kwargs) -> List[Dict]:
        tre_dict = {}
        tre = TestRunExecution.objects.filter(**kwargs, topology_id=self.topology_id)
        for obj in tre:
            tre_dict[obj.id] = model_to_dict(obj)
        return tre_dict

    # single JOIN query of TestSchedule and TestRunExecution
    def join_test_schedule_test_run_execution(self, **kwargs) -> Dict:
        join_obj = TestSchedule.objects.filter(**kwargs).select_related(
            "test_run_execution"
        )
        join_dct = {}
        for obj in join_obj:
            join_dct[obj.id] = model_to_dict(obj)
            # model_to_dict doesn't decode auto_now_add fields so need to
            # do it manually
            join_dct[obj.id]["created_at"] = obj.created_at
            join_dct[obj.id]["test_run_execution"] = {}
            join_dct[obj.id]["test_run_execution"] = model_to_dict(
                obj.test_run_execution
            )
        return join_dct

    def create_test_run_execution(self, **kwargs) -> int:
        tre_obj = TestRunExecution.objects.create(**kwargs)
        return tre_obj.id

    # write scheduled entry in TestRunExecution and TestSchedule
    def create_test_run_execution_test_schedule(
        self,
        parsed_json_data: ParsedReceivedJsonDataType,
        multi_hop_parameters: ValidatedMultiHopParametersType,
        parsed_network_info: ParsedNetworkInfoType,
        parsed_scheduler_data: ParsedSchedulerDataType,
    ) -> int:
        if self.topology_id != parsed_json_data["topology_id"]:
            _log.critical(
                "self.topology_id {} does not match json topology_id {}".format(
                    self.topology_id, parsed_json_data["topology_id"]
                )
            )
            return -1
        with transaction.atomic():
            test_run_db_obj = TestRunExecution.objects.create(
                status=TestStatus.SCHEDULED.value,
                test_code=parsed_json_data["test_code"],
                topology_id=parsed_json_data["topology_id"],
                topology_name=parsed_network_info["topology_name"],
                session_duration=parsed_json_data["session_duration"],
                test_push_rate=parsed_json_data["test_push_rate"],
                protocol=parsed_json_data["protocol"],
                traffic_direction=multi_hop_parameters["traffic_direction"],
                multi_hop_parallel_sessions=multi_hop_parameters[
                    "multi_hop_parallel_sessions"
                ],
                multi_hop_session_iteration_count=multi_hop_parameters[
                    "multi_hop_session_iteration_count"
                ],
                pop_to_node_link=json.dumps(
                    multi_hop_parameters["speed_test_pop_to_node_dict"]
                ),
            )
            # django automatically fills in "created_at" field (see model)
            TestSchedule.objects.create(
                test_run_execution=test_run_db_obj,
                cron_minute=parsed_scheduler_data["cron_minute"],
                cron_hour=parsed_scheduler_data["cron_hour"],
                cron_day_of_month=parsed_scheduler_data["cron_day_of_month"],
                cron_month=parsed_scheduler_data["cron_month"],
                cron_day_of_week=parsed_scheduler_data["cron_day_of_week"],
                priority=parsed_scheduler_data["priority"],
                asap=parsed_scheduler_data["asap"],
            )

            return test_run_db_obj.id

    # returns dict with {"test_run_execution__topology_id" : <id>, "tid_count": <#>}
    # the count is only for information
    def read_test_schedule_topology_ids(self) -> TestSchedule:
        return TestSchedule.objects.values("test_run_execution__topology_id").annotate(
            tid_count=Count("test_run_execution__topology_id")
        )
