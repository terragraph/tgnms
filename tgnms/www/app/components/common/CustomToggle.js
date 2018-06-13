/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 */
'use strict';

// CustomToggle.js
// custom toggle component (hides away a lot of raw html)

import cx from 'classnames';
import PropTypes from 'prop-types';
import {render} from 'react-dom';
import React from 'react';
export default class CustomToggle extends React.Component {
  static propTypes = {
    checkboxId: PropTypes.string.isRequired,
    tooltip: PropTypes.any,
    value: PropTypes.any.isRequired,

    onBlur: PropTypes.func,
    onChange: PropTypes.func.isRequired,
    onFocus: PropTypes.func,

    // optional style props
    selectorClass: PropTypes.any,
    wrapperStyle: PropTypes.object,
  };

  static defaultProps = {
    tooltip: null,

    onFocus: () => {},
    onBlur: () => {},

    selectorClass: 'nc-slider-option',
    wrapperStyle: {},
  };

  render() {
    // you only really need:
    // a checkboxId (for html and css reasons)
    // value
    // onChange
    const {
      checkboxId,
      value,
      tooltip,
      onChange,
      onFocus,
      onBlur,
      selectorClass,
      wrapperStyle,
    } = this.props;

    return (
      <div className="nc-form-input-wrapper">
        <input
          type="checkbox"
          className="nc-custom-checkbox"
          id={checkboxId}
          checked={value}
          onChange={event => onChange(event.target.checked)}
          onFocus={() => this.setState({focus: true})}
          onBlur={() => this.setState({focus: false})}
        />
        <label
          className="nc-slider-label"
          htmlFor={checkboxId}
          style={{marginBottom: '0px'}}>
          <div className="nc-slider-wrapper" style={wrapperStyle}>
            <div className="nc-slider-options">
              <div className={cx([selectorClass, 'yes'])}>Yes</div>
              <div className="nc-slider-option-selector" />
              <div className={cx([selectorClass, 'no'])}>No</div>
            </div>
          </div>
        </label>
        {tooltip}
      </div>
    );
  }
}
