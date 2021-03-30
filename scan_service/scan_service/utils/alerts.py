#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved.

import asyncio
import logging
from datetime import datetime, timedelta
from os import getenv
from typing import Optional

import aiohttp


async def post_alert(
    execution_id: int,
    msg: str,
    start_delay_s: Optional[float] = None,
    end_delay_s: Optional[float] = None,
) -> None:
    """Post alert to Prometheus Alerts Manager."""
    url = (
        f"{getenv('ALERTMANAGER_URL', 'http://stats_alertmanager:9093')}/api/v2/alerts"
    )
    alert_name = "tg_scan_service"
    data = [
        {
            "startsAt": datetime.isoformat(
                datetime.utcnow()
                + timedelta(seconds=start_delay_s if start_delay_s is not None else 0)
            ),
            "endsAt": datetime.isoformat(
                datetime.utcnow()
                + timedelta(seconds=end_delay_s if end_delay_s is not None else 60)
            ),
            "annotations": {"Status": msg},
            "labels": {alert_name: alert_name, "execution_id": f"{execution_id}"},
        }
    ]
    try:
        async with aiohttp.ClientSession() as session:
            async with session.post(url, json=data) as resp:
                if resp.status != 200:
                    logging.error(
                        f"Request to {url} failed: {resp.reason} ({resp.status})"
                    )
                    return None
            logging.debug(f"Alert sent - {data}")
    except (aiohttp.ClientError, asyncio.TimeoutError) as err:
        logging.error(f"Request to {url} failed: {err}")
