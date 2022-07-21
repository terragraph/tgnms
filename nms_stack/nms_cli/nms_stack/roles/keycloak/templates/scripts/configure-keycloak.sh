#!/bin/bash

# Copyright (c) Meta Platforms, Inc. and affiliates.
#
# This source code is licensed under the MIT license found in the
# LICENSE file in the root directory of this source tree.

# copy the keycloak information into the nms auth file
/scripts/generate-keycloak-client.sh tgnms /nms_auth.env
/scripts/copy-public-key.sh tgnms /apiservice/publickey
/scripts/create-default-realm-user.sh tgnms $NMS_DEFAULT_USERNAME $NMS_DEFAULT_PASSWORD
