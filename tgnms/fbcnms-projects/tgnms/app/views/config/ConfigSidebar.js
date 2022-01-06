/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import ActionsMenu from '@fbcnms/tg-nms/app/views/map/mappanels/ActionsMenu/ActionsMenu';
import Button from '@material-ui/core/Button';
import MenuItem from '@material-ui/core/MenuItem';
import ModalClearNodeAutoConfig from './ModalClearNodeAutoConfig';
import ModalConfigGet from '@fbcnms/tg-nms/app/views/config/ModalConfigGet';
import NodeSelector from '@fbcnms/tg-nms/app/components/taskBasedConfig/NodeSelector';
import React from 'react';
import TextField from '@material-ui/core/TextField';
import Typography from '@material-ui/core/Typography';
import {
  CONFIG_MODES,
  EDITOR_OPTIONS,
  NETWORK_CONFIG_MODE,
  SELECTED_NODE_QUERY_PARAM,
} from '@fbcnms/tg-nms/app/constants/ConfigConstants';
import {
  CtrlVerType,
  ctrlVerBefore,
} from '@fbcnms/tg-nms/app/helpers/VersionHelper';
import {apiServiceRequestWithConfirmation} from '@fbcnms/tg-nms/app/apiutils/ServiceAPIUtil';
import {convertType} from '@fbcnms/tg-nms/app/helpers/ObjectHelpers';
import {isConfigChanged} from '@fbcnms/tg-nms/app/helpers/ConfigHelpers';
import {isFeatureEnabled} from '@fbcnms/tg-nms/app/constants/FeatureFlags';
import {makeStyles} from '@material-ui/styles';
import {
  useAlertIfPendingChanges,
  useSnackbars,
} from '@fbcnms/tg-nms/app/hooks/useSnackbar';
import {useConfigTaskContext} from '@fbcnms/tg-nms/app/contexts/ConfigTaskContext';
import {useHistory} from 'react-router';
import {useModalState} from '@fbcnms/tg-nms/app/hooks/modalHooks';
import {useNetworkContext} from '@fbcnms/tg-nms/app/contexts/NetworkContext';

import type {NodeConfigStatusType} from '@fbcnms/tg-nms/app/helpers/ConfigHelpers';

const useStyles = makeStyles(theme => ({
  header: {
    padding: '16px 20px 0',
  },
  selectNodeHeader: {
    padding: '8px 20px 0',
  },
  sidePad: {
    padding: '0 20px',
  },
  grow: {
    flexGrow: 1,
  },
  bottomContainer: {
    paddingTop: theme.spacing(),
    paddingBottom: theme.spacing(),
  },
  nodeListPaper: {
    overflowY: 'auto',
    marginTop: 4,
  },
  selectedNodePrimaryText: {
    fontWeight: 'bold',
    fontStyle: 'italic',
  },
  selectedNodeSecondaryText: {
    lineHeight: 1.2,
  },
  nodeConfigSearch: {
    border: '1px solid lightGray',
    fontSize: 12,
    height: theme.spacing(3),
    padding: theme.spacing(),
  },
}));

// Hide deprecated options?
const deprecatedFieldOptions = Object.freeze([
  {label: 'Hidden', value: true},
  {label: 'Show all', value: false},
]);

type Props = {
  useRawJsonEditor: boolean,
  hideDeprecatedFields: boolean,
  onChangeContentDisplayType: string => any,
  onSelectNode: NodeConfigStatusType => any,
  onSelectImage: string => void,
  onSelectHardwareType: string => void,
  onSelectFirmwareVersion: string => void,
  onSetHideDeprecated: boolean => void,
};

export default function ConfigSidebar(props: Props) {
  const {
    useRawJsonEditor,
    hideDeprecatedFields,
    onChangeContentDisplayType,
    onSelectNode,
    onSelectImage,
    onSelectHardwareType,
    onSelectFirmwareVersion,
    onSetHideDeprecated,
  } = props;
  const {
    configParams,
    selectedValues,
    editMode,
    draftChanges,
    configOverrides,
  } = useConfigTaskContext();
  const {
    nodeInfo,
    imageVersion,
    firmwareVersion,
    hardwareType,
  } = selectedValues;
  const {baseConfigs, hardwareBaseConfigs, firmwareBaseConfigs} = configParams;
  const history = useHistory();
  const alertIfPendingChanges = useAlertIfPendingChanges();
  const {networkName, networkConfig} = useNetworkContext();
  const snackbars = useSnackbars();
  const classes = useStyles();
  const fullNodeConfigModalState = useModalState();
  const clearNodeAutoConfigModalState = useModalState();

  const [mode, setMode] = React.useState(Object.keys(CONFIG_MODES)[0]);

  const currentEditorOptions = React.useMemo(() => {
    const options: {|FORM: ?string, JSON: ?string, TABLE: ?string|} = {
      ...EDITOR_OPTIONS,
    };
    if (
      editMode === NETWORK_CONFIG_MODE.CONTROLLER ||
      editMode === NETWORK_CONFIG_MODE.AGGREGATOR ||
      !isFeatureEnabled('FORM_CONFIG_ENABLED')
    ) {
      delete options.FORM;
    }
    if (!isFeatureEnabled('TABLE_CONFIG_ENABLED')) {
      delete options.TABLE;
    }
    if (!isFeatureEnabled('JSON_CONFIG_ENABLED')) {
      delete options.JSON;
    }
    return options;
  }, [editMode]);

  const [editorType, setEditorType] = React.useState(
    Object.keys(currentEditorOptions)[0],
  );

  React.useEffect(() => {
    if (!currentEditorOptions[editorType]) {
      const newKey = Object.keys(currentEditorOptions)[0];
      onChangeContentDisplayType(currentEditorOptions[newKey] ?? '');
      setEditorType(newKey);
    }
  }, [currentEditorOptions, editMode, editorType, onChangeContentDisplayType]);

  React.useEffect(() => {
    if (imageVersion === null && baseConfigs !== null) {
      onSelectImage(Object.keys(baseConfigs)[0]);
    }
    if (hardwareType === null && hardwareBaseConfigs !== null) {
      onSelectHardwareType(Object.keys(hardwareBaseConfigs)[0]);
    }
    if (firmwareVersion === null && firmwareBaseConfigs !== null) {
      onSelectFirmwareVersion(Object.keys(firmwareBaseConfigs)[0]);
    }
  }, [
    imageVersion,
    hardwareType,
    firmwareVersion,
    baseConfigs,
    firmwareBaseConfigs,
    hardwareBaseConfigs,
    onSelectFirmwareVersion,
    onSelectHardwareType,
    onSelectImage,
  ]);

  const isPendingChanges = React.useCallback(() => {
    return alertIfPendingChanges(
      isConfigChanged(draftChanges, configOverrides),
    );
  }, [alertIfPendingChanges, draftChanges, configOverrides]);

  const handleSelectNode = React.useCallback(
    selectedNode => {
      if (isPendingChanges()) {
        return; // have pending changes
      }

      history.replace({
        search: `?${SELECTED_NODE_QUERY_PARAM}=${
          selectedNode ? selectedNode.name : ''
        }`,
      });
      onSelectNode(selectedNode);
    },
    [onSelectNode, isPendingChanges, history],
  );

  const handleChangeFilterOption = React.useCallback(
    e => {
      setMode(convertType<$Keys<typeof CONFIG_MODES>>(e.target.value));
    },
    [setMode],
  );

  const handleChangeSelectImage = React.useCallback(
    e => {
      onSelectImage(e.target.value);
    },
    [onSelectImage],
  );

  const handleChangeFirmwareVersion = React.useCallback(
    e => {
      onSelectFirmwareVersion(e.target.value);
    },
    [onSelectFirmwareVersion],
  );

  const handleChangeHardwareType = React.useCallback(
    e => {
      onSelectHardwareType(e.target.value);
    },
    [onSelectHardwareType],
  );

  const handleChangeHideDeprecated = React.useCallback(
    e => {
      onSetHideDeprecated(Boolean(e.target.value));
    },
    [onSetHideDeprecated],
  );

  const handleChangeEditorType = React.useCallback(
    e => {
      if (isPendingChanges()) {
        return; // have pending changes
      }
      const newType = e.target.value;
      setEditorType(newType);
      onChangeContentDisplayType(currentEditorOptions[newType]);
    },
    [onChangeContentDisplayType, currentEditorOptions, isPendingChanges],
  );

  const handlePolarityOptCommand = React.useCallback(() => {
    // Trigger polarity optimization
    const data = {};
    apiServiceRequestWithConfirmation(
      networkName,
      'triggerPolarityOptimization',
      data,
      {
        title: 'Optimize polarity allocation',
        desc: 'Do you want to re-assign polarity values across the network?',
        checkbox: 'Clear user-assigned polarities',
        processInput: (data, value) => {
          return {...data, clearUserPolarityConfig: !!value};
        },
        onResultsOverride: value => {
          if (value.success) {
            snackbars.success('Polarity optimization was successful.');
          } else {
            snackbars.error('Polarity optimization failed.');
          }
        },
      },
    );
  }, [snackbars, networkName]);

  const handleGolayOptCommand = React.useCallback(() => {
    // Trigger Golay optimization
    const data = {};
    apiServiceRequestWithConfirmation(
      networkName,
      'triggerGolayOptimization',
      data,
      {
        title: 'Optimize Golay Allocation',
        desc: 'Do you want to re-assign Golay values across the network?',
        checkbox: 'Clear user-assigned Golays',
        processInput: (data, value) => {
          return {...data, clearUserConfig: !!value};
        },
        onResultsOverride: value => {
          if (value.success) {
            snackbars.success('Golay optimization was successful.');
          } else {
            snackbars.error('Golay optimization failed.');
          }
        },
      },
    );
  }, [snackbars, networkName]);

  const handleControlSuperframeOptCommand = React.useCallback(() => {
    // Trigger control superframe optimization
    const data = {};
    apiServiceRequestWithConfirmation(
      networkName,
      'triggerControlSuperframeOptimization',
      data,
      {
        title: 'Optimize Control Superframe Allocation',
        desc:
          'Do you want to re-assign control superframe values across the network?',
        checkbox: 'Clear user-assigned values',
        processInput: (data, value) => {
          return {...data, clearUserConfig: !!value};
        },
        onResultsOverride: value => {
          if (value.success) {
            snackbars.success(
              'Control superframe optimization was successful.',
            );
          } else {
            snackbars.error('Control superframe optimization failed.');
          }
        },
      },
    );
  }, [snackbars, networkName]);

  const handleChannelOptCommand = React.useCallback(() => {
    // Trigger channel optimization
    const data = {};
    apiServiceRequestWithConfirmation(
      networkName,
      'triggerChannelOptimization',
      data,
      {
        title: 'Optimize Channel Allocation',
        desc: 'Do you want to re-assign channel values across the network?',
        checkbox: 'Clear user-assigned channels',
        processInput: (data, value) => {
          return {...data, clearUserChannelConfig: !!value};
        },
        onResultsOverride: value => {
          if (value.success) {
            snackbars.success('Channel optimization was successful.');
          } else {
            snackbars.error('Channel optimization failed.');
          }
        },
      },
    );
  }, [snackbars, networkName]);

  const ctrlVersion = networkConfig.controller_version;

  const actions = [];
  if (!ctrlVerBefore(ctrlVersion, CtrlVerType.M31)) {
    actions.push({
      label: 'Optimize polarity allocation',
      func: handlePolarityOptCommand,
    });
  }
  if (!ctrlVerBefore(ctrlVersion, CtrlVerType.M38)) {
    actions.push({
      label: 'Optimize golay allocation',
      func: handleGolayOptCommand,
    });
  }
  if (!ctrlVerBefore(ctrlVersion, CtrlVerType.M37)) {
    actions.push({
      label: 'Optimize control superframe allocation',
      func: handleControlSuperframeOptCommand,
    });
  }
  if (!ctrlVerBefore(ctrlVersion, CtrlVerType.M42)) {
    actions.push({
      label: 'Optimize channel allocation',
      func: handleChannelOptCommand,
    });
  }
  if (!ctrlVerBefore(ctrlVersion, CtrlVerType.M41)) {
    actions.push({
      label: 'Clear node auto configuration',
      func: clearNodeAutoConfigModalState.open,
    });
  }
  const actionItems = [{heading: 'Actions', actions}];

  return (
    <>
      <div className={classes.header}>
        <Typography variant="body1">Configuration Options</Typography>
      </div>
      <div className={classes.sidePad}>
        <TextField
          label="Editor"
          id="editor"
          select
          InputLabelProps={{shrink: true}}
          margin="dense"
          value={editorType}
          fullWidth
          onChange={handleChangeEditorType}>
          {Object.keys(currentEditorOptions).map(label => (
            <MenuItem key={label} value={label}>
              {currentEditorOptions[label]}
            </MenuItem>
          ))}
        </TextField>
      </div>
      {editMode === NETWORK_CONFIG_MODE.NETWORK && (
        <>
          {!useRawJsonEditor && (
            <div className={classes.sidePad}>
              <TextField
                label="Change Base Version"
                id="base-version"
                select
                InputLabelProps={{shrink: true}}
                margin="dense"
                value={imageVersion || ''}
                fullWidth
                onChange={handleChangeSelectImage}>
                {Object.keys(baseConfigs || {}).map(ver => (
                  <MenuItem key={ver} value={ver}>
                    {ver}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                label="Change Firmware Version"
                id="fw-version"
                select
                InputLabelProps={{shrink: true}}
                margin="dense"
                value={firmwareVersion || ''}
                fullWidth
                onChange={handleChangeFirmwareVersion}>
                {Object.keys(firmwareBaseConfigs || {}).map(ver => (
                  <MenuItem key={ver} value={ver}>
                    {ver}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                label="Change Hardware Type"
                id="hw-type"
                select
                InputLabelProps={{shrink: true}}
                margin="dense"
                value={hardwareType || ''}
                fullWidth
                onChange={handleChangeHardwareType}>
                {Object.keys(hardwareBaseConfigs || {}).map(ver => (
                  <MenuItem key={ver} value={ver}>
                    {ver}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                label="Deprecated Fields"
                select
                InputLabelProps={{shrink: true}}
                margin="dense"
                value={hideDeprecatedFields}
                fullWidth
                onChange={handleChangeHideDeprecated}>
                {deprecatedFieldOptions.map(({label, value}) => (
                  <MenuItem key={label} value={value}>
                    {label}
                  </MenuItem>
                ))}
              </TextField>
            </div>
          )}
          <div className={classes.grow} />
          <div className={classes.bottomContainer}>
            {actionItems.length ? (
              <ActionsMenu
                options={{
                  actionItems,
                  buttonClassName: 'actionsButton',
                  buttonName: 'Network Optimization\u2026',
                }}
              />
            ) : null}
          </div>
          <ModalClearNodeAutoConfig
            isOpen={clearNodeAutoConfigModalState.isOpen}
            onClose={clearNodeAutoConfigModalState.close}
          />
        </>
      )}
      {editMode === NETWORK_CONFIG_MODE.NODE && (
        <>
          <div className={classes.sidePad}>
            <TextField
              label="Filter"
              id="filter"
              select
              InputLabelProps={{shrink: true}}
              margin="dense"
              value={mode}
              fullWidth
              onChange={handleChangeFilterOption}>
              {Object.keys(CONFIG_MODES).map(mode => (
                <MenuItem key={mode} value={mode}>
                  {CONFIG_MODES[mode]}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="Deprecated Fields"
              select
              InputLabelProps={{shrink: true}}
              margin="dense"
              value={hideDeprecatedFields}
              fullWidth
              onChange={handleChangeHideDeprecated}>
              {deprecatedFieldOptions.map(({label, value}) => (
                <MenuItem key={label} value={value}>
                  {label}
                </MenuItem>
              ))}
            </TextField>
          </div>
          <NodeSelector
            mode={mode}
            onSelectNode={handleSelectNode}
            selectedNodeName={nodeInfo?.name || null}
          />
          {nodeInfo ? (
            <>
              <div className={classes.grow} />
              <div className={classes.bottomContainer}>
                <Button fullWidth onClick={fullNodeConfigModalState.open}>
                  Show Full Configuration
                </Button>
              </div>
              <ModalConfigGet
                isOpen={fullNodeConfigModalState.isOpen}
                onClose={fullNodeConfigModalState.close}
              />
            </>
          ) : null}
        </>
      )}
      {(editMode === NETWORK_CONFIG_MODE.CONTROLLER ||
        editMode === NETWORK_CONFIG_MODE.AGGREGATOR) &&
        !useRawJsonEditor && (
          <div className={classes.sidePad}>
            <TextField
              label="Deprecated Fields"
              select
              InputLabelProps={{shrink: true}}
              margin="dense"
              value={hideDeprecatedFields}
              fullWidth
              onChange={handleChangeHideDeprecated}>
              {deprecatedFieldOptions.map(({label, value}) => (
                <MenuItem key={label} value={value}>
                  {label}
                </MenuItem>
              ))}
            </TextField>
          </div>
        )}
    </>
  );
}
