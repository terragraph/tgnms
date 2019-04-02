# Pull base image
FROM ubuntu:18.04

ENV WORKDIR /usr/local/analytics

RUN apt-get update
RUN apt-get -y upgrade

# Install prerequisites and needed packages
RUN apt-get install -y wget nano libtool libboost-all-dev automake bison flex g++ libevent-dev libssl-dev libtool make pkg-config iputils-ping mysql-client libmysqlclient-dev netcat

# Set apt-get to be noninteractive
ENV DEBIAN_FRONTEND noninteractive
ENV DEBCONF_NONINTERACTIVE_SEEN true

# Install python3
RUN apt-get install -y python3-pip python3-dev python3-tk\
    && cd /usr/local/bin \
    && ln -s /usr/bin/python3 python \
    && pip3 install --upgrade pip

# Copy Analytics source files into docker container
RUN mkdir -p $WORKDIR
COPY . $WORKDIR

WORKDIR $WORKDIR

# Install the needed packages
RUN chmod +x ./setup_analytics_env.sh
RUN ./setup_analytics_env.sh


# Remove un-needed building depends
RUN apt-get purge -y --auto-remove bison flex g++
RUN apt-get clean
RUN rm -rf /tmp/*

# Generate the Analytics API
RUN chmod +x interface/generate_analytics_api.sh
RUN interface/generate_analytics_api.sh

# Install out modules into python3's module dir so we don't need sys.path hacks
# Also will install python dependencies defined in setup.py
RUN python3 setup.py install

# Define default command
CMD ["bash"]
