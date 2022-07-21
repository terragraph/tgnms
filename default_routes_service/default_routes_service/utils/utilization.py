#!/usr/bin/env python3

# Copyright (c) Meta Platforms, Inc. and affiliates.
#
# This source code is licensed under the MIT license found in the
# LICENSE file in the root directory of this source tree.

from collections import defaultdict
from datetime import datetime
from typing import DefaultDict, List, Optional, Tuple

from aiomysql.sa.result import RowProxy


def to_tuple(routes: Optional[List[List]]) -> Optional[Tuple[Tuple]]:
    "Make routes hashable by casting to Tuple."
    if routes is None:
        return None
    return tuple(tuple(r) for r in routes)  # type: ignore


def to_list(routes: Optional[Tuple[Tuple]]) -> Optional[List[List]]:
    "Revert hashable routes to List."
    if routes is None:
        return None
    return [list(r) for r in routes]


def compute_routes_utilization(
    raw_routes_data: List[RowProxy], start_dt: datetime, end_dt: datetime
) -> DefaultDict[str, List]:
    """Calculate routes utilization.

    Process raw_routes_data to calculate the percentage of time each route
    takes for each node.
    """
    # Group raw routes data by node name
    node_routes_changes = defaultdict(list)  # type: ignore
    for row in raw_routes_data:
        node_routes_changes[row.node_name].append((row.routes, row.last_updated))

    total_time_window: float = (end_dt - start_dt).total_seconds()
    routes_utilization: DefaultDict[str, List] = defaultdict(list)
    for node_name, routes_changes in node_routes_changes.items():
        routes_duration: DefaultDict = defaultdict(float)

        first_routes, first_last_updated = routes_changes[0]
        prev_routes = first_routes if first_last_updated < start_dt else None
        prev_last_updated = start_dt

        for routes, last_updated in routes_changes:
            # Calculate duration of previous route
            duration = last_updated - prev_last_updated
            routes_duration[to_tuple(prev_routes)] += duration.total_seconds()

            # Record the routes and last_updated for next iteration
            prev_routes, prev_last_updated = routes, last_updated

        # Calculate the duration from last routes change to end_dt
        duration = end_dt - prev_last_updated
        routes_duration[to_tuple(prev_routes)] += duration.total_seconds()

        # Calculate routes utilization for all routes
        for routes, duration in routes_duration.items():
            routes_utilization[node_name].append(
                {
                    "routes": to_list(routes),
                    "percentage": round(duration / total_time_window * 100, 3),
                }
            )

    return routes_utilization
