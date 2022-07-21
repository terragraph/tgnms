/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 * @format
 */

import * as sysdumpApi from '@fbcnms/tg-nms/app/apiutils/SysdumpAPIUtil';
import CircularProgress from '@material-ui/core/CircularProgress';
import NetworkContext from '@fbcnms/tg-nms/app/contexts/NetworkContext';
import NodeSysdumpsTable from './NodeSysdumpsTable';
import React from 'react';
import swal from 'sweetalert2';
import {withRouter} from 'react-router-dom';
import {withStyles} from '@material-ui/core/styles';

export type NodeSysdumpType = {|
  filename: string,
  date: string,
  size: number,
|};

export type NodeSysdumpDeleteType = {|
  deleted: Array<string>,
  failedDelete: Array<string>,
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

  handleDelete = selected => {
    sysdumpApi.deleteSysdump(selected).then(response => {
      const newSysdumps = this.state.sysdumps.filter(
        sysdump => !response.deleted.includes(sysdump.filename),
      );
      this.setState({sysdumps: newSysdumps});
      if (response.failedDelete.length > 0) {
        const failedMsg = response.failedDelete.join(',');
        swal({
          title: 'Failed!',
          html: `The following sysdumps failed to delete: ${failedMsg}`,
          type: 'error',
        });
      }
    });
  };

  renderContext = context => {
    const {classes} = this.props;

    // Extract topology info from the NetworkContext
    const {networkConfig} = context;

    return (
      <div className={classes.root}>
        <NodeSysdumpsTable
          controllerVersion={networkConfig.controller_version}
          data={this.state.sysdumps}
          onDelete={this.handleDelete}
        />
      </div>
    );
  };
}

export default withStyles(styles)(withRouter(NodeSysdumps));
