const thrift = require('thrift');

const ApiConsts = require('./api_consts');
const ApiMethods = ApiConsts.ApiMethods;
const VerificationType = ApiConsts.VerificationType;
const ControllerProxy = require('../worker.js').ControllerProxy;
const Topology_ttypes = require('../thrift/gen-nodejs/Topology_types');
const Controller_ttypes = require('../thrift/gen-nodejs/Controller_types');

class ApiLib {
  constructor(networkConfigs, topologyList, postData) {
    this._networkConfigs = networkConfigs;
    this._topologyList = topologyList;
    this._data = postData;
  }

  validateInput(methodName) {
    if (!this._data.hasOwnProperty("topology")) {
      return false;
    }
    let topologyName = this._data["topology"];
    if (!this._networkConfigs.hasOwnProperty(topologyName) ||
        !this._topologyList.hasOwnProperty(topologyName)) {
      return false;
    }
    let networkConfig = Object.assign({}, this._networkConfigs[topologyName]);
    networkConfig.topology = this._topologyList[topologyName];
    this._networkConfig = networkConfig;
    // ensure a controller IP exists
    if (!this._networkConfig.controller_ip ||
        this._networkConfig.controller_ip.length == 0) {
      return false;
    }
    let fields = ApiMethods[methodName].fields;
    Object.keys(fields).forEach(fieldName => {
      let fieldVerType = fields[fieldName];
      if (!this._data.hasOwnProperty(fieldName)) {
        throw new Error('Missing required field: ' + fieldName);
      }
      let fieldValue = this._data[fieldName];
      switch (fieldVerType) {
        case VerificationType.TOPOLOGY_NAME:
          // done by default
          break;
        case VerificationType.NODE_NAME:
          let foundNode = false;
          this._networkConfig.topology.nodes.forEach(node => {
            if (node.name == fieldValue) {
              foundNode = true;
            }
          });
          if (!foundNode) {
            throw new Error('Field ' + fieldName +
                            ' specified with invalid node: ' + fieldValue);
          }
          break;
        case VerificationType.LINK_NAME:
          let foundLink = false;
          this._networkConfig.topology.links.forEach(link => {
            if (link.name == fieldValue) {
              foundLink = true;
            }
          });
          if (!foundLink) {
            throw new Error('Field ' + fieldName +
                            ' specified with invalid link: ' + fieldValue);
          }
          break;
        case VerificationType.SITE_NAME:
          let foundSite = false;
          this._networkConfig.topology.sites.forEach(site => {
            if (site.name == fieldValue) {
              foundSite = true;
            }
          });
          if (!foundSite) {
            throw new Error('Field ' + fieldName +
                            ' specified with invalid site: ' + fieldValue);
          }
          break;
        case VerificationType.IS_BOOLEAN:
          if (typeof fieldValue == "string") {
            fieldValue = fieldValue == "true" ? true : false;
            this._data[fieldName] = fieldValue;
          }
          if (typeof fieldValue != "boolean") {
            throw new Error('Field ' + fieldName +
                            ' is not a boolean: ' + fieldValue);
          }
          break;
        case VerificationType.VALID_MAC:
          if (fieldValue.length != (6 * 2 + 5)) {
            throw new Error('Field ' + fieldName +
                            ' is not a valid MAC address: ' + fieldValue);
          }
          break;
        case VerificationType.LINK_TYPE:
          if (fieldValue == 'ETHERNET') {
            this._data[fieldName] = Topology_ttypes.LinkType.ETHERNET;
          } else if (fieldValue == 'WIRELESS') {
            this._data[fieldName] = Topology_ttypes.LinkType.WIRELESS;
          } else {
            throw new Error('Link type unknown: ' + fieldValue);
          }
          break;
        default:
          console.error('Unhandled verification type', fieldVerType);
      }
    });
    // finish validating input from ApiMethods
    return true;
  }

  call(res, methodName) {
    var transport = new thrift.TFramedTransport(null, function(byteArray) {
      // Flush puts a 4-byte header, which needs to be parsed/sliced.
      byteArray = byteArray.slice(4);
      const ctrlProxy = new ControllerProxy(
          this._networkConfig.controller_ip);
      // inject the dest mac if needed
      let nodeMac;
      switch (methodName) {
        case 'rebootNode':
          this._networkConfig.topology.nodes.forEach(node => {
            if (node.name == this._data.node) {
              nodeMac = node.mac_addr;
            }
          });
          break;
        default:
          nodeMac = "";
      }
      ctrlProxy.sendCtrlApiMsgType(ApiMethods[methodName].command,
                                   byteArray,
                                   nodeMac,
                                   res);
    }.bind(this));
    var tProtocol = new thrift.TCompactProtocol(transport);
    /**
     * @apiDefine InvalidInputError
     *
     * @apiError (400) InvalidInput The input is invalid
     *
     * @apiErrorExample Error-Response:
     *  HTTP/1.1 400 Bad Request
     *  {
     *    "success":"false",
     *    "error":"Input validation failed: Error: Field linkName specified with invalid link: link-terra121.f5.td.a404-if-terra222.f5.td.a404-"}
     *  }
     */
    /**
     * @apiDefine CallSuccess
     *
     * @apiSuccess (200) {Bool} success Indicates the command was received by the controller
     *
     * @apiSuccessExample Success-Response:
     *  HTTP/1.1 200
     *  {
     *    "success": true
     *  }
     */
    switch (methodName) {
      /**
       * @api {post} /setLinkStatus Set Link Status
       * @apiName SetLinkStatus
       * @apiGroup Topology
       *
       * @apiParam {String} topology Topology Name
       * @apiParam {String} linkName Link Name (<NODE_A>-<NODE_Z>)
       * @apiParam {Bool} linkUp Link Up or Down
       *
       * @apiExample {curl} Example:
       *    curl -id '{"topology": "Lab F8 D", "linkName": "link-terra111.f5.td.a404-if-terra212.f5.td.a404-if", "linkUp": false}' http://localhost:443/api/setLinkStatus
       *
       * @apiUse CallSuccess
       * @apiUse InvalidInputError
       */ 
      case 'setLinkStatus':
        var setLinkStatusReq = new Controller_ttypes.SetLinkStatusReq();
        // find node names
        let foundLink = false;
        this._networkConfig.topology.links.forEach(link => {
          if (link.name == this._data.linkName) {
            foundLink = true;
            setLinkStatusReq.initiatorNodeName = link.a_node_name;
            setLinkStatusReq.responderNodeName = link.z_node_name;
          }
        });
        setLinkStatusReq.action = this._data.linkUp ?
          Controller_ttypes.LinkActionType.LINK_UP :
          Controller_ttypes.LinkActionType.LINK_DOWN;
        setLinkStatusReq.write(tProtocol);
        transport.flush();
        break;
      /**
       * @api {post} /setNodeMacAddress Set Node Mac Address
       * @apiName SetNodeMacAddress
       * @apiGroup Topology
       *
       * @apiParam {String} topology Topology Name
       * @apiParam {String} node Node Name
       * @apiParam {String} mac MAC Address
       * @apiParam {Bool} force Force
       *
       * @apiExample {curl} Example:
       *    curl -id '{"topology": "Lab F8 D", "node": "terra111.f5.td.a404-if", "mac": "99:00:00:10:0d:40", "force": true}' http://localhost:443/api/setNodeMacAddress
       *
       * @apiUse CallSuccess
       * @apiUse InvalidInputError
       */ 
      case 'setNodeMacAddress':
        var setNodeMacReq = new Controller_ttypes.SetNodeMac();
        setNodeMacReq.nodeName = this._data.node;
        setNodeMacReq.nodeMac = this._data.mac;
        setNodeMacReq.force = this._data.force;
        setNodeMacReq.write(tProtocol);
        transport.flush();
        break;
      /**
       * @api {post} /addLink Add Link
       * @apiName AddLink
       * @apiGroup Topology
       *
       * @apiParam {String} topology Topology Name
       * @apiParam {String} nodeA Node A Name
       * @apiParam {String} nodeZ Node Z Name
       * @apiParam {String} linkType Link Type (WIRELESS or ETHERNET)
       *
       * @apiExample {curl} Example:
       *    curl -id '{"topology": "Lab F8 D", "nodeA": "terra212.f5.td.a404-if", "nodeZ": "terra214.f5.td.a404-if", "linkType": "ETHERNET"}' http://localhost:443/api/addLink
       *
       * @apiUse CallSuccess
       * @apiUse InvalidInputError
       */ 
      case 'addLink':
        var addLinkReq = new Controller_ttypes.AddLink();
        var link = new Topology_ttypes.Link();
        link.name = this._data.linkName;
        link.a_node_name = this._data.nodeA;
        link.z_node_name = this._data.nodeZ;
        link.link_type = this._data.linkType;
        link.is_alive = 0;
        link.linkup_attempts = 0;
        addLinkReq.link = link;
        addLinkReq.write(tProtocol);
        transport.flush();
        break;
      /**
       * @api {post} /delLink Delete Link
       * @apiName DelLink
       * @apiGroup Topology
       *
       * @apiParam {String} topology Topology Name
       * @apiParam {String} linkName Link Name
       * @apiParam {Boolean} force Force Link Deletion
       *
       * @apiExample {curl} Example:
       *    curl -id '{"topology": "Lab F8 D", "linkName": "link-terra221.f5.td.a404-if-terra322.f5.td.a404-if", "force": true}' http://localhost:443/api/delLink
       *
       * @apiUse CallSuccess
       * @apiUse InvalidInputError
       */ 
      case 'delLink':
        var delLinkReq = new Controller_ttypes.DelLink();
        this._networkConfig.topology.links.forEach(link => {
          if (link.name == this._data.linkName) {
            delLinkReq.a_node_name = link.a_node_name;
            delLinkReq.z_node_name = link.z_node_name;
          }
        });
        delLinkReq.forceDelete = this._data.force;
        delLinkReq.write(tProtocol);
        transport.flush();
        break;
      /**
       * @api {post} /addNode Add Node (NOT READY)
       * @apiName AddNode
       * @apiGroup Topology
       *
       * @apiParam {String} topology Topology Name
       * @apiParam {String} node Node Struct
       *
       * @apiExample {curl} Example:
       *    curl -id '{"topology": "Lab F8 D", "nodeA": "terra212.f5.td.a404-if", "nodeZ": "terra214.f5.td.a404-if", "linkType": "ETHERNET"}' http://localhost:443/api/addNode
       *
       * @apiUse CallSuccess
       * @apiUse InvalidInputError
       */ 
      case 'addNode':
        var addNodeReq = new Controller_ttypes.AddNode();
        var node = new Topology_ttypes.Node();
        var golay = new Topology_ttypes.GolayIdx();

        golay.txGolayIdx = msg.node.txGolayIdx;
        golay.rxGolayIdx = msg.node.rxGolayIdx;

        node.name = msg.node.name;
        node.node_type = msg.node.type == "DN" ? Topology_ttypes.NodeType.DN : Topology_ttypes.NodeType.CN;
        node.is_primary = msg.node.is_primary;
        node.mac_addr = msg.node.mac_addr;
        node.pop_node = msg.node.is_pop;
        node.polarity = msg.node.polarity == "ODD" ? Topology_ttypes.PolarityType.ODD : Topology_ttypes.PolarityType.EVEN;
        node.golay_idx = golay;
        node.site_name = msg.node.site_name;
        node.ant_azimuth = msg.node.ant_azimuth;
        node.ant_elevation = msg.node.ant_elevation;
        node.has_cpe = msg.node.has_cpe;

        addNodeReq.node = node;
        addNodeReq.write(tProtocol);
        transport.flush();
        break;
      /**
       * @api {post} /delNode Delete Node
       * @apiName DelNode
       * @apiGroup Topology
       *
       * @apiParam {String} topology Topology Name
       * @apiParam {String} node Node Name
       * @apiParam {Bool} force Force Delete
       *
       * @apiExample {curl} Example:
       *    curl -id '{"topology": "Lab F8 D", "node": "terra212.f5.td.a404-if", "force": false}' http://localhost:443/api/delNode
       *
       * @apiUse CallSuccess
       * @apiUse InvalidInputError
       */ 
      case 'delNode':
        var delNodeReq = new Controller_ttypes.DelNode();
        delNodeReq.nodeName = this._data.node;
        delNodeReq.forceDelete = this._data.force;
        delNodeReq.write(tProtocol);
        transport.flush();
        break;
      /**
       * @api {post} /addSite Add Site
       * @apiName AddSite
       * @apiGroup Topology
       *
       * @apiParam {String} topology Topology Name
       * @apiParam {String} site Site Name
       * @apiParam {Double} latitude Latitude
       * @apiParam {Double} longitude Longitude
       * @apiParam {Double} altitude Altitude (meters)
       *
       * @apiExample {curl} Example:
       *    curl -id '{"topology": "Lab F8 D", "site": "Test Site", "latitude": 37.4848, "longitude": -122.1472, "altitude": 30.5}' http://localhost:443/api/addSite
       *
       * @apiUse CallSuccess
       * @apiUse InvalidInputError
       */ 
      case 'addSite':
        var addSiteReq = new Controller_ttypes.AddSite();
        var site = new Topology_ttypes.Site();
        var location = new Topology_ttypes.Location();

        location.latitude = this._data.latitude;
        location.longitude = this._data.longitude;
        location.altitude = this._data.altitude;

        site.name = this._data.site;
        site.location = location
        addSiteReq.site = site;
        addSiteReq.write(tProtocol);
        transport.flush();
        break;
      /**
       * @api {post} /delSite Delete Site
       * @apiName DelSite
       * @apiGroup Topology
       *
       * @apiParam {String} topology Topology Name
       * @apiParam {String} site Site Name
       *
       * @apiExample {curl} Example:
       *    curl -id '{"topology": "Lab F8 D", "site": "Test Site"}' http://localhost:443/api/delSite
       *
       * @apiUse CallSuccess
       * @apiUse InvalidInputError
       */ 
      case 'delSite':
        var delSiteReq = new Controller_ttypes.DelSite();
        delSiteReq.siteName = this._data.site;
        delSiteReq.write(tProtocol);
        transport.flush();
        break;
      /**
       * @api {post} /rebootNode Reboot Node
       * @apiName RebootNode
       * @apiGroup Management
       *
       * @apiParam {String} topology Topology Name
       * @apiParam {String} node Site Name
       * @apiParam {Bool} force Force Reboot
       *
       * @apiExample {curl} Example:
       *    curl -id '{"topology": "Lab F8 D", "node": "terra114.f5.td.a404-if", "force": true}' http://localhost:443/api/rebootNode
       *
       * @apiUse CallSuccess
       * @apiUse InvalidInputError
       */ 
      case 'rebootNode':
        var rebootNode = new Controller_ttypes.RebootNode();
        rebootNode.forced = this._data.force;
        rebootNode.write(tProtocol);
        transport.flush();
        break;
      /**
       * @api {post} /getIgnitionState Get Ignition State
       * @apiName GetIgnitionState
       * @apiGroup Ignition
       *
       * @apiParam {String} topology Topology Name
       *
       * @apiExample {curl} Example:
       *    curl -id '{"topology": "Lab F8 D"}' http://localhost:443/api/getIgnitionState
       *
       * @apiSuccess {JSON} success IgnitionState from ControllerProxy.thrift
       * @apiSuccessExample {json} Success-Response:
       *
        {
            "igCandidates": [],
            "igParams": {
                "enable": true,
                "linkUpDampenInterval": {
                    "buffer": {
                        "data": [
                            0,
                            0,
                            0,
                            0,
                            0,
                            0,
                            0,
                            35
                        ],
                        "type": "Buffer"
                    },
                    "offset": 0
                },
                "linkUpInterval": {
                    "buffer": {
                        "data": [
                            0,
                            0,
                            0,
                            0,
                            0,
                            0,
                            0,
                            5
                        ],
                        "type": "Buffer"
                    },
                    "offset": 0
                },
                "link_auto_ignite": {}
            },
            "lastIgCandidate": {
                "initiatorNodeName": "terra123.f5.td.a404-if",
                "linkName": "link-terra114.f5.td.a404-if-terra123.f5.td.a404-if"
            },
            "visitedNodeNames": [
                "terra111.f5.td.a404-if",
                "terra212.f5.td.a404-if",
                "terra114.f5.td.a404-if",
                "terra211.f5.td.a404-if",
                "terra214.f5.td.a404-if",
                "terra123.f5.td.a404-if",
                "terra312.f5.td.a404-if",
                "terra223.f5.td.a404-if",
                "terra121.f5.td.a404-if",
                "terra314.f5.td.a404-if",
                "terra221.f5.td.a404-if",
                "terra222.f5.td.a404-if",
                "terra323.f5.td.a404-if",
                "terra322.f5.td.a404-if"
            ]
        }
       */ 
      case 'getIgnitionState':
        var getIgnitionStateReq = new Controller_ttypes.GetIgnitionState();
        getIgnitionStateReq.write(tProtocol);
        transport.flush();
        break;
      /**
       * @api {post} /setNetworkIgnitionState Set Network Ignition State
       * @apiName SetNetworkIgnitionState
       * @apiGroup Ignition
       *
       * @apiParam {String} topology Topology Name
       * @apiParam {Bool} enabled State of network-wide ignition
       *
       * @apiExample {curl} Example:
       *    curl -id '{"topology": "Lab F8 D", "enabled": true}' http://localhost:443/api/setNetworkIgnitionState
       *
       * @apiUse CallSuccess
       * @apiUse InvalidInputError
       */ 
      case 'setNetworkIgnitionState':
        var setIgnitionParamsReq = new Controller_ttypes.IgnitionParams();
        setIgnitionParamsReq.enable = this._data.enabled;
        setIgnitionParamsReq.write(tProtocol);
        transport.flush();
        break;
      /**
       * @api {post} /setLinkIgnitionState Set Link Ignition State
       * @apiName SetLinkIgnitionState
       * @apiGroup Ignition
       *
       * @apiParam {String} topology Topology Name
       * @apiParam {String} linkName Link Name
       * @apiParam {Bool} enabled State of ignition for linkt
       *
       * @apiExample {curl} Example:
       *    curl -id '{"topology": "Lab F8 D", "linkName": "link-terra121.f5.td.a404-if-terra222.f5.td.a404-if", "enabled": false}' http://localhost:443/api/setLinkIgnitionState
       *
       * @apiUse CallSuccess
       * @apiUse InvalidInputError
       */ 
      case 'setLinkIgnitionState':
        var setIgnitionParamsReq = new Controller_ttypes.IgnitionParams();
        setIgnitionParamsReq.link_auto_ignite = {};
        setIgnitionParamsReq.link_auto_ignite[this._data.linkName] = this._data.enabled;
        setIgnitionParamsReq.write(tProtocol);
        transport.flush();
        break;
    }
  }
}
module.exports = ApiLib;
