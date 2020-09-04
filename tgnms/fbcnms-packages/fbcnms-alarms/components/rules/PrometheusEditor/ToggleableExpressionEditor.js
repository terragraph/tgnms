/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 * @format
 */

import * as PromQL from '../../prometheus/PromQL';
import * as React from 'react';
import Autocomplete from '@material-ui/lab/Autocomplete';
import Button from '@material-ui/core/Button';
import FormLabel from '@material-ui/core/FormLabel';
import Grid from '@material-ui/core/Grid';
import IconButton from '@material-ui/core/IconButton';
import InputLabel from '@material-ui/core/InputLabel';
import MenuItem from '@material-ui/core/MenuItem';
import RemoveCircleIcon from '@material-ui/icons/RemoveCircle';
import Select from '@material-ui/core/Select';
import TextField from '@material-ui/core/TextField';
import useRouter from '../../../hooks/useRouter';
import {groupBy} from 'lodash';
import {makeStyles} from '@material-ui/styles';
import {useAlarmContext} from '../../AlarmContext';
import {useEnqueueSnackbar} from '../../../hooks/useSnackbar';

import type {InputChangeFunc} from './PrometheusEditor';

type prometheus_labelset = {
  [string]: string,
};

const useStyles = makeStyles(theme => ({
  button: {
    marginLeft: -theme.spacing(0.5),
    margin: theme.spacing(1.5),
  },
  instructions: {
    marginTop: theme.spacing(1),
    marginBottom: theme.spacing(1),
  },
  helpButton: {
    color: 'black',
  },
  labeledToggleSwitch: {
    paddingBottom: 0,
  },
  metricFilterItem: {
    marginRight: theme.spacing(1),
  },
}));

export type ThresholdExpression = {
  metricName: string,
  comparator: PromQL.BinaryComparator,
  filters: PromQL.Labels,
  value: number,
};

export function thresholdToPromQL(
  thresholdExpression: ThresholdExpression,
): string {
  if (!thresholdExpression.comparator || !thresholdExpression.metricName) {
    return '';
  }
  const {metricName, comparator, filters, value} = thresholdExpression;
  const metricSelector = new PromQL.InstantSelector(metricName, filters);
  const exp = new PromQL.BinaryOperation(
    metricSelector,
    new PromQL.Scalar(value),
    comparator,
  );
  return exp.toPromQL();
}

export default function ToggleableExpressionEditor(props: {
  onChange: InputChangeFunc,
  onThresholdExpressionChange: (expresion: ThresholdExpression) => void,
  expression: ThresholdExpression,
  stringExpression: string,
  toggleOn: boolean,
  onToggleChange: void => void,
}) {
  const {apiUtil} = useAlarmContext();
  const {match} = useRouter();
  const enqueueSnackbar = useEnqueueSnackbar();
  const {response, error} = apiUtil.useAlarmsApi(apiUtil.getMetricSeries, {
    networkId: match.params.networkId,
  });
  if (error) {
    enqueueSnackbar('Error retrieving metrics: ' + error, {
      variant: 'error',
    });
  }
  const metricsByName = groupBy(response, '__name__');

  return (
    <Grid container item xs={12}>
      <ThresholdExpressionEditor
        onChange={props.onThresholdExpressionChange}
        expression={props.expression}
        metricsByName={metricsByName}
        onToggleChange={props.onToggleChange}
      />
    </Grid>
  );
}

export function AdvancedExpressionEditor(props: {
  onChange: InputChangeFunc,
  expression: string,
}) {
  return (
    <Grid item>
      <InputLabel htmlFor="metric-advanced-input">Metric</InputLabel>
      <TextField
        id="metric-advanced-input"
        required
        placeholder="SNR >= 0"
        value={props.expression}
        onChange={props.onChange(value => ({expression: value}))}
        fullWidth
      />
    </Grid>
  );
}

function ThresholdExpressionEditor(props: {
  onChange: (expression: ThresholdExpression) => void,
  expression: ThresholdExpression,
  metricsByName: {[string]: Array<prometheus_labelset>},
  onToggleChange: void => void,
}) {
  const metricSelector = (
    <Grid item>
      <InputLabel htmlFor="metric-input">Metric</InputLabel>
      <TextField
        id="metric-input"
        fullWidth
        required
        select
        value={props.expression.metricName || ''}
        onChange={({target}) => {
          props.onChange({...props.expression, metricName: target.value});
        }}>
        {Object.keys(props.metricsByName).map(item => (
          <MenuItem key={item} value={item}>
            {item}
          </MenuItem>
        ))}
        {props.metricsByName[props.expression.metricName] ? (
          ''
        ) : (
          <MenuItem
            key={props.expression.metricName}
            value={props.expression.metricName}>
            {props.expression.metricName}
          </MenuItem>
        )}
      </TextField>
    </Grid>
  );
  const conditions = ['>', '<', '==', '>=', '<=', '!='];
  const conditionSelector = (
    <Grid item>
      <InputLabel htmlFor="condition-input">Condition</InputLabel>
      <TextField
        id="condition-input"
        fullWidth
        required
        select
        value={props.expression.comparator.op}
        onChange={({target}) => {
          props.onChange({
            ...props.expression,
            comparator: new PromQL.BinaryComparator(target.value),
          });
        }}>
        {conditions.map(item => (
          <MenuItem key={item} value={item}>
            {item}
          </MenuItem>
        ))}
      </TextField>
    </Grid>
  );
  const valueSelector = (
    <Grid item>
      <InputLabel htmlFor="value-input">Value</InputLabel>
      <TextField
        id="value-input"
        fullWidth
        value={props.expression.value}
        type="number"
        onChange={({target}) => {
          props.onChange({
            ...props.expression,
            value: parseFloat(target.value),
          });
        }}
      />
    </Grid>
  );

  return (
    <>
      <Grid
        item
        container
        spacing={1}
        alignItems="flex-start"
        justify="space-between">
        <Grid item xs={5}>
          {metricSelector}
        </Grid>
        <Grid item xs={4}>
          {conditionSelector}
        </Grid>
        <Grid item xs={3}>
          {valueSelector}
        </Grid>
      </Grid>
      <Grid item xs={12}>
        {props.expression.filters.len() > 0 ? (
          <FormLabel>For metrics matching:</FormLabel>
        ) : (
          <></>
        )}
        <MetricFilters
          metricSeries={props.metricsByName[props.expression?.metricName] || []}
          expression={props.expression}
          onChange={props.onChange}
          onToggleChange={props.onToggleChange}
        />
      </Grid>
    </>
  );
}

function MetricFilters(props: {
  metricSeries: Array<prometheus_labelset>,
  expression: ThresholdExpression,
  onChange: (expression: ThresholdExpression) => void,
  onToggleChange: void => void,
}) {
  const classes = useStyles();
  return (
    <Grid container>
      {props.expression.filters.labels.map((filter, idx) => (
        <Grid item xs={12}>
          <MetricFilter
            key={idx}
            metricSeries={props.metricSeries}
            onChange={props.onChange}
            onRemove={filterIdx => {
              const filtersCopy = props.expression.filters.copy();
              filtersCopy.remove(filterIdx);
              props.onChange({...props.expression, filters: filtersCopy});
            }}
            expression={props.expression}
            filterIdx={idx}
            selectedLabel={filter.name}
            selectedValue={filter.value}
          />
        </Grid>
      ))}
      <Grid item>
        <Button
          className={classes.button}
          color="primary"
          size="small"
          onClick={() => {
            const filtersCopy = props.expression.filters.copy();
            filtersCopy.addEqual('', '');
            props.onChange({
              ...props.expression,
              filters: filtersCopy,
            });
          }}>
          Add new conditional
        </Button>
        <Button
          className={classes.button}
          color="primary"
          size="small"
          onClick={props.onToggleChange}>
          Write a custom expression
        </Button>
      </Grid>
    </Grid>
  );
}

function MetricFilter(props: {
  metricSeries: Array<prometheus_labelset>,
  onChange: (expression: ThresholdExpression) => void,
  onRemove: (filerIdx: number) => void,
  expression: ThresholdExpression,
  filterIdx: number,
  selectedLabel: string,
  selectedValue: string,
}) {
  const labelNames: Array<string> = [];
  props.metricSeries.forEach(metric => {
    labelNames.push(...Object.keys(metric));
  });
  labelNames.push(props.selectedLabel);

  return (
    <Grid container xs={12} spacing={1} alignItems="center">
      <Grid item>
        <FilterSelector
          values={getFilteredListOfLabelNames([...new Set(labelNames)])}
          defaultVal="Label"
          onChange={({target}) => {
            const filtersCopy = props.expression.filters.copy();
            filtersCopy.setIndex(props.filterIdx, target.value, '');
            props.onChange({...props.expression, filters: filtersCopy});
          }}
          selectedValue={props.selectedLabel}
        />
      </Grid>
      <Grid item xs={3}>
        <FilterAutocomplete
          values={
            props.selectedLabel
              ? [
                  ...new Set(
                    props.metricSeries.map(item => item[props.selectedLabel]),
                  ),
                ]
              : []
          }
          disabled={props.selectedLabel == ''}
          defaultVal="Value"
          onChange={(event, value) => {
            // TODO: This is here because we have to pass the onChange function
            // to both the Autocomplete element and the TextInput element
            // T57876329
            if (!value) {
              value = event.target.value;
            }
            const filtersCopy = props.expression.filters.copy();
            const filterOperator = isRegexValue(value) ? '=~' : '=';
            filtersCopy.setIndex(
              props.filterIdx,
              filtersCopy.labels[props.filterIdx].name,
              value || '',
              filterOperator,
            );
            props.onChange({...props.expression, filters: filtersCopy});
          }}
          updateExpression={props.onChange}
          selectedValue={props.selectedValue}
        />
      </Grid>
      <Grid item>
        <IconButton onClick={() => props.onRemove(props.filterIdx)}>
          <RemoveCircleIcon />
        </IconButton>
      </Grid>
    </Grid>
  );
}

function FilterSelector(props: {
  values: Array<string>,
  defaultVal: string,
  onChange: (event: SyntheticInputEvent<HTMLElement>) => void,
  selectedValue: string,
  disabled?: boolean,
}) {
  const classes = useStyles();
  const menuItems = props.values.map(val => (
    <MenuItem value={val} key={val}>
      {val}
    </MenuItem>
  ));

  return (
    <Select
      disabled={props.disabled}
      displayEmpty
      className={classes.metricFilterItem}
      value={props.selectedValue}
      onChange={props.onChange}>
      <MenuItem disabled value="">
        <em>{props.defaultVal}</em>
      </MenuItem>
      {menuItems}
    </Select>
  );
}

function FilterAutocomplete(props: {
  values: Array<string>,
  defaultVal: string,
  onChange: (event: SyntheticInputEvent<HTMLElement>) => void,
  selectedValue: string,
  disabled?: boolean,
}) {
  return (
    <Autocomplete
      freeSolo
      options={props.values}
      onChange={props.onChange}
      value={props.selectedValue}
      renderInput={({inputProps, ...params}) => (
        <TextField
          {...params}
          inputProps={{
            ...inputProps,
            autoComplete: 'off',
            onChange: props.onChange,
          }}
          disabled={props.values.length === 0}
          label={props.defaultVal}
          margin="normal"
          variant="filled"
          fullWidth
        />
      )}
    />
  );
}

// Labels we don't want to show during metric filtering since they are useless
const forbiddenLabels = new Set(['networkID', '__name__']);
function getFilteredListOfLabelNames(labelNames: Array<string>): Array<string> {
  return labelNames.filter(label => !forbiddenLabels.has(label));
}

// Checks if a value has regex characters
function isRegexValue(value: string): boolean {
  const regexChars = '.+*|?()[]{}:=';
  for (const char of regexChars.split('')) {
    if (value.includes(char)) {
      return true;
    }
  }
  return false;
}
