/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */
'use strict';

import Button from '@material-ui/core/Button';
import MaterialModal from '../../components/common/MaterialModal';
import MaterialReactSelect from '../../components/common/MaterialReactSelect';
import React from 'react';
import TextField from '@material-ui/core/TextField';
import Typography from '@material-ui/core/Typography';
import swal from 'sweetalert2';
import {apiServiceRequest} from '../../apiutils/ServiceAPIUtil';
import {withStyles} from '@material-ui/core/styles';

const styles = theme => ({
  root: {
    minWidth: 720,
  },
  button: {
    margin: theme.spacing(),
  },
});

type Props = {
  classes: Object,
  isOpen: boolean,
  networkName: string,
  nodes: Array<Object>,
  onClose: Function,
};

type State = {
  nodePath: string,
  nodesSelected: Array<Object>,
};

class ModalClearNodeAutoConfig extends React.Component<Props, State> {
  state = {
    nodePath: '',
    nodesSelected: [],
  };

  renderForm = () => {
    const {nodes} = this.props;
    const nodeOptions = nodes.map(node => {
      return {
        label: node.name,
        value: node.name,
      };
    });
    nodeOptions.unshift({
      label: 'All Nodes',
      value: '',
    });

    return (
      <>
        <Typography color="textSecondary" id="nodesSelectedWraper">
          Nodes:
          <MaterialReactSelect
            id="nodesSelected"
            key="nodesSelected"
            defaultOptions
            cacheOptions={false}
            data-testid="toggle-node-menu"
            getOptionValue={option => option.label}
            options={nodeOptions}
            isMulti
            onChange={value => {
              this.setState({nodesSelected: value});
            }}
            value={this.state.nodesSelected}
          />
        </Typography>
        <TextField
          id="nodePath"
          key="nodePath"
          label="JSON Path"
          placeholder="Enter a valid JSON path."
          margin="dense"
          fullWidth
          onChange={ev => {
            const v = ev.target.value;
            this.setState({nodePath: v});
          }}
          value={this.state.nodePath}
        />
      </>
    );
  };

  handleSubmit = () => {
    const {onClose} = this.props;
    const {nodePath, nodesSelected} = this.state;
    const data = {
      nodeNames: nodesSelected.map(node => node.value),
      configPaths: [nodePath],
    };

    apiServiceRequest(
      this.props.networkName,
      'clearAutoNodeOverridesConfig',
      data,
    )
      .then(() => {
        swal({
          type: 'success',
          title: 'Auto Configs Cleared',
          text: 'You have sucessfully cleared the Auto Configs',
        });
        onClose();
      })
      .catch(error => {
        swal({
          type: 'error',
          title: 'Clear Config Failed',
          text: `Your clear configuration attempt failed with the following message:\n\n${error}.`,
        });
      });
  };

  render() {
    const {classes, isOpen, onClose} = this.props;
    const {nodePath, nodesSelected} = this.state;

    return (
      <MaterialModal
        className={classes.root}
        open={isOpen}
        onClose={onClose}
        modalTitle="Clear Node Auto Configurations"
        modalContent={this.renderForm()}
        modalActions={
          <>
            <Button
              className={classes.button}
              disabled={!nodePath || !nodesSelected}
              onClick={this.handleSubmit}
              variant="outlined">
              Submit
            </Button>
            <Button
              className={classes.button}
              variant="outlined"
              onClick={onClose}>
              Close
            </Button>
          </>
        }
      />
    );
  }
}

export default withStyles(styles)(ModalClearNodeAutoConfig);
