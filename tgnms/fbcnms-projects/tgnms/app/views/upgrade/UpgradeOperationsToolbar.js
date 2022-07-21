/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 * @format
 */

import ModalAbort from './ModalAbort';
import ModalUpgradeImages from './ModalUpgradeImages';
import React from 'react';
import Toolbar from '@material-ui/core/Toolbar';
import {withStyles} from '@material-ui/core/styles';

import type {UpgradeGroupReqType} from '@fbcnms/tg-nms/shared/types/Controller';

const styles = theme => ({
  root: {
    flexGrow: 1,
  },
  requestText: {
    padding: theme.spacing(),
  },
});

type Props = {
  classes: Object,
  currentRequest: ?UpgradeGroupReqType,
  pendingRequests: Array<UpgradeGroupReqType>,
  networkName: string,
};

class UpgradeOperationsToolbar extends React.Component<Props> {
  render() {
    const {classes, currentRequest, pendingRequests, networkName} = this.props;
    const allRequests = currentRequest
      ? [currentRequest, ...pendingRequests]
      : pendingRequests;

    return (
      <div className={classes.root} data-testid="upgradeToolbar">
        <Toolbar disableGutters>
          <ModalUpgradeImages networkName={networkName} />
          <ModalAbort networkName={networkName} upgradeRequests={allRequests} />
          {currentRequest ? (
            <div className={classes.requestText}>
              <strong>Current Request: </strong>
              {currentRequest.urReq.upgradeReqId}
            </div>
          ) : null}
          {pendingRequests.length > 0 ? (
            <div className={classes.requestText}>
              <strong>Pending Requests: </strong>
              {pendingRequests.map(req => req.urReq.upgradeReqId).join(', ')}
            </div>
          ) : null}
        </Toolbar>
      </div>
    );
  }
}

export default withStyles(styles)(UpgradeOperationsToolbar);
