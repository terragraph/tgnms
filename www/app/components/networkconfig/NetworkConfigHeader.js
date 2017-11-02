// NetworkConfigHeader.js
import React from 'react';
import { render } from 'react-dom';

import { CONFIG_VIEW_MODE, CONFIG_CLASSNAMES } from '../../constants/NetworkConfigConstants.js';

export default class NetworkConfigHeader extends React.Component {
  constructor(props) {
    super(props);
  }

  renderLegend = () => {
    return (
      <div className='nc-legend'>
        <table>
          <tr>
            <td><input className={CONFIG_CLASSNAMES.BASE} type='text' value='Base Config Field'/></td>
            <td><input className={CONFIG_CLASSNAMES.DRAFT} type='text' value='Unsaved Config Field'/></td>
          </tr>

          <tr>
            <td><input className={CONFIG_CLASSNAMES.NETWORK} type='text' value='Network Override Field'/></td>
            <td><input className={CONFIG_CLASSNAMES.REVERT} type='text' value='Field to Revert'/></td>
          </tr>
          <tr>
            <td><input className={CONFIG_CLASSNAMES.NODE} type='text' value='Node Override Field'/></td>
            <td></td>
          </tr>
        </table>
      </div>
    );
  }

  render() {
    const {editMode} = this.props;
    const editModeText = (editMode === CONFIG_VIEW_MODE.NODE) ? 'Node' : 'Network';
    const titleText = `View/Edit ${editModeText} Override`;

    return (
      <div className='rc-network-config-header'>
        <h3 className='nc-header-title'>{titleText}</h3>
        {this.renderLegend()}
      </div>
    );
  }
}

NetworkConfigHeader.propTypes = {
  editMode: React.PropTypes.string.isRequired,
}
