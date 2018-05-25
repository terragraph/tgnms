/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 */
'use strict';

import React from 'react';
import scrollbarSize from 'dom-helpers/util/scrollbarSize';

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
    hoveredRowIndex: -1,
  }

  constructor(props) {
    super(props);
    this.headerGridRef = React.createRef();
    this.bodyGridRef = React.createRef();
  }

  render() {
    const {
      columns,
      data,
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
                      w * columns[index].width / totalW  // width to fill larger screen
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
                          rowCount={data.length}
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

  _headerCellRenderer({columnIndex, key, rowIndex, style}) {
    const {columns, sortBy, sortDirection} = this.props
    let dataKey = columns[columnIndex].key;

    let unselectedColor = '#ccc';
    let carets = null;

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
        onClick={() => this._headerClicked({columnIndex, dataKey, rowIndex})}
      >
        <div>
          {columns[columnIndex].label}
          {carets}
        </div>
      </div>
    );
  }

  _headerClicked({columnIndex, dataKey, rowIndex}) {
    const {
      columns,
      sortBy,
      sortDirection,
      sortFunction,
    } = this.props;

    // Figure out sort direction
    const isFirstTimeSort = sortBy !== dataKey;
    const newSortDirection = isFirstTimeSort
      ? SortDirection.ASC
      : sortDirection === SortDirection.DESC
        ? SortDirection.ASC
        : SortDirection.DESC;

    // Call sort function if sort is enabled
    columns[columnIndex].sort && sortFunction({
      sortBy: dataKey,
      sortDirection: newSortDirection,
    });
  }

  _bodyCellRenderer({columnIndex, key, rowIndex, style}) {
    const {
      columns,
      data,
      onRowSelect,
    } = this.props;
    let dataKey = columns[columnIndex].key;

    let content = null;
    if (columns[columnIndex].render) {
      content = columns[columnIndex].render(
        data[rowIndex][dataKey],
        data[rowIndex],
        style,
      );
    } else {
      content = data[rowIndex][dataKey];
    }

    let classNames = classnames(
      'GridRow',
      {'GridRowLeft': columnIndex === 0},
      {'GridRowHovered': rowIndex === this.state.hoveredRowIndex},
      {'GridRowEven': rowIndex % 2 === 0},
      {'GridRowSelected': data[rowIndex].isSelected},
    );

    return (
      <div
        key={key}
        style={style}
        className={classNames}
        onClick={() => {
          onRowSelect(data[rowIndex]);
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
}
