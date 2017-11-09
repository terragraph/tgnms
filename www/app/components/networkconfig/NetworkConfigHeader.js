// NetworkConfigHeader.js
import React from 'react';
import { render } from 'react-dom';

import { CONFIG_VIEW_MODE, CONFIG_CLASSNAMES } from '../../constants/NetworkConfigConstants.js';

export default class NetworkConfigHeader extends React.Component {
  constructor(props) {
    super(props);
  }

  render() {
    const {editMode} = this.props;
    const editModeText = (editMode === CONFIG_VIEW_MODE.NODE) ? 'Node' : 'Network';
    const titleText = `View/Edit ${editModeText} Override`;

    return (
      <div className='rc-network-config-header'>
        <h3 className='nc-header-title'>{titleText}</h3>
      </div>
    );
  }
}

NetworkConfigHeader.propTypes = {
  editMode: React.PropTypes.string.isRequired,
}
