FROM python:3-alpine

ENV WORKDIR /app
WORKDIR $WORKDIR
COPY . $WORKDIR

RUN pip3 install --upgrade pip
RUN python3 setup.py install

ENTRYPOINT ["python3", "docker_v6up.py"]
