/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 */
'use strict';

import {
  deleteFields,
  editConfigForm,
  revertConfigOverride,
  discardUnsavedConfig,
} from '../../actions/NetworkConfigActions.js';
import {CONFIG_CLASSNAMES} from '../../constants/NetworkConfigConstants.js';
import CustomToggle from '../common/CustomToggle.js';
import JSONFieldTooltip from './JSONFieldTooltip.js';
import classNames from 'classnames';
import PropTypes from 'prop-types';
import {Glyphicon} from 'react-bootstrap';
import React from 'react';
import isEqual from 'lodash-es/isEqual';

// JSONFormField renders the "leaf" nodes of a JSON form, namely: bool/string/number fields
// a separate component is needed for this to reduce the file size of JSONConfigForm
export default class JSONFormField extends React.Component {
  static propTypes = {
    editPath: PropTypes.array.isRequired,
    metadata: PropTypes.object,

    formLabel: PropTypes.string.isRequired, // the field name for the value we are displaying
    displayIdx: PropTypes.number.isRequired, // the index within values to display if not a draft
    configLayerValues: PropTypes.array.isRequired,
    isReverted: PropTypes.bool.isRequired,
    isDraft: PropTypes.bool.isRequired,
    isDeletable: PropTypes.bool.isRequired,
    displayVal: PropTypes.any.isRequired,
  };

  static defaultProps = {
    metadata: {},
    isDeletable: false,
  };

  state = {
    focus: false,
    hover: false,
    error: false,
  };

  componentDidMount() {
    this.validateField(this.props.displayVal);
  }

  componentDidUpdate(prevProps) {
    if (
      this.props.displayVal !== prevProps.displayVal ||
      !isEqual(this.props.metadata, prevProps.metadata)
    ) {
      this.validateField(this.props.displayVal);
    }
  }

  validateNumber(number, constraints) {
    if (number !== undefined && (typeof number !== 'number' || isNaN(number))) {
      return false;
    }

    const hasAllowedValues = constraints.hasOwnProperty('allowedValues');
    const hasAllowedRanges = constraints.hasOwnProperty('allowedRanges');

    let inAllowedValues = false;
    if (hasAllowedValues) {
      if (constraints.allowedValues.includes(number)) {
        inAllowedValues = true;
      }
    }

    let inAllowedRanges = false;
    if (hasAllowedRanges) {
      constraints.allowedRanges.forEach(range => {
        if (number >= range[0] && number <= range[1]) {
          inAllowedRanges = true;
        }
      });
    }

    return (
      (!hasAllowedValues && !hasAllowedRanges) ||
      (hasAllowedValues && inAllowedValues) ||
      (hasAllowedRanges && inAllowedRanges)
    );
  }

  validateString(string, constraints) {
    if (string !== undefined && typeof string !== 'string') {
      return false;
    }

    const hasAllowedValues = constraints.hasOwnProperty('allowedValues');
    const hasRanges =
      constraints.hasOwnProperty('intRanges') ||
      constraints.hasOwnProperty('floatRanges');

    let inAllowedValues = false;
    if (constraints.hasOwnProperty('allowedValues')) {
      if (constraints.allowedValues.includes(string)) {
        inAllowedValues = true;
      }
    }

    let inRanges = false;
    if (constraints.hasOwnProperty('intRanges')) {
      if (
        this.validateNumber(parseInt(string), {
          allowedRanges: constraints.intRanges,
        })
      ) {
        inRanges = true;
      }
    }

    if (constraints.hasOwnProperty('floatRanges')) {
      if (
        this.validateNumber(parseFloat(string), {
          allowedRanges: constraints.floatRanges,
        })
      ) {
        inRanges = true;
      }
    }

    // NOTE: Unable to validate regex since it is a C++ Regex String

    return (
      (!hasAllowedValues && !hasRanges) ||
      (hasAllowedValues && inAllowedValues) ||
      (hasRanges && inRanges)
    );
  }

  validateField(value) {
    const {metadata} = this.props;
    let error = false;

    switch (metadata.type) {
      case 'INTEGER':
        error =
          typeof value !== 'number' ||
          !this.validateNumber(parseInt(value), metadata.intVal || {});
        break;
      case 'FLOAT':
        error =
          typeof value !== 'number' ||
          !this.validateNumber(parseFloat(value), metadata.floatVal || {});
        break;
      case 'STRING':
        error =
          typeof value !== 'string' ||
          !this.validateString(value, metadata.strVal || {});
        break;
      case 'BOOLEAN':
        error = typeof value !== 'boolean';
        break;
    }

    this.setState({
      error,
    });
  }

  editField(value) {
    this.validateField(value);

    editConfigForm({
      editPath: this.props.editPath,
      value,
    });
  }

  revertField = () => {
    revertConfigOverride({
      editPath: this.props.editPath,
    });
  };

  deleteField = () => {
    deleteFields({
      editPaths: [this.props.editPath],
    });
  };

  discardUnsavedValue = () => {
    discardUnsavedConfig({
      editPath: this.props.editPath,
    });
  };

  getClassName(providedClass, displayIdx, isDraft, isReverted) {
    const className = {};
    className[providedClass] = true;

    className[CONFIG_CLASSNAMES.MISSING] = displayIdx < 0 && !isDraft;
    className[CONFIG_CLASSNAMES.BASE] = displayIdx === 0 && !isDraft;
    className[CONFIG_CLASSNAMES.NETWORK] = displayIdx === 1 && !isDraft;
    className[CONFIG_CLASSNAMES.NODE] = displayIdx >= 2 && !isDraft;

    className[CONFIG_CLASSNAMES.DRAFT] = isDraft;
    className[CONFIG_CLASSNAMES.REVERT] = isReverted;

    className.error = this.state.error;

    return classNames(className);
  }

  // hack: since we need the htmlFor and an id for the checkbox,
  renderToggle(displayVal, displayIdx, isDraft, isReverted) {
    const {metadata, configLayerValues} = this.props;
    const {focus, hover} = this.state;

    // or we can use a stringified version of the editPath for the id
    const checkboxId = JSON.stringify(this.props.editPath);
    const selectorClass = this.getClassName(
      'nc-slider-option',
      displayIdx,
      isDraft,
      false,
    );

    // style hack because the revert class cannot override the class for the wrapper
    const wrapperStyle = isReverted
      ? {
          border: '2px solid #000077',
        }
      : {};

    const tooltip =
      focus || hover ? (
        <JSONFieldTooltip
          metadata={metadata}
          configLayerValues={configLayerValues}
        />
      ) : null;

    return (
      <CustomToggle
        checkboxId={checkboxId}
        value={displayVal}
        tooltip={tooltip}
        disabled={isReverted || (metadata && metadata.deprecated)}
        onChange={value => this.editField(value)}
        onFocus={() => this.setState({focus: true})}
        onBlur={() => this.setState({focus: false})}
        selectorClass={selectorClass}
        wrapperStyle={wrapperStyle}
      />
    );
  }

  renderInputItem(displayVal, displayIdx, isDraft, isReverted) {
    const {metadata} = this.props;
    const {focus, hover} = this.state;

    let inputItem = (
      <span>Error: unable to render child val of {displayVal}</span>
    );

    const inputClass = this.getClassName(
      'config-form-input',
      displayIdx,
      isDraft,
      isReverted,
    );
    const checkboxClass = this.getClassName(
      'config-form-checkbox',
      displayIdx,
      isDraft,
      isReverted,
    );

    switch (typeof displayVal) {
      case 'boolean':
        inputItem = this.renderToggle(
          displayVal,
          displayIdx,
          isDraft,
          isReverted,
        );
        break;
      case 'number':
        inputItem = (
          <div className="nc-form-input-wrapper">
            <input
              className={inputClass}
              type="number"
              value={displayVal}
              disabled={isReverted || (metadata && metadata.deprecated)}
              onChange={event => this.editField(Number(event.target.value))}
              onFocus={() => this.setState({focus: true})}
              onBlur={() => this.setState({focus: false})}
            />
            {(focus || hover) && (
              <JSONFieldTooltip
                metadata={metadata}
                configLayerValues={this.props.configLayerValues}
              />
            )}
          </div>
        );
        break;
      case 'string':
        inputItem = (
          <div className="nc-form-input-wrapper">
            <input
              className={inputClass}
              type="text"
              value={displayVal}
              disabled={isReverted || (metadata && metadata.deprecated)}
              onChange={event => this.editField(event.target.value)}
              onFocus={() => this.setState({focus: true})}
              onBlur={() => this.setState({focus: false})}
            />
            {(focus || hover) && (
              <JSONFieldTooltip
                metadata={metadata}
                configLayerValues={this.props.configLayerValues}
              />
            )}
          </div>
        );
        break;
    }

    return inputItem;
  }

  isRevertable(displayIdx, configLayerValues) {
    return displayIdx === configLayerValues.length - 1;
  }

  render() {
    const {
      formLabel,
      displayIdx,
      configLayerValues,
      isReverted,
      isDraft,
      isDeletable,
      displayVal,
    } = this.props;
    const {focus, hover} = this.state;

    const formInputElement = this.renderInputItem(
      displayVal,
      displayIdx,
      isDraft,
      isReverted,
    );

    let removeIcon;

    if (!this.isRevertable(displayIdx, configLayerValues) || isDraft) {
      removeIcon = null;
    } else if (isDeletable) {
      removeIcon = (
        <div className="nc-form-action">
          <Glyphicon
            glyph="remove"
            style={{marginLeft: '5px'}}
            onClick={this.deleteField}
          />
          <span className="nc-form-action-tooltip">Remove field</span>
        </div>
      );
    } else {
      removeIcon = (
        <div className="nc-form-action">
          {
            <img
              src="/static/images/undo.png"
              style={{marginLeft: '5px'}}
              onClick={this.revertField}
            />
          }
          <span className="nc-form-action-tooltip">Remove override value</span>
        </div>
      );
    }

    return (
      <div
        className={classNames('rc-json-form-field', {
          'json-field-focused': focus || hover,
        })}
        onMouseEnter={() => this.setState({hover: true})}
        onMouseLeave={() => this.setState({hover: false})}>
        <label className="nc-form-label">{formLabel}:</label>

        <div className="nc-form-body">
          {formInputElement}
          {removeIcon}
          {(isReverted || isDraft) && (
            <div className="nc-form-action">
              <img
                src="/static/images/refresh.png"
                style={{marginLeft: '5px', height: '18px', width: '18px'}}
                onClick={this.discardUnsavedValue}
              />
              <span className="nc-form-action-tooltip">
                Discard unsaved value
              </span>
            </div>
          )}
        </div>
      </div>
    );
  }
}
