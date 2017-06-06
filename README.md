# Terragraph NMS
UI to visualize the terragraph wireless network.

## HW Recommendation
**Stats storage/processing has been changing recently so we do not have a firm guideline for HW sizing. The more memory we have, the longer we can configure to keep stats data available. We plan to have recommendations for specific time periods and sector counts**

## Prerequisites
1. **CentOS 7**. We tailored the instructions to this distribution. If you use another distribution you should be very familiar with it.
2. **IPv4 connectivity to the internet**. The UI code is stored on github, which is IPv4-only. NPM (NodeJS Package Manager) is used to install the dependent packages, which is also IPv4-only. If you don't have direct connectivity you'll need to configure your gitconfig, npmconfig, and wgetrc to specify the proxy.
3. **E2E topology file(s)**. The NMS UI loads the topology file(s) from disk as a backup when the E2E controller is offline. You need to provide the 'offline' topology file.
4. **IP Connectivity to E2E Controller and NMS Aggregator**. The NMS UI updates based on the E2E controller topology and NMS Aggregator status.

## Install
Perform all instructions as the root user.
### Pre-requisites
#### Check for IPv4-connectivity to the internet
Try pinging an ipv4-only site such as github.com to verify connectivity.
```
ping www.github.com
```
If you are missing direct connectivity you can specify a proxy to git, npm, and wget for the installation instructions to succeed.
##### Example proxy configs
**~/.gitconfig**
```
[http]
proxy = <PROXY_ADDRESS>

[https]
proxy = <PROXY_ADDRESS>
```
**~/.npmrc**
```
proxy=<PROXY_ADDRESS>
https-proxy=<PROXY_ADDRESS>
```
**~/.wgetrc**
```
http_proxy=<PROXY_ADDRESS>
https_proxy=<PROXY_ADDRESS>
```
#### Add the nms user
```
useradd nms
```
#### Dependencies
```
yum -y install gcc-c++ git mariadb-server
systemctl start mariadb
systemctl enable mariadb
```
#### Install ZeroMQ
[ZeroMQ download](http://zeromq.org/intro:get-the-software)
Commands:
```
pushd ~nms
wget https://github.com/zeromq/libzmq/releases/download/v4.2.1/zeromq-4.2.1.tar.gz
tar -xf zeromq-4.2.1.tar.gz
cd zeromq-4.2.1
./configure --prefix=/usr && make && make install
popd
```
### Install NodeJS
[NodeJS instructions](https://nodejs.org/en/download/package-manager/#enterprise-linux-and-fedora)
Commands:
```
pushd ~nms
curl --silent --location https://rpm.nodesource.com/setup_7.x | bash -
yum -y install nodejs
popd
```
### NMS UI setup
#### Checkout the repository
```
pushd ~nms
git clone https://github.com/pmccut/tgnms.git
ln -s tgnms/www www
cd www && npm install
popd
```
#### Run patch script
```
pushd ~nms/www
./patch.sh
popd
```
##### Import initial schema
```
mysql -uroot -p -e"create database cxl"
mysql -uroot -p cxl < ~nms/tgnms/schema/cxl.sql
```
### UI Configuration
The UI needs to be configured to know which topologies it should display.
#### Instance config
```
pushd ~nms/www/config/instances
```
Use **example_networks.json** as an example instance config. Important parameters to update:
* **topology_file** topology file name. Ensure the file exists within ~nms/www/config/networks/
* **latitude/longitude** Initial coordinates for the center of the map.
* **zoom_level** Initial zoom level for the map. You may need to experiment here to see what you want by default.
* **controller_ip** The IP address of the E2E controller service.
* **aggregator_ip** The IP address of the NMS aggregator service.

Once the instance config is ready you must tell the UI which instance you want to use. If you don't set a config we default to the 'lab_networks' config
* Set name in /etc/sysconfig/nms (don't include the .json extension)
```
echo 'export NETWORK="example_networks"' > /etc/sysconfig/nms
```

### Build Beringei (stats daemon)
Beringei is a Facebook open sourced project that is extremely efficient at storing a large amount of stats in memory. We write all stats data to beringei, storing the 30-second interval data for 7 days. MySQL is used to store the node to key mappings and beringei is only aware of the key id from MySQL.
**Beringei requires many FB open sourced projects which require newer versions of system packages, this requires us to compile a large amount of packages for CentOS 7**
```
pushd setup/beringei/
./dev_env.sh
./install_beringei_system_deps.sh
./install_beringei_fb_deps.sh
./build_beringei_reader.sh
popd
```

### Enable and Start systemd services
Run these commands to enable the two primary services - nms_prod and nms_mysql_writer
```
for dir in ~nms/tgnms/service/*; do [ -d "$dir" ] && systemctl enable $dir/$(basename $dir).service; done
systemctl daemon-reload
for dir in ~nms/tgnms/service/*; do [ -d "$dir" ] && systemctl start $(basename $dir).service; done
```
### Log files
The services should now be running using systemd. You can view the log files using journalctl.
```
journalctl -u nms_prod -f
```
* **nms_prod** is the UI service listening on port 80.
* **nms_mysql_writer** is the stats/events/alerts backend writer listening on port 8086.
