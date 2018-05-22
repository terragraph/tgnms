/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 */
'use strict';

import {CONFIG_LAYER_DESC} from '../../constants/NetworkConfigConstants.js';
import classNames from 'classnames';
import PropTypes from 'prop-types';
import {render} from 'react-dom';
import React from 'react';

const UNDEFINED_PLACEHOLDER = [
  <span className="nc-tooltip-undefined">No Base Version found</span>,
  <span className="nc-tooltip-undefined">Network Override not set</span>,
  <span className="nc-tooltip-undefined">Node Override not set</span>,
];

export default class JSONFieldTooltip extends React.Component {
  static propTypes = {
    metadata: PropTypes.object,
    configLayerValues: PropTypes.array.isRequired,
  };

  static defaultProps = {
    metadata: {},
  };

  constraint2English = {
    allowedRanges: 'Allowed Ranges: ',
    allowedValues: 'Allowed Values: ',
    regexMatches: 'Regex Matches: ',
    intRanges: 'Integer Ranges: ',
    floatRanges: 'Float Ranges',
  };

  renderValueConstraints() {
    const {metadata} = this.props;

    let constraintKeys = [];
    let constraints;

    switch (metadata.type) {
      case 'FLOAT':
        constraintKeys = ['allowedRanges', 'allowedValues'];
        constraints = metadata.floatVal;
        break;
      case 'INTEGER':
        constraintKeys = ['allowedRanges', 'allowedValues'];
        constraints = metadata.intVal;
        break;
      case 'STRING':
        constraintKeys = [
          'regexMatches',
          'intRanges',
          'floatRanges',
          'allowedValues',
        ];
        constraints = metadata.strVal;
        break;
    }

    if (!constraints) {
      return null;
    }

    const constraintElems = constraintKeys
      .filter(key => constraints.hasOwnProperty(key))
      .map(key => {
        let valueConstraints = constraints[key];

        if (Array.isArray(valueConstraints) && valueConstraints.length === 1) {
          valueConstraints = valueConstraints[0];
        }

        return (
          <div>
            <span className="nc-tooltip-label">
              {this.constraint2English[key]}
            </span>
            <span>{JSON.stringify(valueConstraints)}</span>
          </div>
        );
      });

    return (
      <div className="nc-tooltip-constraint-container">{constraintElems}</div>
    );
  }

  render() {
    const {metadata, configLayerValues} = this.props;

    const typePascalCase =
      metadata.type[0] + metadata.type.slice(1).toLowerCase();

    const configLayerContents = configLayerValues.map((value, idx) => {
      const displayVal = !value ? UNDEFINED_PLACEHOLDER[idx] : value;

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
        {metadata.required && <p className="nc-tooltip-label">REQUIRED</p>}
        {metadata.deprecated && (
          <p className="nc-tooltip-label nc-tooltip-deprecated">DEPRECATED</p>
        )}
        <div>
          <span className="nc-tooltip-label">Description:</span>
          {metadata.desc || 'N/A'}
        </div>
        <br />
        <div>
          <span className="nc-tooltip-label">Type:</span>
          {typePascalCase || 'N/A'}
        </div>
        <div>
          <span className="nc-tooltip-label">Action:</span>
          {metadata.action || 'N/A'}
        </div>
        {configLayerContents}
        {this.renderValueConstraints()}
      </div>
    );
  }
}

JSONFieldTooltip.propTypes = {
  values: PropTypes.array.isRequired,
};
