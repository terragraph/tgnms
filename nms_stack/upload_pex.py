#!/usr/bin/env python3.7
# Copyright (c) 2014-present, Facebook, Inc.

import asyncio
from datetime import datetime
from json import dumps
from os import environ
from pathlib import Path

from fbc_sp_client import SPClient


JSONCONF = {
    "api_id": "nms_cli_upload",
    "api_token": "p8zYT_zXhRPeqqMe_i_H1iD6_AQ",
    "api_url": "https://sw.terragraph.link",
}
SUITE = "tg_nms_cli"
DESCRIPTION = "NMS Installer CLI"
TAG = "latest"


async def main() -> int:
    if "WORKSPACE" not in environ:
        print("Need WORKSPACE set in the environ as we usually run in Jenkins")
        return 68
    file_path = Path(f"{environ['WORKSPACE']}/nms")

    client = SPClient(JSONCONF, SUITE)
    release = datetime.utcnow().strftime("%Y%m%d%H")

    # Get existing releases and check if there was a release today
    existing_releases = await client.list()
    er_str = dumps(existing_releases, indent=2, sort_keys=True)
    print(f"Existing {SUITE} Releases:\n{er_str}")
    if release in existing_releases:
        print(f"{SUITE} Release {release} already exists. Skipping Upload")
        return 0

    # Upload pex
    upload_response = await client.upload(release, file_path, description=DESCRIPTION)
    print(f"Upload of {file_path} finished\n- Response: {upload_response}")
    if "status" not in upload_response or upload_response["status"] != 200:
        print("Upload FAILED")
        return 69

    # Tag successful upload as "latest"
    print(f"Tagging {release} as '{TAG}'")
    tag_success = await client.tag(release, [TAG])
    if tag_success["code"] != 0:
        print(
            f"Tag of {release} as '{TAG}' failed: {tag_success['msg']} "
            f"(Code: {tag_success['code']})"
        )
        return 70

    return 0


if __name__ == "__main__":
    exit(asyncio.run(main()))
