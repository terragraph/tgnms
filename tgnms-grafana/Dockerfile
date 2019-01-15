ARG GRAFANA_VERSION="latest"

FROM grafana/grafana:${GRAFANA_VERSION}

WORKDIR /var/lib/grafana

# Install packages useful for debugging
USER root
RUN apt-get update
RUN apt-get -y upgrade
RUN apt-get install -y vim netcat
# end installing packages for debugging

# grafana expects plugins to be owned by user grafana
USER grafana
COPY . .

# use setup.py to install grafana cli
USER root
RUN apt-get install -y python3-pip
RUN pip3 install --upgrade pip setuptools
RUN pip3 install .
