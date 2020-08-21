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
import {context as MapAnnotationContext} from '../../../../contexts/MapAnnotationContext';
import {
  TestApp,
  coerceClass,
  mockPanelControl,
} from '../../../../tests/testHelpers';
import {cleanup, render} from '@testing-library/react';
import type {LineString, Polygon} from '@turf/turf';
import type {MapAnnotationContext as MapAnnotationContextType} from '../../../../contexts/MapAnnotationContext';

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
          {type: 'Point', coordinates: [0, 0]},
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

test('shows length if feature is a line', () => {
  const {getByText, getByTestId} = render(
    <Wrapper
      contextVal={{
        selectedFeatureId: '123',
        selectedFeature: turf.feature(
          {
            type: 'LineString',
            coordinates: ([
              [115, -32],
              [131, -22],
              [143, -25],
              [150, -34],
            ]: LineString),
          },
          {name: 'test-abc', showName: true},
          {id: '123'},
        ),
      }}>
      <AnnotationsPanel {...defaultProps} />
    </Wrapper>,
  );
  expect(getByText('Length:')).toBeInTheDocument();
  expect(getByTestId('feature-length').textContent).toBe('4,407.939 km');
});

test('shows area if feature is a polygon', () => {
  const {getByText, getByTestId} = render(
    <Wrapper
      contextVal={{
        selectedFeatureId: '123',
        selectedFeature: turf.feature(
          {
            type: 'Polygon',
            coordinates: ([
              [
                [125, -15],
                [113, -22],
                [154, -27],
                [144, -15],
                [125, -15],
              ],
            ]: Polygon),
          },
          {name: 'test-abc', showName: true},
          {id: '123'},
        ),
      }}>
      <AnnotationsPanel {...defaultProps} />
    </Wrapper>,
  );
  expect(getByText('Area:')).toBeInTheDocument();
  expect(getByTestId('feature-area').textContent).toBe('3,339,946.239 km');
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
