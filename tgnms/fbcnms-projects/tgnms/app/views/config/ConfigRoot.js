/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import AddIcon from '@material-ui/icons/Add';
import AppBar from '@material-ui/core/AppBar';
import Button from '@material-ui/core/Button';
import ConfigSidebar from './ConfigSidebar';
import ConfigTable from './ConfigTable';
import CustomSnackbar from '../../components/common/CustomSnackbar';
import Fab from '@material-ui/core/Fab';
import LoadingBox from '../../components/common/LoadingBox';
import ModalConfigAddField from './ModalConfigAddField';
import ModalConfigSubmit from './ModalConfigSubmit';
import Paper from '@material-ui/core/Paper';
import React from 'react';
import Tab from '@material-ui/core/Tab';
import Tabs from '@material-ui/core/Tabs';
import {
  ConfigLayer,
  E2EConfigMode,
  NetworkConfigMode,
} from '../../constants/ConfigConstants';
import {
  cleanupObject,
  processConfigs,
  stringifyConfig,
} from '../../helpers/ConfigHelpers';
import {cloneDeep, isEqual, set, unset} from 'lodash';
import {isPunctuation} from '../../helpers/StringHelpers';
import {withRouter} from 'react-router-dom';
import {withStyles} from '@material-ui/core/styles';

import type {NetworkConfig} from '../../NetworkContext';
import type {NodeConfigStatusType} from '../../helpers/ConfigHelpers';
import type {NodeConfigType} from '../../../shared/types/NodeConfig';

const styles = theme => ({
  root: {
    display: 'flex',
    flex: '1 1 auto',
    flexFlow: 'column',
    overflowY: 'hidden',
  },
  appBar: {
    position: 'inherit',
  },
  buttonContainer: {
    // TODO - HACK! - position this properly...
    position: 'absolute',
    right: theme.spacing(),
    marginTop: theme.spacing(),
  },
  tabContent: {
    display: 'flex',
    flex: '1 1 auto',
    flexFlow: 'row',

    // TODO - HACK! - Figure out how to actually set the height to 100% screen
    height: `calc(100vh - ${
      /* pad */ theme.spacing() +
        /* appbar */ 64 +
        /* toolbar */ 48 +
        /* search bar */ 72
    }px)`,
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
    overflowX: 'hidden',
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
});

type Props = {
  classes: {[string]: string},
  networkName: string,
  networkConfig: NetworkConfig,
  editModes: typeof E2EConfigMode | typeof NetworkConfigMode,
  initialEditMode: ?string, // from editModes
  // parent's this.setState() - TODO - HACK! remove...
  setParentState: ({[string]: string}, () => any) => any,
  getSidebarProps: string => {
    editMode: string,
    selectedNodeInfo?: ?NodeConfigStatusType,
    baseConfigs?: ?{[string]: $Shape<NodeConfigType>},
    firmwareBaseConfigs?: ?{[string]: $Shape<NodeConfigType>},
    hardwareBaseConfigs?: ?{[string]: {[string]: $Shape<NodeConfigType>}},
    selectedImage?: ?string,
    selectedFirmwareVersion?: ?string,
    selectedHardwareType?: ?string,
    topologyNodeList?: ?Array<NodeConfigStatusType>,
    useMetadataBase?: boolean,
  },
  getRequests: boolean => Array<Object>,
  getConfigLayers: string => Array<{
    id: string,
    value: ?Object,
  }>,
  getConfigMetadata: string => ?Object,
  getConfigOverrides: string => ?Object,
  onSubmitDraft: (string, Object, () => any, (string) => any) => any,
  onEditModeChanged: ?(string) => any,
  onSelectNode?: (?NodeConfigStatusType, () => any) => any,
  onSelectImage?: ?(string, () => any) => any,
  onSelectFirmwareVersion?: ?(string, () => any) => any,
  onSelectHardwareType?: ?(string, () => any) => any,
  onSetConfigBase?: ?(boolean, () => any) => any,
};

type State = {
  draftConfig: ?Object,
  rawJsonDraftConfig: string,
  configData: ?Array<Object>,
  selectedField: ?Array<string>,
  editMode: string,
  useRawJsonEditor: boolean,
  isLoading: boolean,
  showSubmitModal: boolean,
  showAddFieldModal: boolean,
  snackbarProps: Object,
};

class ConfigRoot extends React.Component<Props, State> {
  constructor(props) {
    super(props);

    this.state = {
      // Draft layer
      draftConfig: {},

      // Draft layer as a string (used when useRawJsonEditor is true)
      rawJsonDraftConfig: '{}',

      // Current processed config data structure (used in ConfigTable)
      configData: null,

      // Current selected config field (in ConfigTable)
      selectedField: null,

      // Edit mode (NetworkConfigMode or E2EConfigMode)
      editMode: props.initialEditMode,

      // Raw JSON editor enabled?
      useRawJsonEditor: false,

      // Are we fetching configs?
      isLoading: false,

      // Modal visibility
      showSubmitModal: false,
      showAddFieldModal: false,

      // Snackbar
      snackbarProps: {open: false},
    };
  }

  componentDidMount() {
    // Fetch configs on mount
    // TODO: handle topology updates too?
    const {networkName} = this.props;

    this.getConfigsForNetwork(networkName, true);
  }

  updateSnackbar = (message, variant) => {
    // Show a new snackbar message
    this.setState({snackbarProps: {open: true, message, variant}});
  };

  getConfigsForNetwork = (networkName, isInitial) => {
    // Get all config layers and metadata for the given network
    const {getRequests, setParentState} = this.props;
    this.setState({isLoading: true});

    // Process all configs
    const requests = getRequests(isInitial);
    const promiseList = requests.map(
      ({func, key, data}) =>
        new Promise((resolve, reject) => {
          // Set state on resolve
          const onResolve = results =>
            setParentState({[key]: results}, () => resolve(results));
          data
            ? func(networkName, data, onResolve, reject)
            : func(networkName, onResolve, reject);
        }),
    );
    Promise.all(promiseList)
      .then(_responses => {
        this.setState({isLoading: false}, () => this.resetDraftConfig());
      })
      .catch(_err => {
        // TODO handle this better
        this.updateSnackbar(
          'Failed to fetch configs. Please refresh the page to try again.',
          'error',
        );
      });
  };

  updateConfigData = () => {
    // Update config data based on current state
    const {getConfigLayers, getConfigMetadata} = this.props;
    const {editMode, draftConfig} = this.state;

    // Determine config layers
    const layers = getConfigLayers(editMode);
    if (layers.length === 0) {
      // Nothing to show?
      this.setState({configData: []});
      return;
    }
    layers.push({id: ConfigLayer.DRAFT, value: draftConfig || {}});

    // Process configs
    const metadata = getConfigMetadata(editMode);
    const configData = processConfigs(layers, metadata);
    this.setState({configData});
  };

  hasPendingChanges = () => {
    // Returns whether there are any draft changes
    const {getConfigOverrides} = this.props;
    const {editMode} = this.state;

    const draft = this.getDraftConfig();
    const cleanedConfigOverrides = getConfigOverrides(editMode) || {};
    return !isEqual(draft, cleanedConfigOverrides);
  };

  alertIfPendingChanges = () => {
    // Throw an alert if there are pending changes
    if (this.hasPendingChanges()) {
      this.updateSnackbar(
        'You have unsaved changes. ' +
          'Please submit or discard them before leaving this page.',
        'warning',
      );
      return true;
    }
    return false;
  };

  resetDraftConfig = () => {
    // Reset all draft changes and re-process config data
    const {getConfigOverrides} = this.props;
    const {editMode} = this.state;

    // Draft layer is a copy of the overrides layer
    const draftConfig = cloneDeep(getConfigOverrides(editMode));

    this.setState(
      {
        draftConfig,
        rawJsonDraftConfig: stringifyConfig(draftConfig),
        selectedField: null,
      },
      this.updateConfigData,
    );
  };

  getDraftConfig = () => {
    // Return the draft config
    const {useRawJsonEditor, draftConfig} = this.state;

    const draft = useRawJsonEditor ? this.parseRawJsonConfig() : draftConfig;
    if (draft === null) {
      return null;
    }
    return cleanupObject(draft) || {};
  };

  parseRawJsonConfig = alertOnError => {
    // Parse the raw JSON config string
    const {rawJsonDraftConfig} = this.state;

    try {
      return rawJsonDraftConfig.trim() ? JSON.parse(rawJsonDraftConfig) : {};
    } catch (err) {
      if (alertOnError) {
        this.updateSnackbar(err.toString(), 'error');
      }
      return null;
    }
  };

  handleDraftChange = (field, value) => {
    // Set the draft value for a config field
    const {draftConfig} = this.state;
    if (value === null) {
      unset(draftConfig, field);
    } else {
      set(draftConfig, field, value);
    }

    this.setState({draftConfig}, this.updateConfigData);
  };

  handleSubmitDraft = () => {
    // Submit all draft changes
    const {editMode} = this.state;
    const {networkName, onSubmitDraft} = this.props;

    // Get the draft config
    const draft = this.getDraftConfig();

    // Create success/error callbacks
    const onSuccess = () => {
      this.getConfigsForNetwork(networkName, false);
      this.updateSnackbar('Your changes were saved successfully.', 'success');
    };
    const onError = err => {
      const errorString = err + (isPunctuation(err.slice(-1)) ? '' : '.');
      this.updateSnackbar(errorString, 'error');
    };

    // Send API request
    onSubmitDraft(editMode, draft, onSuccess, onError);
  };

  handleChangeEditMode = (event, newEditMode) => {
    // Change the edit mode (i.e. tab)
    const {onEditModeChanged} = this.props;
    const {editMode} = this.state;
    if (newEditMode === editMode) {
      return; // nothing changed
    }
    if (this.alertIfPendingChanges()) {
      return; // have pending changes
    }

    onEditModeChanged && onEditModeChanged(newEditMode);

    // Reset and re-process config data structures
    this.setState({editMode: newEditMode}, this.resetDraftConfig);
  };

  handleOpenSubmitModal = () => {
    // Open the submit modal
    const {useRawJsonEditor} = this.state;

    // Check if raw JSON config can be parsed
    if (useRawJsonEditor && this.parseRawJsonConfig(true) === null) {
      return;
    }

    this.setState({showSubmitModal: true});
  };

  handleCloseSubmitModal = () => {
    // Close the submit modal
    this.setState({showSubmitModal: false});
  };

  handleOpenAddFieldModal = () => {
    // Open the "Add Field" modal
    this.setState({showAddFieldModal: true});
  };

  handleCloseAddFieldModal = () => {
    // Close the "Add Field" modal
    this.setState({showAddFieldModal: false});
  };

  handleSelectField = field => {
    // Select a config field
    this.setState({selectedField: field});
  };

  handleRawJsonChange = evt => {
    // Handle a change to the raw JSON draft config text
    this.setState({rawJsonDraftConfig: evt.target.value});
  };

  handleChangeEditorType = useRawJsonEditor => {
    // Select an editor type in the sidebar
    if (useRawJsonEditor === this.state.useRawJsonEditor) {
      return; // no change
    }

    if (this.state.useRawJsonEditor) {
      // If switching from raw JSON to the table editor, we need to modify the
      // actual draft object
      const draftConfig = this.parseRawJsonConfig(true);
      if (draftConfig === null) {
        return; // raw JSON couldn't be parsed
      }
      this.setState({useRawJsonEditor, draftConfig}, this.updateConfigData);
    } else {
      // If switching from the table editor to raw JSON, copy over any changes
      this.setState({
        useRawJsonEditor,
        rawJsonDraftConfig: stringifyConfig(this.getDraftConfig()),
      });
    }
  };

  handleSelectNode = node => {
    // Select a node in the sidebar
    const {onSelectNode} = this.props;

    if (this.alertIfPendingChanges()) {
      return; // have pending changes
    }
    onSelectNode && onSelectNode(node, this.resetDraftConfig);
  };

  handleSelectImage = image => {
    // Select a software image in the sidebar
    const {onSelectImage} = this.props;

    onSelectImage && onSelectImage(image, this.updateConfigData);
  };

  handleSelectHardwareType = hardwareType => {
    // Select a hardware type in the sidebar
    const {onSelectHardwareType} = this.props;

    onSelectHardwareType &&
      onSelectHardwareType(hardwareType, this.updateConfigData);
  };

  handleSelectFirmwareVersion = firmwareVersion => {
    // Select a firmware version in the sidebar
    const {onSelectFirmwareVersion} = this.props;

    onSelectFirmwareVersion &&
      onSelectFirmwareVersion(firmwareVersion, this.updateConfigData);
  };

  handleSetConfigBase = useMetadataBase => {
    // Toggle the E2E config metadata base values in the sidebar
    const {onSetConfigBase} = this.props;

    onSetConfigBase && onSetConfigBase(useMetadataBase, this.updateConfigData);
  };

  renderAddFieldButton = () => {
    // Render the FAB to add a new field
    const {classes} = this.props;
    return (
      <Fab
        className={classes.addButton}
        color="primary"
        onClick={this.handleOpenAddFieldModal}>
        <AddIcon />
      </Fab>
    );
  };

  renderTabContent = () => {
    // Render the current tab
    const {classes, networkConfig, networkName, getSidebarProps} = this.props;
    const {
      configData,
      selectedField,
      editMode,
      useRawJsonEditor,
      rawJsonDraftConfig,
    } = this.state;
    const sidebarProps = getSidebarProps(editMode);

    return (
      <div className={classes.tabContent}>
        <Paper className={classes.configOptions} elevation={2}>
          <ConfigSidebar
            {...sidebarProps}
            networkName={networkName}
            networkConfig={networkConfig}
            useRawJsonEditor={useRawJsonEditor}
            onChangeEditorType={this.handleChangeEditorType}
            onSelectNode={this.handleSelectNode}
            onSelectImage={this.handleSelectImage}
            onSelectHardwareType={this.handleSelectHardwareType}
            onSelectFirmwareVersion={this.handleSelectFirmwareVersion}
            onSetConfigBase={this.handleSetConfigBase}
            onConfigRefresh={this.getConfigsForNetwork}
            onUpdateSnackbar={this.updateSnackbar}
          />
        </Paper>
        <Paper className={classes.configBody} elevation={2}>
          {useRawJsonEditor ? (
            <textarea
              className={classes.jsonTextarea}
              autoCapitalize="none"
              autoComplete="none"
              autoCorrect="none"
              spellCheck={false}
              value={rawJsonDraftConfig}
              onChange={this.handleRawJsonChange}
            />
          ) : (
            <ConfigTable
              data={configData}
              onDraftChange={this.handleDraftChange}
              selectedField={selectedField}
              onSelectField={this.handleSelectField}
            />
          )}
        </Paper>
      </div>
    );
  };

  render() {
    const {
      classes,
      editModes,
      getConfigOverrides,
      getConfigMetadata,
    } = this.props;
    const {
      isLoading,
      editMode,
      useRawJsonEditor,
      configData,
      showSubmitModal,
      showAddFieldModal,
      snackbarProps,
    } = this.state;
    const pendingChanges = this.hasPendingChanges();

    return (
      <div className={classes.root}>
        {isLoading ? (
          <LoadingBox />
        ) : (
          <>
            <AppBar className={classes.appBar} color="default">
              <Tabs
                data-testid="config-root-tabs"
                value={editMode}
                indicatorColor="primary"
                textColor="primary"
                onChange={this.handleChangeEditMode}>
                {Object.keys(editModes).map(key => (
                  <Tab key={key} label={key} value={key} />
                ))}
              </Tabs>
              <div className={classes.buttonContainer}>
                <Button
                  onClick={this.resetDraftConfig}
                  disabled={!pendingChanges}>
                  Cancel
                </Button>
                <Button
                  onClick={this.handleOpenSubmitModal}
                  disabled={!pendingChanges}>
                  Submit
                </Button>
              </div>
            </AppBar>
            {this.renderTabContent()}
            {!useRawJsonEditor ? this.renderAddFieldButton() : null}

            <ModalConfigSubmit
              isOpen={showSubmitModal}
              onSubmit={this.handleSubmitDraft}
              onClose={this.handleCloseSubmitModal}
              draftConfig={this.getDraftConfig()}
              configOverrides={getConfigOverrides(editMode) || {}}
            />
            <ModalConfigAddField
              isOpen={showAddFieldModal}
              onSubmit={this.handleDraftChange}
              onClose={this.handleCloseAddFieldModal}
              data={configData || []}
              configMetadata={getConfigMetadata(editMode) || {}}
            />
          </>
        )}

        <CustomSnackbar
          key={snackbarProps.message || ''}
          {...snackbarProps}
          onClose={(_event, _reason) =>
            this.setState({snackbarProps: {...snackbarProps, open: false}})
          }
        />
      </div>
    );
  }
}

export default withStyles(styles)(withRouter(ConfigRoot));
