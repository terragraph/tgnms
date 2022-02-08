/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import * as React from 'react';
import AddBox from '@material-ui/icons/AddBox';
import ArrowDownward from '@material-ui/icons/ArrowDownward';
import Check from '@material-ui/icons/Check';
import ChevronLeft from '@material-ui/icons/ChevronLeft';
import ChevronRight from '@material-ui/icons/ChevronRight';
import Clear from '@material-ui/icons/Clear';
import DeleteOutline from '@material-ui/icons/DeleteOutline';
import Edit from '@material-ui/icons/Edit';
import FilterList from '@material-ui/icons/FilterList';
import FirstPage from '@material-ui/icons/FirstPage';
import LastPage from '@material-ui/icons/LastPage';
import MaterialTable from '@material-table/core';
import Remove from '@material-ui/icons/Remove';
import SaveAlt from '@material-ui/icons/SaveAlt';
import Search from '@material-ui/icons/Search';
import TableToolbar, {TableToolbarAction} from './MaterialTableToolbar';
import ViewColumn from '@material-ui/icons/ViewColumn';
import {defaultProps as MaterialTableDefaultProps} from '@material-table/core/dist/defaults';

// remove the "actions" column
const TABLE_LOCALIZATION = {header: {actions: ''}};

const tableIcons = {
  Add: React.forwardRef((props, ref) => <AddBox {...props} ref={ref} />),
  Check: React.forwardRef((props, ref) => <Check {...props} ref={ref} />),
  Clear: React.forwardRef((props, ref) => <Clear {...props} ref={ref} />),
  Delete: React.forwardRef((props, ref) => (
    <DeleteOutline {...props} ref={ref} />
  )),
  DetailPanel: React.forwardRef((props, ref) => (
    <ChevronRight {...props} ref={ref} />
  )),
  Edit: React.forwardRef((props, ref) => <Edit {...props} ref={ref} />),
  Export: React.forwardRef((props, ref) => <SaveAlt {...props} ref={ref} />),
  Filter: React.forwardRef((props, ref) => <FilterList {...props} ref={ref} />),
  FirstPage: React.forwardRef((props, ref) => (
    <FirstPage {...props} ref={ref} />
  )),
  LastPage: React.forwardRef((props, ref) => <LastPage {...props} ref={ref} />),
  NextPage: React.forwardRef((props, ref) => (
    <ChevronRight {...props} ref={ref} />
  )),
  PreviousPage: React.forwardRef((props, ref) => (
    <ChevronLeft {...props} ref={ref} />
  )),
  ResetSearch: React.forwardRef((props, ref) => <Clear {...props} ref={ref} />),
  Search: React.forwardRef((props, ref) => <Search {...props} ref={ref} />),
  SortArrow: React.forwardRef((props, ref) => (
    <ArrowDownward {...props} ref={ref} />
  )),
  ThirdStateCheck: React.forwardRef((props, ref) => (
    <Remove {...props} ref={ref} />
  )),
  ViewColumn: React.forwardRef((props, ref) => (
    <ViewColumn {...props} ref={ref} />
  )),
};

// A ref of the material-table instance
type MaterialTableRef = {|
  tableContainerDiv: {current: ?HTMLDivElement},
|};

export function useAutosizeMaterialTable(
  props: ?{
    tableRef?: ?{|
      current: ?MaterialTableRef,
    |},
  },
) {
  const {tableRef: tableRefProp} = props ?? {};
  /**
   * We use refs to get 3 measurements:
   * 1. The height of the div wrapping the table. This is the max height of
   * the table.
   * 2. The height of the table including pagination, search, etc. This is
   * passed to the material-table "Container" component.
   * 3. The height of only the body.
   */
  const wrapperRef = React.useRef<?HTMLDivElement>();
  const containerRef = React.useRef<?HTMLDivElement>();
  const _tableRef = React.useRef<?MaterialTableRef>();
  const tableRef = tableRefProp ?? _tableRef;
  const [bodyHeight, setBodyHeight] = React.useState(0);
  const [effectDep, setEffectDep] = React.useState(0);
  React.useEffect(() => {
    /**
     * Whenever the NetworkMap table is resized, a "resize" event is dispatched.
     * Trigger the layoutEffect in response.
     */
    const handleResize = () => {
      setEffectDep(x => x + 1);
    };
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);
  /**
   * To determine the table body height, measure the max-height div around the
   * MaterialTable and subtract the height of everything that isn't the body
   * (pagination, filtering, etc).
   */
  React.useLayoutEffect(() => {
    if (
      wrapperRef.current == null ||
      containerRef.current == null ||
      tableRef.current == null
    ) {
      return;
    }
    const bodyNode = tableRef.current?.tableContainerDiv?.current;
    const maxHeightRefHeight =
      wrapperRef.current?.getBoundingClientRect()?.height ?? 0;
    const rootHeight =
      containerRef.current?.getBoundingClientRect()?.height ?? 0;
    const currBodyHeight = bodyNode?.getBoundingClientRect()?.height ?? 0;
    const measured = maxHeightRefHeight - (rootHeight - currBodyHeight);
    setBodyHeight(measured);
  }, [effectDep, wrapperRef, containerRef, tableRef]);

  return {
    bodyHeight,
    wrapperRef,
    containerRef,
    tableRef,
  };
}

const defaultTableOptions = {
  showTitle: false,
  pageSize: 50,
  pageSizeOptions: [50, 100, 200],
  padding: 'dense',
  tableLayout: 'fixed',
  toolbarButtonAlignment: 'right',
  searchFieldStyle: {
    marginRight: '16px',
  },
  emptyRowsWhenPaging: false,
  actionsColumnIndex: -1,
  grouping: false,
};
function EditField(props) {
  const Component = MaterialTableDefaultProps.components.EditField;
  return <Component {...props} variant="outlined" />;
}

export default function CustomMaterialTable({
  options,
  tableRef: tableRefProp,
  components,
  'data-testid': testId,
  ...props
}: Object) {
  const {
    bodyHeight,
    wrapperRef,
    containerRef,
    tableRef,
  } = useAutosizeMaterialTable({tableRef: tableRefProp});

  const containerProp = components?.Container;
  const Container = React.useMemo(
    () => cProps => {
      return React.createElement(
        containerProp ?? MaterialTableDefaultProps.components.Container,
        {
          ref: containerRef,
          ...cProps,
        },
      );
    },
    [containerRef, containerProp],
  );
  const _components = React.useMemo(
    () => ({
      EditField,
      /**
       * to measure the table height, pass a ref to the Container component and
       * measure the mounted element.
       */
      Container: Container,
      Toolbar: TableToolbar,
      Action: TableToolbarAction,
      ...(components ?? {}),
    }),
    [Container, components],
  );
  const tableOptions = React.useMemo(
    () => ({
      ...defaultTableOptions,
      minBodyHeight: bodyHeight,
      maxBodyHeight: bodyHeight,
      ...(options ?? {}),
    }),
    [bodyHeight, options],
  );

  return (
    <div
      style={{height: '100%'}}
      ref={wrapperRef}
      data-testid={testId ?? 'material-table'}>
      <MaterialTable
        icons={tableIcons}
        {...props}
        // to measure the body height, pass the tableRef prop
        tableRef={tableRef}
        components={_components}
        options={tableOptions}
        localization={TABLE_LOCALIZATION}
      />
    </div>
  );
}
