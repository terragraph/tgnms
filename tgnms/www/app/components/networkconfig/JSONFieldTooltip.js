/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 */
'use strict';

const classNames = require('classnames');

import {CONFIG_LAYER_DESC} from '../../constants/NetworkConfigConstants.js';
import PropTypes from 'prop-types';
import {render} from 'react-dom';
import React from 'react';

const UNDEFINED_PLACEHOLDER = [
  <span className="nc-tooltip-undefined">No Base Version found</span>,
  <span className="nc-tooltip-undefined">Network Override not set</span>,
  <span className="nc-tooltip-undefined">Node Override not set</span>,
];

export default class JSONFieldTooltip extends React.Component {
  constructor(props) {
    super(props);
  }

  render() {
    const {values} = this.props;

    const tooltipContents = values.map((value, idx) => {
      let displayVal =
        value === undefined || value === null
          ? UNDEFINED_PLACEHOLDER[idx]
          : value;
      // boolean to strings...
      if (displayVal === true) {
        displayVal = 'true';
      } else if (displayVal === false) {
        displayVal = 'false';
      }

      return (
        <tr>
          <td>
            <span className="nc-tooltip-label">{CONFIG_LAYER_DESC[idx]}:</span>
          </td>
          <td>{displayVal}</td>
        </tr>
      );
    });

    return (
      <div className="rc-json-field-tooltip">
        <table>{tooltipContents}</table>
      </div>
    );
  }
}

JSONFieldTooltip.propTypes = {
  values: PropTypes.array.isRequired,
};
