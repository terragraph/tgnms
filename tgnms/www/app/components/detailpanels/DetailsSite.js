/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 */
'use strict';

import 'sweetalert/dist/sweetalert.css';

import Dispatcher from '../../NetworkDispatcher.js';
import {
  availabilityColor,
  getPolarityString,
  polarityColor,
  uptimeSec,
} from '../../helpers/NetworkHelpers.js';

import {Actions} from '../../constants/NetworkConstants.js';
import {
  apiServiceRequest,
  getErrorTextFromE2EAck,
} from '../../apiutils/ServiceAPIUtil';
import {LinkType} from '../../../thrift/gen-nodejs/Topology_types';
import axios from 'axios';
import {Panel} from 'react-bootstrap';
import React from 'react';
import PropTypes from 'prop-types';
import swal from 'sweetalert';

export default class DetailsSite extends React.Component {
  static propTypes = {
    links: PropTypes.object.isRequired,
    maxHeight: PropTypes.number.isRequired,
    nodes: PropTypes.object.isRequired,
    site: PropTypes.object.isRequired,
    topologyName: PropTypes.string.isRequired,
    onClose: PropTypes.func.isRequired,
    onEnter: PropTypes.func.isRequired,
    onLeave: PropTypes.func.isRequired,
  };

  static getDerivedStateFromProps(props) {
    // Find Nodes and Links associated with the site
    if (props.site && props.nodes && props.links) {
      const siteNodesByName = {};

      Object.entries(props.nodes)
        .filter(([key, value]) => {
          return value.site_name === props.site.name;
        })
        .forEach(([key, value]) => (siteNodesByName[key] = value));

      const siteLinks = Object.entries(props.links)
        .filter(([key, value]) => {
          return (
            value.link_type === LinkType.WIRELESS &&
            (siteNodesByName[value.a_node_name] ||
              siteNodesByName[value.z_node_name])
          );
        })
        .map(([key, value]) => value);

      return {
        siteNodesByName,
        siteLinks,
      };
    }

    return null;
  }

  state = {
    siteNodesByName: {},
    siteLinks: [],
    showNodes: true,
    showLinks: true,
    showRuckus: true,
    showActions: true,
  };

  statusColor(onlineStatus, trueText = 'True', falseText = 'False') {
    return (
      <span style={{color: onlineStatus ? 'forestgreen' : 'firebrick'}}>
        {onlineStatus ? trueText : falseText}
      </span>
    );
  }

  selectLink = linkName => {
    const link = this.props.links[linkName];
    Dispatcher.dispatch({
      actionType: Actions.TAB_SELECTED,
      tabName: 'links',
    });
    setTimeout(() => {
      Dispatcher.dispatch({
        actionType: Actions.LINK_SELECTED,
        link,
        source: 'map',
      });
    }, 1);
  };

  selectNode(nodeName) {
    Dispatcher.dispatch({
      actionType: Actions.TAB_SELECTED,
      tabName: 'nodes',
    });
    setTimeout(() => {
      Dispatcher.dispatch({
        actionType: Actions.NODE_SELECTED,
        nodeSelected: nodeName,
        source: 'map',
      });
    }, 1);
  }

  addSite = () => {
    const {site, topologyName} = this.props;
    const data = {
      site,
    };
    swal(
      {
        title: 'Are you sure?',
        text: 'You are adding a site to this topology!',
        type: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#DD6B55',
        confirmButtonText: 'Confirm',
        closeOnConfirm: false,
      },
      () => {
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
      },
    );
  };

  editSite = () => {
    const {site} = this.props;

    Dispatcher.dispatch({
      actionType: Actions.START_SITE_EDIT,
      siteName: site.name,
    });
  };

  deleteSite = () => {
    swal(
      {
        title: 'Are you sure?',
        text: 'You will not be able to recover this site!',
        type: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#DD6B55',
        confirmButtonText: 'Confirm',
        closeOnConfirm: false,
      },
      () => {
        return new Promise((resolve, reject) => {
          const data = {
            siteName: this.props.site.name,
          };
          apiServiceRequest(this.props.topologyName, 'delSite', data)
            .then(response =>
              swal(
                {
                  title: 'Site Deleted!',
                  text: 'Response: ' + response.data.message,
                  type: 'success',
                },
                () => {
                  Dispatcher.dispatch({
                    actionType: Actions.CLEAR_NODE_LINK_SELECTED,
                  });
                  resolve();
                },
              ),
            )
            .catch(error =>
              swal(
                {
                  title: 'Failed!',
                  text:
                    'Site deletion failed\nReason: ' +
                    getErrorTextFromE2EAck(error),
                  type: 'error',
                },
                () => resolve(),
              ),
            );
        });
      },
    );
  };

  formatGolay(golayIdx) {
    return golayIdx || 'N/A';
  }

  genNodeType(nodeType, isPrimary) {
    let type = nodeType === 1 ? 'CN ' : 'DN ';
    type += isPrimary ? '(Primary)' : '(Secondary)';
    return type;
  }

  onHeadingClick(showTable) {
    const show = this.state[showTable];
    this.setState({[showTable]: !show});
  }

  renderNodeRows(siteNodes) {
    return siteNodes.map(node => {
      let txGolayIdx = null;
      let rxGolayIdx = null;
      if (node.golay_idx) {
        txGolayIdx = node.golay_idx.txGolayIdx;
        rxGolayIdx = node.golay_idx.rxGolayIdx;
      }

      return (
        <tr key={node.name}>
          <td>
            <span
              className="details-link"
              onClick={() => this.selectNode(node.name)}>
              {this.statusColor(
                node.status === 2 || node.status === 3,
                node.name,
                node.name,
              )}
            </span>
          </td>
          <td>{this.genNodeType(node.node_type, node.is_primary)}</td>
          <td>
            <span style={{color: polarityColor(node.polarity)}}>
              {getPolarityString(node.polarity)}
            </span>
          </td>
          <td title="txGolayIdx">{this.formatGolay(txGolayIdx)}</td>
          <td title="rxGolayIdx">{this.formatGolay(rxGolayIdx)}</td>
        </tr>
      );
    });
  }

  render() {
    const {
      links,
      maxHeight,
      nodes,
      onClose,
      onEnter,
      onLeave,
      site,
      topologyName,
    } = this.props;

    const {siteLinks, siteNodesByName} = this.state;

    if (!site || !site.name) {
      return null;
    }

    // average availability of all links across site
    let avgAlivePerc = 0;

    // Create link stats (availability)
    const linksRows = siteLinks.map(link => {
      const alivePerc = link.hasOwnProperty('alive_perc')
        ? link.alive_perc.toFixed(3)
        : 0;

      avgAlivePerc += alivePerc;
      return (
        <tr key={link.name}>
          <td>
            <span
              className="details-link"
              onClick={() => {
                this.selectLink(link.name);
              }}>
              {this.statusColor(link.is_alive, link.name, link.name)}
            </span>
          </td>
          <td>
            <span style={{color: availabilityColor(alivePerc)}}>
              {alivePerc}%
            </span>
          </td>
          <td>
            <span>{link.angle.toFixed(2)}&deg;</span>
          </td>
          <td>
            <span>{link.distance.toFixed(2)} m</span>
          </td>
        </tr>
      );
    });

    avgAlivePerc = (avgAlivePerc / siteLinks.length).toFixed(3);

    const ruckusRow = site.hasOwnProperty('ruckus') ? (
      <tr key="ruckus">
        <td>Ruckus Access Point</td>
        <td>{site.ruckus.clientCount} clients</td>
        <td>{uptimeSec(site.ruckus.uptime)}</td>
        <td>{site.ruckus.connectionState}</td>
        <td>{site.ruckus.registrationState}</td>
      </tr>
    ) : null;

    const actionsList =
      site.hasOwnProperty('pending') && site.pending ? (
        <div className="details-link" onClick={this.addSite}>
          Add Site
        </div>
      ) : (
        [
          <div key="edit-site" className="details-link" onClick={this.editSite}>
            Edit Site
          </div>,
          <div
            key="delete-site"
            className="details-link"
            onClick={this.deleteSite}>
            Delete Site
          </div>,
        ]
      );

    return (
      <Panel id="myModal" onMouseEnter={onEnter} onMouseLeave={onLeave}>
        <Panel.Heading>
          <span className="details-close" onClick={onClose}>
            &times;
          </span>
          <Panel.Title componentClass="h3">
            {site.pending ? '(Pending) ' : ''}Site Details
          </Panel.Title>
        </Panel.Heading>
        <Panel.Body className="details" style={{maxHeight, width: '100%'}}>
          <div>
            <h3 style={{marginTop: '0px'}}>{site.name}</h3>
            <table
              className="details-table"
              style={{width: '100%', border: '0px solid black'}}>
              <tbody>
                <tr>
                  <td width="100px">Lat / Lng</td>
                  <td colSpan="2">
                    {`${site.location.latitude.toFixed(
                      2,
                    )} / ${site.location.longitude.toFixed(2)}`}
                  </td>
                </tr>
                <tr>
                  <td width="100px">Altitude</td>
                  <td colSpan="3">{site.location.altitude} m</td>
                </tr>
                {site.location.accuracy !== undefined &&
                  site.location.accuracy !== null && (
                    <tr>
                      <td width="100px">Accuracy</td>
                      <td colSpan="3">{site.location.accuracy} m</td>
                    </tr>
                  )}
                <tr>
                  <td width="100px">Availability</td>
                  <td colSpan="6">
                    <span style={{color: availabilityColor(avgAlivePerc)}}>
                      {isNaN(avgAlivePerc) ? 'N/A' : `${avgAlivePerc}%`}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <div>
            <h4
              className="details-heading"
              onClick={() => {
                this.onHeadingClick('showNodes');
              }}>
              Nodes
            </h4>
            {this.state.showNodes && (
              <table className="details-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Type</th>
                    <th>Polarity</th>
                    <th>Tx Golay</th>
                    <th>Rx Golay</th>
                  </tr>
                </thead>
                <tbody>
                  {this.renderNodeRows(Object.values(siteNodesByName))}
                </tbody>
              </table>
            )}
          </div>
          <div>
            <h4
              className="details-heading"
              onClick={() => {
                this.onHeadingClick('showLinks');
              }}>
              Links
            </h4>
            {this.state.showLinks && (
              <table className="details-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Availability</th>
                    <th>Azimuth</th>
                    <th>Length</th>
                  </tr>
                </thead>
                <tbody>{linksRows}</tbody>
              </table>
            )}
          </div>
          {site.hasOwnProperty('ruckus') && (
            <div>
              <h4
                className="details-heading"
                onClick={() => {
                  this.onHeadingClick('showRuckus');
                }}>
                Ruckus
              </h4>
              {this.state.showRuckus && (
                <table className="details-table">
                  <tbody>{ruckusRow}</tbody>
                </table>
              )}
            </div>
          )}
          <div>
            <h4
              className="details-heading"
              onClick={() => {
                this.onHeadingClick('showActions');
              }}>
              Actions
            </h4>
            {this.state.showActions && (
              <div className="details-action-list">{actionsList}</div>
            )}
          </div>
        </Panel.Body>
      </Panel>
    );
  }
}
