/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 * @flow
 */

import AppBar from '@material-ui/core/AppBar';
import Button from '@material-ui/core/Button';
import ModalConfigSubmit from './ModalConfigSubmit';
import React from 'react';
import Tab from '@material-ui/core/Tab';
import Tabs from '@material-ui/core/Tabs';
import {NETWORK_CONFIG_MODE} from '@fbcnms/tg-nms/app/constants/ConfigConstants';
import {configRootHeightCss} from '@fbcnms/tg-nms/app/constants/StyleConstants';
import {isConfigChanged} from '@fbcnms/tg-nms/app/helpers/ConfigHelpers';
import {makeStyles} from '@material-ui/styles';
import {objectValuesTypesafe} from '@fbcnms/tg-nms/app/helpers/ObjectHelpers';
import {useAlertIfPendingChanges} from '@fbcnms/tg-nms/app/hooks/useSnackbar';
import {useConfigTaskContext} from '@fbcnms/tg-nms/app/contexts/ConfigTaskContext';
import {useModalState} from '@fbcnms/tg-nms/app/hooks/modalHooks';

const useStyles = makeStyles(theme => ({
  root: {
    display: 'flex',
    flex: '1 1 auto',
    flexFlow: 'column',
    overflowY: 'hidden',
    height: '100%',
  },
  appBar: {
    position: 'inherit',
  },
  buttonContainer: {
    position: 'absolute',
    right: theme.spacing(),
    marginTop: theme.spacing(),
  },
  tabContent: {
    display: 'flex',
    flex: '1 1 auto',
    flexFlow: 'row',
    height: configRootHeightCss(theme),
  },
  configOptions: {
    display: 'flex',
    flexFlow: 'column',
    width: 256,
    minWidth: 256,
  },
  configBody: {
    display: 'flex',
    flexFlow: 'column',
    flexGrow: 1,
    overflow: 'hidden',
  },
  jsonTextarea: {
    fontFamily: 'monospace',
    height: '100%',
    border: 'none',
    margin: theme.spacing(2),
  },
  addButton: {
    position: 'fixed',
    bottom: 0,
    right: 0,
    margin: theme.spacing(2),
  },
}));

type Props = {
  onChangeEditMode: string => void,
  rawJsonEditor: boolean,
};

export default function ConfigRoot(props: Props) {
  const {onChangeEditMode, rawJsonEditor} = props;
  const classes = useStyles();
  const alertIfPending = useAlertIfPendingChanges();
  const {isOpen, open, close} = useModalState();

  const {
    editMode,
    draftChanges,
    onCancel,
    configParams,
    configOverrides,
  } = useConfigTaskContext();

  const currentChanges = isConfigChanged(draftChanges, configOverrides);

  const alertIfPendingChanges = React.useCallback(() => {
    return alertIfPending(currentChanges);
  }, [alertIfPending, currentChanges]);

  const handleChangeEditMode = React.useCallback(
    (event, newEditMode) => {
      // Change the edit mode (i.e. tab)
      if (newEditMode === editMode) {
        return; // nothing changed
      }
      if (alertIfPendingChanges()) {
        return; // have pending changes
      }

      // Reset and re-process config data structures
      onChangeEditMode(newEditMode);
    },
    [alertIfPendingChanges, editMode, onChangeEditMode],
  );

  return (
    <>
      <AppBar className={classes.appBar} color="default">
        <Tabs
          data-testid="config-root-tabs"
          value={editMode}
          indicatorColor="primary"
          textColor="primary"
          onChange={handleChangeEditMode}>
          {objectValuesTypesafe<string>(NETWORK_CONFIG_MODE).map(mode =>
            mode === NETWORK_CONFIG_MODE.AGGREGATOR &&
            configParams.aggregatorConfig === null ? null : (
              <Tab key={mode} label={mode} value={mode} />
            ),
          )}
        </Tabs>
        <div className={classes.buttonContainer}>
          <Button onClick={onCancel} disabled={!currentChanges}>
            Cancel
          </Button>
          <Button onClick={open} disabled={!currentChanges}>
            Submit
          </Button>
        </div>
      </AppBar>

      <ModalConfigSubmit
        rawJsonEditor={rawJsonEditor}
        isOpen={isOpen}
        onClose={close}
      />
    </>
  );
}
