/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import * as React from 'react';

import FormControl from '@material-ui/core/FormControl';
import FormHelperText from '@material-ui/core/FormHelperText';
import Grid from '@material-ui/core/Grid';
import InputLabel from '@material-ui/core/InputLabel';
import MenuItem from '@material-ui/core/MenuItem';
import Paper from '@material-ui/core/Paper';
import RuleEditorBase from '@fbcnms/alarms/components/rules/RuleEditorBase';
import Select from '@material-ui/core/Select';
import TextField from '@material-ui/core/TextField';
import Typography from '@material-ui/core/Typography';
import useForm from '@fbcnms/tg-nms/app/hooks/useForm';
import yellow from '@material-ui/core/colors/yellow';
import {
  EventIdValueMap,
  EventLevelValueMap,
} from '@fbcnms/tg-nms/shared/types/Event';
import {Severity} from './EventAlarmsTypes';
import {TgEventAlarmsApiUtil} from '../TgAlarmApi';
import {makeStyles} from '@material-ui/styles';
import {objectEntriesTypesafe} from '@fbcnms/tg-nms/app/helpers/ObjectHelpers';
import {useNetworkId} from '@fbcnms/alarms/components/hooks';
import {useSnackbars} from '@fbcnms/tg-nms/app/hooks/useSnackbar';

import type {EventRule} from './EventAlarmsTypes';
import type {
  GenericRule,
  RuleEditorProps,
} from '@fbcnms/alarms/components/rules/RuleInterface';
import type {RuleEditorBaseFields} from '@fbcnms/alarms/components/rules/RuleEditorBase';

const useStyles = makeStyles(theme => ({
  instructions: {
    marginTop: theme.spacing(1),
    marginBottom: theme.spacing(1),
  },
  helpButton: {
    color: 'black',
  },
  warningAlert: {
    marginTop: theme.spacing(),
    marginBottom: theme.spacing(3),
    padding: theme.spacing(),
    backgroundColor: yellow[100],
    color: yellow[800],
  },
}));

export default function EventRuleEditor(props: RuleEditorProps<EventRule>) {
  const {isNew, onRuleUpdated, onExit, rule} = props;
  const classes = useStyles();
  const snackbars = useSnackbars();
  const networkId = useNetworkId();
  const handleFormUpdated = React.useCallback(
    (state: EventRule) => {
      onRuleUpdated({
        ...rule,
        ...({
          rawRule: state,
        }: $Shape<GenericRule<EventRule>>),
      });
    },
    [rule, onRuleUpdated],
  );

  const {formState, updateFormState, handleInputChange} = useForm({
    initialState: fromGenericRule(rule),
    onFormUpdated: handleFormUpdated,
  });

  /**
   * Handles when the RuleEditorBase form changes, map this from
   * RuleEditorForm -> EventRule
   */
  const handleEditorBaseChange = React.useCallback(
    editorBaseState => {
      updateFormState({
        name: editorBaseState.name,
        description: editorBaseState.description,
        extraLabels: editorBaseState.labels,
      });
    },
    [updateFormState],
  );

  const saveAlert = React.useCallback(async () => {
    try {
      if (isNew) {
        await TgEventAlarmsApiUtil.createAlertRule({
          networkId,
          rule: formState,
        });
      }
      snackbars.success(`Successfully saved alert rule`);
      onExit();
    } catch (error) {
      snackbars.error(`Could not create alert rule: ${error.message}`);
    }
  }, [isNew, networkId, onExit, formState, snackbars]);

  return (
    <RuleEditorBase
      isNew={isNew}
      onExit={onExit}
      onSave={saveAlert}
      initialState={toBaseFields(rule)}
      onChange={handleEditorBaseChange}>
      <>
        <Grid container item xs={12} direction={'column'} spacing={3}>
          {!isNew && (
            <Paper className={classes.warningAlert} elevation={0}>
              <Typography variant="body1">
                Editing event based rules is not currently supported. Please
                delete this rule and create a new one.
              </Typography>
            </Paper>
          )}

          <Grid item>
            <EventIdSelect
              disabled={!isNew}
              required
              value={formState.eventId}
              id="event-id"
              label="Event"
              helpText="Which event raises this alert"
              onChange={handleInputChange(val => ({eventId: parseInt(val)}))}
            />
          </Grid>
          <Grid item>
            <SeveritySelect
              disabled={!isNew}
              required
              value={formState.severity}
              id="severity"
              label="Severity"
              helpText="The severity of the raised alert"
              onChange={handleInputChange(val => ({severity: val}))}
            />
          </Grid>
          <Grid item>
            <EventLevelSelect
              disabled={!isNew}
              required
              id="raise-on-level"
              label="Raise on level"
              helpText="Event levels to raise this alert"
              value={formState.options.raiseOnLevel}
              onChange={handleInputChange(val => ({
                options: {...formState.options, raiseOnLevel: val},
              }))}
            />
          </Grid>
          <Grid item>
            <EventLevelSelect
              disabled={!isNew}
              required
              id="clear-on-level"
              label="Clear on level"
              helpText="Event levels to clear this alert"
              value={formState.options.clearOnLevel}
              onChange={handleInputChange(val => ({
                options: {...formState.options, clearOnLevel: val},
              }))}
            />
          </Grid>
          <Grid item>
            <TextField
              disabled={!isNew}
              required
              type="number"
              placeholder="Seconds"
              label="Raise Delay"
              fullWidth
              value={formState.options.raiseDelay}
              onChange={handleInputChange(val => ({
                options: {...formState.options, raiseDelay: parseInt(val)},
              }))}
            />
          </Grid>
          <Grid item>
            <TextField
              disabled={!isNew}
              required
              type="number"
              placeholder="Seconds"
              label="Clear Delay"
              fullWidth
              value={formState.options.clearDelay}
              onChange={handleInputChange(val => ({
                options: {...formState.options, clearDelay: parseInt(val)},
              }))}
            />
          </Grid>
          <Grid item>
            <TextField
              disabled={!isNew}
              required
              type="number"
              placeholder="0"
              label="Minimum firing entities"
              fullWidth
              value={formState.options.aggregation}
              onChange={handleInputChange(val => ({
                options: {...formState.options, aggregation: parseInt(val)},
              }))}
            />
          </Grid>
        </Grid>
      </>
    </RuleEditorBase>
  );
}

function EventIdSelect(
  props: $Diff<SelectFieldProps, {options: SelectOptions}>,
) {
  const eventOptions = React.useMemo(
    () =>
      objectEntriesTypesafe<string, number>(EventIdValueMap)
        .sort()
        .map(([eventName, eventId]) => ({
          label: eventName,
          value: eventId,
        })),
    [],
  );

  return <SelectField {...props} options={eventOptions} />;
}

function EventLevelSelect(
  props: $Diff<SelectFieldProps, {options: SelectOptions}>,
) {
  const levelOptions = React.useMemo(
    () =>
      Object.keys(EventLevelValueMap).map(key => ({
        label: key,
        value: key,
      })),
    [],
  );

  return <SelectField {...props} multiple options={levelOptions} />;
}

function SeveritySelect(
  props: $Diff<SelectFieldProps, {options: SelectOptions}>,
) {
  const severityOptions = React.useMemo(
    () =>
      Object.keys(Severity).map(key => ({
        label: key,
        value: key,
      })),
    [],
  );
  return <SelectField {...props} options={severityOptions} />;
}

type SelectOptions = Array<{label: string, value: string | number}>;
type SelectValue = $ReadOnlyArray<string | number> | string | number;
type SelectFieldProps = {
  value: ?SelectValue,
  onChange: (event: SyntheticInputEvent<HTMLElement>) => void,
  id: string,
  label: string,
  options: SelectOptions,
  helpText?: string,
};

function SelectField({
  value,
  options,
  onChange,
  helpText,
  label,
  id,
  ...props
}: SelectFieldProps) {
  const labelId = `${id}-label`;
  const selectDisplayProps = React.useMemo(() => ({'data-testid': id}), [id]);
  const menuProps = React.useMemo(() => ({'data-testid': `${id}-menu`}), [id]);
  return (
    <FormControl fullWidth>
      <InputLabel id={labelId}>{label}</InputLabel>
      <Select
        {...props}
        id={id}
        labelId={labelId}
        value={value}
        onChange={onChange}
        fullWidth
        SelectDisplayProps={selectDisplayProps}
        MenuProps={menuProps}>
        {options.map(option => (
          <MenuItem
            key={option.value}
            value={option.value}
            // for querying during testing
            data-text={option.label}>
            {option.label}
          </MenuItem>
        ))}
      </Select>
      {helpText && <FormHelperText>{helpText}</FormHelperText>}
    </FormControl>
  );
}

function fromGenericRule(genericRule?: ?GenericRule<EventRule>): EventRule {
  if (genericRule) {
    return genericRule.rawRule;
  }
  return {
    name: '',
    description: '',
    eventId: EventIdValueMap.CONFIG_CONTROL_SUPERFRAME_INFO,
    severity: Severity.MINOR,
    options: {
      raiseOnLevel: ['WARNING', 'ERROR', 'FATAL'],
      clearOnLevel: ['INFO'],
      raiseDelay: 30,
      clearDelay: 30,
      aggregation: 0,
      eventFilter: [],
      attributeFilter: [{map: {}}],
    },
    extraLabels: {},
    extraAnnotations: {},
  };
}

/**
 * Map from rule-specific type to the generic RuleEditorBaseFields
 */
function toBaseFields(rule: ?GenericRule<EventRule>): RuleEditorBaseFields {
  return {
    name: rule?.name || '',
    description: rule?.description || '',
    labels: rule?.rawRule?.extraLabels || {},
  };
}
