/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 */
'use strict';

import {
  CONFIG_VIEW_MODE,
  CONFIG_CLASSNAMES,
} from '../../constants/NetworkConfigConstants.js';
import classNames from 'classnames';
import PropTypes from 'prop-types';
import {render} from 'react-dom';
import React from 'react';

// legend for the network config
export default class NetworkConfigLegend extends React.Component {
  static propTypes = {
    editMode: PropTypes.string.isRequired,
    onUpdate: PropTypes.func.isRequired,
  };

  state = {
    isExpanded: true,
  };

  networkLegendRef = React.createRef();

  componentDidMount() {
    this.props.onUpdate(this.networkLegendRef.current.clientHeight);
  }

  componentDidUpdate(prevProps, prevState) {
    // We send the height to <NetworkConfigNodes> to know what height to set the table to
    if (prevState.isExpanded !== this.state.isExpanded) {
      this.props.onUpdate(this.networkLegendRef.current.clientHeight);
    }
  }

  toggleExpandLegend = () => {
    this.setState({
      isExpanded: !this.state.isExpanded,
    });
  };

  renderNodeStatus() {
    return (
      <ul
        className="nc-legend-section"
        style={{listStyleType: 'none', padding: 0}}>
        <li className="nc-legend-inline-node-container">
          <div
            className={classNames('nc-inline-legend-node', 'nc-online-node')}>
            Online Node
          </div>
          <div
            className={classNames('nc-inline-legend-node', 'nc-offline-node')}>
            Offline Node
          </div>
        </li>
        <li className="nc-legend-node">
          Node with Unsaved Changes<img
            height="20"
            style={{float: 'right'}}
            src="/static/images/bullet_red.png"
          />
        </li>
        <li
          className={classNames('nc-legend-node', 'nc-node-with-override')}
          style={{fontWeight: 600}}>
          Node With Override
        </li>
      </ul>
    );
  }

  renderFieldLegend() {
    return (
      <div className={classNames('nc-json-field-legend', 'nc-legend-section')}>
        <input
          className={`config-form-input ${CONFIG_CLASSNAMES.BASE}`}
          type="text"
          value="Base Config"
        />
        <input
          className={`config-form-input ${CONFIG_CLASSNAMES.DRAFT}`}
          type="text"
          value="Unsaved Field"
        />
        <input
          className={`config-form-input ${CONFIG_CLASSNAMES.NETWORK}`}
          type="text"
          value="Network Override"
        />
        <input
          className={`config-form-input ${CONFIG_CLASSNAMES.NODE}`}
          type="text"
          value="Node Override"
        />
        <input
          className={`config-form-input ${CONFIG_CLASSNAMES.AUTO}`}
          type="text"
          value="Auto Override"
        />
        <input
          className={`config-form-input ${CONFIG_CLASSNAMES.REVERT}`}
          type="text"
          value="Field to Revert"
        />
      </div>
    );
  }

  render() {
    const {editMode} = this.props;
    const {isExpanded} = this.state;
    const expandMarker = isExpanded
      ? '/static/images/down-chevron.png'
      : '/static/images/up-chevron.png';

    const legendBody = (
      <div>
        <p className="nc-legend-heading">Node Status</p>
        {this.renderNodeStatus()}

        <p className="nc-legend-heading">Config Field</p>
        {this.renderFieldLegend()}
      </div>
    );

    return (
      <div className="rc-config-legend" ref={this.networkLegendRef}>
        <p
          className={classNames('nc-legend-title', {
            'nc-collapsed-title': !isExpanded,
          })}
          onClick={this.toggleExpandLegend}>
          Legend
          <img src={expandMarker} className="legend-expand-marker" />
        </p>
        {isExpanded && legendBody}
      </div>
    );
  }
}
