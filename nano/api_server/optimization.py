#!/usr/bin/env python3

from base import app


def prepare_args_for_optimizer(request_info):
    return {
        "name": app.config["network_name"],
        "config": "{0}/config/{1}.json".format(
            app.config["fp"], app.config["network_name"]
        ),
        "outfolder": app.config["tmp_folder"],
        "ow_polarity": request_info.get("polarity", None),
        "ow_pathreplace": request_info.get("pathreplace", None),
        "ow_target_sinr": int(request_info.get("sinrgoal", 18)),
        "ow_algorithm": request_info.get("algorithm", None),
        "ow_golay": request_info.get("golay", None),
        "ow_max_count": int(request_info.get("max_num_links", 5)),
        "config_base": "{0}/config/nano_base.json".format(app.config["fp"]),
    }
