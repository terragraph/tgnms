/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import Button from '@material-ui/core/Button';
import CustomExpansionPanel from '../common/CustomExpansionPanel';
import EditIcon from '@material-ui/icons/Edit';
import Grid from '@material-ui/core/Grid';
import InfoIcon from '@material-ui/icons/Info';
import PlannedSiteTemplates from './PlannedSiteTemplates';
import React from 'react';
import ShowAdvanced from '../common/ShowAdvanced';
import Typography from '@material-ui/core/Typography';
import {
  basicTemplates,
  defaultTemplate,
} from '../../constants/TemplateConstants';
import {createNumericInput, formParseFloat} from '../../helpers/FormHelpers';
import {isEqual} from 'lodash';
import {sendTopologyBuilderRequest} from '../../helpers/MapPanelHelpers';
import {templateTopologyBuilderRequest} from '../../helpers/templateHelpers';
import {withStyles} from '@material-ui/core/styles';

import type {
  LocationType,
  SiteType,
  TopologyType,
} from '../../../shared/types/Topology';
import type {PlannedSite} from '../../components/mappanels/MapPanelTypes';
import type {SiteTemplate} from '../../helpers/templateHelpers';

const styles = theme => ({
  button: {
    margin: '8px 4px',
    float: 'right',
  },
  iconCentered: {
    verticalAlign: 'middle',
    paddingRight: theme.spacing(),
  },
  infoText: {
    color: theme.palette.primary.light,
    lineHeight: '1rem',
    display: 'flex',
    alignItems: 'center',
    paddingBottom: 4,
  },
});

const FormType = Object.freeze({
  CREATE: 'CREATE',
  EDIT: 'EDIT',
});

type Props = {
  classes: {[string]: string},
  className?: string,
  expanded: boolean,
  onPanelChange: () => any,
  onClose: (x?: ?string) => *,
  formType: $Values<typeof FormType>,
  initialParams: $Shape<LocationType & {name: string}>,
  networkName: string,
  plannedSite: ?PlannedSite,
  onUpdatePlannedSite: ($Shape<PlannedSite>) => any,
  topology: TopologyType,
};

type State = {
  name: string,
  latitude: number,
  longitude: number,
  altitude: number,
  accuracy: number,
  currentTemplate: SiteTemplate,
  templates: Array<SiteTemplate>,
  nodeNumber: number,
};

class AddSitePanel extends React.Component<Props, State> {
  constructor(props) {
    super(props);

    this.state = {
      // Site properties
      name: '',
      latitude: props.plannedSite ? props.plannedSite.latitude : 0,
      longitude: props.plannedSite ? props.plannedSite.longitude : 0,
      altitude: 0,
      accuracy: 40000000,

      currentTemplate: defaultTemplate,
      templates: basicTemplates,
      nodeNumber: 0,

      ...this.props.initialParams,
    };
  }

  componentDidUpdate(prevProps: Props) {
    // Update state if initial values were added
    // TODO Do this somewhere else?
    if (
      Object.keys(this.props.initialParams).length > 0 &&
      !isEqual(this.props.initialParams, prevProps.initialParams)
    ) {
      this.updateInitialParams();
    }

    // Update form values if plannedSite moved on the map
    if (!this.props.plannedSite) {
      return;
    }
    if (
      !prevProps.plannedSite ||
      this.props.plannedSite.latitude !== prevProps.plannedSite.latitude ||
      this.props.plannedSite.longitude !== prevProps.plannedSite.longitude
    ) {
      this.updateLatLong();
    }
  }

  updateInitialParams() {
    this.setState(this.props.initialParams);
  }

  updateLatLong() {
    const {plannedSite} = this.props;
    if (plannedSite) {
      this.setState({
        latitude: plannedSite.latitude,
        longitude: plannedSite.longitude,
      });
    }
  }

  updateTemplateDetails = (input: {
    detail: string,
    value: string | SiteTemplate,
  }) => {
    const {detail, value} = input;
    this.setState({[detail]: value});
  };

  onSubmit() {
    const {initialParams, onClose, networkName, formType} = this.props;
    const {currentTemplate, nodeNumber} = this.state;

    const site: SiteType = {
      name: this.state.name.trim(),
      location: {
        latitude: formParseFloat(this.state.latitude),
        longitude: formParseFloat(this.state.longitude),
        altitude: formParseFloat(this.state.altitude),
        accuracy: formParseFloat(this.state.accuracy),
      },
    };

    if (formType === FormType.CREATE && currentTemplate.name === 'blank') {
      sendTopologyBuilderRequest(networkName, 'addSite', {site}, onClose);
    } else if (
      formType === FormType.CREATE &&
      currentTemplate.name !== 'blank'
    ) {
      const template = {...currentTemplate};
      template.site = site;
      template.nodes = template.nodes.slice(0, nodeNumber);
      templateTopologyBuilderRequest({
        onClose,
        networkName,
        template,
      });
    } else if (formType === FormType.EDIT) {
      const data = {
        siteName: initialParams.name,
        newSite: site,
      };
      sendTopologyBuilderRequest(networkName, 'editSite', data, onClose);
    }
  }

  onFormPositionChange(position) {
    // Update the planned site position on the map based on a form change
    const {latitude, longitude} = position;
    const {plannedSite, onUpdatePlannedSite} = this.props;
    if (plannedSite) {
      onUpdatePlannedSite({
        latitude: latitude || plannedSite.latitude,
        longitude: longitude || plannedSite.longitude,
      });
    }
  }

  handleTemplateSelectionChange = newTemplateName => {
    const {templates} = this.state;
    const selectedTemplate = templates.find(
      template => template.name === newTemplateName,
    );
    this.setState({
      nodeNumber: selectedTemplate?.nodes.length,
      // $FlowFixMe: selectedTemplate could be null
      currentTemplate: {...selectedTemplate},
      name:
        selectedTemplate?.name && selectedTemplate?.name !== 'blank'
          ? selectedTemplate.name + '_' + Date.now()
          : '',
    });
  };

  renderForm() {
    const {classes, formType, onClose, topology, initialParams} = this.props;
    const {currentTemplate, templates, nodeNumber, name} = this.state;

    // Change form based on form type
    const submitButtonText =
      formType === FormType.EDIT ? 'Save Changes' : 'Add Site';

    // Create advancedInputs
    const advancedInputs = [
      {
        func: createNumericInput,
        label: 'Latitude',
        value: 'latitude',
        required: true,
        step: 0.00001,
        onChange: val =>
          this.onFormPositionChange({latitude: val, longitude: null}),
      },
      {
        func: createNumericInput,
        label: 'Longitude',
        value: 'longitude',
        required: true,
        step: 0.00001,
        onChange: val =>
          this.onFormPositionChange({longitude: val, latitude: null}),
      },
      {
        func: createNumericInput,
        label: 'Altitude',
        helperText: 'The altitude of the site (in meters).',
        value: 'altitude',
        required: true,
        step: 0.00001,
      },
      {
        func: createNumericInput,
        label: 'Accuracy',
        helperText: 'The accuracy of the given position (in meters).',
        value: 'accuracy',
        required: true,
        step: 0.001,
      },
    ];

    return (
      <Grid container direction="column" spacing={2}>
        <Grid item>
          <Typography className={classes.infoText} variant="body2">
            <InfoIcon classes={{root: classes.iconCentered}} />
            Move this site by dragging the white circle marker on the map.
          </Typography>
        </Grid>
        <Grid item>
          <PlannedSiteTemplates
            currentTemplate={currentTemplate}
            templates={templates}
            nodeNumber={nodeNumber}
            siteName={name}
            newSite={!initialParams.name}
            handleTemplateSelectionChange={this.handleTemplateSelectionChange}
            updateTemplateDetails={this.updateTemplateDetails}
            topology={topology}
          />
        </Grid>
        <Grid item>
          <ShowAdvanced
            children={advancedInputs.map(input =>
              input.func({...input}, this.state, this.setState.bind(this)),
            )}
          />
        </Grid>
        <div>
          <Button
            className={classes.button}
            variant="contained"
            color="primary"
            size="small"
            onClick={() => this.onSubmit()}>
            {submitButtonText}
          </Button>
          <Button
            className={classes.button}
            variant="outlined"
            size="small"
            onClick={() => onClose()}>
            Cancel
          </Button>
        </div>
      </Grid>
    );
  }

  render() {
    const {
      classes,
      className,
      expanded,
      onPanelChange,
      initialParams,
      formType,
    } = this.props;

    // Change form based on form type
    const title =
      formType === FormType.EDIT ? initialParams.name : 'Add Planned Site';
    const titleIcon =
      formType === FormType.EDIT ? (
        <EditIcon classes={{root: classes.iconCentered}} />
      ) : null;

    return (
      <CustomExpansionPanel
        className={className}
        title={title}
        titleIcon={titleIcon}
        details={this.renderForm()}
        expanded={expanded}
        onChange={onPanelChange}
        data-testid="add-site-panel"
      />
    );
  }
}

export default withStyles(styles)(AddSitePanel);
