#!/bin/bash

# Copyright (c) Meta Platforms, Inc. and affiliates.
#
# This source code is licensed under the MIT license found in the
# LICENSE file in the root directory of this source tree.

mysql -h$DB_HOST -u$DB_ROOT_USER -p$DB_ROOT_PASSWORD -e "set @db_name='${DB_NAME}'; set @db_user='${DB_USER}'; set @db_password='${DB_PASSWORD}'; source /scripts/service.sql;"
