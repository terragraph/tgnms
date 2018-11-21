#!/usr/bin/env python3.6
# Copyright 2004-present Facebook. All Rights Reserved.

import os


DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.mysql",
        "NAME": "network_test",
        "USER": os.environ["MYSQL_USER"],
        "PASSWORD": os.environ["MYSQL_PASS"],
        "HOST": os.environ["MYSQL_HOST"],
        "PORT": "3306",
    }
}
