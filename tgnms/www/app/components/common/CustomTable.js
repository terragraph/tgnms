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
    for (let i = 0; i < columns.length; i++) {
      if (columns[i].isKey) {
        key = columns[i].key;
      }
    }
    this.state.key = key;
    this.state.initialData = data.slice();
    this.state.displayedData = data.slice();
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

    let key = null;
    for (let i = 0; i < columns.length; i++) {
      if (columns[i].isKey) {
        key = columns[i].key;
      }
    }

    return {
      displayedData,
      initialData: data.slice(),
      key,
      sortBy,
      sortDirection,
    };
  }

  render() {
    const {displayedData} = this.state;
    const {
      columns,
      headerHeight,
      height,
      overscanRowCount,
      rowHeight,
    } = this.props;
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
                  const w = width - 2; // subtract border thickness
                  const columnWidth = ({index}) =>
                    Math.max(
                      columns[index].width, // original width
                      // width to fill larger screen
                      w * columns[index].width / totalW,
                    );
                  return (
                    <div>
                      <div
                        style={{
                          height: headerHeight,
                          width: w - scrollbarSize(),
                        }}>
                        <Grid
                          ref={this.headerGridRef}
                          cellRenderer={stuff =>
                            this._headerCellRenderer(stuff)
                          }
                          className="CustomTable__HeaderGrid"
                          columnCount={columnCount}
                          columnWidth={columnWidth}
                          height={headerHeight}
                          overscanColumnCount={0}
                          rowCount={1}
                          rowHeight={headerHeight}
                          scrollLeft={scrollLeft}
                          width={w - scrollbarSize()}
                        />
                      </div>
                      <div
                        style={{
                          height: height - headerHeight,
                          width: w,
                        }}>
                        <Grid
                          ref={this.bodyGridRef}
                          cellRenderer={stuff => this._bodyCellRenderer(stuff)}
                          className="BodyGrid"
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
                          width={w}
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
    const {displayedData, hoveredRowIndex, key: selectedKey} = this.state;
    const {columns, onRowSelect, selected} = this.props;
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

    const classNames = classnames(
      'CustomTable__GridRowCell',
      {'CustomTable__GridRowCellLeft': columnIndex === 0},
      {'CustomTable__GridRowCellHovered': rowIndex === hoveredRowIndex},
      {'CustomTable__GridRowCellEven': rowIndex % 2 === 0},
      {'CustomTable__GridRowCellSelected': isSelected},
    );

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
        <div>{content}</div>
      </div>
    );
  }

  _headerCellRenderer({columnIndex, key, rowIndex, style}) {
    const {sortBy, sortDirection} = this.state;
    const {columns} = this.props;
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
      {'CustomTable__GridRowCellLeft': columnIndex === 0}
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

    const {sortBy, sortDirection} = this.state;

    const {columns, onSortChange} = this.props;

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
        columns[columnIndex],
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
    if (a[sortBy] < b[sortBy]) {
      ret = -1;
    }

    if (a[sortBy] > b[sortBy]) {
      ret = 1;
    }

    return sortDirection === SortDirection.ASC ? ret : 0 - ret;
  }

  _filterFunction(event, key) {
    const {initialData, filters, sortBy, sortDirection} = this.state;
    const {columns} = this.props;

    filters[key] = event.target.value.toLowerCase();

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
      if (key in filters && filters[key]) {
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
      return d[key].toLowerCase().search(filter) !== -1;
    });
  }
}
