/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 */
'use strict';

import ModalUpgradeImages from './ModalUpgradeImages';
import ModalAbort from './ModalAbort';
import React from 'react';
import Toolbar from '@material-ui/core/Toolbar';
import {withStyles} from '@material-ui/core/styles';

const styles = theme => ({
  root: {
    flexGrow: 1,
  },
  requestText: {
    padding: theme.spacing.unit,
  },
});

type Props = {
  classes: Object,
  currentRequest: Object,
  pendingRequests: Array<Object>,
  networkName: string,
};

type State = {};

class UpgradeOperationsToolbar extends React.Component<Props, State> {
  render() {
    const {classes, currentRequest, pendingRequests, networkName} = this.props;
    const allRequests = currentRequest
      ? [currentRequest, ...pendingRequests]
      : pendingRequests;

    return (
      <div className={classes.root}>
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
