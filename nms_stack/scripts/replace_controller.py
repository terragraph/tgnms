import sys
import subprocess
import json

import argparse

parser = argparse.ArgumentParser(description="Process some integers.")
parser.add_argument("--nms")
parser.add_argument("--controller_port")
parser.add_argument("--kafka_port")
parser.add_argument(
    "--nodes", nargs="+",
)

args = parser.parse_args()


def merge(source, destination):
    """
    run me with nosetests --with-doctest file.py

    >>> a = { 'first' : { 'all_rows' : { 'pass' : 'dog', 'number' : '1' } } }
    >>> b = { 'first' : { 'all_rows' : { 'fail' : 'cat', 'number' : '5' } } }
    >>> merge(b, a) == { 'first' : { 'all_rows' : { 'pass' : 'dog', 'fail' : 'cat', 'number' : '5' } } }
    True
    """
    for key, value in source.items():
        if isinstance(value, dict):
            # get node or create one
            node = destination.setdefault(key, {})
            merge(value, node)
        else:
            destination[key] = value

    return destination


# python replace_controller.py tcp://[2620:10d:c0bf:1800:250:56ff:fe93:2a17]:7007 '2620:10d:c0bf:1d60::/59,64' PLAINTEXT://[2620:10d:c0bf:1800:250:56ff:fe93:2a17]:9093 2620:10d:c0bf:1800:250:56ff:fe93:2a17 pop-if6

# python replace_controller.py --nms 2620:10d:c0bf:1800:250:56ff:fe93:2a17 --controller_port 7007 --kafka_port 9093

prefix = "2620:10d:c0bf:1d60::/59,64"


overrides = {
    "kvstoreParams": {
        "e2e-ctrl-url": f"tcp://[{args.nms}]:{args.controller_port}",
        "e2e-network-prefix": prefix,
    },
    "envParams": {
        "DPDK_ENABLED": "1",
        "E2E_ENABLED": "1",
        "OPENR_USE_FIB_VPP": "1",
        "OPENR_STATIC_PREFIX_ALLOC": "false",
    },
    "fluentdParams": {
        "endpoints": {"exampleServer": {"host": args.nms, "port": 24224}}
    },
    "statsAgentParams": {
        "collectors": {"marvellSwitchStatsEnabled": False, "openrStatsEnabled": True},
        "endpointParams": {
            "kafkaParams": {
                "config": {
                    "batchNumMessages": 100,
                    "brokerEndpointList": f"PLAINTEXT://[{args.nms}]:{args.kafka_port}",
                    "compressionCodec": "none",
                    "compressionLevel": -1,
                    "enableIdempotence": False,
                    "messageTimeoutMs": 30000,
                    "queueBufferingMaxKbytes": 1024,
                    "queueBufferingMaxMessages": 1000,
                    "queueBufferingMaxMs": 1000,
                },
                "enabled": True,
                "topics": {
                    "eventsTopic": "events",
                    "hfStatsTopic": "hf_stats",
                    "iperfResultsTopic": "iperf_results",
                    "pingResultsTopic": "ping_results",
                    "scanResultsTopic": "scan_results",
                    "statsTopic": "stats",
                },
            },
            "nmsPublisherParams": {"enabled": False, "zmqSndHwm": 100},
        },
        "publisherParams": {
            "defaultStatsInterval": 30,
            "eventLogsBufferSize": 2000,
            "highFrequencyStatsInterval": 1,
            "highFrequencyStatsWhitelist": {
                "latpcStats": ".*noTrafficCountSF",
                "phyStatusStats": ".*phystatus\\.(ssnrEst|srssi)",
                "staPktStats": ".*staPkt\\.(.*Fail|.*Ok|mcs|perE6|.*Ba|.*Ppdu|txPowerIndex|linkAvailable|mgmtLinkUp)",
            },
            "statsBlacklist": {"gpsSkyview": "tgd\\.gpsStat\\.[0-9]+\\..+"},
            "statsBufferSize": 10000,
        },
        "sources": {
            "controller": {"enabled": False, "zmq_url": f"tcp://localhost:28989"},
            "driver-if": {"enabled": True, "zmq_url": f"tcp://localhost:18990"},
            "minion": {"enabled": True, "zmq_url": f"tcp://localhost:18989"},
            "system": {"enabled": True, "zmq_url": f"tcp://localhost:18991"},
        },
    },
}

print("applying", overrides)

for ip in args.nodes:
    print("Running on", ip)
    r = subprocess.run(
        f"ssh {ip} cat /data/cfg/node_config.json", shell=True, stdout=subprocess.PIPE
    ).stdout.decode("utf-8")
    config = json.loads(r)
    config = merge(overrides, config)
    # config.update(overrides)
    config = json.dumps(config, indent=2)
    subprocess.run(
        f"ssh {ip} tee /data/cfg/node_config.json",
        shell=True,
        input=config.encode("utf-8"),
        stdout=subprocess.PIPE,
    )
    subprocess.run(f"ssh {ip} reboot", shell=True)
