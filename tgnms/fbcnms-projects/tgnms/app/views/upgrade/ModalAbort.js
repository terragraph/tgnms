/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @flow
 * @format
 */

import Button from '@material-ui/core/Button';
import Checkbox from '@material-ui/core/Checkbox';
import MaterialModal from '../../components/common/MaterialModal';
import React from 'react';
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableHead from '@material-ui/core/TableHead';
import TableRow from '@material-ui/core/TableRow';
import swal from 'sweetalert2';
import {
  apiServiceRequest,
  getErrorTextFromE2EAck,
} from '../../apiutils/ServiceAPIUtil';
import {withStyles} from '@material-ui/core/styles';

const styles = theme => ({
  button: {
    margin: theme.spacing(),
  },
  centerText: {
    textAlign: 'center',
  },
  header: {
    backgroundColor: '#fff',
    position: 'sticky',
    top: 0,
    zIndex: 1,
  },
});

const columns = [{id: 'requestId', label: 'Request ID'}];

type Props = {
  classes: Object,
  networkName: string,
  upgradeRequests: Array<Object>,
};

type State = {
  isOpen: boolean,
  selected: Array<string>,
};

class ModalAbort extends React.Component<Props, State> {
  state = {
    isOpen: false,

    // abort upgrade properties
    selected: [],
  };

  handleOpen = () => {
    // Open the modal
    this.setState({isOpen: true});
  };

  handleClose = () => {
    // Close the modal
    this.setState({isOpen: false});
  };

  handleSubmitAbort = _event => {
    const {selected} = this.state;

    // Choose the request type that creates the smallest payload
    let data = {};
    if (this.props.upgradeRequests.length === selected.length) {
      data = {
        abortAll: true,
        resetStatus: true,
        reqIds: [],
      };
    } else {
      data = {
        abortAll: false,
        resetStatus: true,
        reqIds: selected,
      };
    }

    apiServiceRequest(this.props.networkName, 'abortUpgrade', data)
      .then(_ =>
        swal({
          type: 'info',
          title: 'Abort Upgrade(s) Success',
          text: `The upgrade process was aborted successfully.`,
        }),
      )
      .catch(error => {
        const errorText = getErrorTextFromE2EAck(error);
        swal({
          type: 'error',
          title: 'Abort Upgrade Failed',
          text: `Your abort upgrade command failed with the following message:\n\n
            ${errorText}.`,
        });
      });

    this.handleClose();
  };

  handleSelectAllClick = event => {
    if (event.target.checked && this.state.selected.length === 0) {
      this.setState({
        selected: this.props.upgradeRequests.map(req => req.urReq.upgradeReqId),
      });
    } else {
      this.setState({selected: []});
    }
  };

  handleClick = reqId => _event => {
    // Add "reqId" to "selected" if it is currently unchecked. Otherwise,
    // identify the index of "reqId" and remove it accordingly.
    const {selected} = this.state;
    const selectedIndex = selected.indexOf(reqId);
    let newSelected = [];

    if (selectedIndex === -1) {
      newSelected = newSelected.concat(selected, reqId);
    } else if (selectedIndex === 0) {
      newSelected = newSelected.concat(selected.slice(1));
    } else if (selectedIndex === selected.length - 1) {
      newSelected = newSelected.concat(selected.slice(0, -1));
    } else if (selectedIndex > 0) {
      newSelected = newSelected.concat(
        selected.slice(0, selectedIndex),
        selected.slice(selectedIndex + 1),
      );
    }

    this.setState({selected: newSelected});
  };

  isSelected = reqId => {
    return this.state.selected.indexOf(reqId) !== -1;
  };

  createTableBodyRow = req => {
    const id = req.urReq.upgradeReqId;
    const isSelected = this.isSelected(id);

    return (
      <TableRow
        key={id}
        hover
        onClick={this.handleClick(id)}
        selected={isSelected}>
        <TableCell padding="checkbox">
          <Checkbox checked={isSelected} color="primary" />
        </TableCell>
        <TableCell>{id}</TableCell>
      </TableRow>
    );
  };

  render() {
    const {classes, upgradeRequests} = this.props;
    const numSelected = this.state.selected.length;
    const reqCount = upgradeRequests.length;

    return (
      <div>
        <Button
          className={classes.button}
          onClick={this.handleOpen}
          variant="outlined">
          Abort Upgrade
        </Button>
        <MaterialModal
          open={this.state.isOpen}
          onClose={this.handleClose}
          modalTitle="Abort Upgrade Requests"
          modalContentText="Choose from the active upgrade requests below."
          modalContent={
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell className={classes.header} padding="checkbox">
                    <Checkbox
                      checked={numSelected !== 0 && numSelected === reqCount}
                      color="primary"
                      indeterminate={numSelected > 0 && numSelected < reqCount}
                      onChange={this.handleSelectAllClick}
                      data-testid="selectAllBox"
                    />
                  </TableCell>
                  {columns.map(col => {
                    return (
                      <TableCell className={classes.header} key={col.id}>
                        {col.label}
                      </TableCell>
                    );
                  })}
                </TableRow>
              </TableHead>
              <TableBody>
                {upgradeRequests.length === 0 ? (
                  <TableRow>
                    {/* Add 1 to colSpan for the checkbox column */}
                    <TableCell
                      className={this.props.classes.centerText}
                      colSpan={columns.length + 1}>
                      There is no data to display
                    </TableCell>
                  </TableRow>
                ) : (
                  upgradeRequests.map(req => this.createTableBodyRow(req))
                )}
              </TableBody>
            </Table>
          }
          modalActions={
            <>
              <Button
                className={classes.button}
                disabled={numSelected === 0}
                onClick={this.handleSubmitAbort}
                variant="outlined">
                Abort
              </Button>
              <Button
                className={classes.button}
                onClick={this.handleClose}
                variant="outlined">
                Close
              </Button>
            </>
          }
        />
      </div>
    );
  }
}

export default withStyles(styles)(ModalAbort);
