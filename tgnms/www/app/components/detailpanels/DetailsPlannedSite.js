/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 */
'use strict';

import 'sweetalert/dist/sweetalert.css';

import Dispatcher from '../../NetworkDispatcher.js';
import {
  apiServiceRequest,
  getErrorTextFromE2EAck,
} from '../../apiutils/ServiceAPIUtil';
import {Actions} from '../../constants/NetworkConstants.js';
import {Panel} from 'react-bootstrap';
import {render} from 'react-dom';
import NumericInput from 'react-numeric-input';
import React from 'react';
import swal from 'sweetalert';

export default class DetailsPlannedSite extends React.Component {
  constructor(props) {
    super(props);
  }

  commitSite() {
    const {site, topologyName} = this.props;
    swal(
      {
        title: 'Are you sure?',
        text: 'You are adding a site to this topology!',
        type: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#DD6B55',
        confirmButtonText: 'Yes, add it!',
        closeOnConfirm: false,
      },
      () => {
        const data = {
          site,
        };
        apiServiceRequest(topologyName, 'addSite', data)
          .then(response =>
            swal({
              title: 'Site Added!',
              text: 'Response: ' + response.data.message,
              type: 'success',
            }),
          )
          .catch(error =>
            swal({
              title: 'Failed!',
              text:
                'Adding a site failed\nReason: ' +
                getErrorTextFromE2EAck(error),
              type: 'error',
            }),
          );
        this.props.onClose();
      },
    );
  }

  somethingChanged(source, val) {
    const plannedSite = this.props.site;
    let changed = false;
    const location = plannedSite.location;
    switch (source) {
      case 'name':
        changed = plannedSite.name != val.target.value;
        plannedSite.name = val.target.value;
        break;
      case 'lat':
        changed = location.latitude != val;
        location.latitude = val;
        break;
      case 'long':
        changed = location.longitude != val;
        location.longitude = val;
        break;
      case 'alt':
        changed = location.altitude != val;
        location.altitude = val;
        break;
    }
    if (changed) {
      this.props.onUpdate({
        ...plannedSite,
        location,
      });
    }
  }

  render() {
    return (
      <Panel
        bsStyle="primary"
        id="myModal"
        onMouseEnter={this.props.onEnter}
        onMouseLeave={this.props.onLeave}>
        <Panel.Heading>
          <Panel.Title componentClass="h3">Planned Site</Panel.Title>
        </Panel.Heading>
        <Panel.Body
          className="details"
          style={{maxHeight: this.props.maxHeight, width: '100%'}}>
          <table className="details-table" style={{width: '100%'}}>
            <tbody>
              <tr>
                <td width={100}>Name</td>
                <td>
                  <input
                    style={{width: '100%', height: '34px'}}
                    type="text"
                    value={this.props.site.name}
                    onChange={this.somethingChanged.bind(this, 'name')}
                  />
                </td>
              </tr>
              <tr>
                <td width={100}>Latitude</td>
                <td>
                  <NumericInput
                    className="form-control"
                    style={false}
                    value={this.props.site.location.latitude}
                    precision={10}
                    onChange={this.somethingChanged.bind(this, 'lat')}
                  />
                </td>
              </tr>
              <tr>
                <td width={100}>Longitude</td>
                <td>
                  <NumericInput
                    className="form-control"
                    style={false}
                    value={this.props.site.location.longitude}
                    precision={10}
                    onChange={this.somethingChanged.bind(this, 'long')}
                  />
                </td>
              </tr>
              <tr>
                <td width={100}>Altitude</td>
                <td>
                  <NumericInput
                    className="form-control"
                    style={false}
                    value={this.props.site.location.altitude}
                    precision={10}
                    onChange={this.somethingChanged.bind(this, 'alt')}
                  />
                </td>
              </tr>
              <tr>
                <td width={100} />
                <td>
                  <button
                    style={{float: 'right'}}
                    className="graph-button"
                    onClick={this.commitSite.bind(this)}>
                    Commit Site
                  </button>
                  <button
                    style={{float: 'right'}}
                    className="graph-button"
                    onClick={this.props.onClose}>
                    Discard Site
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </Panel.Body>
      </Panel>
    );
  }
}
