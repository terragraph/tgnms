import re
import subprocess
from datetime import date


def get_tag_prefix(release):
    if not release:
        raise RuntimeError("Cannot get tag prefix since release is undefined.")

    if release == "latest":
        tag_prefix = f'v{date.today().strftime("%y.%m.%d")}'
    else:
        tag_prefix = f"{release}"
    return tag_prefix


def get_next_tag(release, printer=lambda x: print(x)):
    """
    Constructs the next lexicographical tag based on the release.
    """
    tag_prefix = get_tag_prefix(release)
    printer(f"Searching for git tags with prefix: {tag_prefix}")

    # search for all tags starting with this release num
    tags = read(f'git tag -l "{tag_prefix}*"')
    if tags:
        tags = tags.split("\n")

    printer(f"Found {len(tags)} tags")
    printer("  Tags: " + str(tags))
    # increments the tag every time this is run
    new_tag = f"{tag_prefix}-{len(tags)}"
    printer(f"Next tag is: {new_tag}")
    return new_tag


def read(cmd: str) -> str:
    p = subprocess.run(cmd, stdout=subprocess.PIPE, shell=True, check=True)
    return p.stdout.decode("utf-8").strip()


def get_release(branch, stage=False):
    if re.search(r"origin/(main|master)", branch):
        if stage:
            release = "dev"
        else:
            release = "latest"
    elif m := re.search(r"origin/releases/(lts-nms-\d{2}\.\d{1,2})", branch):
        if stage:
            raise RuntimeError(f"Cannot build '{stage}' stage for {branch}")
        release = m.group(1)
    else:
        raise RuntimeError(f"Cannot build for {branch}")
    return release
