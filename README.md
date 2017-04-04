# Terragraph NMS
Just enough to show the very basics.

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
    for dir in ~nms/tgnms/service/*; do [ -d "$dir" ] && systemctl start $(basename $dir).service; done
