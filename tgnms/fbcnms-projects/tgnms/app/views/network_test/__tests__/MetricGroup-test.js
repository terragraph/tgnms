/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow strict-local
 */

import 'jest-dom/extend-expect';
import MaterialTheme from '../../../MaterialTheme';
import MetricGroup from '../MetricGroup';
import React from 'react';
import {render} from '@testing-library/react';

const defaultProps = {
  header: 'testHeader',
  metrics: [],
};

test('renders with nothing other than header and empty metrics', () => {
  const {getByText} = render(
    <MaterialTheme>
      <MetricGroup {...defaultProps} />
    </MaterialTheme>,
  );
  expect(getByText('testHeader')).toBeInTheDocument();
});

test('renders metrics', () => {
  const {getByText} = render(
    <MaterialTheme>
      <MetricGroup
        {...defaultProps}
        metrics={[{val: 10, label: 'testMetric'}]}
      />
    </MaterialTheme>,
  );
  expect(getByText('testHeader')).toBeInTheDocument();
  expect(getByText('testMetric')).toBeInTheDocument();
  expect(getByText('10')).toBeInTheDocument();
});

test('renders group wide metric units', () => {
  const {getByText} = render(
    <MaterialTheme>
      <MetricGroup
        {...defaultProps}
        groupUnits="testUnit"
        metrics={[{val: 10, label: 'testMetric'}]}
      />
    </MaterialTheme>,
  );
  expect(getByText('10 testUnit')).toBeInTheDocument();
});

test('renders group units are overwritten by metric units', () => {
  const {getByText} = render(
    <MaterialTheme>
      <MetricGroup
        {...defaultProps}
        groupUnits="wrongTestUnit"
        metrics={[{val: 10, label: 'testMetric', metricUnit: 'thisUnit'}]}
      />
    </MaterialTheme>,
  );
  expect(getByText('10 thisUnit')).toBeInTheDocument();
});

test('renders na if val is null', () => {
  const {getByText} = render(
    <MaterialTheme>
      <MetricGroup
        {...defaultProps}
        metrics={[{val: null, label: 'testMetric'}]}
      />
    </MaterialTheme>,
  );
  expect(getByText('N/A')).toBeInTheDocument();
});

test('renders tooltip', () => {
  const {getByText} = render(
    <MaterialTheme>
      <MetricGroup {...defaultProps} toolTip={<div>toolTipTest</div>} />
    </MaterialTheme>,
  );
  expect(getByText('toolTipTest')).toBeInTheDocument();
});
