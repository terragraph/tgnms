# NMS Installer CLI
This software installs the Terragraph software stack on the supplied hardware.

## Prerequisites
Refer to the top-level [README.md](../README.md) for recommended and well-tested
system specifications.

The CLI *may* support these looser specifications:
* OS: Ubuntu 18.04 or 20.04, Centos 8, Redhat 8
* 2GB of RAM (8GB+ recommended)
* 32GB of disk space (64GB+ recommended)

The following software must be pre-installed to run the CLI:
* `python3-dev`
* `sshpass` (only with the "-p" option)

## Installation
Refer to the top-level [README.md](../README.md) for installation and usage
instructions.

## Technical Notes
- The CLI invokes the Ansible Playbook executor via Ansible Python APIs to run
  all deployment steps.
- The Terragraph software stack is installed in Docker Swarm mode by default. An
  experimental Kubernetes mode was in development ("nms beta" command), but is
  no longer functional or maintained.
