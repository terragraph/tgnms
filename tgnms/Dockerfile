FROM node:9-alpine

RUN apk update
RUN apk upgrade
RUN apk add python make g++ zeromq-dev bash vim

WORKDIR /usr/src/nms
COPY www/ .
RUN npm install
RUN sh ./patch.sh

RUN apk del make g++
