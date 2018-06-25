/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 */
'use strict';

import Dispatcher from '../../NetworkDispatcher.js';
import {Actions} from '../../constants/NetworkConstants.js';
import {Panel} from 'react-bootstrap';
import {render} from 'react-dom';
import NumericInput from 'react-numeric-input';
import React from 'react';
import PropTypes from 'prop-types';

export default class DetailsCreateOrEditSite extends React.Component {
  static propTypes = {
    editing: PropTypes.bool.isRequired, // Edit Mode or Create Mode
    maxHeight: PropTypes.number.isRequired,
    onClose: PropTypes.func.isRequired,
    onMouseEnter: PropTypes.func.isRequired,
    onMouseLeave: PropTypes.func.isRequired,
    onSaveSite: PropTypes.func.isRequired,
    onSiteUpdate: PropTypes.func.isRequired,
    site: PropTypes.object.isRequired,
  };

  onEditSiteInfo = (attribute, value) => {
    const newSite = {...this.props.site};
    const newSiteLocation = newSite.location;

    let changed = false;

    if (attribute === 'name') {
      changed = newSite[attribute] !== value;
      newSite[attribute] = value;
    } else {
      changed = newSiteLocation[attribute] !== value;
      // All location attributes are numbers
      newSiteLocation[attribute] = value !== null ? value : 0;
    }

    if (changed) {
      this.props.onSiteUpdate({
        ...newSite,
        location: newSiteLocation,
      });
    }
  };

  render() {
    const {
      editing,
      maxHeight,
      topologyName,
      onClose,
      onMouseEnter,
      onMouseLeave,
      onSaveSite,
      onSiteUpdate,
      site,
    } = this.props;

    return (
      <Panel
        bsStyle="primary"
        id="CreateEditSiteModal"
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}>
        <Panel.Heading>
          <Panel.Title componentClass="h3">
            {editing ? 'Edit Site' : 'Planned Site'}
          </Panel.Title>
        </Panel.Heading>
        <Panel.Body className="details" style={{maxHeight}}>
          <table className="details-table create-edit-site">
            <tbody>
              <tr>
                <td>Name</td>
                <td>
                  <input
                    className="form-control name-input"
                    type="text"
                    value={site.name}
                    onChange={event =>
                      this.onEditSiteInfo('name', event.target.value)
                    }
                  />
                </td>
              </tr>
              <tr>
                <td>Latitude</td>
                <td>
                  <NumericInput
                    className="form-control"
                    style={false}
                    value={site.location.latitude}
                    precision={10}
                    onChange={value => this.onEditSiteInfo('latitude', value)}
                  />
                </td>
              </tr>
              <tr>
                <td>Longitude</td>
                <td>
                  <NumericInput
                    className="form-control"
                    style={false}
                    value={site.location.longitude}
                    precision={10}
                    onChange={value => this.onEditSiteInfo('longitude', value)}
                  />
                </td>
              </tr>
              <tr>
                <td>Altitude</td>
                <td>
                  <NumericInput
                    className="form-control"
                    style={false}
                    value={site.location.altitude}
                    precision={3}
                    onChange={value => this.onEditSiteInfo('altitude', value)}
                  />
                </td>
              </tr>
              {(editing || site.location.hasOwnProperty('accuracy')) && (
                <tr>
                  <td>Accuracy</td>
                  <td>
                    <NumericInput
                      className="form-control"
                      style={false}
                      value={site.location.accuracy}
                      precision={3}
                      onChange={value => this.onEditSiteInfo('accuracy', value)}
                    />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          <div className="details-button-panel">
            <button className="graph-button" onClick={() => onSaveSite(site)}>
              {editing ? 'Save Changes' : 'Create Site'}
            </button>
            <button className="graph-button" onClick={onClose}>
              {editing ? 'Discard Changes' : 'Discard Site'}
            </button>
          </div>
        </Panel.Body>
      </Panel>
    );
  }
}
