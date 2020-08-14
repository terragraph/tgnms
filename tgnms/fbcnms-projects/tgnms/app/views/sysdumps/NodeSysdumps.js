/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @flow
 * @format
 */

import * as sysdumpApi from '../../apiutils/SysdumpAPIUtil';
import CircularProgress from '@material-ui/core/CircularProgress';
import NetworkContext from '../../contexts/NetworkContext';
import NodeSysdumpsTable from './NodeSysdumpsTable';
import React from 'react';
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
};

type State = {
  sysdumps: Array<NodeSysdumpType>,
  fetching: boolean,
};

class NodeSysdumps extends React.Component<Props, State> {
  constructor(props) {
    super(props);
    this.state = {sysdumps: [], fetching: true};
  }
  componentDidMount() {
    sysdumpApi.getSysdumps().then(response => {
      this.setState({sysdumps: response, fetching: false});
    });
  }

  render() {
    if (this.state.fetching) {
      return <CircularProgress />;
    }
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
          data={this.state.sysdumps}
        />
      </div>
    );
  };
}

export default withStyles(styles)(withRouter(NodeSysdumps));
