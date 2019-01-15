#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved.

import logging

import requests
from .common import genUrl


def add_users(cli_opts):
    grafana_ip = cli_opts.grafana_ip
    grafana_port = cli_opts.grafana_port
    auth_user = cli_opts.auth_user
    auth_passwd = cli_opts.auth_passwd
    url = genUrl(grafana_ip, grafana_port)
    user_org_list = [{"user": "fbuser"}]

    logging.info("\nStarting add_users")
    logging.debug("url is {}".format(url))

    # create users
    for usorg in user_org_list:
        user = usorg["user"]
        logging.info("Checking if user {} already exists".format(user))
        try:
            r = requests.get(
                url + "/api/users/lookup?loginOrEmail=" + user,
                auth=(auth_user, auth_passwd),
            )
        except requests.exceptions.RequestException as e:
            logging.error("Error checking if user exists: {}".format(e))
            return

        if r.status_code != 200 and "message" not in r.json():
            logging.info("Grafana returned status code {}".format(r.status_code))
            logging.error("Error reading users from Grafana {}".format(r.json()))
            return
        else:
            parsed_response = r.json()
            # Grafana will return {"message":"User not found"} if not found
            if "message" in parsed_response:
                logging.info(
                    "User {} not found - Grafana returned {}".format(
                        user, parsed_response
                    )
                )
                logging.info("Creating user {}".format(user))
                try:
                    r = requests.post(
                        url + "/api/admin/users",
                        auth=(auth_user, auth_passwd),
                        json={
                            "name": user,
                            "email": "noreply@fb.com",
                            "login": user,
                            "password": "facebook",
                        },
                    )
                except requests.exceptions.RequestException as e:
                    logging.error("Error creating user: {}".format(e))
                    return

                logging.info(
                    "Return from post to {}: {}".format(
                        url + "/api/admin/users", r.text
                    )
                )
            # Grafana will return something like
            # {"id":3,"email":"noreply@fb.com","name":"fbuser1",
            # "login":"fbuser1","theme":"","orgId":1,"isGrafanaAdmin":false}
            elif "name" in parsed_response and parsed_response["name"] == user:
                logging.info("User {} already exists".format(user))
            else:
                logging.error(
                    "Unexpected response from Grafana {}".format(parsed_response)
                )
