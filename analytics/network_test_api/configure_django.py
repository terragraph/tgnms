#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved.

import os
from django.apps import apps
from django.conf import settings

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "nmsapi.settings")
apps.populate(settings.INSTALLED_APPS)
