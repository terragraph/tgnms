#!/usr/bin/env python3
# (c) Facebook, Inc. and its affiliates. Confidential and proprietary.

import argparse
import asyncio
import json
import os
import shutil
import sys
import tempfile
import time
from argparse import RawTextHelpFormatter
from datetime import date, timedelta


# Days an ephemeral upload lasts
JF_UPLOAD_EXPIRY = 30

# TODO(T63490787): Get a special Everstore bucket for Node toolchains. For
# example, Rust uses RUST_FOUNDATION_TOOLS.
# This Everstore bucket should have indefinite (or very, very long) retention.
EVERSTORE_BUCKET_WITH_INDEFINITE_RETENTION = "TODO:Get_Everstore_Bucket!!!"
ONCALL = "oncall+jsinfra@xmail.facebook.com"


def parse_args():
    parser = argparse.ArgumentParser(
        description="""Create a Node toolchain by downloading components from
https://nodejs.org and vendor it into the repo. Example:

    ./create_node_toolchain.py --output ./v10.16.0 v10.16.0
""",
        formatter_class=RawTextHelpFormatter,
    )
    parser.add_argument(
        "--output",
        help="If specified, overwrite this directory with the generated DotSlash files.",
    )
    parser.add_argument(
        "--retain-forever",
        action="store_true",
        help="""Store the artifacts in Everstore with indefinite retention.
Only use when you plan to check the result of this script into the repo.
""",
    )
    parser.add_argument(
        "toolchain_version", help="toolchain version, such as 'v10.16.0'"
    )
    return parser.parse_args()


fbsource = os.path.realpath(os.path.join(os.path.dirname(__file__), "../../../"))

# Keys are DotSlash platforms.
PLATFORMS = {
    "linux": {"shortname": "linux", "archive_type": ".tar.gz"},
    "macos": {"shortname": "darwin", "archive_type": ".tar.gz"},
    "windows": {"shortname": "win", "archive_type": ".zip"},
}

# Value is whether ".exe" extension should be added for Windows.
DOTSLASH_FILES_TO_CREATE = {"node": True, "npm": False, "npx": False}


async def main():
    args = parse_args()
    version = args.toolchain_version
    retain_forever = args.retain_forever

    tmp = tempfile.mkdtemp(f"create_node_toolchain_{version}")
    node_root = os.path.join(tmp, "node_root")
    os.mkdir(node_root)

    async def download_toolchain(platform, details):
        platform_dir = os.path.join(node_root, platform)
        os.mkdir(platform_dir)
        shortname = details["shortname"]
        archive_type = details["archive_type"]
        url_path = (
            f"/download/release/{version}/node-{version}-{shortname}-x64{archive_type}"
        )
        handle = await create_node_toolchain(
            platform_dir, url_path, platform, retain_forever
        )
        return (platform, handle)

    downloads = [
        download_toolchain(platform, details)
        for (platform, details) in PLATFORMS.items()
    ]
    platform_to_handle = dict(await asyncio.gather(*downloads))
    eprint(f"Finished uploading all toolchains for {version}")

    if not retain_forever:
        expires = date.today() + timedelta(days=JF_UPLOAD_EXPIRY)
    else:
        expires = None

    dotslash_files_dir = os.path.join(tmp, version)
    os.mkdir(dotslash_files_dir)
    write_dotslash_files(dotslash_files_dir, platform_to_handle, version, expires)
    eprint(f"All DotSlash files have been written to {dotslash_files_dir}")

    if args.output:
        output_dir = args.output
        shutil.rmtree(output_dir, ignore_errors=True)
        shutil.copytree(dotslash_files_dir, output_dir)
        eprint(f"\n\n{output_dir} has been rewritten with the new DotSlash files\n\n")

    if expires:
        eprint(
            f"NOTE NOTE NOTE: Ephemeral upload expires in {JF_UPLOAD_EXPIRY} days ({expires.ctime()})"
        )


def write_dotslash_files(dotslash_files_dir, platform_to_handle, version, expires):
    for filename, add_exe_for_windows in DOTSLASH_FILES_TO_CREATE.items():
        output_file = os.path.join(dotslash_files_dir, filename)
        write_dotslash_file(
            output_file,
            filename,
            add_exe_for_windows,
            platform_to_handle,
            version,
            expires,
        )


async def create_node_toolchain(platform_dir, url_path, platform, retain_forever):
    """Fetch the release archive specific to the platform."""
    eprint(f"Downloading from nodejs.org in: {platform_dir}")

    archive_file = os.path.basename(url_path)
    output_file = os.path.join(platform_dir, archive_file)
    url = f"https://nodejs.org{url_path}"

    # If it looks like we are on a devserver, try to be helpful by proactively
    # setting https_proxy.
    env = os.environ.copy()
    if os.uname()[1].endswith(".facebook.com"):
        env["https_proxy"] = "fwdproxy:8080"

    await run(["curl", "--output", output_file, url], env=env)

    if archive_file.endswith(".zip"):
        # We need to unzip the .zip and repack it as a .tar.
        await run(["unzip", archive_file], cwd=platform_dir)
        archive_no_suffix = archive_file[: -len(".zip")]
        archive_dir = os.path.join(platform_dir, archive_no_suffix)

        tar_gz = os.path.join(platform_dir, f"{archive_no_suffix}.tar.gz")
        tar_args = ["tar", "czf", tar_gz, "."]
        eprint(f"about to run: {' '.join(tar_args)}")
        await run(tar_args, cwd=archive_dir)
        eprint(f"created {tar_gz}")
    else:
        tar_gz = output_file

    if retain_forever:
        handle = await clowder_put(tar_gz)
    else:
        handle = await jf_upload(tar_gz)
    eprint(f"Everstore handle for {platform}: {handle}")
    return handle


def write_dotslash_file(
    output_file, filename, add_exe_for_windows, platform_to_handle, version, expires
):
    def create_platform(platform, handle):
        # In the .zip for Windows, files are in the root of the archive
        # whereas for Mac and Linux, they are in a bin/ folder under the root
        # folder.
        if platform == "windows":
            if add_exe_for_windows:
                path = f"{filename}.exe"
            else:
                path = f"{filename}.cmd"
        else:
            shortname = PLATFORMS[platform]["shortname"]
            path = f"node-{version}-{shortname}-x64/bin/{filename}"
        return {
            "scheme": "everstore",
            "handle": handle,
            "extract": {"decompress": "tar.gz", "path": path},
        }

    platforms = {
        platform: create_platform(platform, handle)
        for platform, handle in platform_to_handle.items()
    }
    config = {"name": f"{filename}-{version}", "oncall": ONCALL, "platforms": platforms}
    with open(output_file, "w") as f:
        f.write("#!/usr/bin/env dotslash\n\n")
        f.write(
            "// \x40generated with xplat/third-party/node/create_node_toolchain.py\n"
        )
        if expires:
            f.write(
                f"// NOTE: Ephemeral everstore handle expires around {expires.ctime()}\n"
            )
            f.write("// \x40nocommit\n")
        json.dump(config, f, indent=2)
        f.write("\n")
    os.chmod(output_file, 0o755)
    eprint(f"wrote DotSlash file: {output_file}")

    batch_file = f"{output_file}.bat"
    with open(batch_file, "w") as f:
        f.write(
            "@REM (c) Facebook, Inc. and its affiliates. Confidential and proprietary.\n\n"
        )
        f.write(f'@dotslash "%~dp0{filename}" %*\n')
    os.chmod(output_file, 0o755)
    eprint(f"wrote batch script: {batch_file}")


async def clowder_put(file: str) -> str:
    stdout, stderr = await run(
        ["clowder", "put", "--fbtype", EVERSTORE_BUCKET_WITH_INDEFINITE_RETENTION, file]
    )
    # Strip trailing newline and return as a string.
    return stdout[:-1].decode("ascii")


async def jf_upload(file: str) -> str:
    """By default, upload artifacts via `jf upload`, though note that only
    guarantees 30 days of retention."""
    stdout, stderr = await run(["jf", "--json", "upload", file])
    lines = stdout.split(b"\n")
    for line in lines:
        if not line:
            continue
        event = json.loads(line)
        if event["type"] != "data":
            continue
        data = event["data"]
        handle = data.get("handle")
        if handle:
            return handle
    raise Exception(f"handle not found in {stdout}")


async def run(args, cwd=None, env=None):
    proc = await asyncio.create_subprocess_exec(
        *args,
        cwd=cwd,
        env=env,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )
    stdout, stderr = await proc.communicate()
    code = proc.returncode
    if code:
        raise Exception(f"command failed: {args}\n{stderr.decode('utf-8')}")
    return stdout, stderr


def eprint(message: str):
    print(f"[{time.ctime()}] {message}", file=sys.stderr)


if __name__ == "__main__":
    # asyncio.run() is not available until Python 3.7.
    loop = asyncio.get_event_loop()
    try:
        loop.run_until_complete(main())
    finally:
        loop.close()
