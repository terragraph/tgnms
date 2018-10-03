/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 */
'use strict';

import {
  changeEditMode,
  selectImage,
  selectHardwareType,
} from '../../actions/NetworkConfigActions.js';
import {CONFIG_VIEW_MODE} from '../../constants/NetworkConfigConstants.js';
import classNames from 'classnames';
import PropTypes from 'prop-types';
import {render} from 'react-dom';
import Select from 'react-select';
import React from 'react';

export default class NetworkConfigImageSelector extends React.Component {
  constructor(props) {
    super(props);
  }

  selectImage(val) {
    selectImage({
      image: val.value,
    });
  }

  selectHardwareType(val) {
    selectHardwareType({
      hardwareType: val.value,
    });
  }

  render() {
    const {
      imageVersions,
      selectedImage,
      hardwareTypes,
      selectedHardwareType,
    } = this.props;

    const selectImageOptions = imageVersions.map(image => {
      return {
        label: image,
        value: image,
      };
    });

    const selectHardwareTypeOptions = hardwareTypes.map(hardwareType => {
      return {
        label: hardwareType,
        value: hardwareType,
      };
    });

    return [
      <div className="selector-title">Select Base Version</div>,
      <Select
        name="Select Base Version"
        value={selectedImage}
        options={selectImageOptions}
        onChange={this.selectImage}
        clearable={false}
      />,
      <div className="selector-title">Select Hardware Base</div>,
      <Select
        name="Select Hardware Base"
        value={selectedHardwareType}
        options={selectHardwareTypeOptions}
        onChange={this.selectHardwareType}
        clearable={false}
      />,
    ];
  }
}

NetworkConfigImageSelector.propTypes = {
  selectedImage: PropTypes.string.isRequired,
  imageVersions: PropTypes.array.isRequired,
  selectedHardwareType: PropTypes.string.isRequired,
  hardwareTypes: PropTypes.array.isRequired,
};
