/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 */
'use strict';

// Text Area component for displaying a config in raw JSON

import {
  NetworkConfigActions,
  editAndDeleteFields,
  showConfigError,
} from '../../actions/NetworkConfigActions.js';
import {
  createConfigToSubmit,
  objDifference,
  allPathsInObj,
} from '../../helpers/NetworkConfigHelpers.js';
import cx from 'classnames';
import PropTypes from 'prop-types';
import React from 'react';
import {has, isEmpty, merge} from 'lodash-es';

export default class JSONConfigTextArea extends React.Component {
  static propTypes = {
    config: PropTypes.object,
    draftConfig: PropTypes.object,
    removedFields: PropTypes.instanceOf(Set), // Used for Network/Node Config
  };

  static getDerivedStateFromProps(props) {
    return {
      configString: JSON.stringify(
        createConfigToSubmit(
          props.config,
          props.draftConfig,
          props.removedFields,
        ),
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
        createConfigToSubmit(
          this.props.config,
          this.props.draftConfig,
          this.props.removedFields,
        ),
        null,
        4,
      ),
    });
  }

  saveChanges() {
    try {
      const stringToParse =
        this.state.draftConfigString === ''
          ? '{}'
          : this.state.draftConfigString;
      const draftConfig = JSON.parse(stringToParse);

      // Find removed fields (if they don't exist in the draft)
      const configDifferenceDraft = objDifference(
        this.props.config,
        draftConfig,
      );
      const removedPaths = allPathsInObj(configDifferenceDraft).filter(
        path => !has(draftConfig, path),
      );

      editAndDeleteFields({
        editPath: null,
        value: objDifference(draftConfig, this.props.config),
        pathsToRemove: removedPaths,
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
        autocapitalize="off"
        autocomplete="off"
        autocorrect="off"
        className={cx('rc-json-config-textarea', {draft: this.isDraft()})}
        value={this.state.draftConfigString}
        onChange={event => this.editConfigJSON(event.target.value)}
        spellCheck={false}
      />
    );
  }
}
