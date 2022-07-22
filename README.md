# Terragraph NMS

<p align="center">
  <img src="./docs/_static/media/logo/terragraph-logo-full-RGB.svg" width="320" />
</p>

Terragraph is a gigabit wireless technology designed to meet the growing demand
for reliable high-speed internet access. Documentation for the project can be
found at [terragraph.com](https://terragraph.com).

This repository contains code for the Terragraph Network Management System
(TGNMS). **Compatibility and product support with any commercial Terragraph
solution should be discussed with the appropriate Terragraph vendor directly.**

## Installation
The Terragraph cloud suite is deployed as a set of Docker services in a Docker
Swarm. Terragraph includes an executable installer that automatically configures
the Docker Swarm and installs all of the cloud services.

### System Requirements
Docker Swarm recommends at least 3 (Docker) hosts for redundancy. If redundancy
is not required, the cloud suite can be run on a single host. To support a
network composed of roughly 512 sectors, each Docker host must meet the
following specifications.

* Ubuntu 18.04
* 4 vCPU
* 16GB of RAM
* 200GB of disk space
* Globally addressable IPv6 and private (or global) IPv4
* A unique and static hostname for each Docker node

### Partitioning Scheme
Below is a suggested filesystem partitioning scheme for the Docker hosts. By
default, all of the Terragraph-specific data is stored in `/opt/terragraph`.

| Partition         | Size  | Description                     |
| ----------------- | ----- | ------------------------------- |
| `/opt`            | 130GB | Storage for all Terragraph data |
| `/var/lib/docker` | 50GB  | Storage for all Docker data     |

### Installation Options
Terragraph comes with an installer that deploys and configures the Terragraph
cloud suite. The installer is a PEX file which packages together Ansible, a
Python CLI, and all of their dependencies into a single executable. An
installation host that has SSH access to all the Docker hosts is necessary to
run the installer. The installation host can be one of the Docker hosts.

#### Installation from Source

```bash
git clone https://github.com/terragraph/tgnms
cd tgnms/nms_stack
python -m pip install .

# Verify the installer tool was installed correctly.
nms install --help

# Create the configuration file from this template.
nms show-defaults > config.yml

# Modify the config file.

# Run the installer tool.
nms install -f config.yml
```

#### Installation from PEX

```bash
# Download release via this command or from the Releases section on Github.
wget https://github.com/terragraph/tgnms/releases/latest/download/nms

chmod +x nms
nms --version

# Install Python 3.8 on the installation host.
sudo apt-get install python3-distutils-extra
sudo apt-get install python3.8

# Create the configuration file from this template.
nms show-defaults > config.yml

# Modify the config file.

# Run the installer tool.
nms install -f config.yml
```

## Developer Guide
[See here](tgnms/fbcnms-projects/tgnms/README.md).

Additional documentation for the TGNMS can be found
[here](http://terragraph.github.io/tgnms).

## Overall Architecture
![image](readme_images/ArchitectureOverview.png)

## Release Process
1. Code changes are merged into `main` or an LTS branch. All tests/linters must
   pass and the Pull Request must be approved by a key maintainer/code owner.
2. Our Github Actions jobs start, building the Docker images and creating the
   installer PEX.
3. These assets are then made available via Github Releases, tagged with the
   version name.

In order to understand the release process, it's important to understand what a
release is and how it is generated. The NMS stack mainly consists of Docker
images published to the registry, and the CLI installer. At its core, a single
release is a set of Docker images and the CLI installer, which were built from a
branch of the codebase at the same point in time.

![image](readme_images/ReleaseProcess.png)

## Upgrading
The installer also performs E2E controller upgrades. Running the `upgrade`
command upgrades `e2e_controller`, `api_service`, `stats_agent`, and
`nms_aggregator` to the image specified by `<docker_image>`. It also copies the
controller's data folder and mounts the new copy in the controller container.
This provides automatic backups of the topology and config.
```bash
nms upgrade -f config.yml -c <controller_name> -i <docker_image> -h my-e2e-controller01
```

To upgrade other services, use the following command:
```bash
docker service update --with-registry-auth --image <image> <service_name>
```

## Community
Please review our [Code of Conduct](CODE_OF_CONDUCT.md) and
[Contributing Guidelines](CONTRIBUTING.md).

General discussions are held on our
[Discord server](https://discord.gg/HQaxCevzus).

![](https://discordapp.com/api/guilds/982440743765409822/widget.png?style=banner2)

## License
TGNMS has an MIT-style license as can be seen in the [LICENSE](LICENSE) file.
