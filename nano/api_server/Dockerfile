FROM ubuntu:latest
RUN apt-get update -y && \
    apt-get install -y python-pip python-dev && \
    apt-get install -y openssh-server
RUN mkdir /var/run/sshd
COPY ./ ./network_analyzer
WORKDIR /network_analyzer/api_server
RUN pip install -r requirements.txt
ENV PYTHONPATH "${PYTONPATH}:/network_analyzer"
CMD python start_api_server.py $NETWORK_NAME -p $PORT --time-gap $TIME_GAP --get-default-routes $DEFAULT_ROUTE_INTERVAL
