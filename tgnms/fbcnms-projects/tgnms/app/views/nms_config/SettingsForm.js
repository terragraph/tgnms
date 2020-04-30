/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 *
 */

import * as React from 'react';
import * as settingsApi from '../../apiutils/SettingsAPIUtil';
import Button from '@material-ui/core/Button';
import Grid from '@material-ui/core/Grid';
import MaterialModal from '../../components/common/MaterialModal';
import Typography from '@material-ui/core/Typography';
import lightGreen from '@material-ui/core/colors/lightGreen';
import red from '@material-ui/core/colors/red';
import {EMPTY_SETTINGS_STATE} from '../../../shared/dto/Settings';
import {Provider as SettingsFormContextProvider} from './SettingsFormContext';
import {makeStyles} from '@material-ui/styles';
import {useConfirmationModalState} from '../../hooks/modalHooks';
import {useForm} from '@fbcnms/ui/hooks/index';

import type {CancelTokenSource} from 'axios';
import type {EnvMap, SettingsState} from '../../../shared/dto/Settings';
import type {InputData} from './SettingsFormContext';

const useStyles = makeStyles(_theme => ({
  oldValue: {
    backgroundColor: red[100],
    color: red[400],
    opacity: '0.7',
    whiteSpace: 'nowrap',
  },
  newValue: {
    textDecoration: 'none',
    backgroundColor: lightGreen[300],
    color: lightGreen[900],
    whiteSpace: 'nowrap',
  },
}));

export default function SettingsForm({
  children,
  title,
  description,
}: {
  children: React.Node,
  title: string,
  description: string,
}) {
  const {
    getInput,
    formState,
    initialFormState,
    settingsState,
    resetForm,
    refreshSettings,
  } = useSettingsForm();

  const classes = useStyles();
  const originalSettings = initialFormState ?? {};
  const makeRequest = React.useCallback(async () => {
    await settingsApi.postSettings(formState);
  }, [formState]);
  const {
    isOpen,
    cancel,
    confirm,
    requestConfirmation,
  } = useConfirmationModalState();
  const changedSettings = React.useMemo<Array<string>>(() => {
    const changes = [];
    if (!originalSettings) {
      return changes;
    }
    for (const key in formState) {
      if (originalSettings[key] !== formState[key]) {
        changes.push(key);
      }
    }
    return changes;
  }, [formState, originalSettings]);
  const handleSubmit = React.useCallback(
    (event: SyntheticEvent<HTMLFormElement>) => {
      event.preventDefault();
      requestConfirmation(async () => {
        try {
          await makeRequest();
          await refreshSettings();
        } catch (err) {
          /**
           * request can fail if NMS doesn't write the response before
           * the restart occurs but still log it just in case.
           */
          console.error(err);
        }
      });
    },
    [requestConfirmation, makeRequest, refreshSettings],
  );

  return (
    <>
      <Grid item>
        <form onSubmit={handleSubmit}>
          <Grid container direction={'column'} spacing={4}>
            <Grid
              container
              item
              justify="space-between"
              alignContent="center"
              alignItems="center"
              wrap="nowrap">
              <Grid item>
                <Typography variant="h6">{title}</Typography>
                <Typography variant="body2" color="textSecondary">
                  {description}
                </Typography>
              </Grid>
              <Grid item>
                <Grid container spacing={2}>
                  <Grid item>
                    <Button
                      onClick={resetForm}
                      data-testid="cancel-button"
                      variant="text">
                      Cancel
                    </Button>
                  </Grid>
                  <Grid item>
                    <Button
                      type="submit"
                      data-testid="submit-button"
                      variant="contained"
                      color="primary"
                      disabled={changedSettings.length === 0}>
                      Save
                    </Button>
                  </Grid>
                </Grid>
              </Grid>
            </Grid>
            <SettingsFormContextProvider
              getInput={getInput}
              formState={formState}
              settingsState={settingsState || EMPTY_SETTINGS_STATE}>
              <Grid container item spacing={3} direction={'column'} xs={10}>
                {children}
              </Grid>
            </SettingsFormContextProvider>
          </Grid>
        </form>
      </Grid>
      <MaterialModal
        open={isOpen}
        modalTitle="Confirm Settings Change"
        modalContent={
          <Grid container direction="column">
            <Grid item xs={12}>
              <Typography>
                Please review your settings changes. Submitting these changes
                may cause service disruption.
              </Typography>
            </Grid>
            <Grid item>
              <ul>
                {changedSettings.map(key => (
                  <li key={key}>
                    <Grid container spacing={2} alignItems="flex-start">
                      <Grid item>
                        <Typography variant="body2">{key}</Typography>
                      </Grid>
                      <Grid item container direction="column" spacing={1}>
                        <Grid item>
                          <Typography>
                            <del className={classes.oldValue}>
                              {originalSettings[key]}
                            </del>
                          </Typography>
                        </Grid>
                        <Grid item>
                          <Typography>
                            <ins className={classes.newValue}>
                              {formState[key]}
                            </ins>
                          </Typography>
                        </Grid>
                      </Grid>
                    </Grid>
                  </li>
                ))}
              </ul>
            </Grid>
          </Grid>
        }
        onClose={cancel}
        modalActions={
          <>
            <Button onClick={cancel} data-testid="cancel-settings-change">
              CANCEL
            </Button>
            <Button onClick={confirm} data-testid="confirm-settings-change">
              CONFIRM
            </Button>
          </>
        }
      />
    </>
  );
}

/**
 * Populate the form with values from the backend and let the form take over.
 */
export function useSettingsForm() {
  const [refreshToken, setRefreshToken] = React.useState(
    new Date().toLocaleTimeString(),
  );
  const settingsState = useLoadSettingsState({refreshToken});
  const initialFormStateRef = React.useRef({});
  const {formState, setFormState, updateFormState} = useForm<EnvMap>({
    initialState: initialFormStateRef.current,
  });
  const resetForm = React.useCallback(
    () => setFormState(initialFormStateRef.current),
    [initialFormStateRef, setFormState],
  );
  React.useEffect(() => {
    if (settingsState) {
      const state = {
        ...settingsState.current,
        ...settingsState.envMaps.settingsFileEnv,
      };
      setFormState(state);
      initialFormStateRef.current = state;
    }
  }, [settingsState, setFormState, initialFormStateRef]);
  const refreshSettings = React.useCallback(
    () => setRefreshToken(new Date().toLocaleTimeString()),
    [setRefreshToken],
  );
  const getInput = React.useCallback(
    (key: string) => {
      const isOverridden =
        typeof settingsState?.envMaps?.initialEnv[key] === 'string';
      return ({
        isOverridden,
        config: settingsState?.registeredSettings[key],
        value: formState[key],
        onChange: (value: string) => {
          updateFormState({[key]: value});
        },
      }: $Shape<InputData>);
    },
    [settingsState, formState, updateFormState],
  );

  return {
    settingsState,
    getInput,
    formState,
    refreshSettings,
    resetForm,
    initialFormState: initialFormStateRef.current,
  };
}

/**
 * Load settings state from the backend
 */
function useLoadSettingsState(
  options: ?{
    refreshToken: string,
  },
): ?SettingsState {
  const {refreshToken} = options || {refreshToken: ''};
  const [settingsState, setSettingsState] = React.useState<?SettingsState>(
    null,
  );
  React.useEffect(() => {
    let cancelSource: CancelTokenSource;
    async function makeRequest() {
      const settings = await settingsApi.getSettings();
      setSettingsState(settings);
    }
    makeRequest();
    return () => cancelSource && cancelSource.cancel();
  }, [refreshToken]);
  return settingsState;
}
