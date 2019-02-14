#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved.

from api import views
from django.conf.urls import url


urlpatterns = [
    url(r"start_test/$", views.start_test, name="start_test"),
    url(r"stop_test/$", views.stop_test, name="stop_test"),
    url(r"help/$", views.help, name="help"),
]
