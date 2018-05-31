/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 */
'use strict';

// E2EConfigHeader.js
// contains the component to toggle between the Controller or Aggregator Config

import {changeConfigType} from '../../actions/NetworkConfigActions.js';
import {E2EConstants} from '../../constants/NetworkConstants.js';
import {DropdownButton, MenuItem} from 'react-bootstrap';
import PropTypes from 'prop-types';
import React from 'react';

export default class E2EConfigHeader extends React.Component {
  static propTypes = {
    activeConfig: PropTypes.string.isRequired,
  };

  onConfigMenuSelect(key) {
    changeConfigType(key);
  }

  renderHeader(title) {
    return <h3 className="nc-header-toggle-title">{title}</h3>;
  }

  render() {
    return (
      <div className="rc-network-config-header">
        <DropdownButton
          className="nc-header-toggle"
          id="e2e-config-dropdown"
          title={this.renderHeader(`${this.props.activeConfig} Config`)}>
          <MenuItem
            key={E2EConstants.Controller}
            onClick={() => this.onConfigMenuSelect(E2EConstants.Controller)}>
            <h4 className="nc-header-toggle-item">Controller Config</h4>
          </MenuItem>
          <MenuItem
            key={E2EConstants.Aggregator}
            onClick={() => this.onConfigMenuSelect(E2EConstants.Aggregator)}>
            <h4 className="nc-header-toggle-item">Aggregator Config</h4>
          </MenuItem>
        </DropdownButton>
      </div>
    );
  }
}
