/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 */
'use strict';

// Text Area component for displaying a config in raw JSON

import {
  NetworkConfigActions,
  editConfigForm,
  showConfigError,
} from '../../actions/NetworkConfigActions.js';
import {objDifference} from '../../helpers/NetworkConfigHelpers.js';
import cx from 'classnames';
import PropTypes from 'prop-types';
import React from 'react';
import isEmpty from 'lodash-es/isEmpty';
import merge from 'lodash-es/merge';

export default class JSONConfigTextArea extends React.Component {
  static propTypes = {
    config: PropTypes.object,
    draftConfig: PropTypes.object,
  };

  static getDerivedStateFromProps(props) {
    return {
      configString: JSON.stringify(
        merge(props.config, props.draftConfig),
        null,
        4,
      ),
    };
  }

  state = {
    configString: '',
    draftConfigString: '',
  };

  componentDidMount() {
    this.setState({
      draftConfigString: JSON.stringify(
        merge(this.props.config, this.props.draftConfig),
        null,
        4,
      ),
    });
  }

  saveChanges() {
    try {
      const draftConfig = JSON.parse(this.state.draftConfigString);

      editConfigForm({
        editPath: null,
        value: objDifference(draftConfig, this.props.config),
      });

      this.setState({
        draftConfigString: '',
      });
    } catch (error) {
      showConfigError(error.toString());
      return error;
    }
  }

  isDraft() {
    const {draftConfigString, configString} = this.state;

    return (
      draftConfigString !== undefined && draftConfigString !== configString
    );
  }

  editConfigJSON(value) {
    this.setState({
      draftConfigString: value,
    });
  }

  render() {
    return (
      <textarea
        className={cx('rc-json-config-textarea', {draft: this.isDraft()})}
        value={this.state.draftConfigString}
        onChange={event => this.editConfigJSON(event.target.value)}
      />
    );
  }
}
