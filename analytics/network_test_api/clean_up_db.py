#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved.

import logging
from logger import Logger
import os

import django


try:
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "nmsapi.settings")
    django.setup()
    from api.models import TestRunExecution, TestStatus
except django.core.exceptions.ImproperlyConfigured:
    raise

_log = Logger(__name__, logging.INFO).get_logger()


def clean_up_db():
    # Check if any stale tests are still running
    test_run_list = TestRunExecution.objects.filter(
        status__in=[TestStatus.RUNNING.value]
    )

    if test_run_list.count() >= 1:
        for obj in test_run_list:
            _log.info(
                "\nTest {} is currently running. ".format(obj.test_code)
                + "Updating the status to Aborted."
            )
            obj.status = TestStatus.ABORTED.value
            obj.save()
    else:
        _log.info("\nNo test is currently running. No clean-up needed.")


if __name__ == "__main__":
    clean_up_db()
