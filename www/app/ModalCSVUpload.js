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

      let nodesSeen = [];
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
          "localPop": (column[3].toLowerCase() == 'yes'),
          "localElev": parseInt(column[4]),
          "remoteName": column[5],
          "remoteNode": column[5].split(".")[0].toLowerCase(),
          "remoteSector": column[5].split(".")[1].toLowerCase(),
          "remoteLat": parseFloat(column[6]),
          "remoteLong": parseFloat(column[7]),
          "remotePop": (column[8].toLowerCase() == 'yes'),
          "remoteElev": parseInt(column[9]),
        };

        // NODES
        if (_.indexOf(nodesSeen, rowDeets['localName']) === -1) {
          topology["nodes"].push({
            "name": rowDeets["localName"],
            "mac_addr": null,
            "site_name": rowDeets["localNode"],
            "pop_node": rowDeets["localPop"],
            "polarity": null,
            "golay_idx": {
              "txGolayIdx": null,
              "rxGolayIdx": null
            }
          });
          nodesSeen.push(rowDeets['localName']);
        }

        if (_.indexOf(nodesSeen, rowDeets['remoteName']) === -1) {
          topology["nodes"].push({
            "name": rowDeets["remoteName"],
            "mac_addr": null,
            "site_name": rowDeets["remoteNode"],
            "pop_node": rowDeets["remotePop"],
            "polarity": null,
            "golay_idx": {
              "txGolayIdx": null,
              "rxGolayIdx": null
            }
          });
          nodesSeen.push(rowDeets['remoteName']);
        }

        // LINK
        let aEnd = null;
        let zEnd = null;
        if (rowDeets["localName"] < rowDeets["remoteName"]) {
          aEnd = topology["nodes"][topology["nodes"].length - 2];
          zEnd = topology["nodes"][topology["nodes"].length - 1];
        } else {
          aEnd = topology["nodes"][topology["nodes"].length - 1];
          zEnd = topology["nodes"][topology["nodes"].length - 2];
        }

        let linkName = "link-" + aEnd["name"] + "-" + zEnd["name"];
        if (_.indexOf(linksSeen, linkName) === -1) {
          topology["links"].push({
            "name": linkName,
            "a_node_name": aEnd["name"],
            "z_node_name": zEnd["name"],
            "link_type": null,
            "is_alive": false
          });
          linksSeen.push(linkName);
        }

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
