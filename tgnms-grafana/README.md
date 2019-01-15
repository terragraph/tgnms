# Terragraph NMS Grafana
Beringei plugin for Grafana, configuration, and FB-created dashboards.

## Building and Installation
The terragraph Grafana image can be built using the script
- build_grafana_docker.sh

The tg-grafana image is used both for running Grafana and, as a second
container for initiating users, data sources, and installing pre-built
dashboards.

Once installed, Grafana will have two data sources:
- Beringei
- MySQL

and pre-designed dashboards which will continue to be updated and developed.

When bringing up the docker containers with docker-compose, the Grafana
container
will start first and then the utility container will start to load the
data sources, dashboards, and users.




## Export Dashboards
You can create new dashboards and export them using:
```
python3 export_dashboards.py <ip address of grafana> <port of grafana>
<user> <passwd> [dashboard name or part of name or "all"]
```
This python script uses python3 and can be run outside of docker on the host
machine as long as python3 and requests are installed.

After exporting dashboards, you can put them in the dashboards directory and
check them into the repo to distribute them with NMS. The import_dashboards.py
script will read all files in the dashboards directory.

### Instructions for exporting dashboards from within container (example)
1. exec into the grafana docker container
2. <code>cd /var/lib/grafana/utilities</code>
3. <code>python3 export_dashboards.py grafana 3000 admin <admin password> all</code>
4. copy generated file into version control
