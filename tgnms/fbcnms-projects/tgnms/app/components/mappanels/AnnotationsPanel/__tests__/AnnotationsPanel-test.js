/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import 'jest-dom/extend-expect';
import * as React from 'react';
import * as serviceApiUtil from '../../../../apiutils/ServiceAPIUtil';
import * as turf from '@turf/turf';
import AnnotationsPanel from '../AnnotationsPanel';
import {
  context as MapAnnotationContext,
  MapAnnotationContextProvider,
} from '../../../../contexts/MapAnnotationContext';
import {
  TestApp,
  coerceClass,
  mockPanelControl,
} from '../../../../tests/testHelpers';
import {act, cleanup, fireEvent, render} from '@testing-library/react';
import type {GeoGeometry, LineStringCoords, PolygonCoords} from '@turf/turf';
import type {MapAnnotationContext as MapAnnotationContextType} from '../../../../contexts/MapAnnotationContext';

jest.mock('../../../../apiutils/ServiceAPIUtil');
const apiServiceRequestMock = jest
  .spyOn(serviceApiUtil, 'apiRequest')
  .mockImplementation(() => Promise.resolve());
afterEach(cleanup);

const defaultProps = {
  panelControl: mockPanelControl({
    getIsOpen: jest.fn().mockReturnValue(true),
    getIsHidden: jest.fn().mockReturnValue(false),
  }),
};

test('renders', () => {
  const {getByTestId} = render(
    <TestApp>
      <MapAnnotationContextProvider>
        <AnnotationsPanel {...defaultProps} />
      </MapAnnotationContextProvider>
      ,
    </TestApp>,
  );
  expect(getByTestId('annotations-panel')).toBeInTheDocument();
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
  expect(coerceClass(getByLabelText('Name'), HTMLInputElement).value).toBe(
    'test-abc',
  );
  expect(
    coerceClass(getByLabelText('Show name on map'), HTMLInputElement)?.checked,
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
            coordinates: mockLineStringCoords(),
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
            ]: PolygonCoords),
          },
          {name: 'test-abc', showName: true},
          {id: '123'},
        ),
      }}>
      <AnnotationsPanel {...defaultProps} />
    </Wrapper>,
  );
  expect(getByText('Area:')).toBeInTheDocument();
  expect(getByTestId('feature-area').textContent).toBe('3,339,946.239 sq km');
});

describe('Convert to Topology', () => {
  describe('Convert to Site - Quick', () => {
    test('does not show for non-point annotations', () => {
      const makeCtx = (geo: GeoGeometry) => ({
        selectedFeatureId: '123',
        selectedFeature: turf.feature(
          geo,
          {name: 'test-abc', showName: true},
          {id: '123'},
        ),
      });
      const {getByText, queryByTestId, rerender} = render(
        <Wrapper
          contextVal={makeCtx({
            type: 'Polygon',
            coordinates: mockPolyCoords(),
          })}>
          <AnnotationsPanel {...defaultProps} />
        </Wrapper>,
      );
      const btn = getByText(/View Actions/i);
      act(() => {
        fireEvent.click(btn);
      });
      expect(queryByTestId('quick-convert-to-site')).not.toBeInTheDocument();

      rerender(
        <Wrapper
          contextVal={makeCtx({
            type: 'Point',
            coordinates: [0, 0],
          })}>
          <AnnotationsPanel {...defaultProps} />
        </Wrapper>,
      );
      act(() => {
        fireEvent.click(btn);
      });
      expect(queryByTestId('quick-convert-to-site')).toBeInTheDocument();
    });

    test('creates a site with same name/coords as the annotation', () => {
      const {getByText, getByTestId} = render(
        <Wrapper
          contextVal={{
            selectedFeatureId: '123',
            selectedFeature: turf.feature(
              {type: 'Point', coordinates: [18, 32]},
              {name: 'test-abc', showName: true},
              {id: '123'},
            ),
          }}>
          <AnnotationsPanel {...defaultProps} />
        </Wrapper>,
      );
      const btn = getByText(/View Actions/i);
      act(() => {
        fireEvent.click(btn);
      });
      expect(apiServiceRequestMock).not.toHaveBeenCalled();
      act(() => {
        fireEvent.click(getByTestId('quick-convert-to-site'));
      });
      expect(apiServiceRequestMock).toHaveBeenCalled();
      expect(apiServiceRequestMock).toHaveBeenCalledWith({
        endpoint: 'bulkAdd',
        networkName: '',
        data: {
          sites: [
            {
              name: 'test-abc',
              location: {
                accuracy: 1000,
                altitude: 0,
                longitude: 18,
                latitude: 32,
              },
            },
          ],
        },
      });
    });
    test.todo('deletes the annotation after the site is created');
  });
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

function mockLineStringCoords(): LineStringCoords {
  return ([
    [115, -32],
    [131, -22],
    [143, -25],
    [150, -34],
  ]: LineStringCoords);
}

function mockPolyCoords(): PolygonCoords {
  return ([
    [
      [125, -15],
      [113, -22],
      [154, -27],
      [144, -15],
      [125, -15],
    ],
  ]: PolygonCoords);
}
