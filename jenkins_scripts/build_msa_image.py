import os
import subprocess
import argparse
import re
import logging
from typing import Tuple


logging.basicConfig(level=logging.DEBUG)


def run(cmd: str) -> None:
    logging.info(f"Running: {cmd}")

    subprocess.check_call(cmd, shell=True)


def read(cmd: str) -> str:
    logging.info(f"Reading: {cmd}")
    p = subprocess.run(cmd, stdout=subprocess.PIPE, shell=True)
    return p.stdout.decode("utf-8").strip()


def get_commit_info() -> Tuple[str, str]:
    commit_body = read("git log -1 --pretty='%b'")
    match = re.search("Differential Revision: D(\d+)", commit_body)
    if match is None:
        diff_num = "<unknown>"
    else:
        diff_num = match.groups()[0]

    # a string with more information about the commit
    # (e.g.): [2020-10-08 12:12:07 -0700] aa78800: Add lint / unit tests
    full_commit_info = read("git log -1 --pretty='[%ci] %h: %s'")
    full_commit_info = f"{full_commit_info} (D{diff_num})"

    # just the short hash, e.g.: aa78800
    commit_hash = read("git log -1 --pretty='%h'")

    return commit_hash, full_commit_info


def env(key: str) -> str:
    result = os.getenv(key)
    if result is None:
        raise RuntimeError(f"{key} environment variable must be set")
    return result


def get_release() -> str:
    branch = env("GIT_BRANCH")

    if branch == "origin/master":
        return "latest"
    else:
        return branch.split("/")[-1]


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Run docker build / push for Terragraph MSA images")
    parser.add_argument("--docker_registry", default="secure.cxl-terragraph.com:443")
    parser.add_argument("--docker_package_name", required=True)

    args = parser.parse_args()

    logging.info(
        f"Building package {args.docker_package_name} to {args.docker_registry}")

    # build image
    commit_hash, full_commit_info = get_commit_info()
    logging.info(f"Commit: {full_commit_info}")

    release = get_release()
    logging.info(f"Release: {release}")

    run(
        f"docker build -f {args.docker_package_name}/Dockerfile"
        f" --tag '{args.docker_registry}/{args.docker_package_name}:{release}'"
        f' --label "commit_info={full_commit_info}"'
        f' --label "commit_hash={commit_hash}"'
        " ."
    )

    # login to repository
    run(
        f"echo {env('DOCKER_PASSWORD')} |"
        f" docker login -u {env('DOCKER_LOGIN')} --password-stdin {args.docker_registry}/v2"
    )

    # upload image
    run(f"docker push {args.docker_registry}/{args.docker_package_name}")
