/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import * as React from 'react';
import PlanningToggle from '../PlanningToggle';
import {
  MapContextWrapper,
  TestApp,
  mockMapboxRef,
} from '@fbcnms/tg-nms/app/tests/testHelpers';
import {NetworkPlanningContextProvider} from '@fbcnms/tg-nms/app/contexts/NetworkPlanningContext';
import {act, fireEvent, render} from '@testing-library/react';
import type {MapContext} from '@fbcnms/tg-nms/app/contexts/MapContext';

jest.mock('@fbcnms/tg-nms/app/apiutils/MapAPIUtil');
jest
  .spyOn(
    require('@fbcnms/tg-nms/app/constants/FeatureFlags'),
    'isFeatureEnabled',
  )
  .mockReturnValue(true);

describe('PlanningToggle', () => {
  test('Renders button into mapboxControl', async () => {
    mockMapboxPlanning();
    const {__baseElement, ...mapboxRef} = mockMapboxRef();
    const {getByTestId} = await render(
      <Wrapper mapValue={{mapboxRef}}>
        <PlanningToggle />
      </Wrapper>,
      {container: document.body?.appendChild(__baseElement)},
    );
    expect(getByTestId('tg-plan-toggle-container')).toBeInTheDocument();
    expect(getByTestId('tg-plan-toggle')).toBeInTheDocument();
  });

  test('clicking plan toggle adds/removes the button', async () => {
    mockMapboxPlanning();
    const {__baseElement, ...mapboxRef} = mockMapboxRef();
    const {getByTestId} = await render(
      <Wrapper mapValue={{mapboxRef}}>
        <PlanningToggle />
      </Wrapper>,
      {container: document.body?.appendChild(__baseElement)},
    );
    expect(getByTestId('tg-plan-toggle-container')).toBeInTheDocument();
    const toggle = getByTestId('tg-plan-toggle');
    expect(toggle).toBeInTheDocument();
    await act(async () => {
      fireEvent.click(toggle);
    });
  });

  test('adds control', async () => {
    mockMapboxPlanning();
    const {__baseElement, ...mapboxRef} = mockMapboxRef();
    const {getByTestId} = await render(
      <Wrapper mapValue={{mapboxRef}}>
        <PlanningToggle />
      </Wrapper>,
      {container: document.body?.appendChild(__baseElement)},
    );
    expect(mapboxRef.addControl).toHaveBeenCalled();
    expect(getByTestId('tg-plan-toggle-container')).toBeInTheDocument();
  });

  test('toggles the plan control when mapbox dispatches tg.plan.toggle event', async () => {
    mockMapboxPlanning();
    const {__baseElement, ...mapboxRef} = mockMapboxRef();
    const {getByTestId, queryByTestId} = await render(
      <Wrapper mapValue={{mapboxRef}}>
        <PlanningToggle />
      </Wrapper>,
      {container: document.body?.appendChild(__baseElement)},
    );
    expect(mapboxRef.addControl).toHaveBeenCalledTimes(1);
    act(() => {
      fireEvent.click(getByTestId('tg-plan-toggle'));
    });
    expect(getByTestId('close-plan')).toBeInTheDocument();
    act(() => {
      fireEvent.click(getByTestId('tg-plan-toggle'));
    });
    expect(queryByTestId('close-plan')).not.toBeInTheDocument();
  });
});

function Wrapper({
  children,
  mapValue,
}: {
  children: React.Node,
  mapValue?: $Shape<MapContext>,
}) {
  return (
    <TestApp>
      <NetworkPlanningContextProvider>
        <MapContextWrapper contextValue={mapValue}>
          {children}
        </MapContextWrapper>
      </NetworkPlanningContextProvider>
    </TestApp>
  );
}

function mockMapboxPlanning() {
  const el = document.createElement('div');
  el.setAttribute('data-testid', 'plan-plan-mock');
  return {
    __el: el,
    onAdd: jest.fn(() => {
      return el;
    }),
    onRemove: jest.fn(),
    add: jest.fn(),
    getAll: jest.fn(),
  };
}
