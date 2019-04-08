/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */
'use strict';

import React from 'react';
import * as testApi from '../../apiutils/NetworkTestAPIUtil';

import ProgressButton from '../../components/common/ProgressButton';

type Props = {
  onTestAborted: (Error | empty) => any,
};

type State = {loading: boolean};

class AbortNetworkTestButton extends React.Component<Props, State> {
  state = {
    loading: false,
  };

  render() {
    return (
      <ProgressButton
        loading={this.state.loading}
        onClick={this.sendAbortTestRequest}
        variant="contained">
        Abort
      </ProgressButton>
    );
  }

  sendAbortTestRequest = () => {
    this.setLoading(true);
    return testApi
      .stopTest()
      .then(response => {
        this.setLoading(false);
        this.props.onTestAborted(response.data);
      })
      .catch((error: Error) => {
        this.setLoading(false);
        this.props.onTestAborted(error);
      });
  };

  setLoading = (loading: boolean) => this.setState({loading});
}

export default AbortNetworkTestButton;
