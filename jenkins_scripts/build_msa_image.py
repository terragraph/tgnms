import argparse
import logging
import os
import re
import subprocess
from typing import Dict


logging.basicConfig(level=logging.DEBUG)


def run(cmd: str) -> None:
    logging.info(f"Running: {cmd}")
    subprocess.run(cmd, shell=True, check=True)


def read(cmd: str) -> str:
    logging.info(f"Reading: {cmd}")
    p = subprocess.run(cmd, stdout=subprocess.PIPE, shell=True, check=True)
    return p.stdout.decode("utf-8").strip()


def get_commit_info() -> Dict[str, str]:
    commit_body = read("git log -1 --pretty='%b'")
    match = re.search(r"Differential Revision: D(\d+)", commit_body)
    if match is None:
        diff_num = "<unknown>"
    else:
        diff_num = f"D{match.groups()[0]}"

    return {
        "commit_date": read("git log -1 --pretty='%ci'"),
        "commit_subject": read("git log -1 --pretty='%s'"),
        "commit_hash": read("git log -1 --pretty='%h'"),
        "commit_diff": diff_num
    }


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
    commit_labels = get_commit_info()
    logging.info(f"Commit: {commit_labels}")

    release = get_release()
    logging.info(f"Release: {release}")

    labels = " ".join([f'--label "{name}={value}"' for name, value in commit_labels.items()])
    run(
        f"docker build -f {args.docker_package_name}/Dockerfile"
        f" --tag '{args.docker_registry}/{args.docker_package_name}:{release}'"
        f" {labels}"
        " ."
    )

    # login to repository
    run(
        f"echo {env('DOCKER_PASSWORD')} |"
        f" docker login -u {env('DOCKER_LOGIN')} --password-stdin {args.docker_registry}/v2"
    )

    # upload image
    run(f"docker push {args.docker_registry}/{args.docker_package_name}")
