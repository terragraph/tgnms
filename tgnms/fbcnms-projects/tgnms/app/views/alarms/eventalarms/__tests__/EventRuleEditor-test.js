/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict-local
 * @format
 */
import 'jest-dom/extend-expect';
import * as React from 'react';
import EventRuleEditor from '../EventRuleEditor';
import nullthrows from '@fbcnms/util/nullthrows';
import {EventIdValueMap} from '../../../../../shared/types/Event';
import {Router} from 'react-router-dom';
import {SnackbarProvider} from 'notistack';
import {TestApp} from '../../../../tests/testHelpers';
import {act, cleanup, fireEvent, render} from '@testing-library/react';
import {createMemoryHistory} from 'history';
import {mockApiUtil} from '@fbcnms/alarms/test/testHelpers';

import type {EventRule} from '../EventAlarmsTypes';
import type {GenericRule} from '@fbcnms/alarms/components/rules/RuleInterface';

jest.mock('@material-ui/core/TextField', () => {
  const Input = require('@material-ui/core/Input').default;
  return ({children: _, InputProps: __, label, ...props}) => (
    <label>
      {label}
      <Input {...props} />
    </label>
  );
});

const commonProps = {
  apiUtil: mockApiUtil(),
  onRuleUpdated: jest.fn(),
  onExit: jest.fn(),
  isNew: true,
  onRuleSaved: jest.fn(),
};

afterEach(() => {
  cleanup();
  jest.clearAllMocks();
});

function Wrapper({children}) {
  return (
    <TestApp>
      {/* $FlowFixMe: MemoryHistory and react-router are incompatible */}
      <Router history={createMemoryHistory()}>{children}</Router>
    </TestApp>
  );
}

test('renders with default props', () => {
  render(
    <Wrapper>
      <SnackbarProvider>
        <EventRuleEditor {...commonProps} rule={null} />
      </SnackbarProvider>
    </Wrapper>,
  );
});

test('calls onRuleUpdated with latest form state', async () => {
  const {getByLabelText, getByTestId} = render(
    <Wrapper>
      <SnackbarProvider>
        <EventRuleEditor {...commonProps} isNew={true} rule={mockRule()} />
      </SnackbarProvider>
    </Wrapper>,
  );
  const setText = makeTextFieldSetter(getByLabelText);
  const setSelect = makeSelectFieldSetter(getByTestId);

  setText(/rule name/i, 'test rule');
  setSelect('event-id', 'event-id-menu', 'GPS_SYNC');
  setText(/description/i, 'test description');
  setSelect('raise-on-level', 'raise-on-level-menu', ['WARNING', 'ERROR']);
  setSelect('clear-on-level', 'clear-on-level-menu', ['INFO']);
  setText(/raise delay/i, 10);
  setText(/clear delay/i, 10);
  expect(commonProps.onRuleUpdated).toHaveBeenCalled();
  const lastUpdatedCall = commonProps.onRuleUpdated.mock.calls.slice(-1)[0][0];
  expect(lastUpdatedCall.rawRule).toMatchObject({
    name: 'test rule',
    description: 'test description',
    eventId: EventIdValueMap.GPS_SYNC,
    options: {
      raiseOnLevel: ['WARNING', 'ERROR'],
      clearOnLevel: ['INFO'],
      raiseDelay: 10,
      clearDelay: 10,
    },
  });
});

test('rendering with isNew shows ADD or EDIT button', () => {
  const {getByText, rerender} = render(
    <Wrapper>
      <SnackbarProvider>
        <EventRuleEditor {...commonProps} isNew={true} rule={null} />
      </SnackbarProvider>
    </Wrapper>,
  );
  expect(getByText(/add$/i)).toBeInTheDocument();
  rerender(
    <Wrapper>
      <SnackbarProvider>
        <EventRuleEditor {...commonProps} isNew={false} rule={null} />
      </SnackbarProvider>
    </Wrapper>,
  );
  expect(getByText(/save/i)).toBeInTheDocument();
});

function mockRule(): GenericRule<EventRule> {
  const rule: EventRule = {
    name: '',
    description: '',
    eventId: 101,
    severity: 'MINOR',
    options: {
      raiseOnLevel: [],
      clearOnLevel: [],
      raiseDelay: 30,
      clearDelay: 30,
      aggregation: 0,
      eventFilter: [],
      attributeFilter: [],
    },
    extraLabels: {},
    extraAnnotations: {},
  };
  return {
    name: 'rule',
    severity: 'info',
    ruleType: 'event',
    description: 'rule description',
    period: '1s',
    expression: '',
    rawRule: rule,
  };
}

function makeTextFieldSetter(getterFn) {
  return (query, value) => {
    act(() => {
      try {
        fireEvent.change(getterFn(query), {target: {value: value}});
      } catch (err) {
        /**
         * Attempting to change an input which does not have a value setter will
         * throw an error. This just logs the query before rethrowing the error
         * to make it easier to determine which input caused the error.
         */
        // eslint-disable-next-line no-console
        console.log(query.toString());
        throw err;
      }
    });
  };
}

function makeSelectFieldSetter(getterFn) {
  return (
    query: string | RegExp,
    menuQuery: string | RegExp,
    value: string | number | Array<string | number>,
  ) => {
    act(() => {
      fireEvent.mouseDown(getterFn(query));
    });
    const menu = getterFn(menuQuery);
    const vals =
      typeof value === 'string' || typeof value === 'number' ? [value] : value;
    for (const val of vals) {
      act(() => {
        fireEvent.click(nullthrows(menu.querySelector(`[data-text="${val}"]`)));
      });
    }
  };
}
