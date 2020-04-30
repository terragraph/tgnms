FROM golang:latest AS builder

WORKDIR $GOPATH/src/github.com/gluster/gluster-prometheus
RUN git clone https://github.com/gluster/gluster-prometheus.git .
RUN scripts/install-reqs.sh
RUN PREFIX=/ make
RUN PREFIX=/ make install

FROM gluster/gluster-centos

COPY --from=builder /sbin/gluster-exporter /sbin/gluster-exporter
