const {
  getConfigByName,
} = require('../topology/model');

const express = require('express');
const fs = require('fs');
const isIp = require('is-ip');
const proxy = require('express-http-proxy');
const querystring = require('querystring');


const app = express();

function getAPIServiceHost(req, res) {
  const topology = getConfigByName(req.params.topology);
  if (topology.apiservice_baseurl) {
    return topology.apiservice_baseurl;
  }
  const controller_ip = topology.controller_ip_active;
  return isIp.v6(controller_ip)
    ? 'http://[' + controller_ip + ']:8080'
    : 'http://' + controller_ip + ':8080';
}

app.use('/:topology/',
  proxy(getAPIServiceHost, {
    memoizeHost: false,
    parseReqBody: false,
  }),
);

module.exports = app;
