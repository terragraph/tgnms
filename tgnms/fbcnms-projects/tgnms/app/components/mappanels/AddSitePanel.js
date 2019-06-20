/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 */
'use strict';

import Button from '@material-ui/core/Button';
import {
  createTextInput,
  createNumericInput,
  formParseFloat,
} from '../../helpers/FormHelpers';
import CustomExpansionPanel from '../common/CustomExpansionPanel';
import {
  getEditIcon,
  sendTopologyBuilderRequest,
  sendTopologyEditRequest,
} from '../../helpers/MapPanelHelpers';
import InfoIcon from '@material-ui/icons/Info';
import {isEqual} from 'lodash';
import PropTypes from 'prop-types';
import React from 'react';
import Typography from '@material-ui/core/Typography';
import {withStyles} from '@material-ui/core/styles';

const styles = theme => ({
  button: {
    margin: '8px 4px',
    float: 'right',
  },
  iconCentered: {
    verticalAlign: 'middle',
    paddingRight: theme.spacing.unit,
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

class AddSitePanel extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      // Site properties
      name: '',
      latitude: props.plannedSite ? props.plannedSite.latitude : 0,
      longitude: props.plannedSite ? props.plannedSite.longitude : 0,
      altitude: 0,
      accuracy: 40000000,

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
      this.setState(this.props.initialParams);
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
      this.setState({
        latitude: this.props.plannedSite.latitude,
        longitude: this.props.plannedSite.longitude,
      });
    }
  }

  onSubmit() {
    const {initialParams, onClose, networkName, formType} = this.props;

    const site = {
      name: this.state.name.trim(),
      location: {
        latitude: formParseFloat(this.state.latitude),
        longitude: formParseFloat(this.state.longitude),
        altitude: formParseFloat(this.state.altitude),
        accuracy: formParseFloat(this.state.accuracy),
      },
    };

    if (formType === FormType.CREATE) {
      sendTopologyBuilderRequest(networkName, 'addSite', {site}, 'site', {
        onSuccess: onClose,
      });
    } else if (formType === FormType.EDIT) {
      const data = {
        siteName: initialParams.name,
        newSite: site,
      };
      sendTopologyEditRequest(networkName, 'editSite', data, 'site', {
        onSuccess: onClose,
      });
    }
  }

  onFormPositionChange(position) {
    // Update the planned site position on the map based on a form change
    const {latitude, longitude} = position;
    const {plannedSite, onUpdatePlannedSite} = this.props;
    onUpdatePlannedSite({
      latitude: latitude || plannedSite.latitude,
      longitude: longitude || plannedSite.longitude,
    });
  }

  renderForm() {
    const {classes, formType} = this.props;

    // Change form based on form type
    const submitButtonText =
      formType === FormType.EDIT ? 'Save Changes' : 'Add Site';

    // Create inputs
    const inputs = [
      {
        func: createTextInput,
        label: 'Site Name',
        value: 'name',
        required: true,
      },
      {
        func: createNumericInput,
        label: 'Latitude',
        value: 'latitude',
        required: true,
        step: 0.00001,
        onChange: val => this.onFormPositionChange({latitude: val}),
      },
      {
        func: createNumericInput,
        label: 'Longitude',
        value: 'longitude',
        required: true,
        step: 0.00001,
        onChange: val => this.onFormPositionChange({longitude: val}),
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
      <div style={{width: '100%'}}>
        <Typography className={classes.infoText}>
          <InfoIcon classes={{root: classes.iconCentered}} />
          Move this site by dragging the white circle marker on the map.
        </Typography>

        {inputs.map(input =>
          input.func({...input}, this.state, this.setState.bind(this)),
        )}

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
            onClick={() => this.props.onClose()}>
            Cancel
          </Button>
        </div>
      </div>
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
      formType === FormType.EDIT
        ? getEditIcon({classes: {root: classes.iconCentered}})
        : null;

    return (
      <CustomExpansionPanel
        className={className}
        title={title}
        titleIcon={titleIcon}
        details={this.renderForm()}
        expanded={expanded}
        onChange={onPanelChange}
      />
    );
  }
}

AddSitePanel.propTypes = {
  classes: PropTypes.object.isRequired,
  className: PropTypes.string,
  expanded: PropTypes.bool.isRequired,
  onPanelChange: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
  formType: PropTypes.oneOf(Object.keys(FormType)),
  initialParams: PropTypes.object,
  networkName: PropTypes.string.isRequired,
  plannedSite: PropTypes.object,
  onUpdatePlannedSite: PropTypes.func,
};

export default withStyles(styles)(AddSitePanel);
