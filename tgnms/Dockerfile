FROM node:9-alpine

RUN apk update
RUN apk upgrade
RUN apk add python make g++ zeromq-dev bash vim findutils mysql-client grep lz4 tzdata

WORKDIR /usr/src/
COPY www/ nms/
COPY service/ service/
WORKDIR nms
RUN npm install
RUN sh ./patch.sh

RUN apk del make g++
