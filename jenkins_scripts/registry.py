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
        "commit.date": read("git log -1 --pretty='%ci'"),
        "commit.subject": read("git log -1 --pretty='%s'"),
        "commit.hash": read("git log -1 --pretty='%h'"),
        "commit.diff": diff_num,
    }


def build(args: argparse.Namespace) -> None:
    command = ["docker", "build", "-f", f"{args.dir}/Dockerfile"]
    if args.branch == "origin/master":
        if args.stage:
            command += ["--target", args.stage]
            release = "dev"
        else:
            release = "latest"
    elif m := re.search(r"origin/releases/(lts-nms-\d{2}\.\d{1,2})", args.branch):
        if args.stage:
            raise RuntimeError(f"Cannot build '{args.stage}' stage for {args.branch}")
        release = m.group(1)
    else:
        raise RuntimeError(f"Cannot build for {args.branch}")

    command += ["--tag", f"{args.registry}/{args.name}:{release}"]
    for arg in args.build_arg or []:
        command += ["--build-arg", arg]
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
    run(f"docker push {args.registry}/{args.name}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Docker resgistry CLI parser for TG")
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
    build_parser.set_defaults(func=build)

    push_parser = subparsers.add_parser("push")
    push_parser.add_argument("name", help="docker package name")
    push_parser.add_argument(
        "--registry",
        help="regsitry hostname and port",
        default="secure.cxl-terragraph.com:443",
    )
    push_parser.add_argument("--username", help="docker registry username")
    push_parser.set_defaults(func=push)

    args = parser.parse_args()
    args.func(args)
