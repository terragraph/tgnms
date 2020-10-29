#!/bin/bash

# copy the keycloak information into the nms auth file
/scripts/generate-keycloak-client.sh tgnms /nms_auth.env
/scripts/copy-public-key.sh tgnms /apiservice/publickey
/scripts/create-default-realm-user.sh tgnms $NMS_DEFAULT_USERNAME $NMS_DEFAULT_PASSWORD
