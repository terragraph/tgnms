#!/usr/bin/env python3
# Copyright (c) 2014-present, Facebook, Inc.

import asyncio
import glob
import io
import os
import pickle
import signal
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


def read(cmd: str) -> str:
    p = subprocess.run(cmd, stdout=subprocess.PIPE, shell=True, check=True)
    return p.stdout.decode("utf-8").strip()


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
        "swarm_service": "nms_nms",
    },
    "docs": {
        "deployment": "nms_docs",
        "container": "nms_docs",
        "build_cmd": "docker build . -f docs/Dockerfile --tag nms_docs:dev",
        "image_name": "nms_docs",
        "swarm_service": "nms_docs",
    },
    # swarm-only nginx
    "nginx_swarm": {
        "deployment": "nginx",
        "container": "nginx",
        "build_cmd": "docker build nginx -f nginx/Dockerfile --network=host --tag nginx:dev",
        "image_name": "nginx",
    },
    # K8s only
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
    "crashlog-analysis-service",
    "anomaly_detection",
]

for service in msa_services:
    folder = service.replace("-", "_")
    projects[service] = {
        "deployment": service,
        "container": service,
        "build_cmd": f"docker build . -f {folder}/Dockerfile --tag {service}:dev --network=host ",
        "image_name": service,
        # service name in docker swarm
        "swarm_service": f'msa_{service.replace("-", "_")}',
    }


async def cmd_async(c, **kwargs):
    cwd = kwargs.get("cwd", BASE_CWD)
    cprint(col.YELLOW, c)
    proc = await asyncio.create_subprocess_shell(c, cwd=cwd, **kwargs)
    await proc.communicate()


async def prepare_image(cluster, builder, hosts, project):
    if project is not None:
        if project not in projects:
            raise RuntimeError(
                f"Unknown project {project}, add it to the list or specify everything manually"
            )
        build_cmd = "cd nmsdev && " + projects[project]["build_cmd"]
        image_name = projects[project]["image_name"]
        deployment = projects[project].get("deployment")
        swarm_service = projects[project].get("swarm_service")
        container = projects[project]["container"]

    if None in [build_cmd, image_name, deployment, container]:
        raise RuntimeError(
            f"All of these must be specified: {build_cmd=} {image_name=} {deployment=} {container=}"
        )

    cprint(
        col.BLUE,
        f"Building on {builder} and deploying to {','.join(hosts)}",
    )

    cprint(col.GREEN, f"Copying local files to {builder}:~/nmsdev")
    cmd("cd .. && cp ../.gitignore .")
    cmd(f"ssh {builder} 'rm -rf ~/nmsdev && mkdir ~/nmsdev'")
    cmd(
        f'cd .. && rsync -aP --exclude "third-party" --inplace --filter=":- .gitignore" nms/ {get_scp_dest(builder)}:~/nmsdev',
        stdout=subprocess.PIPE,
    )

    # Run the remote build command
    cprint(col.GREEN, "Building Dockerfile")
    cmd(f"ssh {builder} '{build_cmd}'")

    # Tar up the image
    cprint(col.GREEN, "Distributing Dockerfile to workers")
    cmd(f"ssh {builder} docker save -o {image_name}.tar.gz {image_name}:dev")

    # Copy tar to all nodes
    cmd(
        f"rsync -aP --inplace {get_scp_dest(builder)}:~/{image_name}.tar.gz /tmp/{image_name}.tar.gz"
    )
    coros = [
        cmd_async(f"rsync -aP --inplace /tmp/{image_name}.tar.gz {get_scp_dest(w)}:~")
        for w in hosts
    ]
    await asyncio.gather(*coros)
    if cluster == "k8s":
        coros = [
            cmd_async(
                f"ssh {w} podman load --input {image_name}.tar.gz",
            )
            for w in hosts
        ]
    elif cluster == "swarm":
        coros = [
            cmd_async(
                f'ssh {w} "docker load < {image_name}.tar.gz"',
            )
            for w in hosts
        ]
    await asyncio.gather(*coros)


async def go_impl(
    ctx,
    cluster,
    project,
    managers,
    workers,
):
    builder = "root@2620:10d:c0bf:1800:250:56ff:fe93:9a4a"
    kube_manager = managers[0]
    hosts = managers + workers
    await prepare_image(cluster, builder, hosts, project)

    image_name = projects[project]["image_name"]
    swarm_service = projects[project]["swarm_service"]

    if cluster == "k8s":
        cprint(col.GREEN, "Setting Kubernetes to use development image")
        cmd(
            f"ssh {kube_manager} kubectl set image deployment/{deployment} {container}=garbage"
        )
        cmd(
            f"ssh {kube_manager} kubectl set image deployment/{deployment} {container}=localhost/{image_name}:dev"
        )
    elif cluster == "swarm":
        cprint(col.GREEN, "Setting Docker Swarm to use development image")
        # we can't automatically update the image for the nginx_proxy_monitor
        if project == "nginx_swarm":
            cprint(
                col.YELLOW,
                "Please set the image to nginx:dev in /opt/terragraph/proxy/docker-compose.yml on each host. Then run systemctl restart nginx_proxy_monitor",
            )
        else:
            cmd(
                f"ssh {kube_manager} docker service update --force --image {image_name}:dev {swarm_service}"
            )


async def devproxy_impl(ctx, cluster, host, rm, daemon):
    if rm:
        return remove_devproxy(cluster, host)
    project_name = "dev_proxy"
    builder = "root@2620:10d:c0bf:1800:250:56ff:fe93:9a4a"
    await prepare_image(cluster, builder, [host], project_name)

    if cluster == "k8s":
        cprint(col.RED, "K8s support not implemented")
        return ctx.exit(1)
    elif cluster == "swarm":
        cprint(
            col.GREEN,
            "Starting proxy",
        )

        id_format = "{{.ID}}"
        proxy_id = read(
            f"ssh {host} docker ps --filter 'name={project_name}' --format '{id_format}'"
        )
        if proxy_id:
            print(f"Removing existing proxy container: {proxy_id}")
            cmd(f"ssh {host} docker rm -f {project_name}")
        cmd(
            f"ssh {host} docker run -d --network terragraph_net -p 3128:3128 -p 3389:3306 --name {project_name} {project_name}:dev"
        )
        cprint(col.GREEN, "Configuring SSH tunnel")
        cmd(f"ssh -M -S /tmp/devproxy-socket -fnNT -L 3128:localhost:3128 {host}")
    if not daemon:
        cprint(
            col.GREEN,
            "Press Ctrl+c to stop the proxy. Pass the --daemon flag to run the proxy in the background",
        )
        signal.signal(signal.SIGINT, lambda sig, frame: remove_devproxy(cluster, host))
        signal.pause()
    else:
        cprint(
            col.GREEN,
            "Proxy running in the background. Pass the --rm flag to stop it",
        )


def remove_devproxy(cluster, host):
    cprint(col.GREEN, "Stopping development proxy")
    if cluster == "k8s":
        pass
    else:
        cmd(f"ssh {host} docker rm -f dev_proxy")
    cprint(col.GREEN, "Stopping SSH tunnel")
    cmd(f"ssh -S /tmp/devproxy-socket -O exit {host}")


@cli.command()
@click.option("--cluster", default="k8s", type=click.Choice(["k8s", "swarm"]))
@click.option("--project", type=click.Choice(projects.keys()))
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
@click.option("--project", type=click.Choice(projects.keys()))
@click.option("--build_cmd")
@click.option("--image_name")
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
def reset(ctx, project, container, build_cmd, managers, workers, image_name):
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


@cli.command(help="Deploy a development proxy to the cluster")
@click.option("--cluster", default="k8s", type=click.Choice(["k8s", "swarm"]))
@click.option("--host")
@click.option(
    "--rm", default=False, is_flag=True, help="Stop a proxy running in the background"
)
@click.option(
    "--daemon",
    default=False,
    is_flag=True,
    help="Run the proxy in the background. Pass the --rm flag to stop a proxy running in the background.",
)
@click.pass_context
def devproxy(*args, **kwargs):
    asyncio.run(devproxy_impl(*args, **kwargs))


if __name__ == "__main__":
    cli()
