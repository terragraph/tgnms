# Terragraph NMS
UI to visualize the terragraph wireless network.

## Prerequisites
1. Recent-ish version of nodejs. 6.9.1 was used for development.
2. zeromq headers (zeromq-devel for CentOS)

## Install
These instructions assume a CentOS 7 distribution.
### Add the nms user
    useradd nms
    cd ~nms
### Checkout this repository
`git clone https://github.com/pmccut/tgnms.git`
### Create symlink for 'www'
`ln -s tgnms/www www`
### Install ZeroMQ
[ZeroMQ download](http://zeromq.org/intro:get-the-software)
### Install NodeJS
[NodeJS instructions](https://nodejs.org/en/download/package-manager/#enterprise-linux-and-fedora)
### Run patch script
`pushd www && ./patch.sh ; popd`
### Install MariaDB (MySQL)
`yum install mariadb-server`
#### Import schema
    mysql -uroot -p -e"create database cxl"
    mysql -uroot -p cxl < ~nms/tgnms/schema/cxl.sql
### Set the config for displayed topologies
1. Find matching or add new to  ~nms/www/config/instances/
2. Set name in /etc/sysconfig/nms (don't include the .json extension)

    echo 'export NETWORK="sjc_networks"' > /etc/sysconfig/nms

### Enable and Start systemd services
    for dir in ~nms/tgnms/service/*; do [ -d "$dir" ] && systemctl enable $dir/$(basename $dir).service; done
    systemctl daemon-reload
    for dir in ~nms/tgnms/service/*; do [ -d "$dir" ] && systemctl start $(basename $dir).service; done
    
# Running E2EController / NMSAggregator
Basic support for running e2e_controller and nms_aggregator is checked into service_chroot/
Activating is fairly straight-forward.

## Configuration
You must define the rootfs path for e2e_controller and nms_aggregator.
For CentOS this is defined in /etc/sysconfig/tg_services, Debian/Ubuntu uses /etc/default/tg_services.

E2E_ROOTFS="/root/rootfs"
NMS_ROOTFS="/root/rootfs"
NMS_ARGS="-v 2"

## Install    
    for dir in ~nms/tgnms/service_chroot/*; do [ -d "$dir" ] && systemctl enable $dir/$(basename $dir).service; done
    systemctl daemon-reload
    for dir in ~nms/tgnms/service_chroot/*; do [ -d "$dir" ] && systemctl start $(basename $dir).service; done

## Logging
   journalctl -u e2e_controller -f
   journalctl -u nms_aggregator -f
