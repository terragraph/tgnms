#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved.


import logging
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

    def __init__(self, topology_id: int) -> None:
        self.topology_id = topology_id

    # read test_schedule rows with variable filter input
    def read_test_schedule(self, **kwargs) -> List[Dict]:
        ts_obj = TestSchedule.objects.filter(
            **kwargs, test_run_execution__topology_id=self.topology_id
        )
        ts_dict = {}
        for obj in ts_obj:
            ts_dict[obj.id] = model_to_dict(obj)
        return ts_dict

    def delete_test_run_execution_row(self, id) -> None:
        tre = TestRunExecution.objects.filter(id=id).first()
        if tre:
            # this deletes from all foreign tables too
            tre.delete()

    def update_test_run_execution(self, id, **kwargs) -> None:
        TestRunExecution.objects.filter(id=id).update(**kwargs)

    def delete_test_schedule_row(self, id) -> None:
        ts = TestSchedule.objects.filter(id=id).first()
        if ts:
            ts.delete()

    def delete_test_schedule_if_asap(self, test_run_execution_id) -> bool:
        ts = TestSchedule.objects.filter(
            test_run_execution_id=test_run_execution_id
        ).first()
        if not ts:
            logging.error(
                "Test run execution id not present in table {}",
                format(test_run_execution_id),
            )
            return False
        elif ts.asap:
            ts.delete()
            return True
        else:
            return True

    def read_test_run_execution(self, **kwargs) -> Optional[Dict]:
        tre = TestRunExecution.objects.filter(
            **kwargs, topology_id=self.topology_id
        ).first()
        return model_to_dict(tre) if tre else None

    # look for tests left in running state (possibly because process
    # restarted or ended unexpectedly)
    def abort_test_run_execution_stale_aborted(self) -> int:
        # Check if any stale tests are still running
        num_stale_tests = 0
        test_run_list = TestRunExecution.objects.filter(
            status__in=[TestStatus.RUNNING.value], topology_id=self.topology_id
        )
        if test_run_list.count() >= 1:
            for obj in test_run_list:
                if not obj.expected_end_time or (time.time() > obj.expected_end_time):
                    obj.status = TestStatus.ABORTED.value
                    obj.save()
                    num_stale_tests += 1
        return num_stale_tests

    # single JOIN query of TestSchedule and TestRunExecution
    def join_test_schedule_test_run_execution(self, test_schedule_id: int) -> TestSchedule:
        return(
            TestSchedule.objects.filter(id=test_schedule_id)
            .select_related("test_run_execution")
            .first()
        )

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
                pop_to_node_link=multi_hop_parameters["speed_test_pop_to_node_dict"],
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
def read_test_schedule_topology_ids() -> TestSchedule:
    return TestSchedule.objects.values("test_run_execution__topology_id").annotate(
        tid_count=Count("test_run_execution__topology_id")
    )
