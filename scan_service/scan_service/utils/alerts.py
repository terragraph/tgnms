#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved.

import asyncio
import enum
import logging
from datetime import datetime, timedelta
from os import getenv
from typing import Optional

import aiohttp


class Severity(enum.Enum):
    CRITICAL = "critical"
    ERROR = "error"
    WARNING = "warning"
    INFO = "info"


class Alerts:
    enabled: bool
    session: aiohttp.ClientSession

    @classmethod
    async def init(cls, enabled: bool) -> None:
        cls.enabled = enabled
        cls.session = aiohttp.ClientSession()

    @classmethod
    async def post(
        cls,
        execution_id: int,
        msg: str,
        severity: Severity,
        start_delay_s: Optional[float] = None,
        end_delay_s: Optional[float] = None,
    ) -> None:
        """Post alert to Prometheus Alerts Manager."""
        if not cls.enabled:
            return None

        url = f"{getenv('ALERTMANAGER_URL', 'http://stats_alertmanager:9093')}/api/v2/alerts"
        alert_name = "tg_scan_service"
        data = [
            {
                "startsAt": datetime.isoformat(
                    datetime.utcnow()
                    + timedelta(
                        seconds=start_delay_s if start_delay_s is not None else 0
                    )
                ),
                "endsAt": datetime.isoformat(
                    datetime.utcnow()
                    + timedelta(seconds=end_delay_s if end_delay_s is not None else 60)
                ),
                "annotations": {"Status": msg},
                "labels": {
                    "alertname": alert_name,
                    alert_name: alert_name,
                    "execution_id": f"{execution_id}",
                    "severity": severity.value,
                },
            }
        ]
        try:
            resp = await cls.session.post(url, json=data)
            async with resp:
                if resp.status != 200:
                    logging.error(
                        f"Request to {url} failed: {resp.reason} ({resp.status})"
                    )
                    return None
            logging.debug(f"Alert sent - {data}")
        except (aiohttp.ClientError, asyncio.TimeoutError) as err:
            logging.error(f"Request to {url} failed: {err}")
