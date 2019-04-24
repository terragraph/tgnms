#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved.

import logging
from typing import Any, Dict, List, Optional, Tuple, Union

from django.http import HttpResponse
from module.routing import RoutesForNode


# alias for custom types
ReceivedJsonDataType = Dict[str, Union[int, Any]]
NetworkParametersType = Dict[str, Union[str, int, float, Dict]]
ParametersType = Dict[str, Optional[Union[str, int, float, Dict, List[RoutesForNode]]]]
ParsedReceivedJsonDataType = Dict[str, Union[HttpResponse, int, float, str]]
ValidatedMultiHopParametersType = Dict[str, Union[HttpResponse, int, Dict[str, str]]]
ParsedNetworkInfoType = Dict[str, Union[HttpResponse, str, int, Dict]]
RcvdStatsType = Dict[str, Dict[str, Optional[Union[int, float]]]]
IperfPingStatsType = Dict[str, Union[str, Dict[str, Optional[Union[int, float]]]]]
PopToNodeLinksType = List[Dict[str, Union[bool, int, str]]]
TopologyType = Dict[str, Union[str, List]]
TestLinksDictType = Dict[
    Tuple[str, str], Dict[str, Optional[Union[str, int, bool, Any]]]
]
