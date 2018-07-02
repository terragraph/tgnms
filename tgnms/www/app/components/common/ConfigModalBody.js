/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 */
'use strict';

import PropTypes from 'prop-types';
import React from 'react';
import Clipboard from 'clipboard';

export default class ConfigModalBody extends React.Component {
  static propTypes = {
    configString: PropTypes.string.isRequired,
    onModalConfirm: PropTypes.func.isRequired,
  };

  copyButtonRef = React.createRef();
  configBlockRef = React.createRef();

  state = {
    copyButtonText: 'Copy Config',
  };

  componentDidMount() {
    this.clipboard = new Clipboard(this.copyButtonRef.current, {
      target: () => this.configBlockRef.current,
    });
  }

  componentWillUnmount() {
    this.clipboard.destroy();
  }

  onCopyClick = () => {
    this.setState({copyButtonText: 'Copied!'});

    setTimeout(() => {
      this.setState({copyButtonText: 'Copy Config'});
    }, 3000);
  };

  render() {
    return (
      <div>
        <pre className="config-block" ref={this.configBlockRef}>
          {this.props.configString}
        </pre>
        <div className="button-container">
          <button
            className="copy-button"
            ref={this.copyButtonRef}
            onClick={this.onCopyClick}>
            {this.state.copyButtonText}
          </button>
          <button onClick={this.props.onModalConfirm}>Close</button>
        </div>
      </div>
    );
  }
}
