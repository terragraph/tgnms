import React from 'react';
import { render } from 'react-dom';
const classNames = require('classnames');

import { CONFIG_LAYER_DESC } from '../../constants/NetworkConfigConstants.js';

const UNDEFINED_PLACEHOLDER = [
  <span className='nc-tooltip-undefined'>No Base Version found</span>,
  <span className='nc-tooltip-undefined'>Network Override not set</span>,
  <span className='nc-tooltip-undefined'>Node Override not set</span>,
];

export default class JSONFieldTooltip extends React.Component {
  constructor(props) {
    super(props);
  }

  render() {
    const {values} = this.props;

    const tooltipContents = values.map((value, idx) => {
      const displayVal = (value === undefined || value === null) ? UNDEFINED_PLACEHOLDER[idx] : value;
      return (
        <tr>
          <td><span className='nc-tooltip-label'>{CONFIG_LAYER_DESC[idx]}:</span></td>
          <td>{displayVal}</td>
        </tr>
      );
    })

    return (
      <div className='rc-json-field-tooltip'>
        <table>
          {tooltipContents}
        </table>
      </div>
    );
  }
}

JSONFieldTooltip.propTypes = {
  values: React.PropTypes.array.isRequired,
}
