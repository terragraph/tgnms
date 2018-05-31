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
} from 'react-virtualized'
import classnames from 'classnames';

export default class CustomTable extends React.Component {
  state = {
    filters: {},
    hoveredRowIndex: -1,
    sortBy: null,
    sortDirection: SortDirection.ASC,
  }

  constructor(props) {
    super(props);
    this.headerGridRef = React.createRef();
    this.bodyGridRef = React.createRef();

    const {
      data,
      columns,
    } = props;

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
    const {
      columns,
      data,
    } = nextProps;
    const {
      filters,
    } = prevState;

    const sortBy = nextProps.sortBy || prevState.sortBy;
    const sortDirection = nextProps.sortDirection || prevState.sortDirection;


    let displayedData = data.slice();
    // Filter data
    if (filters) {
      displayedData = CustomTable._applyFiltersToData(
        displayedData,
        filters,
      );
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
      displayedData: displayedData,
      initialData: data.slice(),
      key: key,
      sortBy: sortBy,
      sortDirection: sortDirection,
    }
  }

  render() {
    const {
      displayedData
    } = this.state;
    const {
      columns,
      headerHeight,
      height,
      overscanRowCount,
      rowHeight,
    } = this.props;
    const totalW = columns.reduce(
      ((total, currVal) => total + currVal.width),
      0,
    );
    const columnCount = columns.length;
    const table = (
      <ScrollSync>
        {({
          onScroll,
          scrollLeft,
          scrollTop,
        }) => {
          return (
            <div className='GridColumn'>
              <AutoSizer
                disableHeight
                onResize={() => {
                  this.headerGridRef.current.recomputeGridSize();
                  this.bodyGridRef.current.recomputeGridSize();
                }}
              >
                {({width}) => {
                  let w = width - 2; // subtract border thickness
                  let columnWidth = (
                    ({index}) => Math.max(
                      columns[index].width,  // original width
                      // width to fill larger screen
                      w * columns[index].width / totalW,
                    )
                  );
                  return (
                    <div>
                      <div
                        className='HeaderGridContainer'
                        style={{
                          height: headerHeight,
                          width: w - scrollbarSize(),
                        }}
                      >
                        <Grid
                          ref={this.headerGridRef}
                          cellRenderer={stuff => this._headerCellRenderer(stuff)}
                          className='HeaderGrid'
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
                        className='BodyGridContainer'
                        style={{
                          height: height - headerHeight,
                          width: w,
                        }}
                      >
                        <Grid
                          ref={this.bodyGridRef}
                          cellRenderer={stuff => this._bodyCellRenderer(stuff)}
                          className='BodyGrid'
                          columnCount={columnCount}
                          columnWidth={columnWidth}
                          height={height - headerHeight}
                          onScroll={onScroll}
                          overscanIndicesGetter={accessibilityOverscanIndicesGetter}
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
    const {
      displayedData,
      hoveredRowIndex,
      key: selectedKey,
    } = this.state;
    const {
      columns,
      onRowSelect,
      selected,
    } = this.props;
    let dataKey = columns[columnIndex].key;

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
      isSelected = selected.includes(
        displayedData[rowIndex][selectedKey]
      );
    }

    let classNames = classnames(
      'GridRow',
      {'GridRowLeft': columnIndex === 0},
      {'GridRowHovered': rowIndex === hoveredRowIndex},
      {'GridRowEven': rowIndex % 2 === 0},
      {'GridRowSelected': isSelected},
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
        }}
      >
        <div>
          {content}
        </div>
      </div>
    );
  }

  _headerCellRenderer({columnIndex, key, rowIndex, style}) {
    const {sortBy, sortDirection} = this.state;
    const {columns} = this.props
    let dataKey = columns[columnIndex].key;

    let unselectedColor = '#ccc';
    let carets = null;
    let filter = null;

    // If column has sorting enabled
    if (columns[columnIndex].sort) {
      if (sortBy === dataKey) {
        if (sortDirection === SortDirection.ASC) {
          carets = (
            <span className='dropup'>
              <span className='caret' />
            </span>
          );
        } else {
          carets = (
            <span className='caret' />
          );
        }
      } else {
        carets = (
          <div style={{display: 'inline-block'}}>
            <span className='dropup' style={{color: unselectedColor}}>
              <span className='caret' />
            </span>
            <span className='caret' style={{color: unselectedColor}} />
          </div>
        );
      }
    }

    if (columns[columnIndex].filter) {
      filter = (
        <div>
          <DebounceInput
            className={'CustomTable__header__filter'}
            minLength={1}
            debounceTimeout={50}
            onChange={event =>
              this._filterFunction(event, columns[columnIndex].key)
            }
            style={{width: '100%'}}
          />
        </div>
      )
    }

    let classNames = classnames(
      'GridRow',
      'HeaderRow',
      {'GridRowLeft': columnIndex === 0},
    );
    return (
      <div
        key={key}
        style={style}
        className={classNames}
        onClick={event =>
          this._headerClicked(event, {columnIndex, dataKey, rowIndex})
        }
      >
        <div
          className='HeaderTitle'
        >
          {columns[columnIndex].label}
          {carets}
        </div>
        {filter}
      </div>
    );
  }

  _headerClicked(event, {columnIndex, dataKey, rowIndex}) {
    if (event.target.className === 'CustomTable__header__filter') {
      return;
    }

    const {
      sortBy,
      sortDirection,
    } = this.state;

    const {
      columns,
      onSortChange,
    } = this.props;

    // Figure out sort direction
    const isFirstTimeSort = sortBy !== dataKey;
    const newSortDirection = isFirstTimeSort
      ? SortDirection.ASC
      : sortDirection === SortDirection.DESC
        ? SortDirection.ASC
        : SortDirection.DESC;

    // Call sort function if sort is enabled
    let column = columns[columnIndex];
    if (column.sort) {
      let data = CustomTable._sortHelper(
        this.state.displayedData.slice(),
        dataKey,
        newSortDirection,
        columns[columnIndex],
      );
      this.setState({
        displayedData: data,
        sortBy: dataKey,
        sortDirection: newSortDirection,
      }, () => {
        if (onSortChange) {
          onSortChange(dataKey, newSortDirection);
        }
      });
    }
  }

  static _sortHelper(data, sortBy, sortDirection, column) {
    let sortFunc = column.sortFunc || CustomTable._sortFunction;
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
    const {
      initialData,
      filters,
      sortBy,
      sortDirection,
    } = this.state;
    const {
      columns,
    } = this.props;

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
      displayedData: displayedData,
      filters: filters,
    });
  }

  static _applyFiltersToData(data, filters) {
    let filteredData = data;
    for (let key in filters) {
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
