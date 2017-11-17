import React from 'react';
import { render } from 'react-dom';
import Select from 'react-select';

const classNames = require('classnames');

import { CONFIG_VIEW_MODE } from '../../constants/NetworkConfigConstants.js';
import {changeEditMode, selectImage} from '../../actions/NetworkConfigActions.js';

export default class NetworkConfigImageSelector extends React.Component {
  constructor(props) {
    super(props);
  }

  selectImage = (val) => {
    selectImage({
      image: val.value
    });
  }

  renderBaseVersionSelector = (imageVersions, selectedImage) => {
    const selectOptions = imageVersions.map((image) => {
      return {
        label: image,
        value: image,
      };
    });

    return (
      <Select
        name='Select Base Version'
        value={selectedImage}
        options={selectOptions}
        onChange={this.selectImage}
        clearable={false}
      />
    );
  }

  render() {
    const {imageVersions, selectedImage} = this.props;
    return (
      this.renderBaseVersionSelector(imageVersions, selectedImage)
    );
  }
}

NetworkConfigImageSelector.propTypes = {
  selectedImage: React.PropTypes.string.isRequired,
  imageVersions: React.PropTypes.array.isRequired,
}
