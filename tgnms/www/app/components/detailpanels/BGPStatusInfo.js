/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 */
'use strict';

import cx from 'classnames';
import {forIn} from 'lodash-es';
import React from 'react';
import PropTypes from 'prop-types';

class BGPRouteInfo extends React.PureComponent {
  static propTypes = {
    name: PropTypes.string.isRequired,
    routes: PropTypes.shape({
      network: PropTypes.string.isRequired,
      nextHop: PropTypes.string.isRequired,
    }).isRequired,
  };

  render() {
    const {name, routes} = this.props;
    return routes.map((routeInfo, index) => (
      <tr>
        {/* Render the label if it's the first table row */}
        {index === 0 && <td rowSpan={routes.length}>{name}</td>}
        <td>{routeInfo.network}</td>
        <td>{routeInfo.nextHop}</td>
      </tr>
    ));
  }
}

export default class BGPStatusInfo extends React.PureComponent {
  static propTypes = {
    bgpStatus: PropTypes.object.isRequired,
    onBgpNeighborHeaderClick: PropTypes.func.isRequired,
    hiddenBgpNeighbors: PropTypes.instanceOf(Set).isRequired,
  };

  render() {
    const bgpStatusInfo = [];
    forIn(this.props.bgpStatus, (neighborInfo, neighborIp) => {
      bgpStatusInfo.push(
        <div className="bgp-neighbor-info" key={neighborIp}>
          <div
            className="bgp-neighbor-header"
            onClick={() => this.props.onBgpNeighborHeaderClick(neighborIp)}>
            <div
              className={cx({
                status: true,
                online: neighborInfo.online,
                offline: !neighborInfo.online,
              })}
            />
            <strong>{neighborIp}</strong>
          </div>
          {!this.props.hiddenBgpNeighbors.has(neighborIp) && (
            <div>
              <table className="details-table">
                <tbody>
                  <tr>
                    <td>Status</td>
                    <td colSpan={2}>
                      {neighborInfo.online ? 'Established' : 'Disconnected'}
                    </td>
                  </tr>
                  <tr>
                    <td>
                      {isNaN(neighborInfo.stateOrPfxRcd)
                        ? 'State'
                        : 'Received Prefixes'}
                    </td>
                    <td colSpan={2}>{neighborInfo.stateOrPfxRcd}</td>
                  </tr>
                  <tr>
                    <td>ASN</td>
                    <td colSpan={2}>{neighborInfo.asn}</td>
                  </tr>
                  <tr>
                    <td>Up / Down Time</td>
                    <td colSpan={2}>{neighborInfo.upDownTime}</td>
                  </tr>
                </tbody>
              </table>
              {neighborInfo.online && (
                <table className="details-table bgp-route-info">
                  <thead>
                    <tr>
                      <th>Routes</th>
                      <th>Network</th>
                      <th>Next Hop</th>
                    </tr>
                  </thead>
                  <tbody>
                    <BGPRouteInfo
                      name="Advertised Routes"
                      routes={neighborInfo.advertisedRoutes}
                    />
                    <BGPRouteInfo
                      name="Received Routes"
                      routes={neighborInfo.receivedRoutes}
                    />
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>,
      );
    });

    return bgpStatusInfo;
  }
}
