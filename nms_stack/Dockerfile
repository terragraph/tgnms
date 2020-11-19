FROM ubuntu:18.04

WORKDIR /usr/local/nms
RUN apt update
RUN apt install -y devscripts dh-virtualenv python3.8
COPY nms_stack/ ./

RUN apt install -y debhelper
RUN ./builddeb.sh
