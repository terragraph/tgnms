FROM golang:latest AS builder

WORKDIR $GOPATH/src/github.com/gluster/gluster-prometheus
RUN git clone https://github.com/gluster/gluster-prometheus.git .
RUN scripts/install-reqs.sh
RUN PREFIX=/usr/local make
RUN PREFIX=/usr/local make install

FROM gluster/gluster-centos

# Forward logs to docker logs collector
RUN install -D /dev/null /var/log/gluster-exporter/exporter.log && \
    ln -sf /dev/stdout /var/log/gluster-exporter/exporter.log

COPY --from=builder /usr/local/sbin/gluster-exporter /usr/local/sbin/gluster-exporter
