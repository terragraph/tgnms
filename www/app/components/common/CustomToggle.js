// CustomToggle.js
// custom toggle component (hides away a lot of raw html)

import React from 'react';
import { render } from 'react-dom';

const classNames = require('classnames');
export default class CustomToggle extends React.Component {
  constructor(props) {
    super(props);
  }

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
      <div className='nc-form-input-wrapper'>
        <input
          type='checkbox' className='nc-custom-checkbox' id={checkboxId} checked={value}
          onChange={(event) => onChange(event.target.checked)}
          onFocus={() => this.setState({focus: true})} onBlur={() => this.setState({focus: false})}
        />
        <label className='nc-slider-label' htmlFor={checkboxId} style={{marginBottom: '0px'}}>
          <div className='nc-slider-wrapper' style={wrapperStyle}>
            <div className='nc-slider-options'>
              <div className={selectorClass}>Yes</div>
              <div className='nc-slider-option-selector'></div>
              <div className={selectorClass}>No</div>
            </div>
          </div>
        </label>
        {tooltip}
      </div>
    );
  }
}

// add is handled by the parent
CustomToggle.propTypes = {
  checkboxId: React.PropTypes.string.isRequired,
  value: React.PropTypes.any.isRequired,
  tooltip: React.PropTypes.any,

  onChange: React.PropTypes.func.isRequired,
  onFocus: React.PropTypes.func,
  onBlur: React.PropTypes.func,

  // optional style props
  selectorClass: React.PropTypes.any,
  wrapperStyle: React.PropTypes.object,
}

CustomToggle.defaultProps = {
  tooltip: null,
  onFocus: () => {},
  onBlur: () => {},
  selectorClass: 'nc-slider-option',
  wrapperStyle: {},
}
