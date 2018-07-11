# Pull base image
FROM ubuntu:18.04

ENV WORKDIR /usr/local

RUN apt-get update
RUN apt-get -y upgrade

# Install prerequisites and needed packages
RUN apt-get install -y wget nano libtool libboost-all-dev automake bison flex
RUN apt-get install -y g++ libevent-dev libssl-dev libtool make pkg-config
RUN apt-get install -y iputils-ping

# Set apt-get to be noninteractive
ENV DEBIAN_FRONTEND noninteractive
ENV DEBCONF_NONINTERACTIVE_SEEN true

# Install python3
RUN apt-get install -y python3-pip python3-dev python3-tk\
    && cd /usr/local/bin \
    && ln -s /usr/bin/python3 python \
    && pip3 install --upgrade pip

# Copy Analytics source files into docker container
COPY ./analytics $WORKDIR/analytics
# Copy beringei/beringei/if, will be used as API between Analytics and BQS
RUN mkdir -p $WORKDIR/beringei/beringei/if
COPY ./beringei/beringei/if $WORKDIR/beringei/beringei/if

# Define default command
CMD ["bash"]

WORKDIR $WORKDIR/analytics

# Install the needed packages
RUN  chmod +x $WORKDIR/analytics/setup_analytics_env.sh
RUN  $WORKDIR/analytics/setup_analytics_env.sh

# Remove un-needed building depends
RUN apt-get purge -y --auto-remove bison flex g++
RUN apt-get clean
RUN rm -rf /tmp/*

# Generate the Analytics API
RUN chmod +x $WORKDIR/analytics/interface/generate_analytics_api.sh
RUN $WORKDIR/analytics/interface/generate_analytics_api.sh
