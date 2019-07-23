/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 */
'use strict';

import Button from '@material-ui/core/Button';
import MaterialModal from '../../components/common/MaterialModal';
import React from 'react';
import classNames from 'classnames';
import {diffJson} from 'diff';
import {withStyles} from '@material-ui/core/styles';

const styles = theme => ({
  root: {
    minWidth: 720,
  },
  button: {
    margin: theme.spacing(),
  },
  content: {
    maxHeight: `calc(100% - ${theme.spacing(9)}px)`,
    overflowY: 'auto',
    backgroundColor: '#f3f3f3',
    padding: theme.spacing(),
    borderRadius: 4,
  },
  added: {
    backgroundColor: '#e6ffed',
  },
  removed: {
    backgroundColor: '#ffdde1',
  },
});

type Props = {
  classes: Object,
  isOpen: boolean,
  onClose: Function,
  onSubmit: Function,
  draftConfig: ?Object,
  configOverrides: ?Object,
};

type State = {};

class ModalConfigSubmit extends React.Component<Props, State> {
  state = {};

  handleSubmit = () => {
    // Submit the draft
    const {onSubmit, onClose} = this.props;

    onSubmit();
    onClose();
  };

  render() {
    const {classes, isOpen, onClose, configOverrides, draftConfig} = this.props;

    // Generate JSON diff
    const changes =
      configOverrides && draftConfig
        ? diffJson(configOverrides, draftConfig)
        : [];

    return (
      <MaterialModal
        className={classes.root}
        open={isOpen}
        onClose={onClose}
        modalTitle="Review Changes"
        modalContentText={
          <>
            Please review your configuration changes below.
            <br />
            Submitting these changes may cause temporary network disruption.
          </>
        }
        modalContent={
          <pre className={classes.content}>
            {changes.map(({added, removed, value}, index) => (
              <span
                key={`json-diff-${index}`}
                className={classNames(
                  added && classes.added,
                  removed && classes.removed,
                )}>
                {value}
              </span>
            ))}
          </pre>
        }
        modalActions={
          <>
            <Button
              className={classes.button}
              variant="outlined"
              onClick={onClose}>
              Cancel
            </Button>
            <Button
              className={classes.button}
              variant="outlined"
              onClick={this.handleSubmit}>
              Submit
            </Button>
          </>
        }
      />
    );
  }
}

export default withStyles(styles)(ModalConfigSubmit);
