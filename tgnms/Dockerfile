FROM node:9-alpine

RUN apk update && apk upgrade
RUN apk add python make g++ bash vim findutils mysql-client grep lz4 tzdata

WORKDIR /usr/src/
COPY www/ nms/
COPY service/ service/
WORKDIR nms
RUN npm config set registry https://registry.npmjs.org/ && yarn install
RUN npm run-script build

RUN apk del make g++
