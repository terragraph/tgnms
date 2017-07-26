import React from 'react';
import { render } from 'react-dom';
import Modal from 'react-modal';
import swal from 'sweetalert';
import 'sweetalert/dist/sweetalert.css';
const _ = require('lodash');


const customModalStyle = {
  content : {
    top                   : '50%',
    left                  : '50%',
    right                 : 'auto',
    bottom                : 'auto',
    marginRight           : '-50%',
    transform             : 'translate(-50%, -50%)'
  }
};


export default class ModalCSVUpload extends React.Component {
  state = {
    enableSubmit: false,
    topology: {}
  };

  modalClose() {
    this.props.onClose();
  }

  uploadCSV() {
    let fileInput = document.getElementById("fileInput");
    let reader = new FileReader();
    let rows = [];

    reader.onload = function(e) {
      // Split on newlines and ignore the 2 header rows
      rows = reader.result.split(/\n/).slice(2);

      // Skeleton topology object that will be populated with CSV data
      let topology = {
        "name": null,
        "nodes": [],
        "links": [],
        "sites": [],
      };

      // nodesSeen - object with keys of sector
      // names and values of sector details
      let nodesSeen = {};
      let linksSeen = [];
      let sitesSeen = [];
      _.forEach(rows, function(row) {
        let column = row.split(",");
        if (column.length < 10) {
          swal({title: 'Invalid input', text: 'Row: ' + row.substr(0, 10)});
          return;
        }
        let rowDeets = {
          "localName": column[0],
          "localNode": column[0].split(".")[0].toLowerCase(),
          "localSector": column[0].split(".")[1].toLowerCase(),
          "localLat": parseFloat(column[1]),
          "localLong": parseFloat(column[2]),
          "localNodeType": column[3].toLowerCase(),
          "localPop": (column[4].toLowerCase() == 'yes'),
          "localElev": parseInt(column[5]),
          "remoteName": column[6],
          "remoteNode": column[6].split(".")[0].toLowerCase(),
          "remoteSector": column[6].split(".")[1].toLowerCase(),
          "remoteLat": parseFloat(column[7]),
          "remoteLong": parseFloat(column[8]),
          "remoteNodeType": column[9].toLowerCase(),
          "remotePop": (column[10].toLowerCase() == 'yes'),
          "remoteElev": parseInt(column[11]),
        };

        // NODES
        if (!(rowDeets['localName'] in nodesSeen)) {
          let node = {
            "name": rowDeets["localName"],
            "mac_addr": rowDeets["localMac"] || null,
            "site_name": rowDeets["localNode"],
            "pop_node": rowDeets["localPop"],
            "node_type": rowDeets["localNodeType"] == 'cn' ? 1 : 2,
            "polarity": null,
            "golay_idx": {
              "txGolayIdx": null,
              "rxGolayIdx": null
            }
          };
          topology["nodes"].push();
          nodesSeen[rowDeets['localName']] = node;
        }

        if (!(rowDeets['remoteName'] in nodesSeen)) {
          let node = {
            "name": rowDeets["remoteName"],
            "mac_addr": rowDeets["remoteMac"] || null,
            "site_name": rowDeets["remoteNode"],
            "pop_node": rowDeets["remotePop"],
            "node_type": rowDeets["remoteNodeType"] == 'cn' ? 1 : 2,
            "polarity": null,
            "golay_idx": {
              "txGolayIdx": null,
              "rxGolayIdx": null
            }
          };
          topology["nodes"].push(node);
          nodesSeen[rowDeets['remoteName']] = node;
        }

        // LINK
        let aEnd = null;
        let zEnd = null;
        if (rowDeets["localName"] < rowDeets["remoteName"]) {
          aEnd = nodesSeen[rowDeets['localName']];
          zEnd = nodesSeen[rowDeets['remoteName']];
        } else {
          aEnd = nodesSeen[rowDeets['remoteName']];
          zEnd = nodesSeen[rowDeets['localName']];
        }

        let linkName = "link-" + aEnd["name"] + "-" + zEnd["name"];
        if (_.indexOf(linksSeen, linkName) === -1) {
          topology["links"].push({
            "name": linkName,
            "a_node_name": aEnd["name"],
            "z_node_name": zEnd["name"],
            "link_type": 1, /* WIRELESS, ETHERNET */
            "is_alive": false
          });
          linksSeen.push(linkName);
        }
        // add ethernet connections in the same site

        // SITES
        if (_.indexOf(sitesSeen, rowDeets["localNode"]) === -1) {
          topology["sites"].push({
            "name": rowDeets["localNode"],
            "location":{
              "latitude": rowDeets["localLat"],
              "longitude": rowDeets["localLong"],
              "altitude": rowDeets["localElev"]
            }
          });
          sitesSeen.push(rowDeets["localNode"]);
        }

        if (_.indexOf(sitesSeen, rowDeets["remoteNode"]) === -1) {
          topology["sites"].push({
            "name": rowDeets["remoteNode"],
            "location":{
              "latitude": rowDeets["remoteLat"],
              "longitude": rowDeets["remoteLong"],
              "altitude": rowDeets["remoteElev"]
            }
          });
          sitesSeen.push(rowDeets["remoteNode"]);
        }

      });

      var jsonTopology = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(topology, 0, 4));
      var downloadElement = document.getElementById('downloadElement');
      downloadElement.setAttribute("href", jsonTopology);
      downloadElement.setAttribute("download", "topology.json");

      swal({
        title: "Topology generated!",
        text: "Topology successfully generated",
        type: "success"
      });

      downloadElement.click();
    };

    if (fileInput.files.length == 0) {
      swal({title: 'Select a file!'});
    } else {
      try {
        reader.readAsText(fileInput.files[0]);
      } catch (ex) {
        swal({title: 'Error uploading file'});
      }
    }
  }

  render() {
    var nodesVector = [];

    if (this.props.topology.nodes) {
      Object(this.props.topology.nodes).forEach(node => {
        nodesVector.push(
          {
            value: node.name,
            label: node.name
          },
        );
      });
    }

    return (
      <Modal
          isOpen={this.props.isOpen}
          onRequestClose={this.modalClose.bind(this)}
          style={customModalStyle}
          contentLabel="Example Modal">
        <table>
          <tbody>
          <tr className="blank_row"/>
          <tr>
            <td width={100}>CSV</td>
            <td>
              <input type="file" style={{float: 'right'}} id="fileInput"/>
            </td>
          </tr>
          <tr className="blank_row"/>
          <tr>
            <td width={100}/>
            <td>
              <button style={{float: 'right'}} className='graph-button' onClick={this.modalClose.bind(this)}>close</button>
              <button style={{float: 'right'}} className='graph-button' onClick={this.uploadCSV.bind(this)}>submit</button>
            </td>
          </tr>
          <tr>
            <td width={100}/>
            <td>
              <a id="downloadElement"/>
            </td>
          </tr>
          </tbody>
        </table>
      </Modal>
    );
  }
}
