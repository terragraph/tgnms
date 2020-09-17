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
import Attachment from '@material-ui/icons/Attachment';
import Button from '@material-ui/core/Button';
import Grid from '@material-ui/core/Grid';
import IconButton from '@material-ui/core/IconButton';
import InputLabel from '@material-ui/core/InputLabel';
import MenuItem from '@material-ui/core/MenuItem';
import RemoveCircleIcon from '@material-ui/icons/RemoveCircle';
import Select from '@material-ui/core/Select';
import TextField from '@material-ui/core/TextField';
import useRouter from '../../../hooks/useRouter';
import {LABEL_OPERATORS} from '../../prometheus/PromQLTypes';
import {groupBy} from 'lodash';
import {makeStyles} from '@material-ui/styles';
import {useAlarmContext} from '../../AlarmContext';
import {useEnqueueSnackbar} from '../../../hooks/useSnackbar';

import type {BinaryComparator} from '../../prometheus/PromQLTypes';
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

function ConditionSelector(props: {
  onChange: (expression: ThresholdExpression) => void,
  expression: ThresholdExpression,
}) {
  const conditions: Array<BinaryComparator> = [
    '>',
    '<',
    '==',
    '>=',
    '<=',
    '!=',
  ];
  return (
    <Grid>
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
            comparator: new PromQL.BinaryComparator(
              // Cast to element type of conditions as it's item type
              ((target.value: any): $ElementType<typeof conditions, 0>),
            ),
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
}

function ValueSelector(props: {
  onChange: (expression: ThresholdExpression) => void,
  expression: ThresholdExpression,
}) {
  return (
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
}

function MetricSelector(props: {
  expression: ThresholdExpression,
  onChange: (expression: ThresholdExpression) => void,
  metricsByName: {[string]: Array<prometheus_labelset>},
}) {
  return (
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
        {getFilteredListOfLabelNames(Object.keys(props.metricsByName)).map(
          item => (
            <MenuItem key={item} value={item}>
              {item}
            </MenuItem>
          ),
        )}
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
}

function ThresholdExpressionEditor(props: {
  onChange: (expression: ThresholdExpression) => void,
  expression: ThresholdExpression,
  metricsByName: {[string]: Array<prometheus_labelset>},
  onToggleChange: void => void,
}) {
  return (
    <Grid item container spacing={1}>
      <Grid
        item
        container
        spacing={1}
        alignItems="flex-end"
        justify="space-between">
        <Grid item xs={7}>
          <MetricSelector
            expression={props.expression}
            onChange={props.onChange}
            metricsByName={props.metricsByName}
          />
        </Grid>
        <Grid item xs={3}>
          <ConditionSelector
            expression={props.expression}
            onChange={props.onChange}
          />
        </Grid>
        <Grid item xs={2}>
          <ValueSelector
            expression={props.expression}
            onChange={props.onChange}
          />
        </Grid>
      </Grid>
      <Grid item xs={12}>
        <MetricFilters
          metricsByName={props.metricsByName || {}}
          expression={props.expression}
          onChange={props.onChange}
          onToggleChange={props.onToggleChange}
        />
      </Grid>
    </Grid>
  );
}

function MetricFilters(props: {
  metricsByName: {[string]: Array<prometheus_labelset>},
  expression: ThresholdExpression,
  onChange: (expression: ThresholdExpression) => void,
  onToggleChange: void => void,
}) {
  const classes = useStyles();
  return (
    <Grid item container direction="column">
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
      <Grid item container direction="column" spacing={3}>
        {props.expression.filters.labels.map((filter, idx) => (
          <Grid item>
            <MetricFilter
              key={idx}
              metricsByName={props.metricsByName}
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
      </Grid>
    </Grid>
  );
}

function MetricFilter(props: {
  metricsByName: {[string]: Array<prometheus_labelset>},
  onChange: (expression: ThresholdExpression) => void,
  onRemove: (filerIdx: number) => void,
  expression: ThresholdExpression,
  filterIdx: number,
  selectedLabel: string,
  selectedValue: string,
}) {
  const currentFilter = props.expression.filters.labels[props.filterIdx];
  return (
    <Grid item container xs={12} spacing={2} alignItems="flex-end">
      <Grid item xs={1}>
        <IconButton disabled>
          <Attachment />
        </IconButton>
      </Grid>
      <Grid item xs={6}>
        <InputLabel htmlFor={'metric-input-' + props.filterIdx}>
          Metric
        </InputLabel>
        <FilterSelector
          id={'metric-input-' + props.filterIdx}
          fullWidth
          values={getFilteredListOfLabelNames(Object.keys(props.metricsByName))}
          defaultVal=""
          onChange={({target}) => {
            const filtersCopy = props.expression.filters.copy();
            filtersCopy.setIndex(props.filterIdx, target.value, '');
            props.onChange({...props.expression, filters: filtersCopy});
          }}
          selectedValue={props.selectedLabel}
        />
      </Grid>
      <Grid item xs={2}>
        <Grid>
          <InputLabel htmlFor={'condition-input-' + props.filterIdx}>
            Condition
          </InputLabel>
          <TextField
            id={'condition-input-' + props.filterIdx}
            fullWidth
            required
            select
            value={currentFilter.operator}
            onChange={({target}) => {
              const filtersCopy = props.expression.filters.copy();
              const filterOperator = isRegexValue(target.value) ? '=~' : '=';
              filtersCopy.setIndex(
                props.filterIdx,
                currentFilter.name,
                currentFilter.value,
                filterOperator,
              );
              props.onChange({...props.expression, filters: filtersCopy});
            }}>
            {LABEL_OPERATORS.map(item => (
              <MenuItem key={item} value={item}>
                {item}
              </MenuItem>
            ))}
          </TextField>
        </Grid>
      </Grid>
      <Grid item xs={2}>
        <Grid item>
          <InputLabel htmlFor={'value-input-' + props.filterIdx}>
            Value
          </InputLabel>
          <TextField
            id={'value-input-' + props.filterIdx}
            fullWidth
            value={currentFilter.value}
            type="number"
            onChange={({target}) => {
              const filtersCopy = props.expression.filters.copy();
              filtersCopy.setIndex(
                props.filterIdx,
                currentFilter.name,
                target.value,
                currentFilter.operator,
              );
              props.onChange({
                ...props.expression,
                filters: filtersCopy,
              });
            }}
          />
        </Grid>
      </Grid>
      <Grid item xs={1}>
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
      fullWidth
      disabled={props.disabled}
      displayEmpty
      className={classes.metricFilterItem}
      value={props.selectedValue}
      onChange={props.onChange}>
      <MenuItem disabled value="">
        {props.defaultVal}
      </MenuItem>
      {menuItems}
    </Select>
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
