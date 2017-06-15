define({ "api": [
  {
    "type": "post",
    "url": "/getIgnitionState",
    "title": "Get Ignition State",
    "name": "GetIgnitionState",
    "group": "Ignition",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "String",
            "optional": false,
            "field": "topology",
            "description": "<p>Topology Name</p>"
          }
        ]
      }
    },
    "examples": [
      {
        "title": "Example:",
        "content": "curl -id '{\"topology\": \"Lab F8 D\"}' http://localhost:443/api/getIgnitionState",
        "type": "curl"
      }
    ],
    "success": {
      "fields": {
        "Success 200": [
          {
            "group": "Success 200",
            "type": "JSON",
            "optional": false,
            "field": "success",
            "description": "<p>IgnitionState from ControllerProxy.thrift</p>"
          }
        ]
      },
      "examples": [
        {
          "title": "Success-Response:",
          "content": "\n{\n    \"igCandidates\": [],\n    \"igParams\": {\n        \"enable\": true,\n        \"linkUpDampenInterval\": {\n            \"buffer\": {\n                \"data\": [\n                    0,\n                    0,\n                    0,\n                    0,\n                    0,\n                    0,\n                    0,\n                    35\n                ],\n                \"type\": \"Buffer\"\n            },\n            \"offset\": 0\n        },\n        \"linkUpInterval\": {\n            \"buffer\": {\n                \"data\": [\n                    0,\n                    0,\n                    0,\n                    0,\n                    0,\n                    0,\n                    0,\n                    5\n                ],\n                \"type\": \"Buffer\"\n            },\n            \"offset\": 0\n        },\n        \"link_auto_ignite\": {}\n    },\n    \"lastIgCandidate\": {\n        \"initiatorNodeName\": \"terra123.f5.td.a404-if\",\n        \"linkName\": \"link-terra114.f5.td.a404-if-terra123.f5.td.a404-if\"\n    },\n    \"visitedNodeNames\": [\n        \"terra111.f5.td.a404-if\",\n        \"terra212.f5.td.a404-if\",\n        \"terra114.f5.td.a404-if\",\n        \"terra211.f5.td.a404-if\",\n        \"terra214.f5.td.a404-if\",\n        \"terra123.f5.td.a404-if\",\n        \"terra312.f5.td.a404-if\",\n        \"terra223.f5.td.a404-if\",\n        \"terra121.f5.td.a404-if\",\n        \"terra314.f5.td.a404-if\",\n        \"terra221.f5.td.a404-if\",\n        \"terra222.f5.td.a404-if\",\n        \"terra323.f5.td.a404-if\",\n        \"terra322.f5.td.a404-if\"\n    ]\n}",
          "type": "json"
        }
      ]
    },
    "version": "0.0.0",
    "filename": "api/api_lib.js",
    "groupTitle": "Ignition"
  },
  {
    "type": "post",
    "url": "/setLinkIgnitionState",
    "title": "Set Link Ignition State",
    "name": "SetLinkIgnitionState",
    "group": "Ignition",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "String",
            "optional": false,
            "field": "topology",
            "description": "<p>Topology Name</p>"
          },
          {
            "group": "Parameter",
            "type": "String",
            "optional": false,
            "field": "linkName",
            "description": "<p>Link Name</p>"
          },
          {
            "group": "Parameter",
            "type": "Bool",
            "optional": false,
            "field": "enabled",
            "description": "<p>State of ignition for linkt</p>"
          }
        ]
      }
    },
    "examples": [
      {
        "title": "Example:",
        "content": "curl -id '{\"topology\": \"Lab F8 D\", \"linkName\": \"link-terra121.f5.td.a404-if-terra222.f5.td.a404-if\", \"enabled\": false}' http://localhost:443/api/setLinkIgnitionState",
        "type": "curl"
      }
    ],
    "version": "0.0.0",
    "filename": "api/api_lib.js",
    "groupTitle": "Ignition",
    "success": {
      "fields": {
        "200": [
          {
            "group": "200",
            "type": "Bool",
            "optional": false,
            "field": "success",
            "description": "<p>Indicates the command was received by the controller</p>"
          }
        ]
      },
      "examples": [
        {
          "title": "Success-Response:",
          "content": "HTTP/1.1 200\n{\n  \"success\": true\n}",
          "type": "json"
        }
      ]
    },
    "error": {
      "fields": {
        "400": [
          {
            "group": "400",
            "optional": false,
            "field": "InvalidInput",
            "description": "<p>The input is invalid</p>"
          }
        ]
      },
      "examples": [
        {
          "title": "Error-Response:",
          "content": "HTTP/1.1 400 Bad Request\n{\n  \"success\":\"false\",\n  \"error\":\"Input validation failed: Error: Field linkName specified with invalid link: link-terra121.f5.td.a404-if-terra222.f5.td.a404-\"}\n}",
          "type": "json"
        }
      ]
    }
  },
  {
    "type": "post",
    "url": "/setNetworkIgnitionState",
    "title": "Set Network Ignition State",
    "name": "SetNetworkIgnitionState",
    "group": "Ignition",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "String",
            "optional": false,
            "field": "topology",
            "description": "<p>Topology Name</p>"
          },
          {
            "group": "Parameter",
            "type": "Bool",
            "optional": false,
            "field": "enabled",
            "description": "<p>State of network-wide ignition</p>"
          }
        ]
      }
    },
    "examples": [
      {
        "title": "Example:",
        "content": "curl -id '{\"topology\": \"Lab F8 D\", \"enabled\": true}' http://localhost:443/api/setNetworkIgnitionState",
        "type": "curl"
      }
    ],
    "version": "0.0.0",
    "filename": "api/api_lib.js",
    "groupTitle": "Ignition",
    "success": {
      "fields": {
        "200": [
          {
            "group": "200",
            "type": "Bool",
            "optional": false,
            "field": "success",
            "description": "<p>Indicates the command was received by the controller</p>"
          }
        ]
      },
      "examples": [
        {
          "title": "Success-Response:",
          "content": "HTTP/1.1 200\n{\n  \"success\": true\n}",
          "type": "json"
        }
      ]
    },
    "error": {
      "fields": {
        "400": [
          {
            "group": "400",
            "optional": false,
            "field": "InvalidInput",
            "description": "<p>The input is invalid</p>"
          }
        ]
      },
      "examples": [
        {
          "title": "Error-Response:",
          "content": "HTTP/1.1 400 Bad Request\n{\n  \"success\":\"false\",\n  \"error\":\"Input validation failed: Error: Field linkName specified with invalid link: link-terra121.f5.td.a404-if-terra222.f5.td.a404-\"}\n}",
          "type": "json"
        }
      ]
    }
  },
  {
    "type": "post",
    "url": "/rebootNode",
    "title": "Reboot Node",
    "name": "RebootNode",
    "group": "Management",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "String",
            "optional": false,
            "field": "topology",
            "description": "<p>Topology Name</p>"
          },
          {
            "group": "Parameter",
            "type": "String",
            "optional": false,
            "field": "node",
            "description": "<p>Site Name</p>"
          },
          {
            "group": "Parameter",
            "type": "Bool",
            "optional": false,
            "field": "force",
            "description": "<p>Force Reboot</p>"
          }
        ]
      }
    },
    "examples": [
      {
        "title": "Example:",
        "content": "curl -id '{\"topology\": \"Lab F8 D\", \"node\": \"terra114.f5.td.a404-if\", \"force\": true}' http://localhost:443/api/rebootNode",
        "type": "curl"
      }
    ],
    "version": "0.0.0",
    "filename": "api/api_lib.js",
    "groupTitle": "Management",
    "success": {
      "fields": {
        "200": [
          {
            "group": "200",
            "type": "Bool",
            "optional": false,
            "field": "success",
            "description": "<p>Indicates the command was received by the controller</p>"
          }
        ]
      },
      "examples": [
        {
          "title": "Success-Response:",
          "content": "HTTP/1.1 200\n{\n  \"success\": true\n}",
          "type": "json"
        }
      ]
    },
    "error": {
      "fields": {
        "400": [
          {
            "group": "400",
            "optional": false,
            "field": "InvalidInput",
            "description": "<p>The input is invalid</p>"
          }
        ]
      },
      "examples": [
        {
          "title": "Error-Response:",
          "content": "HTTP/1.1 400 Bad Request\n{\n  \"success\":\"false\",\n  \"error\":\"Input validation failed: Error: Field linkName specified with invalid link: link-terra121.f5.td.a404-if-terra222.f5.td.a404-\"}\n}",
          "type": "json"
        }
      ]
    }
  },
  {
    "type": "post",
    "url": "/addLink",
    "title": "Add Link",
    "name": "AddLink",
    "group": "Topology",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "String",
            "optional": false,
            "field": "topology",
            "description": "<p>Topology Name</p>"
          },
          {
            "group": "Parameter",
            "type": "String",
            "optional": false,
            "field": "nodeA",
            "description": "<p>Node A Name</p>"
          },
          {
            "group": "Parameter",
            "type": "String",
            "optional": false,
            "field": "nodeZ",
            "description": "<p>Node Z Name</p>"
          },
          {
            "group": "Parameter",
            "type": "String",
            "optional": false,
            "field": "linkType",
            "description": "<p>Link Type (WIRELESS or ETHERNET)</p>"
          }
        ]
      }
    },
    "examples": [
      {
        "title": "Example:",
        "content": "curl -id '{\"topology\": \"Lab F8 D\", \"nodeA\": \"terra212.f5.td.a404-if\", \"nodeZ\": \"terra214.f5.td.a404-if\", \"linkType\": \"ETHERNET\"}' http://localhost:443/api/addLink",
        "type": "curl"
      }
    ],
    "version": "0.0.0",
    "filename": "api/api_lib.js",
    "groupTitle": "Topology",
    "success": {
      "fields": {
        "200": [
          {
            "group": "200",
            "type": "Bool",
            "optional": false,
            "field": "success",
            "description": "<p>Indicates the command was received by the controller</p>"
          }
        ]
      },
      "examples": [
        {
          "title": "Success-Response:",
          "content": "HTTP/1.1 200\n{\n  \"success\": true\n}",
          "type": "json"
        }
      ]
    },
    "error": {
      "fields": {
        "400": [
          {
            "group": "400",
            "optional": false,
            "field": "InvalidInput",
            "description": "<p>The input is invalid</p>"
          }
        ]
      },
      "examples": [
        {
          "title": "Error-Response:",
          "content": "HTTP/1.1 400 Bad Request\n{\n  \"success\":\"false\",\n  \"error\":\"Input validation failed: Error: Field linkName specified with invalid link: link-terra121.f5.td.a404-if-terra222.f5.td.a404-\"}\n}",
          "type": "json"
        }
      ]
    }
  },
  {
    "type": "post",
    "url": "/addNode",
    "title": "Add Node (NOT READY)",
    "name": "AddNode",
    "group": "Topology",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "String",
            "optional": false,
            "field": "topology",
            "description": "<p>Topology Name</p>"
          },
          {
            "group": "Parameter",
            "type": "String",
            "optional": false,
            "field": "node",
            "description": "<p>Node Struct</p>"
          }
        ]
      }
    },
    "examples": [
      {
        "title": "Example:",
        "content": "curl -id '{\"topology\": \"Lab F8 D\", \"nodeA\": \"terra212.f5.td.a404-if\", \"nodeZ\": \"terra214.f5.td.a404-if\", \"linkType\": \"ETHERNET\"}' http://localhost:443/api/addNode",
        "type": "curl"
      }
    ],
    "version": "0.0.0",
    "filename": "api/api_lib.js",
    "groupTitle": "Topology",
    "success": {
      "fields": {
        "200": [
          {
            "group": "200",
            "type": "Bool",
            "optional": false,
            "field": "success",
            "description": "<p>Indicates the command was received by the controller</p>"
          }
        ]
      },
      "examples": [
        {
          "title": "Success-Response:",
          "content": "HTTP/1.1 200\n{\n  \"success\": true\n}",
          "type": "json"
        }
      ]
    },
    "error": {
      "fields": {
        "400": [
          {
            "group": "400",
            "optional": false,
            "field": "InvalidInput",
            "description": "<p>The input is invalid</p>"
          }
        ]
      },
      "examples": [
        {
          "title": "Error-Response:",
          "content": "HTTP/1.1 400 Bad Request\n{\n  \"success\":\"false\",\n  \"error\":\"Input validation failed: Error: Field linkName specified with invalid link: link-terra121.f5.td.a404-if-terra222.f5.td.a404-\"}\n}",
          "type": "json"
        }
      ]
    }
  },
  {
    "type": "post",
    "url": "/addSite",
    "title": "Add Site",
    "name": "AddSite",
    "group": "Topology",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "String",
            "optional": false,
            "field": "topology",
            "description": "<p>Topology Name</p>"
          },
          {
            "group": "Parameter",
            "type": "String",
            "optional": false,
            "field": "site",
            "description": "<p>Site Name</p>"
          },
          {
            "group": "Parameter",
            "type": "Double",
            "optional": false,
            "field": "latitude",
            "description": "<p>Latitude</p>"
          },
          {
            "group": "Parameter",
            "type": "Double",
            "optional": false,
            "field": "longitude",
            "description": "<p>Longitude</p>"
          },
          {
            "group": "Parameter",
            "type": "Double",
            "optional": false,
            "field": "altitude",
            "description": "<p>Altitude (meters)</p>"
          }
        ]
      }
    },
    "examples": [
      {
        "title": "Example:",
        "content": "curl -id '{\"topology\": \"Lab F8 D\", \"site\": \"Test Site\", \"latitude\": 37.4848, \"longitude\": -122.1472, \"altitude\": 30.5}' http://localhost:443/api/addSite",
        "type": "curl"
      }
    ],
    "version": "0.0.0",
    "filename": "api/api_lib.js",
    "groupTitle": "Topology",
    "success": {
      "fields": {
        "200": [
          {
            "group": "200",
            "type": "Bool",
            "optional": false,
            "field": "success",
            "description": "<p>Indicates the command was received by the controller</p>"
          }
        ]
      },
      "examples": [
        {
          "title": "Success-Response:",
          "content": "HTTP/1.1 200\n{\n  \"success\": true\n}",
          "type": "json"
        }
      ]
    },
    "error": {
      "fields": {
        "400": [
          {
            "group": "400",
            "optional": false,
            "field": "InvalidInput",
            "description": "<p>The input is invalid</p>"
          }
        ]
      },
      "examples": [
        {
          "title": "Error-Response:",
          "content": "HTTP/1.1 400 Bad Request\n{\n  \"success\":\"false\",\n  \"error\":\"Input validation failed: Error: Field linkName specified with invalid link: link-terra121.f5.td.a404-if-terra222.f5.td.a404-\"}\n}",
          "type": "json"
        }
      ]
    }
  },
  {
    "type": "post",
    "url": "/delLink",
    "title": "Delete Link",
    "name": "DelLink",
    "group": "Topology",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "String",
            "optional": false,
            "field": "topology",
            "description": "<p>Topology Name</p>"
          },
          {
            "group": "Parameter",
            "type": "String",
            "optional": false,
            "field": "linkName",
            "description": "<p>Link Name</p>"
          },
          {
            "group": "Parameter",
            "type": "Boolean",
            "optional": false,
            "field": "force",
            "description": "<p>Force Link Deletion</p>"
          }
        ]
      }
    },
    "examples": [
      {
        "title": "Example:",
        "content": "curl -id '{\"topology\": \"Lab F8 D\", \"linkName\": \"link-terra221.f5.td.a404-if-terra322.f5.td.a404-if\", \"force\": true}' http://localhost:443/api/delLink",
        "type": "curl"
      }
    ],
    "version": "0.0.0",
    "filename": "api/api_lib.js",
    "groupTitle": "Topology",
    "success": {
      "fields": {
        "200": [
          {
            "group": "200",
            "type": "Bool",
            "optional": false,
            "field": "success",
            "description": "<p>Indicates the command was received by the controller</p>"
          }
        ]
      },
      "examples": [
        {
          "title": "Success-Response:",
          "content": "HTTP/1.1 200\n{\n  \"success\": true\n}",
          "type": "json"
        }
      ]
    },
    "error": {
      "fields": {
        "400": [
          {
            "group": "400",
            "optional": false,
            "field": "InvalidInput",
            "description": "<p>The input is invalid</p>"
          }
        ]
      },
      "examples": [
        {
          "title": "Error-Response:",
          "content": "HTTP/1.1 400 Bad Request\n{\n  \"success\":\"false\",\n  \"error\":\"Input validation failed: Error: Field linkName specified with invalid link: link-terra121.f5.td.a404-if-terra222.f5.td.a404-\"}\n}",
          "type": "json"
        }
      ]
    }
  },
  {
    "type": "post",
    "url": "/delNode",
    "title": "Delete Node",
    "name": "DelNode",
    "group": "Topology",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "String",
            "optional": false,
            "field": "topology",
            "description": "<p>Topology Name</p>"
          },
          {
            "group": "Parameter",
            "type": "String",
            "optional": false,
            "field": "node",
            "description": "<p>Node Name</p>"
          },
          {
            "group": "Parameter",
            "type": "Bool",
            "optional": false,
            "field": "force",
            "description": "<p>Force Delete</p>"
          }
        ]
      }
    },
    "examples": [
      {
        "title": "Example:",
        "content": "curl -id '{\"topology\": \"Lab F8 D\", \"node\": \"terra212.f5.td.a404-if\", \"force\": false}' http://localhost:443/api/delNode",
        "type": "curl"
      }
    ],
    "version": "0.0.0",
    "filename": "api/api_lib.js",
    "groupTitle": "Topology",
    "success": {
      "fields": {
        "200": [
          {
            "group": "200",
            "type": "Bool",
            "optional": false,
            "field": "success",
            "description": "<p>Indicates the command was received by the controller</p>"
          }
        ]
      },
      "examples": [
        {
          "title": "Success-Response:",
          "content": "HTTP/1.1 200\n{\n  \"success\": true\n}",
          "type": "json"
        }
      ]
    },
    "error": {
      "fields": {
        "400": [
          {
            "group": "400",
            "optional": false,
            "field": "InvalidInput",
            "description": "<p>The input is invalid</p>"
          }
        ]
      },
      "examples": [
        {
          "title": "Error-Response:",
          "content": "HTTP/1.1 400 Bad Request\n{\n  \"success\":\"false\",\n  \"error\":\"Input validation failed: Error: Field linkName specified with invalid link: link-terra121.f5.td.a404-if-terra222.f5.td.a404-\"}\n}",
          "type": "json"
        }
      ]
    }
  },
  {
    "type": "post",
    "url": "/delSite",
    "title": "Delete Site",
    "name": "DelSite",
    "group": "Topology",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "String",
            "optional": false,
            "field": "topology",
            "description": "<p>Topology Name</p>"
          },
          {
            "group": "Parameter",
            "type": "String",
            "optional": false,
            "field": "site",
            "description": "<p>Site Name</p>"
          }
        ]
      }
    },
    "examples": [
      {
        "title": "Example:",
        "content": "curl -id '{\"topology\": \"Lab F8 D\", \"site\": \"Test Site\"}' http://localhost:443/api/delSite",
        "type": "curl"
      }
    ],
    "version": "0.0.0",
    "filename": "api/api_lib.js",
    "groupTitle": "Topology",
    "success": {
      "fields": {
        "200": [
          {
            "group": "200",
            "type": "Bool",
            "optional": false,
            "field": "success",
            "description": "<p>Indicates the command was received by the controller</p>"
          }
        ]
      },
      "examples": [
        {
          "title": "Success-Response:",
          "content": "HTTP/1.1 200\n{\n  \"success\": true\n}",
          "type": "json"
        }
      ]
    },
    "error": {
      "fields": {
        "400": [
          {
            "group": "400",
            "optional": false,
            "field": "InvalidInput",
            "description": "<p>The input is invalid</p>"
          }
        ]
      },
      "examples": [
        {
          "title": "Error-Response:",
          "content": "HTTP/1.1 400 Bad Request\n{\n  \"success\":\"false\",\n  \"error\":\"Input validation failed: Error: Field linkName specified with invalid link: link-terra121.f5.td.a404-if-terra222.f5.td.a404-\"}\n}",
          "type": "json"
        }
      ]
    }
  },
  {
    "type": "post",
    "url": "/setLinkStatus",
    "title": "Set Link Status",
    "name": "SetLinkStatus",
    "group": "Topology",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "String",
            "optional": false,
            "field": "topology",
            "description": "<p>Topology Name</p>"
          },
          {
            "group": "Parameter",
            "type": "String",
            "optional": false,
            "field": "linkName",
            "description": "<p>Link Name (&lt;NODE_A&gt;-&lt;NODE_Z&gt;)</p>"
          },
          {
            "group": "Parameter",
            "type": "Bool",
            "optional": false,
            "field": "linkUp",
            "description": "<p>Link Up or Down</p>"
          }
        ]
      }
    },
    "examples": [
      {
        "title": "Example:",
        "content": "curl -id '{\"topology\": \"Lab F8 D\", \"linkName\": \"link-terra111.f5.td.a404-if-terra212.f5.td.a404-if\", \"linkUp\": false}' http://localhost:443/api/setLinkStatus",
        "type": "curl"
      }
    ],
    "version": "0.0.0",
    "filename": "api/api_lib.js",
    "groupTitle": "Topology",
    "success": {
      "fields": {
        "200": [
          {
            "group": "200",
            "type": "Bool",
            "optional": false,
            "field": "success",
            "description": "<p>Indicates the command was received by the controller</p>"
          }
        ]
      },
      "examples": [
        {
          "title": "Success-Response:",
          "content": "HTTP/1.1 200\n{\n  \"success\": true\n}",
          "type": "json"
        }
      ]
    },
    "error": {
      "fields": {
        "400": [
          {
            "group": "400",
            "optional": false,
            "field": "InvalidInput",
            "description": "<p>The input is invalid</p>"
          }
        ]
      },
      "examples": [
        {
          "title": "Error-Response:",
          "content": "HTTP/1.1 400 Bad Request\n{\n  \"success\":\"false\",\n  \"error\":\"Input validation failed: Error: Field linkName specified with invalid link: link-terra121.f5.td.a404-if-terra222.f5.td.a404-\"}\n}",
          "type": "json"
        }
      ]
    }
  },
  {
    "type": "post",
    "url": "/setNodeMacAddress",
    "title": "Set Node Mac Address",
    "name": "SetNodeMacAddress",
    "group": "Topology",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "String",
            "optional": false,
            "field": "topology",
            "description": "<p>Topology Name</p>"
          },
          {
            "group": "Parameter",
            "type": "String",
            "optional": false,
            "field": "node",
            "description": "<p>Node Name</p>"
          },
          {
            "group": "Parameter",
            "type": "String",
            "optional": false,
            "field": "mac",
            "description": "<p>MAC Address</p>"
          },
          {
            "group": "Parameter",
            "type": "Bool",
            "optional": false,
            "field": "force",
            "description": "<p>Force</p>"
          }
        ]
      }
    },
    "examples": [
      {
        "title": "Example:",
        "content": "curl -id '{\"topology\": \"Lab F8 D\", \"node\": \"terra111.f5.td.a404-if\", \"mac\": \"99:00:00:10:0d:40\", \"force\": true}' http://localhost:443/api/setNodeMacAddress",
        "type": "curl"
      }
    ],
    "version": "0.0.0",
    "filename": "api/api_lib.js",
    "groupTitle": "Topology",
    "success": {
      "fields": {
        "200": [
          {
            "group": "200",
            "type": "Bool",
            "optional": false,
            "field": "success",
            "description": "<p>Indicates the command was received by the controller</p>"
          }
        ]
      },
      "examples": [
        {
          "title": "Success-Response:",
          "content": "HTTP/1.1 200\n{\n  \"success\": true\n}",
          "type": "json"
        }
      ]
    },
    "error": {
      "fields": {
        "400": [
          {
            "group": "400",
            "optional": false,
            "field": "InvalidInput",
            "description": "<p>The input is invalid</p>"
          }
        ]
      },
      "examples": [
        {
          "title": "Error-Response:",
          "content": "HTTP/1.1 400 Bad Request\n{\n  \"success\":\"false\",\n  \"error\":\"Input validation failed: Error: Field linkName specified with invalid link: link-terra121.f5.td.a404-if-terra222.f5.td.a404-\"}\n}",
          "type": "json"
        }
      ]
    }
  }
] });
