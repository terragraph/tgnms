import React from 'react';
import { render } from 'react-dom';

const classNames = require('classnames');

import { CONFIG_VIEW_MODE, CONFIG_CLASSNAMES } from '../../constants/NetworkConfigConstants.js';


// legend for the network config
// big mess of css and html
export default class NetworkConfigLegend extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      expanded: true,
    };
  }

  toggleExpandLegend = () => {
    this.setState({
      expanded: !this.state.expanded
    });
  }

  renderNodeStatus = () => {
    return (
      <ul className='nc-legend-section' style={{listStyleType: 'none', padding: 0}}>
        <li className='nc-legend-inline-node-container'>
          <div className={classNames('nc-inline-legend-node', 'nc-online-node')}>
            Online Node
          </div>
          <div className={classNames('nc-inline-legend-node', 'nc-offline-node')}>
            Offline Node
          </div>
        </li>
        <li className='nc-legend-node'>
          Node with Unsaved Changes<img height='20' style={{float: 'right'}} src='/static/images/bullet_red.png'/>
        </li>
        <li className={classNames('nc-legend-node', 'nc-node-with-override')} style={{fontWeight: 600}}>
          Node With Override
        </li>
      </ul>
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
    const {expanded} = this.state;
    const expandMarker = expanded ?
      '/static/images/down-chevron.png' : '/static/images/up-chevron.png';

    const legendBody = (
      <div>
        <p className='nc-legend-heading'>
          Node Status
        </p>
        {this.renderNodeStatus()}

        <p className='nc-legend-heading'>
          Config Field
        </p>
        {this.renderFieldLegend()}
      </div>
    );

    return (
      <div className='rc-network-config-legend'>
        <p className={classNames('nc-legend-title', {'nc-collapsed-title': !expanded})} onClick={this.toggleExpandLegend}>
          Legend
          <img src={expandMarker} className='legend-expand-marker'/>
        </p>
        {expanded && legendBody}
      </div>
    );
  }
}

NetworkConfigLegend.propTypes = {
  editMode: React.PropTypes.string.isRequired,
}
