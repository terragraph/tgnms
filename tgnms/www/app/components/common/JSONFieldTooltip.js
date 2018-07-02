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
          <div key={key}>
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

    const typePascalCase = metadata.hasOwnProperty('type')
      ? metadata.type[0] + metadata.type.slice(1).toLowerCase()
      : 'N/A';

    const hasOverrides =
      (configLayerValues[1] !== undefined && configLayerValues[1] !== null) ||
      (configLayerValues[2] !== undefined && configLayerValues[2] !== null) ||
      (configLayerValues[3] !== undefined && configLayerValues[3] !== null);

    const configLayerContents = configLayerValues
      .map((value, idx) => {
        if (value === undefined || value === null) {
          return null;
        }

        const displayVal = value === '' ? '(Empty String)' : value.toString();

        return (
          <div key={`${CONFIG_LAYER_DESC[idx]}-${displayVal}`}>
            <span className="nc-tooltip-label">{CONFIG_LAYER_DESC[idx]}:</span>
            <span className="nc-tooltip-value">{displayVal}</span>
          </div>
        );
      })
      .filter(element => element); // Filter needs to be after cause indices are required for the map

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
          {typePascalCase}
        </div>
        <div>
          <span className="nc-tooltip-label">Action:</span>
          <em>{metadata.action || 'NO_ACTION'}</em>
        </div>
        {hasOverrides && [<br />, ...configLayerContents]}
        {this.renderValueConstraints()}
      </div>
    );
  }
}

JSONFieldTooltip.propTypes = {
  metadata: PropTypes.object,
  configLayerValues: PropTypes.array.isRequired,
};
