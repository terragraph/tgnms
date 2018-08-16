/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 */
'use strict';

import React from 'react';
import scrollbarSize from 'dom-helpers/util/scrollbarSize';
import {DebounceInput} from 'react-debounce-input';

import {
  accessibilityOverscanIndicesGetter,
  AutoSizer,
  Grid,
  ScrollSync,
  SortDirection,
} from 'react-virtualized';
import classnames from 'classnames';

export default class CustomTable extends React.Component {
  state = {
    filters: {},
    hoveredRowIndex: -1,
    sortBy: null,
    sortDirection: SortDirection.ASC,
  };

  constructor(props) {
    super(props);
    this.headerGridRef = React.createRef();
    this.bodyGridRef = React.createRef();

    const {data, columns} = props;

    let key = null;
    const keyFilter = columns.filter(column => column.isKey);
    if (keyFilter.length > 0) {
      key = keyFilter[0].key;
    }
    this.state.key = key;
    this.state.initialData = data.slice();
    this.state.displayedData = data.slice();
    this.state.columns = columns.filter(column => !column.hidden);
  }

  static getDerivedStateFromProps(nextProps, prevState) {
    const {columns, data} = nextProps;
    const {filters} = prevState;

    const sortBy = nextProps.sortBy || prevState.sortBy;
    const sortDirection = nextProps.sortDirection || prevState.sortDirection;

    let displayedData = data.slice();
    // Filter data
    if (filters) {
      displayedData = CustomTable._applyFiltersToData(displayedData, filters);
    }

    // Sort data
    if (sortBy) {
      let column = null;
      const colFilter = columns.filter(column => column.key == sortBy);
      if (colFilter.length > 0) {
        column = colFilter[0];
      }
      if (column && column.sort) {
        displayedData = CustomTable._sortHelper(
          displayedData,
          sortBy,
          sortDirection,
          column,
        );
      }
    }

    let key = null;
    const keyFilter = columns.filter(column => column.isKey);
    if (keyFilter.length > 0) {
      key = keyFilter[0].key;
    }

    return {
      columns: columns.filter(column => !column.hidden),
      displayedData,
      initialData: data.slice(),
      key,
      sortBy,
      sortDirection,
    };
  }

  render() {
    const {columns, displayedData} = this.state;
    const {headerHeight, height, overscanRowCount, rowHeight} = this.props;
    const totalW = columns.reduce((total, currVal) => total + currVal.width, 0);
    const columnCount = columns.length;
    const table = (
      <ScrollSync>
        {({onScroll, scrollLeft, scrollTop}) => {
          return (
            <div className="CustomTable__Autosizer__Container">
              <AutoSizer
                disableHeight
                onResize={() => {
                  this.headerGridRef.current.recomputeGridSize();
                  this.bodyGridRef.current.recomputeGridSize();
                }}>
                {({width}) => {
                  const adjustedWidth = width - 2; // subtract border thickness
                  const columnWidth = ({index}) =>
                    Math.max(
                      columns[index].width, // original width
                      // width to fill larger screen
                      (adjustedWidth * columns[index].width) / totalW,
                    );
                  return (
                    <div>
                      <div
                        style={{
                          height: headerHeight,
                          width: adjustedWidth - scrollbarSize(),
                        }}>
                        <Grid
                          ref={this.headerGridRef}
                          cellRenderer={cell => this._headerCellRenderer(cell)}
                          className="CustomTable__HeaderGrid"
                          columnCount={columnCount}
                          columnWidth={columnWidth}
                          height={headerHeight}
                          overscanColumnCount={0}
                          rowCount={1}
                          rowHeight={headerHeight}
                          scrollLeft={scrollLeft}
                          width={adjustedWidth - scrollbarSize()}
                        />
                      </div>
                      <div
                        style={{
                          height: height - headerHeight,
                          width: adjustedWidth,
                        }}>
                        <Grid
                          ref={this.bodyGridRef}
                          cellRenderer={cell => this._bodyCellRenderer(cell)}
                          className="CustomTable__BodyGrid"
                          columnCount={columnCount}
                          columnWidth={columnWidth}
                          height={height - headerHeight}
                          onScroll={onScroll}
                          overscanIndicesGetter={
                            accessibilityOverscanIndicesGetter
                          }
                          overscanRowCount={overscanRowCount}
                          rowCount={displayedData.length}
                          rowHeight={rowHeight}
                          width={adjustedWidth}
                        />
                      </div>
                    </div>
                  );
                }}
              </AutoSizer>
            </div>
          );
        }}
      </ScrollSync>
    );
    return table;
  }

  _bodyCellRenderer({columnIndex, key, rowIndex, style}) {
    const {
      columns,
      displayedData,
      hoveredRowIndex,
      key: selectedKey,
    } = this.state;
    const {onRowSelect, trClassName, striped, selected} = this.props;
    const dataKey = columns[columnIndex].key;

    let content = null;
    if (columns[columnIndex].render) {
      content = columns[columnIndex].render(
        displayedData[rowIndex][dataKey],
        displayedData[rowIndex],
        style,
      );
    } else {
      content = displayedData[rowIndex][dataKey];
    }

    let isSelected = false;
    if (selected && Array.isArray(selected)) {
      isSelected = selected.includes(displayedData[rowIndex][selectedKey]);
    }

    let classNames = classnames(
      'CustomTable__GridRowCell',
      {CustomTable__GridRowCellLeft: columnIndex === 0},
      {CustomTable__GridRowCellHovered: rowIndex === hoveredRowIndex},
      {CustomTable__GridRowCellEven: striped && rowIndex % 2 === 0},
      {CustomTable__GridRowCellSelected: isSelected},
    );

    const row = displayedData[rowIndex];
    if (trClassName && typeof trClassName === 'function') {
      classNames += ' ' + trClassName(row, rowIndex);
    }

    return (
      <div
        key={key}
        style={style}
        className={classNames}
        onClick={() => {
          onRowSelect(displayedData[rowIndex]);
        }}
        onMouseOver={() => {
          this.setState({hoveredRowIndex: rowIndex});
        }}
        onMouseOut={() => {
          this.setState({hoveredRowIndex: -1});
        }}>
        <div className="table-cell-content">{content}</div>
      </div>
    );
  }

  _headerCellRenderer({columnIndex, key, rowIndex, style}) {
    const {columns, sortBy, sortDirection} = this.state;
    const dataKey = columns[columnIndex].key;

    const unselectedColor = '#ccc';
    let carets = null;
    let filter = null;

    // If column has sorting enabled
    if (columns[columnIndex].sort) {
      if (sortBy === dataKey) {
        if (sortDirection === SortDirection.ASC) {
          carets = (
            <span className="dropup">
              <span className="caret" />
            </span>
          );
        } else {
          carets = <span className="caret" />;
        }
      } else {
        carets = (
          <div style={{display: 'inline-block'}}>
            <span className="dropup" style={{color: unselectedColor}}>
              <span className="caret" />
            </span>
            <span className="caret" style={{color: unselectedColor}} />
          </div>
        );
      }
    }

    if (columns[columnIndex].filter) {
      filter = (
        <div>
          <DebounceInput
            className={'CustomTable__Header__Filter'}
            minLength={1}
            debounceTimeout={50}
            onChange={event =>
              this._filterFunction(event, columns[columnIndex].key)
            }
            style={{width: '100%'}}
          />
        </div>
      );
    }

    const classNames = classnames(
      'CustomTable__GridRowCell',
      'CustomTable__HeaderRowCell',
      {CustomTable__GridRowCellLeft: columnIndex === 0},
    );
    return (
      <div
        key={key}
        style={style}
        className={classNames}
        onClick={event =>
          this._headerClicked(event, {columnIndex, dataKey, rowIndex})
        }>
        <div className="CustomTable__HeaderRowCell__Title">
          {columns[columnIndex].label}
          {carets}
        </div>
        {filter}
      </div>
    );
  }

  _headerClicked(event, {columnIndex, dataKey, rowIndex}) {
    if (event.target.className === 'CustomTable__Header__Filter') {
      return;
    }

    const {columns, sortBy, sortDirection} = this.state;
    const {onSortChange} = this.props;

    // Figure out sort direction
    const isFirstTimeSort = sortBy !== dataKey;
    const newSortDirection = isFirstTimeSort
      ? SortDirection.ASC
      : sortDirection === SortDirection.DESC
        ? SortDirection.ASC
        : SortDirection.DESC;

    // Call sort function if sort is enabled
    const column = columns[columnIndex];
    if (column.sort) {
      const data = CustomTable._sortHelper(
        this.state.displayedData.slice(),
        dataKey,
        newSortDirection,
        column,
      );
      this.setState(
        {
          displayedData: data,
          sortBy: dataKey,
          sortDirection: newSortDirection,
        },
        () => {
          if (onSortChange) {
            onSortChange(dataKey, newSortDirection);
          }
        },
      );
    }
  }

  static _sortHelper(data, sortBy, sortDirection, column) {
    const sortFunc = column.sortFunc || CustomTable._sortFunction;
    return data.sort((a, b) => {
      return sortFunc(a, b, sortDirection, sortBy);
    });
  }

  static _sortFunction(a, b, sortDirection, sortBy) {
    let ret = 0;
    if (!a.hasOwnProperty(sortBy) || a[sortBy] < b[sortBy]) {
      ret = -1;
    } else if (!b.hasOwnProperty(sortBy) || a[sortBy] > b[sortBy]) {
      ret = 1;
    }

    return sortDirection === SortDirection.ASC ? ret : 0 - ret;
  }

  _filterFunction(event, key) {
    const {columns, initialData, filters, sortBy, sortDirection} = this.state;

    filters[key] = String(event.target.value).toLowerCase();

    // Filter data
    let displayedData = CustomTable._applyFiltersToData(initialData, filters);

    // Sort data if needed
    if (sortBy) {
      let column;
      for (let i = 0; i < columns.length; i++) {
        if (columns[i].key === sortBy) {
          column = columns[i];
          break;
        }
      }

      if (column && column.sort) {
        displayedData = CustomTable._sortHelper(
          displayedData,
          sortBy,
          sortDirection,
          column,
        );
      }
    }

    this.setState({
      displayedData,
      filters,
    });
  }

  static _applyFiltersToData(data, filters) {
    let filteredData = data;
    for (const key in filters) {
      if (filters.hasOwnProperty(key) && filters[key]) {
        filteredData = CustomTable._applyFilterHelper(
          filteredData,
          key,
          filters[key],
        );
      }
    }
    return filteredData;
  }

  static _applyFilterHelper(data, key, filter) {
    return data.filter(d => {
      return (
        String(d[key])
          .toLowerCase()
          .search(filter) !== -1
      );
    });
  }
}

CustomTable.defaultProps = {
  striped: true,
  hover: true,
};
