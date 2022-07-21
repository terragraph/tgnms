#!/usr/bin/env python3

# Copyright (c) Meta Platforms, Inc. and affiliates.
#
# This source code is licensed under the MIT license found in the
# LICENSE file in the root directory of this source tree.

import sys

from .nms import cli as swarm_cli
from .k8s_nms.nms import cli as k8s_cli


def main():
    if len(sys.argv) > 1 and sys.argv[1] == "beta":
        sys.argv = sys.argv[:1] + sys.argv[2:]
        k8s_cli()
    else:
        swarm_cli()


if __name__ == "__main__":
    main()
