#!/usr/bin/env python3
# Copyright (c) 2014-present, Facebook, Inc.

import asyncio
import glob
import io
import os
import pickle
import subprocess
import sys
import tarfile
import tempfile
import urllib.request

import click


THIS_CWD = os.path.dirname(os.path.realpath(__file__))
BASE_CWD = os.path.join(THIS_CWD, "..")


class col:
    HEADER = "\033[95m"
    BLUE = "\033[94m"
    CYAN = "\033[96m"
    GREEN = "\033[92m"
    YELLOW = "\033[93m"
    RED = "\033[91m"
    ENDC = "\033[0m"
    BOLD = "\033[1m"
    UNDERLINE = "\033[4m"


def cprint(c, text):
    print(col.BOLD + c + text + col.ENDC)


def cmd(c, **kwargs):
    cwd = kwargs.get("cwd", BASE_CWD)
    cprint(col.YELLOW, c)
    subprocess.run(c, shell=True, cwd=cwd, check=True, **kwargs)


@click.group(invoke_without_command=True)
@click.option("--version", is_flag=True, default=False, help="Show version")
@click.pass_context
def cli(ctx, version):
    """
    CLI utility to build and deploy a Docker image into a k8s cluster from
    local sources.
    """
    if ctx.invoked_subcommand is None:
        click.echo(ctx.get_help())
        ctx.exit(1)


def get_scp_dest(dest):
    scp_dest = dest
    if ":" in dest:
        pieces = dest.split("@")
        last = pieces.pop()
        scp_dest = "@".join(pieces + [f"[{last}]"])
    return scp_dest


@cli.command()
@click.option(
    "-m",
    "--machines",
    multiple=True,
    help="Node IP",
)
@click.pass_context
def prepare(ctx, machines):
    for machine in machines:
        cmd(
            f"ssh {machine} 'apt update && apt install -y docker.io unzip podman'",
            stderr=subprocess.PIPE,
            stdout=subprocess.PIPE,
        )
        print(f"Done with {machine}")


projects = {
    "tgnms": {
        "deployment": "nms",
        "container": "nms",
        "build_cmd": "cd tgnms && docker build . -f fbcnms-projects/tgnms/Dockerfile --network=host --tag nmsv2:dev",
        "image_name": "nmsv2",
    },
    "controller-operator": {
        "deployment": "controller-operator",
        "container": "controller-operator",
        "build_cmd": "docker build . -f k8s_controller_operator/Dockerfile --network=host --tag controller-operator:dev",
        "image_name": "controller-operator",
    },
    "dev_proxy": {
        "deployment": "dev_proxy",
        "container": "dev_proxy",
        "build_cmd": "docker build dev_proxy -f dev_proxy/Dockerfile --network=host --tag dev_proxy:dev",
        "image_name": "dev_proxy",
        "swarm_service": "dev_proxy",
    },
    "nms_nginx": {
        "deployment": "nms_nginx",
        "container": "nms_nginx",
        "build_cmd": "docker build nginx -f nginx/Dockerfile --network=host --tag nms_nginx:dev",
        "image_name": "nms_nginx",
    },
}

msa_services = [
    "weather-service",
    "network-health-service",
    "scan-service",
    "default-routes-service",
    "network-test",
    "analytics",
    "topology-service",
    "queryservice",
]

for service in msa_services:
    folder = service.replace("-", "_")
    projects[service] = {
        "deployment": service,
        "container": service,
        "build_cmd": f"docker build . -f {folder}/Dockerfile --tag {service}:dev --network=host ",
        "image_name": service,
    }


async def cmd_async(c, **kwargs):
    cwd = kwargs.get("cwd", BASE_CWD)
    cprint(col.YELLOW, c)
    proc = await asyncio.create_subprocess_shell(c, cwd=cwd, **kwargs)
    await proc.communicate()


async def go_impl(
    ctx, project, deployment, container, build_cmd, managers, workers, image_name
):
    if project is not None:
        if project not in projects:
            raise RuntimeError(
                f"Unknown project {project}, add it to the list or specify everything manually"
            )
        build_cmd = "cd nmsdev && " + projects[project]["build_cmd"]
        image_name = projects[project]["image_name"]
        deployment = projects[project]["deployment"]
        container = projects[project]["container"]

    if None in [build_cmd, image_name, deployment, container]:
        raise RuntimeError(
            f"All of these must be specified: {build_cmd=} {image_name=} {deployment=} {container=}"
        )

    # Select the build machine
    kube_manager = managers[0]
    docker_builder = "root@2620:10d:c0bf:1800:250:56ff:fe93:9a4a"

    cprint(
        col.BLUE,
        f"Building on {docker_builder} and deploying to k8s on {kube_manager}",
    )

    cprint(col.GREEN, f"Copying local files to {docker_builder}:~/nmsdev")
    cmd("cd .. && cp ../.gitignore .")
    cmd(f"ssh {docker_builder} 'rm -rf ~/nmsdev && mkdir ~/nmsdev'")
    cmd(
        f'cd .. && rsync -aP --exclude "third-party" --inplace --filter=":- .gitignore" nms/ {get_scp_dest(docker_builder)}:~/nmsdev',
        stdout=subprocess.PIPE,
    )

    # Run the remote build command
    cprint(col.GREEN, "Building Dockerfile")
    cmd(f"ssh {docker_builder} '{build_cmd}'")

    # Tar up the image
    cprint(col.GREEN, "Distributing Dockerfile to workers")
    cmd(f"ssh {docker_builder} docker save -o {image_name}.tar.gz {image_name}:dev")

    # Copy tar to all nodes
    # cmd(
    #     f"scp {get_scp_dest(docker_builder)}:~/{image_name}.tar.gz /tmp/{image_name}.tar.gz"
    # )
    cmd(
        f"rsync -aP --inplace {get_scp_dest(docker_builder)}:~/{image_name}.tar.gz /tmp/{image_name}.tar.gz"
    )

    coros = [
        cmd_async(f"rsync -aP --inplace /tmp/{image_name}.tar.gz {get_scp_dest(w)}:~")
        # cmd_async(f"scp /tmp/{image_name}.tar.gz {get_scp_dest(w)}:~")
        for w in managers + workers
    ]
    await asyncio.gather(*coros)

    # Add image, tag it with ':dev'
    coros = [
        cmd_async(
            f"ssh {w} podman load --input {image_name}.tar.gz",
            # stdout=asyncio.subprocess.PIPE,
            # stderr=asyncio.subprocess.PIPE,
        )
        for w in managers + workers
    ]
    await asyncio.gather(*coros)

    cprint(col.GREEN, "Setting Kubernetes to use development image")
    cmd(
        f"ssh {kube_manager} kubectl set image deployment/{deployment} {container}=garbage"
    )
    cmd(
        f"ssh {kube_manager} kubectl set image deployment/{deployment} {container}=localhost/{image_name}:dev"
    )


@cli.command()
@click.option("--project")
@click.option("--build_cmd")
@click.option("--image_name")
@click.option("--deployment")
@click.option("--container")
@click.option(
    "-m",
    "--manager",
    "managers",
    default=None,
    multiple=True,
    required=True,
    help="Control plane nodes for Kubernetes",
)
@click.option(
    "-w",
    "--worker",
    "workers",
    default=None,
    multiple=True,
    help="Worker nodes for Kubernetes",
)
@click.pass_context
def go(*args, **kwargs):
    asyncio.run(go_impl(*args, **kwargs))


@cli.command()
@click.option("--project")
@click.option("--build_cmd")
@click.option("--image_name")
@click.option("--deployment")
@click.option("--container")
@click.option(
    "-m",
    "--manager",
    "managers",
    default=None,
    multiple=True,
    required=True,
    help="Control plane nodes for Kubernetes",
)
@click.option(
    "-w",
    "--worker",
    "workers",
    default=None,
    multiple=True,
    help="Worker nodes for Kubernetes",
)
@click.pass_context
def reset(
    ctx, project, deployment, container, build_cmd, managers, workers, image_name
):
    kube_manager = managers[0]
    if project is not None:
        if project not in projects:
            raise RuntimeError(
                f"Unknown project {project}, add it to the list or specify everything manually"
            )
        image_name = projects[project]["image_name"]
        deployment = projects[project]["deployment"]
        container = projects[project]["container"]

    if None in [image_name, deployment, container]:
        raise RuntimeError(
            f"All of these must be specified: {image_name=} {deployment=} {container=}"
        )

    cmd(
        f"ssh {kube_manager} kubectl set image deployment/{deployment} {container}=garbage"
    )
    cmd(
        f"ssh {kube_manager} kubectl set image deployment/{deployment} {container}=secure.cxl-terragraph.com:443/{image_name}:latest"
    )


if __name__ == "__main__":
    cli()
