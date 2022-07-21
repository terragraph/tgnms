/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 * @flow
 */

import Button from '@material-ui/core/Button';
import MaterialModal from '@fbcnms/tg-nms/app/components/common/MaterialModal';
import React from 'react';
import classNames from 'classnames';
import {cloneDeep, set, unset} from 'lodash';
import {diffJson} from 'diff';
import {makeStyles} from '@material-ui/styles';
import {useConfigTaskContext} from '@fbcnms/tg-nms/app/contexts/ConfigTaskContext';

const useStyles = makeStyles(theme => ({
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
}));

type Props = {
  rawJsonEditor: boolean,
  isOpen: boolean,
  onClose: () => any,
};

export default function ModalConfigSubmit(props: Props) {
  const {rawJsonEditor, isOpen, onClose} = props;
  const classes = useStyles();

  const {configOverrides, draftChanges, onSubmit} = useConfigTaskContext();
  const handleSubmit = () => {
    // Submit the draft

    onSubmit();
    onClose();
  };

  // Generate JSON diff
  const changes = React.useMemo(() => {
    let draftConfig;
    if (rawJsonEditor) {
      draftConfig = draftChanges;
    } else {
      draftConfig = cloneDeep(configOverrides);
      Object.keys(draftChanges).forEach(configField => {
        if (
          draftChanges[configField] === '' ||
          draftChanges[configField] === null
        ) {
          unset(draftConfig, configField.split('.'));
        } else {
          set(draftConfig, configField.split('.'), draftChanges[configField]);
        }
      });
    }

    return configOverrides && draftConfig
      ? diffJson(configOverrides, draftConfig)
      : [];
  }, [configOverrides, draftChanges, rawJsonEditor]);

  return (
    <MaterialModal
      className={classes.root}
      open={isOpen}
      data-testid="modal-config-submit"
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
            onClick={handleSubmit}>
            Submit
          </Button>
        </>
      }
    />
  );
}
