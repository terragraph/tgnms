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
We have recently switched to using docker + ansible. This greatly simplifies the installation process, but we're still working through exposing more configuration options. Perform all instructions as the root user.

You'll need to request access to our terragraph-nms github + docker repository.  These are separate logins.
1. Clone the repository.
```
git clone https://github.com/facebookexternal/terragraph-nms
```
2. Ensure ssh-keys work locally as root.
```
ssh-keygen -t rsa
cat ~/.ssh/id_rsa.pub >> ~/.ssh/authorized_keys
```
3. Run the launch script as root.
```
cd tgnms/docker
TARGET_USER=root ./launch.sh
```

This will pull down and run all required images. This doc will be updated shortly with configuration options.

### UI Configuration
The UI needs to be configured to know which topologies it should display.
#### Instance config
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
