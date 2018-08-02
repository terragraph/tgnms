/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 */
'use strict';

import {changeConfigType} from '../../actions/NetworkConfigActions.js';
import {E2E} from '../../constants/NetworkConstants.js';
import PropTypes from 'prop-types';
import React from 'react';
import Select from 'react-select';

const e2eOptions = Object.values(E2E).map(value => ({
  value,
  label: value,
}));

export default class E2EConfigHeader extends React.Component {
  static propTypes = {
    activeConfig: PropTypes.string.isRequired,
  };

  onConfigMenuSelect(option) {
    changeConfigType(option.value);
  }

  render() {
    return (
      <div className="rc-config-header">
        <Select
          className="nc-header-toggle"
          defaultValue={E2E.PrimaryController}
          clearable={false}
          searchable={false}
          value={this.props.activeConfig}
          onChange={this.onConfigMenuSelect}
          options={e2eOptions}
        />
      </div>
    );
  }
}
