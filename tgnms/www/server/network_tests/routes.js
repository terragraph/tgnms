/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 */

const {api_singlehoptest, api_testrunexecution} = require('../models');

const axios = require('axios');
const express = require('express');
const router = express.Router();
const {topologies} = require('../models');

async function getTopologyId(networkName) {
  return new Promise((resolve, reject) => {
    topologies
      .findOne({
        where: {
          name: networkName,
        },
      })
      .then(topology => {
        if (topology.id) {
          resolve(topology.id);
        }
        reject();
      })
      .catch(err => {
        reject();
      });
  });
}

router.get('/:network/list', async (req, res) => {
  const networkName = req.params.network;
  getTopologyId(networkName)
    .then(topologyId => {
      api_testrunexecution
        .findAll({
          where: {
            topology_id: topologyId,
          },
          order: [['start_date', 'DESC']],
          limit: 10,
        })
        .then(tests => {
          return res.status(200).send(tests);
        })
        .catch(err => {
          return res.status(500).send({
            msg: 'Failed to fetch list of tests',
            error: false,
          });
        });
    })
    .catch(err => {
      res
        .status(500)
        .send({error: 'Unable to find topology id for network name'});
    });
});

router.get('/:network/results/:resultId', async (req, res) => {
  // TODO - restrict results by network
  // topology_id isn't in the same table, and we aren't joining them in the
  // model, but we should only be showing the matching network in the initial
  // list so this shouldn't be a problem
  const resultId = req.params.resultId;
  api_singlehoptest
    .findAll({
      where: {
        test_run_execution_id: resultId,
      },
    })
    .then(tests => {
      res.status(200).send(tests);
    })
    .catch(err => {
      res.status(500).send({
        msg: 'Failed to fetch test from DB',
        status: false,
      });
    });
});

router.get('/:network/start/:testId', async (req, res) => {
  const networkName = req.params.network;
  getTopologyId(networkName)
    .then(topologyId => {
      const testId = req.params.testId;
      const sendReq = {
        protocol: 'UDP',
        test_code: testId,
        topology_id: topologyId,
        test_duration: 10,
        test_push_rate: 100000000,
      };
      axios
        .post(`http://network_test:8000/api/start_test/`, sendReq, {
          headers: {'Content-Type': 'application/json'},
        })
        .then(response => {
          if (response.status == 200) {
            res.status(200).send(response.data);
          } else {
            res.status(500).send(response.data);
          }
        })
        .catch(error => {
          res.status(500).send({
            msg: error.response.statusText,
            error: !error.response.status,
          });
        });
    })
    .catch(err => {
      res.status(500).send({
        msg: 'Unable to find topology id for network name',
        error: true,
      });
    });
});

module.exports = router;
