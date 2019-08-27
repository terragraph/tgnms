from __future__ import absolute_import, division, print_function, unicode_literals

import json

from NetworkIgnition import NetworkIgnition


if __name__ == "__main__":
    test_init_info = {}
    # Reading Test config file
    with open("../networkTests/config.json") as config_file:
        config = json.load(config_file)
    test_init_info["controller"] = config["test_init"]["controller_info"]
    test_init_info["time_out"] = int(config["test_init"]["time_out"])
    test_init_info["topology_file"] = config["test_init"]["topology_file"]
    test_init_info["networkValidation"] = config["networkValidation"]
    test_init_info["test_setup"] = config["test_init"]["test_setup"]
    # Initializing test setup
    for i in range(0, config["test_init"]["repeat_count"]):
        print("INFO: round {} of test run".format(i))
        # running all tests defined in config
        for test in config["tests"]:
            test["round_no"] = i
            if test["test_type"] == "ignition_test":
                NetworkIgnition(**test_init_info).run_test(**test)
