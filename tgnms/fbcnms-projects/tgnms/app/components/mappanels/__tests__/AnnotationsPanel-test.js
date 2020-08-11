/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import 'jest-dom/extend-expect';
import * as React from 'react';
import * as turf from '@turf/turf';
import AnnotationsPanel from '../AnnotationsPanel';
import {context as MapAnnotationContext} from '../../../contexts/MapAnnotationContext';
import {
  TestApp,
  coerceClass,
  mockPanelControl,
} from '../../../tests/testHelpers';
import {cleanup, render} from '@testing-library/react';
import type {MapAnnotationContext as MapAnnotationContextType} from '../../../contexts/MapAnnotationContext';

afterEach(cleanup);

const defaultProps = {
  panelControl: mockPanelControl({
    getIsOpen: jest.fn().mockReturnValue(true),
    getIsHidden: jest.fn().mockReturnValue(false),
  }),
};

test('renders', () => {
  const {getByText} = render(
    <Wrapper>
      <AnnotationsPanel {...defaultProps} />
    </Wrapper>,
  );
  expect(getByText('Annotations')).toBeInTheDocument();
});

test('shows form if a feature is selected', () => {
  const {getByLabelText} = render(
    <Wrapper
      contextVal={{
        selectedFeatureId: '123',
        selectedFeature: turf.feature(
          {type: 'Point', coordinates: [[0, 0]]},
          {name: 'test-abc', showName: true},
          {id: '123'},
        ),
      }}>
      <AnnotationsPanel {...defaultProps} />
    </Wrapper>,
  );
  expect(coerceClass(getByLabelText('Title'), HTMLInputElement).value).toBe(
    'test-abc',
  );
  expect(
    coerceClass(getByLabelText('Show title on map'), HTMLInputElement)?.checked,
  ).toBe(true);
});

function Wrapper({
  children,
  contextVal,
}: {
  contextVal?: $Shape<MapAnnotationContextType>,
  children: React.Node,
}) {
  return (
    <TestApp>
      <MapAnnotationContext.Provider
        value={{
          ...(contextVal || {}: $Shape<MapAnnotationContextType>),
        }}>
        {children}
      </MapAnnotationContext.Provider>
    </TestApp>
  );
}
