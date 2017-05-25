# Terragraph NMS
UI to visualize the terragraph wireless network.

## Prerequisites
1. CentOS 7. We tailored the instructions to this distribution. If you use another distribution you should be very familiar with it.
2. IPv4 connectivity to the internet. The UI code is stored on github, which is IPv4-only. NPM (NodeJS Package Manager) is used to install the dependent packages, which is also IPv4-only. If you don't have direct connectivity you'll need to configure your gitconfig, npmconfig, and wgetrc to specify the proxy.

## Install
Perform all instructions as the root user.
### Add the nms user
```
useradd nms
cd ~nms
```
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
```
mysql -uroot -p -e"create database cxl"
mysql -uroot -p cxl < ~nms/tgnms/schema/cxl.sql
```
### Set the config for displayed topologies
1. Find matching or add new to  ~nms/www/config/instances/
2. Set name in /etc/sysconfig/nms (don't include the .json extension)
```
echo 'export NETWORK="sjc_networks"' > /etc/sysconfig/nms
```
### Enable and Start systemd services
```
for dir in ~nms/tgnms/service/*; do [ -d "$dir" ] && systemctl enable $dir/$(basename $dir).service; done
systemctl daemon-reload
for dir in ~nms/tgnms/service/*; do [ -d "$dir" ] && systemctl start $(basename $dir).service; done
```
