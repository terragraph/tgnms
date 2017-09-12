import React from 'react';
import { render } from 'react-dom';
import { Actions } from '../../NetworkConstants.js';
import Dispatcher from '../../NetworkDispatcher.js';
import NumericInput from 'react-numeric-input';
import swal from 'sweetalert';
import 'sweetalert/dist/sweetalert.css';

export default class DetailsPlannedSite extends React.Component {

  constructor(props) {
    super(props);
  }

  commitSite() {
    let newSite = {
      name: this.props.site.name,
      lat: this.props.site.lat,
      long: this.props.site.long,
      alt: this.props.site.alt
    }
    let postData = {
      "topology": this.props.topologyName,
      "newSite": newSite
    }
    swal({
      title: "Are you sure?",
      text: "You are adding a site to this topology!",
      type: "warning",
      showCancelButton: true,
      confirmButtonColor: "#DD6B55",
      confirmButtonText: "Yes, add it!",
      closeOnConfirm: false
    },
    function(){
      var request = new XMLHttpRequest();
      request.onload = function() {
        if (!request) {
          return;
        }
        if (request.status == 200) {
          swal({
            title: "Site Added!",
            text: "Response: "+request.statusText,
            type: "success"
          });
        } else {
          swal({
            title: "Failed!",
            text: "Adding a site failed\nReason: "+request.statusText,
            type: "error"
          });
        }
      }.bind(this);
      try {
        request.open('POST', '/controller/addSite', true);
        request.send(JSON.stringify(postData));
      } catch (e) {}
      this.props.onClose();
    }.bind(this));
  }

  somethingChanged(source, val) {
    let plannedSite = this.props.site;
    let changed = false;
    switch (source) {
      case "name":
        changed = plannedSite.name != val.target.value;
        plannedSite.name = val.target.value;
        break;
      case "lat":
        changed = plannedSite.lat != val;
        plannedSite.lat = val;
        break;
      case "long":
        changed = plannedSite.long != val;
        plannedSite.long = val;
        break;
      case "alt":
        changed = plannedSite.alt != val;
        plannedSite.alt = val;
        break;
    }
    if (changed) {
      this.props.onUpdate(plannedSite);
    }
  }

  render() {
    if (!this.props.site || !this.props.site.name) {
        return (<div/>);
    }

    return (
      <div id="myModal" className="details">
        <div className="details-content">
          <div className="details-header">
            <h3 style={{marginTop: "0px"}}>Planned Site</h3>
          </div>
          <div className="details-body" style={{maxHeight: this.props.maxHeight}}>
            <table className="details-table" style={{width: '100%'}}>
              <tbody>
                <tr>
                  <td width={100}>Name</td>
                  <td>
                    <input style={{'width': '100%', 'height': '34px'}} type="text" value={this.props.site.name} onChange={this.somethingChanged.bind(this, "name")} />
                  </td>
                </tr>
                <tr>
                  <td width={100}>Latitude</td>
                  <td>
                    <NumericInput
                      className="form-control"
                      style={ false }
                      value={this.props.site.lat}
                      precision={10}
                      onChange={this.somethingChanged.bind(this, "lat")} />
                  </td>
                </tr>
                <tr>
                <td width={100}>Longitude</td>
                <td>
                  <NumericInput
                    className="form-control"
                    style={ false }
                    value={this.props.site.long}
                    precision={10}
                    onChange={this.somethingChanged.bind(this, "long")} />
                </td>
                </tr>
                <tr>
                <td width={100}>Altitude</td>
                <td>
                  <NumericInput
                    className="form-control"
                    style={ false }
                    value={this.props.site.alt}
                    precision={10}
                    onChange={this.somethingChanged.bind(this, "alt")} />
                </td>
                </tr>
                <tr>
                  <td width={100}/>
                  <td>
                    <button style={{float: 'right'}} className='graph-button' onClick={this.commitSite.bind(this)}>Commit Site</button>
                    <button style={{float: 'right'}} className='graph-button' onClick={this.props.onClose}>Discard Site</button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }
}
