define({ 'api': [
  {
    'type': 'post',
    'url': '/getNetworkOverridesConfig',
    'title': 'Get Network Override Config',
    'name': 'GetNetworkOverridesConfig',
    'description': '<p>Get network overrides configuration. Network Overrides only include the options that are different from the base config.</p>',
    'group': 'Config',
    'version': '0.0.0',
    'filename': 'api/api_lib.js',
    'groupTitle': 'Config',
    'success': {
      'fields': {
        '200': [
          {
            'group': '200',
            'type': 'Bool',
            'optional': false,
            'field': 'success',
            'description': '<p>If controller was able to fetch network config</p>',
          },
        ],
      },
      'examples': [
        {
          'title': 'Success-Response:',
          'content': 'HTTP/1.1 200\n{\n  "success": true,\n  "response": {\n    "config": {\n      "envParams": {},\n      "fwParams": {},\n      "logTailParams": {},\n      "statsAgentParams": {},\n      "sysParams": {}\n    }\n  }\n}',
          'type': 'json',
        },
      ],
    },
  },
  {
    'type': 'post',
    'url': '/getNodesConfig',
    'title': 'Get Node(s) Config',
    'name': 'GetNodesConfig',
    'description': '<p>Get node configuration. Returns all node configs if empty list.</p>',
    'group': 'Config',
    'parameter': {
      'fields': {
        'Parameter': [
          {
            'group': 'Parameter',
            'type': 'String[]',
            'optional': false,
            'field': 'nodes',
            'description': '<p>List of node names</p>',
          },
        ],
      },
    },
    'version': '0.0.0',
    'filename': 'api/api_lib.js',
    'groupTitle': 'Config',
    'success': {
      'fields': {
        '200': [
          {
            'group': '200',
            'type': 'Bool',
            'optional': false,
            'field': 'success',
            'description': '<p>If controller was able to fetch config for all nodes</p>',
          },
        ],
      },
      'examples': [
        {
          'title': 'Success-Response:',
          'content': 'HTTP/1.1 200\n{\n  "success": true,\n  "response": {\n    "config": {\n      "nodeName1": {\n        "envParams": {},\n        "fwParams": {},\n        "logTailParams": {},\n        "statsAgentParams": {},\n        "sysParams": {}\n      }\n    }\n  }\n}',
          'type': 'json',
        },
      ],
    },
  },
  {
    'type': 'post',
    'url': '/getNodesOverrideConfig',
    'title': 'Get Node(s) Override Config',
    'name': 'GetNodesOverrideConfig',
    'description': '<p>Get node overrides configuration. Returns all node configs if empty list. Node Overrides only include the options that are different from the base config.</p>',
    'group': 'Config',
    'parameter': {
      'fields': {
        'Parameter': [
          {
            'group': 'Parameter',
            'type': 'String[]',
            'optional': false,
            'field': 'nodes',
            'description': '<p>List of node names</p>',
          },
        ],
      },
    },
    'version': '0.0.0',
    'filename': 'api/api_lib.js',
    'groupTitle': 'Config',
    'success': {
      'fields': {
        '200': [
          {
            'group': '200',
            'type': 'Bool',
            'optional': false,
            'field': 'success',
            'description': '<p>If controller was able to fetch config for all nodes</p>',
          },
        ],
      },
      'examples': [
        {
          'title': 'Success-Response:',
          'content': 'HTTP/1.1 200\n{\n  "success": true,\n  "response": {\n    "config": {\n      "nodeName1": {\n        "envParams": {},\n        "fwParams": {},\n        "logTailParams": {},\n        "statsAgentParams": {},\n        "sysParams": {}\n      }\n    }\n  }\n}',
          'type': 'json',
        },
      ],
    },
  },
  {
    'type': 'post',
    'url': '/setNetworkOverrideConfig',
    'title': 'Set Network Override Config',
    'name': 'SetNetworkOverrideConfig',
    'description': '<p>Set network-wide override configuration.</p>',
    'group': 'Config',
    'parameter': {
      'fields': {
        'Parameter': [
          {
            'group': 'Parameter',
            'type': 'Object',
            'optional': false,
            'field': 'config',
            'description': '<p>NodeConfig object</p>',
          },
          {
            'group': 'Parameter',
            'type': 'String',
            'allowedValues': [
              '"LINK"',
              '"NODE"',
              '"NETWORK"',
            ],
            'optional': false,
            'field': 'maxAction',
            'description': '<p>Maximum action to allow when applying changes.</p>',
          },
        ],
      },
      'examples': [
        {
          'title': 'Request-Example:',
          'content': '{\n  "config": {\n    "envParams": {\n      "OOB_NETNS": "1"\n    },\n    "fwParams": {\n      "txPower": -5\n    }\n  },\n  "maxAction": "LINK"\n}',
          'type': 'json',
        },
      ],
    },
    'version': '0.0.0',
    'filename': 'api/api_lib.js',
    'groupTitle': 'Config',
    'success': {
      'fields': {
        '200': [
          {
            'group': '200',
            'type': 'Bool',
            'optional': false,
            'field': 'success',
            'description': '<p>If controller was able to set or schedule the config change.</p>',
          },
        ],
      },
      'examples': [
        {
          'title': 'Success-Response:',
          'content': 'HTTP/1.1 200\n{\n  "success": true,\n  "response": {\n    "actions": {\n      "nodeName1": "LINK",\n      "nodeName2": "LINK",\n      "nodeName3": "NODE"\n    }\n  }\n}',
          'type': 'json',
        },
      ],
    },
  },
  {
    'type': 'post',
    'url': '/setNodesOverrideConfig',
    'title': 'Set Node(s) Override Config',
    'name': 'SetNodesOverrideConfig',
    'description': '<p>Set node override configuration.</p>',
    'group': 'Config',
    'parameter': {
      'fields': {
        'Parameter': [
          {
            'group': 'Parameter',
            'type': 'Object',
            'optional': false,
            'field': 'nodeConfig',
            'description': '<p>Map&lt;Node Name, NodeConfig object&gt;</p>',
          },
          {
            'group': 'Parameter',
            'type': 'String',
            'allowedValues': [
              '"LINK"',
              '"NODE"',
              '"NETWORK"',
            ],
            'optional': false,
            'field': 'maxAction',
            'description': '<p>Maximum action to allow when applying changes.</p>',
          },
        ],
      },
      'examples': [
        {
          'title': 'Request-Example:',
          'content': '{\n  "nodes": {\n    "nodeName1": {\n      "envParams": {\n        "OOB_NETNS": "1"\n      },\n      "fwParams": {\n        "txPower": -5\n      }\n    }\n  },\n  "maxAction": "LINK"\n}',
          'type': 'json',
        },
      ],
    },
    'version': '0.0.0',
    'filename': 'api/api_lib.js',
    'groupTitle': 'Config',
    'success': {
      'fields': {
        '200': [
          {
            'group': '200',
            'type': 'Bool',
            'optional': false,
            'field': 'success',
            'description': '<p>If controller was able to set or schedule the config change.</p>',
          },
        ],
      },
      'examples': [
        {
          'title': 'Success-Response:',
          'content': 'HTTP/1.1 200\n{\n  "success": true,\n  "response": {\n    "actions": {\n      "nodeName1": "LINK",\n      "nodeName2": "LINK",\n      "nodeName3": "NODE"\n    }\n  }\n}',
          'type': 'json',
        },
      ],
    },
  },
  {
    'type': 'post',
    'url': '/getConfigActions',
    'title': 'Get action per config option',
    'description': '<p>We still need to define a struct for mapping config parameters to their actions. EX: fwParams.txPower -&gt; LINK envParams.OPENR_ENABLED -&gt; NODE</p>',
    'group': 'ConfigTodo',
    'version': '0.0.0',
    'filename': 'api/api_lib.js',
    'groupTitle': 'ConfigTodo',
    'name': 'PostGetconfigactions',
  },
  {
    'type': 'post',
    'url': '/getIgnitionState',
    'title': 'Get Ignition State',
    'name': 'GetIgnitionState',
    'group': 'Ignition',
    'parameter': {
      'fields': {
        'Parameter': [
          {
            'group': 'Parameter',
            'type': 'String',
            'optional': false,
            'field': 'topology',
            'description': '<p>Topology Name</p>',
          },
        ],
      },
    },
    'examples': [
      {
        'title': 'Example:',
        'content': "curl -id '{\"topology\": \"Lab F8 D\"}' http://localhost:443/api/getIgnitionState",
        'type': 'curl',
      },
    ],
    'success': {
      'fields': {
        'Success 200': [
          {
            'group': 'Success 200',
            'type': 'JSON',
            'optional': false,
            'field': 'success',
            'description': '<p>IgnitionState from ControllerProxy.thrift</p>',
          },
        ],
      },
      'examples': [
        {
          'title': 'Success-Response:',
          'content': '\n{\n    "igCandidates": [],\n    "igParams": {\n        "enable": true,\n        "linkUpDampenInterval": {\n            "buffer": {\n                "data": [\n                    0,\n                    0,\n                    0,\n                    0,\n                    0,\n                    0,\n                    0,\n                    35\n                ],\n                "type": "Buffer"\n            },\n            "offset": 0\n        },\n        "linkUpInterval": {\n            "buffer": {\n                "data": [\n                    0,\n                    0,\n                    0,\n                    0,\n                    0,\n                    0,\n                    0,\n                    5\n                ],\n                "type": "Buffer"\n            },\n            "offset": 0\n        },\n        "link_auto_ignite": {}\n    },\n    "lastIgCandidate": {\n        "initiatorNodeName": "terra123.f5.td.a404-if",\n        "linkName": "link-terra114.f5.td.a404-if-terra123.f5.td.a404-if"\n    },\n    "visitedNodeNames": [\n        "terra111.f5.td.a404-if",\n        "terra212.f5.td.a404-if",\n        "terra114.f5.td.a404-if",\n        "terra211.f5.td.a404-if",\n        "terra214.f5.td.a404-if",\n        "terra123.f5.td.a404-if",\n        "terra312.f5.td.a404-if",\n        "terra223.f5.td.a404-if",\n        "terra121.f5.td.a404-if",\n        "terra314.f5.td.a404-if",\n        "terra221.f5.td.a404-if",\n        "terra222.f5.td.a404-if",\n        "terra323.f5.td.a404-if",\n        "terra322.f5.td.a404-if"\n    ]\n}',
          'type': 'json',
        },
      ],
    },
    'version': '0.0.0',
    'filename': 'api/api_lib.js',
    'groupTitle': 'Ignition',
  },
  {
    'type': 'post',
    'url': '/setLinkIgnitionState',
    'title': 'Set Link Ignition State',
    'name': 'SetLinkIgnitionState',
    'group': 'Ignition',
    'parameter': {
      'fields': {
        'Parameter': [
          {
            'group': 'Parameter',
            'type': 'String',
            'optional': false,
            'field': 'topology',
            'description': '<p>Topology Name</p>',
          },
          {
            'group': 'Parameter',
            'type': 'String',
            'optional': false,
            'field': 'linkName',
            'description': '<p>Link Name</p>',
          },
          {
            'group': 'Parameter',
            'type': 'Bool',
            'optional': false,
            'field': 'enabled',
            'description': '<p>State of ignition for linkt</p>',
          },
        ],
      },
    },
    'examples': [
      {
        'title': 'Example:',
        'content': "curl -id '{\"topology\": \"Lab F8 D\", \"linkName\": \"link-terra121.f5.td.a404-if-terra222.f5.td.a404-if\", \"enabled\": false}' http://localhost:443/api/setLinkIgnitionState",
        'type': 'curl',
      },
    ],
    'version': '0.0.0',
    'filename': 'api/api_lib.js',
    'groupTitle': 'Ignition',
    'success': {
      'fields': {
        '200': [
          {
            'group': '200',
            'type': 'Bool',
            'optional': false,
            'field': 'success',
            'description': '<p>Indicates the command was received by the controller</p>',
          },
        ],
      },
      'examples': [
        {
          'title': 'Success-Response:',
          'content': 'HTTP/1.1 200\n{\n  "success": true\n}',
          'type': 'json',
        },
      ],
    },
    'error': {
      'fields': {
        '400': [
          {
            'group': '400',
            'optional': false,
            'field': 'InvalidInput',
            'description': '<p>The input is invalid</p>',
          },
        ],
      },
      'examples': [
        {
          'title': 'Error-Response:',
          'content': 'HTTP/1.1 400 Bad Request\n{\n  "success":"false",\n  "error":"Input validation failed: Error: Field linkName specified with invalid link: link-terra121.f5.td.a404-if-terra222.f5.td.a404-"}\n}',
          'type': 'json',
        },
      ],
    },
  },
  {
    'type': 'post',
    'url': '/setNetworkIgnitionState',
    'title': 'Set Network Ignition State',
    'name': 'SetNetworkIgnitionState',
    'group': 'Ignition',
    'parameter': {
      'fields': {
        'Parameter': [
          {
            'group': 'Parameter',
            'type': 'String',
            'optional': false,
            'field': 'topology',
            'description': '<p>Topology Name</p>',
          },
          {
            'group': 'Parameter',
            'type': 'Bool',
            'optional': false,
            'field': 'enabled',
            'description': '<p>State of network-wide ignition</p>',
          },
        ],
      },
    },
    'examples': [
      {
        'title': 'Example:',
        'content': "curl -id '{\"topology\": \"Lab F8 D\", \"enabled\": true}' http://localhost:443/api/setNetworkIgnitionState",
        'type': 'curl',
      },
    ],
    'version': '0.0.0',
    'filename': 'api/api_lib.js',
    'groupTitle': 'Ignition',
    'success': {
      'fields': {
        '200': [
          {
            'group': '200',
            'type': 'Bool',
            'optional': false,
            'field': 'success',
            'description': '<p>Indicates the command was received by the controller</p>',
          },
        ],
      },
      'examples': [
        {
          'title': 'Success-Response:',
          'content': 'HTTP/1.1 200\n{\n  "success": true\n}',
          'type': 'json',
        },
      ],
    },
    'error': {
      'fields': {
        '400': [
          {
            'group': '400',
            'optional': false,
            'field': 'InvalidInput',
            'description': '<p>The input is invalid</p>',
          },
        ],
      },
      'examples': [
        {
          'title': 'Error-Response:',
          'content': 'HTTP/1.1 400 Bad Request\n{\n  "success":"false",\n  "error":"Input validation failed: Error: Field linkName specified with invalid link: link-terra121.f5.td.a404-if-terra222.f5.td.a404-"}\n}',
          'type': 'json',
        },
      ],
    },
  },
  {
    'type': 'post',
    'url': '/rebootNode',
    'title': 'Reboot Node',
    'name': 'RebootNode',
    'group': 'Management',
    'parameter': {
      'fields': {
        'Parameter': [
          {
            'group': 'Parameter',
            'type': 'String',
            'optional': false,
            'field': 'topology',
            'description': '<p>Topology Name</p>',
          },
          {
            'group': 'Parameter',
            'type': 'String',
            'optional': false,
            'field': 'node',
            'description': '<p>Site Name</p>',
          },
          {
            'group': 'Parameter',
            'type': 'Bool',
            'optional': false,
            'field': 'force',
            'description': '<p>Force Reboot</p>',
          },
        ],
      },
    },
    'examples': [
      {
        'title': 'Example:',
        'content': "curl -id '{\"topology\": \"Lab F8 D\", \"node\": \"terra114.f5.td.a404-if\", \"force\": true}' http://localhost:443/api/rebootNode",
        'type': 'curl',
      },
    ],
    'version': '0.0.0',
    'filename': 'api/api_lib.js',
    'groupTitle': 'Management',
    'success': {
      'fields': {
        '200': [
          {
            'group': '200',
            'type': 'Bool',
            'optional': false,
            'field': 'success',
            'description': '<p>Indicates the command was received by the controller</p>',
          },
        ],
      },
      'examples': [
        {
          'title': 'Success-Response:',
          'content': 'HTTP/1.1 200\n{\n  "success": true\n}',
          'type': 'json',
        },
      ],
    },
    'error': {
      'fields': {
        '400': [
          {
            'group': '400',
            'optional': false,
            'field': 'InvalidInput',
            'description': '<p>The input is invalid</p>',
          },
        ],
      },
      'examples': [
        {
          'title': 'Error-Response:',
          'content': 'HTTP/1.1 400 Bad Request\n{\n  "success":"false",\n  "error":"Input validation failed: Error: Field linkName specified with invalid link: link-terra121.f5.td.a404-if-terra222.f5.td.a404-"}\n}',
          'type': 'json',
        },
      ],
    },
  },
  {
    'type': 'post',
    'url': '/startTraffic',
    'title': 'Start Iperf Traffic',
    'name': 'StartTraffic',
    'group': 'Performance',
    'parameter': {
      'fields': {
        'Parameter': [
          {
            'group': 'Parameter',
            'type': 'String',
            'optional': false,
            'field': 'topology',
            'description': '<p>Topology Name</p>',
          },
          {
            'group': 'Parameter',
            'type': 'String',
            'optional': false,
            'field': 'srcNode',
            'description': '<p>Source Node Name</p>',
          },
          {
            'group': 'Parameter',
            'type': 'String',
            'optional': false,
            'field': 'dstNode',
            'description': '<p>Destination Node Name</p>',
          },
          {
            'group': 'Parameter',
            'type': 'String',
            'optional': false,
            'field': 'srcIp',
            'description': '<p>Source IP</p>',
          },
          {
            'group': 'Parameter',
            'type': 'String',
            'optional': false,
            'field': 'dstIp',
            'description': '<p>Destination IP</p>',
          },
          {
            'group': 'Parameter',
            'type': 'Number',
            'optional': false,
            'field': 'bitrate',
            'description': '<p>Transfer rate (bps)</p>',
          },
          {
            'group': 'Parameter',
            'type': 'Number',
            'optional': false,
            'field': 'timesec',
            'description': '<p>Time (seconds)</p>',
          },
        ],
      },
    },
    'examples': [
      {
        'title': 'Example:',
        'content': "curl -id '{\"topology\": \"Lab F8 B\", \"srcNode\": \"terra111.f5.tb.a404-if\", \"dstNode\": \"terra121.f5.tb.a404-if\", \"srcIp\": \"2620:10d:c089:2164::1\", \"dstIp\": \"2620:10d:c089:2121::1\", \"bitrate\": 100, \"timeSec\": 100}' http://localhost:443/api/startTraffic",
        'type': 'curl',
      },
    ],
    'version': '0.0.0',
    'filename': 'api/api_lib.js',
    'groupTitle': 'Performance',
    'success': {
      'fields': {
        '200': [
          {
            'group': '200',
            'type': 'Bool',
            'optional': false,
            'field': 'success',
            'description': '<p>Indicates the command was received by the controller</p>',
          },
        ],
      },
      'examples': [
        {
          'title': 'Success-Response:',
          'content': 'HTTP/1.1 200\n{\n  "success": true\n}',
          'type': 'json',
        },
      ],
    },
    'error': {
      'fields': {
        '400': [
          {
            'group': '400',
            'optional': false,
            'field': 'InvalidInput',
            'description': '<p>The input is invalid</p>',
          },
        ],
      },
      'examples': [
        {
          'title': 'Error-Response:',
          'content': 'HTTP/1.1 400 Bad Request\n{\n  "success":"false",\n  "error":"Input validation failed: Error: Field linkName specified with invalid link: link-terra121.f5.td.a404-if-terra222.f5.td.a404-"}\n}',
          'type': 'json',
        },
      ],
    },
  },
  {
    'type': 'post',
    'url': '/statusTraffic',
    'title': 'Iperf Node Status',
    'name': 'StatusTraffic',
    'group': 'Performance',
    'parameter': {
      'fields': {
        'Parameter': [
          {
            'group': 'Parameter',
            'type': 'String',
            'optional': false,
            'field': 'topology',
            'description': '<p>Topology Name</p>',
          },
          {
            'group': 'Parameter',
            'type': 'String',
            'optional': false,
            'field': 'node',
            'description': '<p>Node Name</p>',
          },
        ],
      },
    },
    'examples': [
      {
        'title': 'Example:',
        'content': "curl -id '{\"topology\": \"Lab F8 B\", \"node\": \"terra111.f5.tb.a404-if\"}' http://localhost:443/api/statusTraffic",
        'type': 'curl',
      },
    ],
    'version': '0.0.0',
    'filename': 'api/api_lib.js',
    'groupTitle': 'Performance',
    'success': {
      'fields': {
        '200': [
          {
            'group': '200',
            'type': 'Bool',
            'optional': false,
            'field': 'success',
            'description': '<p>Indicates the command was received by the controller</p>',
          },
        ],
      },
      'examples': [
        {
          'title': 'Success-Response:',
          'content': 'HTTP/1.1 200\n{\n  "success": true\n}',
          'type': 'json',
        },
      ],
    },
    'error': {
      'fields': {
        '400': [
          {
            'group': '400',
            'optional': false,
            'field': 'InvalidInput',
            'description': '<p>The input is invalid</p>',
          },
        ],
      },
      'examples': [
        {
          'title': 'Error-Response:',
          'content': 'HTTP/1.1 400 Bad Request\n{\n  "success":"false",\n  "error":"Input validation failed: Error: Field linkName specified with invalid link: link-terra121.f5.td.a404-if-terra222.f5.td.a404-"}\n}',
          'type': 'json',
        },
      ],
    },
  },
  {
    'type': 'post',
    'url': '/stopTraffic',
    'title': 'Stop Iperf Traffic',
    'name': 'StopTraffic',
    'group': 'Performance',
    'parameter': {
      'fields': {
        'Parameter': [
          {
            'group': 'Parameter',
            'type': 'String',
            'optional': false,
            'field': 'topology',
            'description': '<p>Topology Name</p>',
          },
          {
            'group': 'Parameter',
            'type': 'String',
            'optional': false,
            'field': 'node',
            'description': '<p>Node Name</p>',
          },
        ],
      },
    },
    'examples': [
      {
        'title': 'Example:',
        'content': "curl -id '{\"topology\": \"Lab F8 B\", \"node\": \"terra111.f5.tb.a404-if\"}' http://localhost:443/api/stopTraffic",
        'type': 'curl',
      },
    ],
    'version': '0.0.0',
    'filename': 'api/api_lib.js',
    'groupTitle': 'Performance',
    'success': {
      'fields': {
        '200': [
          {
            'group': '200',
            'type': 'Bool',
            'optional': false,
            'field': 'success',
            'description': '<p>Indicates the command was received by the controller</p>',
          },
        ],
      },
      'examples': [
        {
          'title': 'Success-Response:',
          'content': 'HTTP/1.1 200\n{\n  "success": true\n}',
          'type': 'json',
        },
      ],
    },
    'error': {
      'fields': {
        '400': [
          {
            'group': '400',
            'optional': false,
            'field': 'InvalidInput',
            'description': '<p>The input is invalid</p>',
          },
        ],
      },
      'examples': [
        {
          'title': 'Error-Response:',
          'content': 'HTTP/1.1 400 Bad Request\n{\n  "success":"false",\n  "error":"Input validation failed: Error: Field linkName specified with invalid link: link-terra121.f5.td.a404-if-terra222.f5.td.a404-"}\n}',
          'type': 'json',
        },
      ],
    },
  },
  {
    'type': 'post',
    'url': '/addLink',
    'title': 'Add Link',
    'name': 'AddLink',
    'group': 'Topology',
    'parameter': {
      'fields': {
        'Parameter': [
          {
            'group': 'Parameter',
            'type': 'String',
            'optional': false,
            'field': 'topology',
            'description': '<p>Topology Name</p>',
          },
          {
            'group': 'Parameter',
            'type': 'String',
            'optional': false,
            'field': 'nodeA',
            'description': '<p>Node A Name</p>',
          },
          {
            'group': 'Parameter',
            'type': 'String',
            'optional': false,
            'field': 'nodeZ',
            'description': '<p>Node Z Name</p>',
          },
          {
            'group': 'Parameter',
            'type': 'String',
            'optional': false,
            'field': 'linkType',
            'description': '<p>Link Type (WIRELESS or ETHERNET)</p>',
          },
        ],
      },
    },
    'examples': [
      {
        'title': 'Example:',
        'content': "curl -id '{\"topology\": \"Lab F8 D\", \"nodeA\": \"terra212.f5.td.a404-if\", \"nodeZ\": \"terra214.f5.td.a404-if\", \"linkType\": \"ETHERNET\"}' http://localhost:443/api/addLink",
        'type': 'curl',
      },
    ],
    'version': '0.0.0',
    'filename': 'api/api_lib.js',
    'groupTitle': 'Topology',
    'success': {
      'fields': {
        '200': [
          {
            'group': '200',
            'type': 'Bool',
            'optional': false,
            'field': 'success',
            'description': '<p>Indicates the command was received by the controller</p>',
          },
        ],
      },
      'examples': [
        {
          'title': 'Success-Response:',
          'content': 'HTTP/1.1 200\n{\n  "success": true\n}',
          'type': 'json',
        },
      ],
    },
    'error': {
      'fields': {
        '400': [
          {
            'group': '400',
            'optional': false,
            'field': 'InvalidInput',
            'description': '<p>The input is invalid</p>',
          },
        ],
      },
      'examples': [
        {
          'title': 'Error-Response:',
          'content': 'HTTP/1.1 400 Bad Request\n{\n  "success":"false",\n  "error":"Input validation failed: Error: Field linkName specified with invalid link: link-terra121.f5.td.a404-if-terra222.f5.td.a404-"}\n}',
          'type': 'json',
        },
      ],
    },
  },
  {
    'type': 'post',
    'url': '/addNode',
    'title': 'Add Node',
    'name': 'AddNode',
    'group': 'Topology',
    'parameter': {
      'fields': {
        'Parameter': [
          {
            'group': 'Parameter',
            'type': 'String',
            'optional': false,
            'field': 'topology',
            'description': '<p>Topology Name</p>',
          },
          {
            'group': 'Parameter',
            'type': 'String',
            'optional': false,
            'field': 'nodeName',
            'description': '<p>Node Name</p>',
          },
          {
            'group': 'Parameter',
            'type': 'String',
            'allowedValues': [
              '"DN"',
              '"CN"',
            ],
            'optional': true,
            'field': 'nodeType',
            'defaultValue': 'DN',
            'description': '<p>Type of node (distribution or client)</p>',
          },
          {
            'group': 'Parameter',
            'type': 'Bool',
            'optional': false,
            'field': 'isPrimary',
            'description': '<p>Node is primary</p>',
          },
          {
            'group': 'Parameter',
            'type': 'String',
            'optional': false,
            'field': 'macAddr',
            'description': '<p>MAC Address (can be left blank)</p>',
          },
          {
            'group': 'Parameter',
            'type': 'Bool',
            'optional': false,
            'field': 'popNode',
            'description': '<p>Node is connected to POP</p>',
          },
          {
            'group': 'Parameter',
            'type': 'String',
            'allowedValues': [
              '"ODD"',
              '"EVEN"',
            ],
            'optional': false,
            'field': 'polarityType',
            'description': '<p>Polarity (ODD/EVEN)</p>',
          },
          {
            'group': 'Parameter',
            'type': 'Number',
            'optional': false,
            'field': 'txGolay',
            'description': '',
          },
          {
            'group': 'Parameter',
            'type': 'Number',
            'optional': false,
            'field': 'rxGolay',
            'description': '',
          },
          {
            'group': 'Parameter',
            'type': 'String',
            'optional': false,
            'field': 'siteName',
            'description': '',
          },
          {
            'group': 'Parameter',
            'type': 'Double',
            'optional': false,
            'field': 'antAzimuth',
            'description': '',
          },
          {
            'group': 'Parameter',
            'type': 'Double',
            'optional': false,
            'field': 'antElevation',
            'description': '',
          },
          {
            'group': 'Parameter',
            'type': 'Bool',
            'optional': true,
            'field': 'hasCpe',
            'defaultValue': 'false',
            'description': '<p>Is attached to a customer</p>',
          },
        ],
      },
    },
    'examples': [
      {
        'title': 'Example:',
        'content': "curl -id '{\"topology\": \"Lab F8 D\", \"nodeName\": \"terra999.f5.td.a404-if\", \"isPrimary\": false, \"madAddr\": \"\", \"popNode\" : false, \"polarityType\": \"ODD\", \"txGolay\": 100, \"rxGolay\": 200, \"siteName\": \"A\", \"antAzimuth\": 100.0, \"antElevation\": 999.99}' http://localhost:443/api/addNode",
        'type': 'curl',
      },
    ],
    'version': '0.0.0',
    'filename': 'api/api_lib.js',
    'groupTitle': 'Topology',
    'success': {
      'fields': {
        '200': [
          {
            'group': '200',
            'type': 'Bool',
            'optional': false,
            'field': 'success',
            'description': '<p>Indicates the command was received by the controller</p>',
          },
        ],
      },
      'examples': [
        {
          'title': 'Success-Response:',
          'content': 'HTTP/1.1 200\n{\n  "success": true\n}',
          'type': 'json',
        },
      ],
    },
    'error': {
      'fields': {
        '400': [
          {
            'group': '400',
            'optional': false,
            'field': 'InvalidInput',
            'description': '<p>The input is invalid</p>',
          },
        ],
      },
      'examples': [
        {
          'title': 'Error-Response:',
          'content': 'HTTP/1.1 400 Bad Request\n{\n  "success":"false",\n  "error":"Input validation failed: Error: Field linkName specified with invalid link: link-terra121.f5.td.a404-if-terra222.f5.td.a404-"}\n}',
          'type': 'json',
        },
      ],
    },
  },
  {
    'type': 'post',
    'url': '/addSite',
    'title': 'Add Site',
    'name': 'AddSite',
    'group': 'Topology',
    'parameter': {
      'fields': {
        'Parameter': [
          {
            'group': 'Parameter',
            'type': 'String',
            'optional': false,
            'field': 'topology',
            'description': '<p>Topology Name</p>',
          },
          {
            'group': 'Parameter',
            'type': 'String',
            'optional': false,
            'field': 'site',
            'description': '<p>Site Name</p>',
          },
          {
            'group': 'Parameter',
            'type': 'Double',
            'optional': false,
            'field': 'latitude',
            'description': '<p>Latitude</p>',
          },
          {
            'group': 'Parameter',
            'type': 'Double',
            'optional': false,
            'field': 'longitude',
            'description': '<p>Longitude</p>',
          },
          {
            'group': 'Parameter',
            'type': 'Double',
            'optional': false,
            'field': 'altitude',
            'description': '<p>Altitude (meters)</p>',
          },
        ],
      },
    },
    'examples': [
      {
        'title': 'Example:',
        'content': "curl -id '{\"topology\": \"Lab F8 D\", \"site\": \"Test Site\", \"latitude\": 37.4848, \"longitude\": -122.1472, \"altitude\": 30.5}' http://localhost:443/api/addSite",
        'type': 'curl',
      },
    ],
    'version': '0.0.0',
    'filename': 'api/api_lib.js',
    'groupTitle': 'Topology',
    'success': {
      'fields': {
        '200': [
          {
            'group': '200',
            'type': 'Bool',
            'optional': false,
            'field': 'success',
            'description': '<p>Indicates the command was received by the controller</p>',
          },
        ],
      },
      'examples': [
        {
          'title': 'Success-Response:',
          'content': 'HTTP/1.1 200\n{\n  "success": true\n}',
          'type': 'json',
        },
      ],
    },
    'error': {
      'fields': {
        '400': [
          {
            'group': '400',
            'optional': false,
            'field': 'InvalidInput',
            'description': '<p>The input is invalid</p>',
          },
        ],
      },
      'examples': [
        {
          'title': 'Error-Response:',
          'content': 'HTTP/1.1 400 Bad Request\n{\n  "success":"false",\n  "error":"Input validation failed: Error: Field linkName specified with invalid link: link-terra121.f5.td.a404-if-terra222.f5.td.a404-"}\n}',
          'type': 'json',
        },
      ],
    },
  },
  {
    'type': 'post',
    'url': '/delLink',
    'title': 'Delete Link',
    'name': 'DelLink',
    'group': 'Topology',
    'parameter': {
      'fields': {
        'Parameter': [
          {
            'group': 'Parameter',
            'type': 'String',
            'optional': false,
            'field': 'topology',
            'description': '<p>Topology Name</p>',
          },
          {
            'group': 'Parameter',
            'type': 'String',
            'optional': false,
            'field': 'linkName',
            'description': '<p>Link Name</p>',
          },
          {
            'group': 'Parameter',
            'type': 'Boolean',
            'optional': false,
            'field': 'force',
            'description': '<p>Force Link Deletion</p>',
          },
        ],
      },
    },
    'examples': [
      {
        'title': 'Example:',
        'content': "curl -id '{\"topology\": \"Lab F8 D\", \"linkName\": \"link-terra221.f5.td.a404-if-terra322.f5.td.a404-if\", \"force\": true}' http://localhost:443/api/delLink",
        'type': 'curl',
      },
    ],
    'version': '0.0.0',
    'filename': 'api/api_lib.js',
    'groupTitle': 'Topology',
    'success': {
      'fields': {
        '200': [
          {
            'group': '200',
            'type': 'Bool',
            'optional': false,
            'field': 'success',
            'description': '<p>Indicates the command was received by the controller</p>',
          },
        ],
      },
      'examples': [
        {
          'title': 'Success-Response:',
          'content': 'HTTP/1.1 200\n{\n  "success": true\n}',
          'type': 'json',
        },
      ],
    },
    'error': {
      'fields': {
        '400': [
          {
            'group': '400',
            'optional': false,
            'field': 'InvalidInput',
            'description': '<p>The input is invalid</p>',
          },
        ],
      },
      'examples': [
        {
          'title': 'Error-Response:',
          'content': 'HTTP/1.1 400 Bad Request\n{\n  "success":"false",\n  "error":"Input validation failed: Error: Field linkName specified with invalid link: link-terra121.f5.td.a404-if-terra222.f5.td.a404-"}\n}',
          'type': 'json',
        },
      ],
    },
  },
  {
    'type': 'post',
    'url': '/delNode',
    'title': 'Delete Node',
    'name': 'DelNode',
    'group': 'Topology',
    'parameter': {
      'fields': {
        'Parameter': [
          {
            'group': 'Parameter',
            'type': 'String',
            'optional': false,
            'field': 'topology',
            'description': '<p>Topology Name</p>',
          },
          {
            'group': 'Parameter',
            'type': 'String',
            'optional': false,
            'field': 'node',
            'description': '<p>Node Name</p>',
          },
          {
            'group': 'Parameter',
            'type': 'Bool',
            'optional': false,
            'field': 'force',
            'description': '<p>Force Delete</p>',
          },
        ],
      },
    },
    'examples': [
      {
        'title': 'Example:',
        'content': "curl -id '{\"topology\": \"Lab F8 D\", \"node\": \"terra212.f5.td.a404-if\", \"force\": false}' http://localhost:443/api/delNode",
        'type': 'curl',
      },
    ],
    'version': '0.0.0',
    'filename': 'api/api_lib.js',
    'groupTitle': 'Topology',
    'success': {
      'fields': {
        '200': [
          {
            'group': '200',
            'type': 'Bool',
            'optional': false,
            'field': 'success',
            'description': '<p>Indicates the command was received by the controller</p>',
          },
        ],
      },
      'examples': [
        {
          'title': 'Success-Response:',
          'content': 'HTTP/1.1 200\n{\n  "success": true\n}',
          'type': 'json',
        },
      ],
    },
    'error': {
      'fields': {
        '400': [
          {
            'group': '400',
            'optional': false,
            'field': 'InvalidInput',
            'description': '<p>The input is invalid</p>',
          },
        ],
      },
      'examples': [
        {
          'title': 'Error-Response:',
          'content': 'HTTP/1.1 400 Bad Request\n{\n  "success":"false",\n  "error":"Input validation failed: Error: Field linkName specified with invalid link: link-terra121.f5.td.a404-if-terra222.f5.td.a404-"}\n}',
          'type': 'json',
        },
      ],
    },
  },
  {
    'type': 'post',
    'url': '/delSite',
    'title': 'Delete Site',
    'name': 'DelSite',
    'group': 'Topology',
    'parameter': {
      'fields': {
        'Parameter': [
          {
            'group': 'Parameter',
            'type': 'String',
            'optional': false,
            'field': 'topology',
            'description': '<p>Topology Name</p>',
          },
          {
            'group': 'Parameter',
            'type': 'String',
            'optional': false,
            'field': 'site',
            'description': '<p>Site Name</p>',
          },
        ],
      },
    },
    'examples': [
      {
        'title': 'Example:',
        'content': "curl -id '{\"topology\": \"Lab F8 D\", \"site\": \"Test Site\"}' http://localhost:443/api/delSite",
        'type': 'curl',
      },
    ],
    'version': '0.0.0',
    'filename': 'api/api_lib.js',
    'groupTitle': 'Topology',
    'success': {
      'fields': {
        '200': [
          {
            'group': '200',
            'type': 'Bool',
            'optional': false,
            'field': 'success',
            'description': '<p>Indicates the command was received by the controller</p>',
          },
        ],
      },
      'examples': [
        {
          'title': 'Success-Response:',
          'content': 'HTTP/1.1 200\n{\n  "success": true\n}',
          'type': 'json',
        },
      ],
    },
    'error': {
      'fields': {
        '400': [
          {
            'group': '400',
            'optional': false,
            'field': 'InvalidInput',
            'description': '<p>The input is invalid</p>',
          },
        ],
      },
      'examples': [
        {
          'title': 'Error-Response:',
          'content': 'HTTP/1.1 400 Bad Request\n{\n  "success":"false",\n  "error":"Input validation failed: Error: Field linkName specified with invalid link: link-terra121.f5.td.a404-if-terra222.f5.td.a404-"}\n}',
          'type': 'json',
        },
      ],
    },
  },
  {
    'type': 'post',
    'url': '/setLinkStatus',
    'title': 'Set Link Status',
    'name': 'SetLinkStatus',
    'group': 'Topology',
    'parameter': {
      'fields': {
        'Parameter': [
          {
            'group': 'Parameter',
            'type': 'String',
            'optional': false,
            'field': 'topology',
            'description': '<p>Topology Name</p>',
          },
          {
            'group': 'Parameter',
            'type': 'String',
            'optional': false,
            'field': 'linkName',
            'description': '<p>Link Name (&lt;NODE_A&gt;-&lt;NODE_Z&gt;)</p>',
          },
          {
            'group': 'Parameter',
            'type': 'Bool',
            'optional': false,
            'field': 'linkUp',
            'description': '<p>Link Up or Down</p>',
          },
        ],
      },
    },
    'examples': [
      {
        'title': 'Example:',
        'content': "curl -id '{\"topology\": \"Lab F8 D\", \"linkName\": \"link-terra111.f5.td.a404-if-terra212.f5.td.a404-if\", \"linkUp\": false}' http://localhost:443/api/setLinkStatus",
        'type': 'curl',
      },
    ],
    'version': '0.0.0',
    'filename': 'api/api_lib.js',
    'groupTitle': 'Topology',
    'success': {
      'fields': {
        '200': [
          {
            'group': '200',
            'type': 'Bool',
            'optional': false,
            'field': 'success',
            'description': '<p>Indicates the command was received by the controller</p>',
          },
        ],
      },
      'examples': [
        {
          'title': 'Success-Response:',
          'content': 'HTTP/1.1 200\n{\n  "success": true\n}',
          'type': 'json',
        },
      ],
    },
    'error': {
      'fields': {
        '400': [
          {
            'group': '400',
            'optional': false,
            'field': 'InvalidInput',
            'description': '<p>The input is invalid</p>',
          },
        ],
      },
      'examples': [
        {
          'title': 'Error-Response:',
          'content': 'HTTP/1.1 400 Bad Request\n{\n  "success":"false",\n  "error":"Input validation failed: Error: Field linkName specified with invalid link: link-terra121.f5.td.a404-if-terra222.f5.td.a404-"}\n}',
          'type': 'json',
        },
      ],
    },
  },
  {
    'type': 'post',
    'url': '/setNodeMacAddress',
    'title': 'Set Node Mac Address',
    'name': 'SetNodeMacAddress',
    'group': 'Topology',
    'parameter': {
      'fields': {
        'Parameter': [
          {
            'group': 'Parameter',
            'type': 'String',
            'optional': false,
            'field': 'topology',
            'description': '<p>Topology Name</p>',
          },
          {
            'group': 'Parameter',
            'type': 'String',
            'optional': false,
            'field': 'node',
            'description': '<p>Node Name</p>',
          },
          {
            'group': 'Parameter',
            'type': 'String',
            'optional': false,
            'field': 'mac',
            'description': '<p>MAC Address</p>',
          },
          {
            'group': 'Parameter',
            'type': 'Bool',
            'optional': false,
            'field': 'force',
            'description': '<p>Force</p>',
          },
        ],
      },
    },
    'examples': [
      {
        'title': 'Example:',
        'content': "curl -id '{\"topology\": \"Lab F8 D\", \"node\": \"terra111.f5.td.a404-if\", \"mac\": \"99:00:00:10:0d:40\", \"force\": true}' http://localhost:443/api/setNodeMacAddress",
        'type': 'curl',
      },
    ],
    'version': '0.0.0',
    'filename': 'api/api_lib.js',
    'groupTitle': 'Topology',
    'success': {
      'fields': {
        '200': [
          {
            'group': '200',
            'type': 'Bool',
            'optional': false,
            'field': 'success',
            'description': '<p>Indicates the command was received by the controller</p>',
          },
        ],
      },
      'examples': [
        {
          'title': 'Success-Response:',
          'content': 'HTTP/1.1 200\n{\n  "success": true\n}',
          'type': 'json',
        },
      ],
    },
    'error': {
      'fields': {
        '400': [
          {
            'group': '400',
            'optional': false,
            'field': 'InvalidInput',
            'description': '<p>The input is invalid</p>',
          },
        ],
      },
      'examples': [
        {
          'title': 'Error-Response:',
          'content': 'HTTP/1.1 400 Bad Request\n{\n  "success":"false",\n  "error":"Input validation failed: Error: Field linkName specified with invalid link: link-terra121.f5.td.a404-if-terra222.f5.td.a404-"}\n}',
          'type': 'json',
        },
      ],
    },
  },
] });
