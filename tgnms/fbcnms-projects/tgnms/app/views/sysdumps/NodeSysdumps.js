/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @flow
 * @format
 */

import NetworkContext from '../../contexts/NetworkContext';
import NodeSysdumpsTable from './NodeSysdumpsTable';
import React from 'react';
import {mockSysdumpData} from '../../tests/data/Sysdumps';
import {withRouter} from 'react-router-dom';
import {withStyles} from '@material-ui/core/styles';

export type NodeSysdumpType = {|
  filename: string,
  date: string,
  size: number,
|};

const styles = theme => ({
  root: {
    flexGrow: 1,
    padding: theme.spacing(),
    overflow: 'auto',
  },
});

type Props = {
  classes: Object,
  sysdumps: Array<Object>,
};

class NodeSysdumps extends React.Component<Props> {
  structureSysdumpData = () => {
    // mock data for now
    return mockSysdumpData();
  };

  render() {
    return (
      <NetworkContext.Consumer>{this.renderContext}</NetworkContext.Consumer>
    );
  }

  renderContext = context => {
    const {classes} = this.props;

    // Extract topology info from the NetworkContext
    const {networkConfig} = context;

    return (
      <div className={classes.root}>
        <NodeSysdumpsTable
          controllerVersion={networkConfig.controller_version}
          data={this.structureSysdumpData()}
        />
      </div>
    );
  };
}

export default withStyles(styles)(withRouter(NodeSysdumps));
