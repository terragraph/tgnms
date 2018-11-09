#!/usr/bin/env python3.6
# Copyright 2004-present Facebook. All Rights Reserved.

import os
import sys
import django
import logging
setting_path = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, setting_path)
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "settings")
django.setup()
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from api.models import (
    TestRunExecution,
    TEST_STATUS_RUNNING,
    TEST_STATUS_ABORTED
)
_log = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)


def clean_up_db():
    # Check if any stale tests are still running
    test_run_list = TestRunExecution.objects.filter(
        status__in=[
            TEST_STATUS_RUNNING
        ]
    )

    if test_run_list.count() >= 1:
        for obj in test_run_list:
            _log.info("\nTest {} is currently running. ".format(obj.test_code)
                      + "Updating the status to Aborted.")
            obj.status = TEST_STATUS_ABORTED
            obj.save()
    else:
        _log.info("\nNo test is currently running. No clean-up needed.")


if __name__ == '__main__':
    clean_up_db()
