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
### Run patch script
`pushd www && ./patch ; popd`
### Install runit
The easiest route is an existing package.
[Runit instructions](https://packagecloud.io/imeyer/runit/packages/el/7/runit-2.1.1-7.el7.centos.x86_64.rpm?page=2)
### Create runit services
`for dir in ~nms/tgnms/service/*; do ln -s $dir /etc/service/$(basename $dir); done`
### Install ZeroMQ
[ZeroMQ download](http://zeromq.org/intro:get-the-software)
### Install NodeJS
[NodeJS instructions](https://nodejs.org/en/download/package-manager/#enterprise-linux-and-fedora)
### Install MariaDB (MySQL)
`yum install mariadb`
#### Import schema
    mysql -uroot -p -e"create database cxl"
    mysql -uroot -p cxl < ~nms/tgnms/schema/cxl.sql
### Set the config for displayed topologies
1. Find matching or add new to  ~nms/www/config/instances/
2. Set name in /etc/sysconfig/nms (don't include the .json extension)
`export NETWORK="sjc_networks"`
### Enable services (runit)
    chkconfig runit on
    for dir in ~nms/tgnms/service/*; do sv start $(basename $dir); done
