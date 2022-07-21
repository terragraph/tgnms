/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
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
        A: {
          value: '5',
          text: 'Tower G',
          metadata: {
            'Site Health Key': 65,
            metric_underscore: 'puppy',
          },
        },
        Z: {
          value: '30',
          metadata: {
            'Site Health Key': 41,
            metric_underscore: 'kitten',
            'Another key': 'special',
            'Object value': {
              test: 1,
              'test long key': 'test long value',
            },
          },
        },
      },
      'link-terra114.f5.tg.a404-if-terra123.f5.tg.a404-if': {
        A: {value: '56', text: 'Tower G'},
        Z: {value: '80'},
      },
      'link-terra311.f1.tg.a404-if-terra412.f1.tg.a404-if': {
        A: {value: '70', text: 'Tower G'},
        Z: {value: '90'},
      },
      'link-terra213.f5.tg.a404-if-terra413.f5.tg.a404-if': {
        value: '70',
        text: 'Single Value',
        metadata: {
          test: 'test 123',
          Sideless: 'Sideless Test',
        },
      },
    },
    nodes: {
      'terra121.f3.tg.a404-if': {
        value: 10,
        metadata: {
          test: 'test 123',
          testObject: {
            key: 'value',
          },
        },
      },
      'terra111.f3.tg.a404-if': {
        value: 1,
        metadata: {
          test: 'test 123',
          testObject: {
            key: 'value',
          },
        },
      },
    },
    sites: {
      '12L56': {
        value: '60',
        metadata: {
          'Test Key': 10,
          test_underscore_key_test: 'test',
        },
      },
      '11L746': {
        value: '80',
      },
      '12L394': {
        value: '100',
      },
      '12L212': {
        value: '95',
        metadata: {
          'Test Key': 10,
          test_underscore_key_test: 'test',
        },
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
      items: [
        {color: '#cccccc', label: 'Missing Node', value: 0},
        {color: '#ff0000', label: 'Unhealthy Node', value: 3},
        {color: '#00ff00', label: 'Healthy Node', value: 10},
      ],
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
  const {network_name} = req.query;
  const response = networkResponses[network_name.toLowerCase()];
  if (response) {
    return res.json(response);
  }
  return res.status(404).send({error: `Network not found: ${network_name}`});
});
app.post('/', (req, res) => {
  const {network_name} = req.body;
  const response = networkResponses[network_name.toLowerCase()];
  if (response) {
    return res.json(response);
  }
  return res.status(404).send({error: `Network not found: ${network_name}`});
});
const port = 8081 || parseInt(process.env.HTTP_PORT);
app.listen(port, () => {
  console.log(`listening on port: ${port}`);
});
