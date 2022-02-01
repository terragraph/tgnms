/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow strict-local
 */
import * as React from 'react';
import MaterialTable, {useAutosizeMaterialTable} from '../MaterialTable';
import {TestApp} from '@fbcnms/tg-nms/app/tests/testHelpers';
import {act as hooksAct, renderHook} from '@testing-library/react-hooks';
import {render} from '@testing-library/react';

test('renders', () => {
  const {getByText} = render(
    <TestApp>
      <MaterialTable
        columns={[{field: 'name', title: 'name'}]}
        data={[{name: 'test1'}, {name: 'test2'}]}
      />
    </TestApp>,
  );

  expect(getByText('name')).toBeInTheDocument();
  expect(getByText('test1')).toBeInTheDocument();
});

describe('useAutosizeMaterialTable', () => {
  test('returns body height by measuring refs', () => {
    const {result} = renderHook(props => useAutosizeMaterialTable(props), {
      initialProps: {},
    });
    expect(result.current.bodyHeight).toBe(0);
    result.current.wrapperRef.current = makeElementWithRect({height: 100});
    result.current.containerRef.current = makeElementWithRect({height: 50});
    result.current.tableRef.current = {
      tableContainerDiv: {current: makeElementWithRect({height: 5})},
    };
    hooksAct(() => {
      // this event gets dispatched by another component
      window.dispatchEvent(new Event('resize'));
    });
    expect(result.current.bodyHeight).toBe(55);
  });
});

function makeElementWithRect(rect: $Shape<ClientRect>) {
  const el = document.createElement('div');
  jest.spyOn(el, 'getBoundingClientRect').mockImplementation(() => rect);
  return el;
}
