FROM grafana/grafana:latest

WORKDIR /var/lib/grafana

# Install packages useful for debugging
USER root
RUN apk update
RUN apk upgrade
RUN apk add netcat-openbsd ${DEV_EXTRA_PACKAGES}
# end installing packages for debugging

# grafana expects plugins to be owned by user grafana
USER grafana
COPY . .

# use setup.py to install grafana cli
USER root
RUN apk add python3-dev
RUN apk add --update python3
RUN pip3 install --upgrade pip setuptools
RUN pip3 install .

# install extra visualization plugins
RUN grafana-cli plugins install grafana-piechart-panel
