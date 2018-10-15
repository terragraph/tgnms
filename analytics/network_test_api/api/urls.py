#!/usr/bin/env python3.6
# Copyright 2004-present Facebook. All Rights Reserved.

from django.conf.urls import url
from api import views


urlpatterns = [
    url(r'start_test/$', views.start_test, name='start_test'),
    url(r'stop_test/$', views.stop_test, name='stop_test'),
]
