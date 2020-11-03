/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */
const express = require('express');
const app = express();

import type {OverlayResponse} from '@fbcnms/tg-nms/shared/dto/RemoteOverlay';

const towerGResponse: OverlayResponse = {
  type: 'topology',
  data: {
    links: {
      'link-terra511.f5.tg.a404-if-terra622.f3.tg.a404-if': {
        A: {value: '5', text: 'Tower G'},
        Z: {value: '30'},
      },
      'link-terra114.f5.tg.a404-if-terra123.f5.tg.a404-if': {
        A: {value: '56', text: 'Tower G'},
        Z: {value: '80'},
      },
      'link-terra311.f1.tg.a404-if-terra412.f1.tg.a404-if': {
        A: {value: '70', text: 'Tower G'},
        Z: {value: '90'},
      },
    },
    nodes: {},
    sites: {
      '12L56': {
        value: '60',
      },
      '11L746': {
        value: '80',
      },
      '12L394': {
        value: '100',
      },
      '12L212': {
        value: '95',
      },
      '11L917': {
        value: '88',
      },
    },
  },
  legend: {
    links: {
      items: [
        {color: '#00dd44', label: 'Test Z', value: 100},
        {color: '#ffdd00', label: 'Test X', value: 80},
        {color: '#dd8800', label: 'Test Y', value: 60},
        {color: '#dd0000', label: 'Test W', value: 0},
      ],
    },
    sites: {
      items: [
        {color: '#ffeeee', label: 'Healthy Site', value: 100},
        {color: '#cccccc', label: 'Happy Site', value: 80},
        {color: '#999999', label: 'Marginal Site', value: 50},
        {color: '#333333', label: 'Bad Site', value: 0},
      ],
    },
    nodes: {
      items: [{color: '#ffffff', label: 'Test', value: 1}],
    },
  },
};

const towerEResponse: OverlayResponse = {
  type: 'topology',
  data: {
    links: {
      'link-terra111.f1-terra212.f1': {
        A: {value: '29'},
        Z: {value: '30'},
      },
      'link-terra114.f1-terra123.f1': {A: {value: '32'}, Z: {value: '31'}},
      'link-terra121.f1-terra222.f1': {A: {value: '30'}, Z: {value: '31'}},
      'link-terra114.f1.te.a404-if-terra123.f1.te.a404-if': {
        A: {value: '31', text: 'custom'},
        Z: {value: '44'},
      },
      'link-terra113.f7.te.a404-if-terra124.f5.te.a404-if': {
        A: {value: '10'},
        Z: {value: '80'},
      },
      'link-POP_1583436158785_1-TestNode': {
        A: {value: '90'},
        Z: {value: '100'},
      },
    },
    nodes: {},
    sites: {},
  },
  legend: {
    links: {
      items: [
        {color: '#00dd44', label: 'Test Z', value: 100},
        {color: '#ffdd00', label: 'Test X', value: 80},
        {color: '#dd8800', label: 'Test Y', value: 60},
        {color: '#dd0000', label: 'Test W', value: 0},
      ],
    },
    sites: {
      items: [
        {color: '#ffffff', label: 'Test', value: 1},
        {color: '#ffffff', label: 'Test', value: 2},
        {color: '#ffffff', label: 'Test', value: 3},
      ],
    },
    nodes: {
      items: [{color: '#ffffff', label: 'Test', value: 1}],
    },
  },
};

const networkResponses: {[string]: OverlayResponse} = {
  'tower g': towerGResponse,
  'tower e': towerEResponse,
};

app.use(express.json());
app.get('/', (req, res) => {
  console.dir(req.query);
  const {networkName} = req.query;
  const response = networkResponses[networkName.toLowerCase()];
  if (response) {
    return res.json(response);
  }
  return res.status(404).send({error: `Network not found: ${networkName}`});
});
app.post('/', (req, res) => {
  const {networkName} = req.body;
  const response = networkResponses[networkName.toLowerCase()];
  if (response) {
    return res.json(response);
  }
  return res.status(404).send({error: `Network not found: ${networkName}`});
});
const port = 8081 || parseInt(process.env.HTTP_PORT);
app.listen(port, () => {
  console.log(`listening on port: ${port}`);
});
