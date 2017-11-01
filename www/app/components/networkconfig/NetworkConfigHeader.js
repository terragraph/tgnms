// NetworkConfigHeader.js
import React from 'react';
import { render } from 'react-dom';

import { CONFIG_VIEW_MODE, CONFIG_CLASSNAMES } from '../../constants/NetworkConfigConstants.js';

export default class NetworkConfigHeader extends React.Component {
  constructor(props) {
    super(props);
  }

  renderLegend = () => {
    return
  }

  render() {
    const {editMode} = this.props;
    const editModeText = (editMode === CONFIG_VIEW_MODE.NODE) ? 'node' : 'network';
    const titleText = `View/Edit ${editModeText} Override`;

    return (
      <div className='rc-network-config-header'>
        <h3>{titleText}</h3>
        {this.renderLegend()}
      </div>
    );
  }
}

NetworkConfigHeader.propTypes = {
  editMode: React.PropTypes.string.isRequired,
}
