ARG GRAFANA_VERSION="latest"

FROM grafana/grafana:${GRAFANA_VERSION}

WORKDIR /var/lib/grafana

# Install packages useful for debugging
USER root
RUN apt-get update
RUN apt-get -y upgrade
RUN apt-get install -y netcat ${DEV_EXTRA_PACKAGES}
# end installing packages for debugging

# grafana expects plugins to be owned by user grafana
USER grafana
COPY . .

# use setup.py to install grafana cli
USER root
RUN apt-get install -y python3-pip
RUN pip3 install --upgrade pip setuptools
RUN pip3 install .

# install extra visualization plugins
RUN grafana-cli plugins install grafana-piechart-panel
