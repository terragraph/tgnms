import React from 'react';
import { render } from 'react-dom';

const classNames = require('classnames');

import { CONFIG_VIEW_MODE, CONFIG_CLASSNAMES } from '../../constants/NetworkConfigConstants.js';


// legend for the network config
// big mess of css and html
export default class NetworkConfigLegend extends React.Component {
  constructor(props) {
    super(props);
  }

  renderNodeStatus = () => {
    return (
      <ul className='nc-legend-section' style={{listStyleType: 'none', padding: 0}}>
        <li className='nc-legend-node'>
          Unsaved Node<img height='20' style={{float: 'right'}} src='/static/images/bullet_red.png'/>
        </li>
        <li className='nc-legend-node' style={{backgroundColor: '#aaffaa'}}>
          Node With Override
        </li>
      </ul>
    );
  }

  renderFieldOperations = () => {
    return (
      <div className='nc-legend-section'>
        <table className='nc-field-op-legend'><tr>
          <td className='nc-field-op-desc'>Remove Override</td>
          <td><img src='/static/images/undo.png'/></td>
        </tr><tr>
          <td className='nc-field-op-desc'>Discard Unsaved Value</td>
          <td><img src='/static/images/refresh.png'/></td>
        </tr></table>
      </div>
    );
  }

  renderFieldLegend = () => {
    return (
      <div className={classNames('nc-json-field-legend', 'nc-legend-section')}>
        <table><tr>
          <td><input className={CONFIG_CLASSNAMES.BASE} type='text' value='Base Config'/></td>
          <td><input className={CONFIG_CLASSNAMES.DRAFT} type='text' value='Unsaved Field'/></td>
        </tr><tr>
          <td><input className={CONFIG_CLASSNAMES.NETWORK} type='text' value='Network Override'/></td>
          <td><input className={CONFIG_CLASSNAMES.REVERT} type='text' value='Field to Revert'/></td>
        </tr><tr>
          <td><input className={CONFIG_CLASSNAMES.NODE} type='text' value='Node Override'/></td>
          <td></td>
        </tr></table>
      </div>
    );
  }

  render() {
    const {editMode} = this.props;

    return (
      <div className='rc-network-config-legend'>
        <p style={{fontWeight: 600, fontSize: '22px'}}>
          Legend
        </p>
        <p className='nc-legend-heading'>
          Node Status
        </p>
        {this.renderNodeStatus()}

        <p className='nc-legend-heading'>
          Config Field
        </p>
        <p className='nc-legend-subheading'>
          Field Operations
        </p>
        {this.renderFieldOperations()}
        <p className='nc-legend-subheading'>
          Field Status
        </p>
        {this.renderFieldLegend()}
      </div>
    );
  }
}

NetworkConfigLegend.propTypes = {
  editMode: React.PropTypes.string.isRequired,
}
