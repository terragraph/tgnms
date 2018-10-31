#!/usr/bin/env python3.6
# Copyright 2004-present Facebook. All Rights Reserved.

import requests
import time


def regression():
    url = "http://localhost:8000/api/start_test/"
    r = requests.post(
        url,
        json={
            "test_code": 8.3,
            "topology_id": 1,
            "test_duration": 60,
            "test_push_rate": 200000000
        }
    )
    print(r.text)


if __name__ == "__main__":
    for i in range(720):
        print("Iteration {}/720:".format(i + 1))
        regression()
        time.sleep(120)
