FROM python:latest

ENV WORKDIR /app

RUN apt-get update
RUN apt-get -y upgrade

RUN mkdir -p $WORKDIR
WORKDIR $WORKDIR

COPY . $WORKDIR

RUN pip3 install --upgrade pip
RUN python3 setup.py install

ENTRYPOINT ["python3", "docker_v6up.py"]
