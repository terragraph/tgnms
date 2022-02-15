## NMS Installer CLI

This software installs Terragraph software stack to the supplied hardware.

## Prerequisites

* IPv4 and IPv6 connectivity on all Hosts/VMs
* OS support: Ubuntu 18.04, 20.04, Centos8, Redhat8
* at-least 2GB RAM (8GB+ recommended) and 32 GB (64GB+ recommended) of free disk space.
* To make your install fault resilient  we prefer 3+ hosts/VMs
* python3-dev pre installed.
* sshpass pre installed (only if you use -p)

## Install Instructions

1. Save nms executable to a desired directory, make it executable if needed
    1.  `chmod +x nms`
2. Run the nms command to generate a default config set
    1. `./nms show-defaults > config.yaml`
3. Edit the default config file (`config.yaml`) as desired
4. Run install
    1. `./nms install -f config.yaml`
