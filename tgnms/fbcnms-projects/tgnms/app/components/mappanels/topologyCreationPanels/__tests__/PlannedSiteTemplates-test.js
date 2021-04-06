/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import PlannedSiteTemplates from '../PlannedSiteTemplates';
import React from 'react';
import {
  TestApp,
  mockTopology,
  renderAsync,
} from '../../../../tests/testHelpers';
import {
  basicTemplates,
  defaultTemplate,
} from '../../../../constants/TemplateConstants';
import {fireEvent, render} from '@testing-library/react';

const defaultProps = {
  currentTemplate: defaultTemplate,
  templates: [defaultTemplate, ...basicTemplates],
  handleTemplateSelectionChange: jest.fn(),
  nodeNumber: 4,
  siteName: 'testSite',
  updateTemplateDetails: jest.fn(),
  topology: mockTopology(),
  newSite: true,
};

test('renders with None without crashing', () => {
  const {getByText} = render(
    <TestApp>
      <PlannedSiteTemplates {...defaultProps} />
    </TestApp>,
  );
  expect(getByText('Select Site Template')).toBeInTheDocument();
});

test('1 node template does not show node selector', async () => {
  const {getByText, queryByText} = await renderAsync(
    <TestApp>
      <PlannedSiteTemplates
        {...defaultProps}
        currentTemplate={basicTemplates[0]}
      />
    </TestApp>,
  );
  expect(getByText('Select Site Template')).toBeInTheDocument();
  expect(queryByText('Select Number of Nodes')).not.toBeInTheDocument();
});

test('multi node template shows node selector', async () => {
  const {getByText} = await renderAsync(
    <TestApp>
      <PlannedSiteTemplates
        {...defaultProps}
        currentTemplate={basicTemplates[1]}
      />
    </TestApp>,
  );
  expect(getByText('Select Site Template')).toBeInTheDocument();
  expect(getByText('Select Number of Nodes')).toBeInTheDocument();
});

test('link selector renders with None', async () => {
  const {getByText} = await renderAsync(
    <TestApp>
      <PlannedSiteTemplates
        {...defaultProps}
        currentTemplate={basicTemplates[1]}
      />
    </TestApp>,
  );
  expect(getByText('Select Links')).toBeInTheDocument();
});

test('changing template calls handleTemplateSelectionChange', async () => {
  const {getByText} = await renderAsync(
    <TestApp>
      <PlannedSiteTemplates {...defaultProps} />
    </TestApp>,
  );
  expect(getByText('None')).toBeInTheDocument();
  fireEvent.mouseDown(getByText('None'));
  expect(getByText('DN Template')).toBeInTheDocument();
  fireEvent.click(getByText('DN Template'));
  expect(defaultProps.handleTemplateSelectionChange).toHaveBeenCalled();
});

test('new site set to false cuases no tempaltes to show up', () => {
  const {getByText, queryByText} = render(
    <TestApp>
      <PlannedSiteTemplates {...defaultProps} newSite={false} />
    </TestApp>,
  );
  expect(queryByText('None')).not.toBeInTheDocument();
  expect(getByText('Site Name')).toBeInTheDocument();
});
