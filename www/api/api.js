const assert = require('assert');
const express = require('express');
const app = express();
const ApiLib = require('./api_lib');
const worker = require('../worker.js');
const ApiConsts = require('./api_consts');
// api methods
const ApiMethods = ApiConsts.ApiMethods;
const VerificationType = ApiConsts.VerificationType;

module.exports = function(app, configs, topologies, liveTopologies) {
  app.post(/\/api\/([a-zA-Z]+)/, function (req, res) {
    let apiMethod = req.params[0];
    // validate api method exists
    if (!ApiMethods.hasOwnProperty(apiMethod)) {
      console.error("Invalid API method:", apiMethod);
      res.status(500).end("Invalid API method");
      return;
    }
    let httpPostData = '';
    // while receiving input
    req.on('data', function(chunk) {
      httpPostData += chunk.toString();
    });
    // respond to input
    req.on('end', function() {
      if (!httpPostData.length) {
        res.status(500).end("Empty input");
        return;
      }
      let postData;
      try {
        postData = JSON.parse(httpPostData);
      } catch (err) {
        console.error("Unable to parse JSON:", httpPostData);
        res.status(500).end("Invalid JSON");
        return;
      }
      let apiLib = new ApiLib(configs, topologies, liveTopologies, postData);
      // validate input
      try {
        if (!apiLib.validateInput(apiMethod)) {
          let result = {
            "success": "false",
            "error": "Input validation failed, please reference the api docs"
          };
          res.status(400).end(JSON.stringify(result));
          return;
        }
      } catch (err) {
        let result = {
          "success": "false",
          "error": "Input validation failed: " + err
        };
        res.status(400).end(JSON.stringify(result));
        return;
      }
      // validation complete - perform call, pass result
      apiLib.call(res, apiMethod);
    });
  });
};
