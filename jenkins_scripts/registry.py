# Copyright (c) 2014-present, Facebook, Inc.
import argparse
import logging
import os
import re
import subprocess
from typing import Dict

from shared import get_next_tag, read, get_release


logging.basicConfig(level=logging.DEBUG)


def run(cmd: str) -> None:
    logging.info(f"Running: {cmd}")
    subprocess.run(cmd, shell=True, check=True)


def _read(cmd: str) -> str:
    logging.info(f"Reading: {cmd}")
    return read(cmd)


def get_commit_info() -> Dict[str, str]:
    commit_body = _read("git log -1 --pretty='%b'")
    match = re.search(r"Differential Revision: D(\d+)", commit_body)
    if match is None:
        diff_num = "<unknown>"
    else:
        diff_num = f"D{match.groups()[0]}"

    return {
        "commit.date": _read("git log -1 --pretty='%ci'"),
        "commit.subject": _read("git log -1 --pretty='%s'"),
        "commit.hash": _read("git log -1 --pretty='%h'"),
        "commit.diff": diff_num,
    }


def build(args: argparse.Namespace) -> None:
    command = ["docker", "build", "-f", f"{args.dir}/Dockerfile"]
    release = get_release(args.branch, args.stage)
    if re.search(r"origin/(main|master)", args.branch) and args.stage:
        command += ["--target", args.stage]

    # Tag the image with the release version
    if args.tag:
        logging.info(f"Tagging image with custom tag: {args.tag}")
        command += ["--tag", f"{args.registry}/{args.name}:{args.tag}"]
    else:
        version_tag = get_next_tag(release, printer=logging.info)
        logging.info(f"Tagging image with tag: {version_tag}")
        command += ["--tag", f"{args.registry}/{args.name}:{release}"]
        command += ["--tag", f"{args.registry}/{args.name}:{version_tag}"]

    command += ["--build-arg", f'"TAG={release}"']
    for arg in args.build_arg or []:
        command += ["--build-arg", f'"{arg}"']
    for label, value in get_commit_info().items():
        command += ["--label", f'"{label}={value}"']

    command.append(args.context)
    run(" ".join(command))


def push(args: argparse.Namespace) -> None:
    command = [
        "echo",
        os.environ["DOCKER_PASSWORD"],
        "|",
        "docker",
        "login",
        "-u",
        args.username,
        "--password-stdin",
        f"{args.registry}/v2",
    ]
    run(" ".join(command))
    if args.tag:
        push_cmd = f"docker push {args.registry}/{args.name}:{args.tag}"
    else:
        push_cmd = f"docker push --all-tags {args.registry}/{args.name}"
    run(push_cmd)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Docker registry CLI parser for TG")
    subparsers = parser.add_subparsers(title="actions")
    subparsers.required = True

    build_parser = subparsers.add_parser("build")
    build_parser.add_argument("name", help="docker package name")
    build_parser.add_argument("--branch", help="git branch that is being built")
    build_parser.add_argument("--build-arg", action="append", help="specify build args")
    build_parser.add_argument("--context", help="build context path", default=".")
    build_parser.add_argument("--dir", help="directory of the Dockerfile", default=".")
    build_parser.add_argument(
        "--registry",
        help="regsitry hostname and port",
        default="secure.cxl-terragraph.com:443",
    )
    build_parser.add_argument("--stage", help="specify a Dockerfile stage")
    build_parser.add_argument(
        "--tag",
        help="tag this image with this tag only",
    )
    build_parser.set_defaults(func=build)

    push_parser = subparsers.add_parser("push")
    push_parser.add_argument("name", help="docker package name")
    push_parser.add_argument(
        "--registry",
        help="regsitry hostname and port",
        default="secure.cxl-terragraph.com:443",
    )
    push_parser.add_argument("--username", help="docker registry username")
    push_parser.add_argument(
        "--tag",
        help="specific docker image tag to push, default is all tags in repository",
    )
    push_parser.set_defaults(func=push)

    args = parser.parse_args()
    args.func(args)
