#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved.

import asyncio

from aiohttp import web
from tglib.routes import routes


async def init(app: web.Application):
    runner = web.AppRunner(app, handle_signals=True)
    await runner.setup()
    site = web.TCPSite(runner, "0.0.0.0", 8080)

    try:
        await site.start()
    except:  # noqa: E722
        await runner.cleanup()


if __name__ == "__main__":
    app = web.Application()
    app.add_routes(routes)
    asyncio.ensure_future(init(app))
