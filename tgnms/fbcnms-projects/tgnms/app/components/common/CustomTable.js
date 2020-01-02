/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import ArrowDropDownIcon from '@material-ui/icons/ArrowDropDown';
import ArrowDropUpIcon from '@material-ui/icons/ArrowDropUp';
import React from 'react';
import Typography from '@material-ui/core/Typography';
import UnfoldMoreIcon from '@material-ui/icons/UnfoldMore';
import classnames from 'classnames';
import scrollbarSize from 'dom-helpers/util/scrollbarSize';
import {
  AutoSizer,
  Grid,
  ScrollSync,
  SortDirection,
  accessibilityOverscanIndicesGetter,
} from 'react-virtualized';
import {DebounceInput} from 'react-debounce-input';
import {withStyles} from '@material-ui/core/styles';

import type {NetworkContextType} from '../../NetworkContext';
import type {Node} from 'react';

type ColumnType = {
  filter?: boolean,
  isKey?: boolean,
  key: string,
  label: Node,
  sortFunc?: (Object, Object, $Values<typeof SortDirection>, string) => number,
  render?: (
    val: any,
    row: Object,
    style: {[string]: string},
    additionalParams: {context: NetworkContextType},
  ) => any,
  sort?: boolean,
  width?: number,
  hidden?: boolean,
};

const borderThickness = 1;
const paddingLeftRight = 25;
const paddingTopBottom = 5;

const styles = theme => {
  return {
    autosizerInnerContainer: {
      flex: '1 1 auto',
    },
    gridRowCell: {
      borderBottomWidth: borderThickness,
      borderBottomStyle: 'solid',
      borderBottomColor: 'rgba(224, 224, 224, 1)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'flex-start',
      flexWrap: 'wrap',
    },
    gridRowCellEven: {
      backgroundColor: 'rgb(250, 250, 250)',
    },
    gridRowCellHovered: {
      backgroundColor: 'rgba(0, 0, 0, 0.07)',
    },
    gridRowCellSelected: {
      backgroundColor: 'rgb(183, 210, 255)',
    },
    gridRowCellContent: {
      flexDirection: 'column',
      alignItems: 'flex-start',
      display: 'flex',
      padding: `${paddingTopBottom}px ${paddingLeftRight}px`,
    },
    headerRowCellFilter: {
      paddingTop: 10,
    },
    bodyTypo: {
      fontWeight: theme.typography.fontWeightRegular,
      ...theme.typography.body2,
    },
  };
};

type Props = {
  classes: {[string]: string},
  columns: Array<ColumnType>,
  striped?: boolean,
  hover?: boolean,
  data: ?Array<Object>,
  sortBy?: string,
  sortDirection?: $Values<typeof SortDirection>,
  headerHeight: number,
  overscanRowCount: number,
  rowHeight: number,
  additionalRenderParams?: {context: NetworkContextType},
  onRowSelect: Object => any,
  trClassName?: Object,
  selected?: Array<Object>,
  onSortChange?: (string, $Values<typeof SortDirection>) => any,
};

type State = {
  filters: {},
  hoveredRowIndex: number,
  sortBy: ?string,
  sortDirection: $Values<typeof SortDirection>,
};

class CustomTable extends React.Component<Props, State> {
  state = {
    filters: {},
    hoveredRowIndex: -1,
    sortBy: null,
    sortDirection: SortDirection.ASC,
  };

  static defaultProps = {
    striped: true,
    hover: true,
  };

  headerGridRef: {current: Object};
  bodyGridRef: {current: Object};

  constructor(props) {
    super(props);
    this.headerGridRef = React.createRef();
    this.bodyGridRef = React.createRef();
  }

  applyFiltersAndSorts = () => {
    const {columns, data} = this.props;
    const {filters} = this.state;

    const sortBy = this.props.sortBy || this.state.sortBy;
    const sortDirection = this.props.sortDirection || this.state.sortDirection;

    let displayedData = data ? data.slice() : [];
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
      key,
    };
  };

  render() {
    const {classes, headerHeight, overscanRowCount, rowHeight} = this.props;
    const adjustedHeaderHeight = headerHeight;
    const adjustedRowHeight = rowHeight;

    const {columns, displayedData, key} = this.applyFiltersAndSorts();
    const totalW = columns.reduce((total, currVal) => total + currVal.width, 0);
    const columnCount = columns.length;

    const table = (
      <div className="CustomTable__Autosizer__Container">
        <div className={classes.autosizerInnerContainer}>
          <AutoSizer
            onResize={() => {
              if (this.headerGridRef.current) {
                this.headerGridRef.current.recomputeGridSize();
              }
              if (this.bodyGridRef.current) {
                this.bodyGridRef.current.recomputeGridSize();
              }
            }}>
            {({height, width}) => {
              return (
                <ScrollSync>
                  {({onScroll, scrollLeft}) => {
                    const adjustedWidth = width;
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
                            cellRenderer={cell =>
                              this._headerCellRenderer(cell, columns)
                            }
                            className="CustomTable__HeaderGrid"
                            columnCount={columnCount}
                            columnWidth={columnWidth}
                            height={headerHeight}
                            onScroll={onScroll}
                            overscanColumnCount={0}
                            rowCount={1}
                            rowHeight={adjustedHeaderHeight}
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
                            cellRenderer={cell =>
                              this._bodyCellRenderer(
                                cell,
                                displayedData,
                                columns,
                                key,
                              )
                            }
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
                            rowHeight={adjustedRowHeight}
                            scrollLeft={scrollLeft}
                            width={adjustedWidth}
                          />
                        </div>
                      </div>
                    );
                  }}
                </ScrollSync>
              );
            }}
          </AutoSizer>
        </div>
      </div>
    );
    return table;
  }

  _bodyCellRenderer(cell, displayedData, columns, selectedKey) {
    const {columnIndex, key, rowIndex, style} = cell;

    const {hoveredRowIndex} = this.state;
    const {
      additionalRenderParams,
      classes,
      onRowSelect,
      trClassName,
      striped,
      selected,
    } = this.props;
    const dataKey = columns[columnIndex].key;

    let content = null;
    if (columns[columnIndex].render) {
      content = columns[columnIndex].render(
        displayedData[rowIndex][dataKey],
        displayedData[rowIndex],
        style,
        additionalRenderParams,
      );
    } else {
      content = displayedData[rowIndex][dataKey];
    }

    let isSelected = false;
    if (selected && Array.isArray(selected)) {
      isSelected = selected.includes(displayedData[rowIndex][selectedKey]);
    }

    let classNames = classnames(
      classes.gridRowCell,
      'CustomTable__GridRowCell',
      {[classes.gridRowCellHovered]: rowIndex === hoveredRowIndex},
      {[classes.gridRowCellEven]: striped && rowIndex % 2 === 0},
      {[classes.gridRowCellSelected]: isSelected},
    );

    const row = displayedData[rowIndex];
    if (trClassName && typeof trClassName === 'function') {
      classNames += ' ' + trClassName(row, rowIndex);
    } else if (typeof trClassName === 'string') {
      classNames += ' ' + trClassName;
    }

    const newStyles = {
      ...style,
      height: style.height - borderThickness,
    };

    const contentStyle = {
      maxWidth: style.width - 2 * paddingLeftRight,
      maxHeight: style.height - 2 * paddingTopBottom,
    };

    return (
      <div
        key={key}
        style={newStyles}
        className={classNames}
        onClick={() => {
          onRowSelect && onRowSelect(displayedData[rowIndex]);
        }}
        onMouseOver={() => {
          this.setState({hoveredRowIndex: rowIndex});
        }}
        onMouseOut={() => {
          this.setState({hoveredRowIndex: -1});
        }}>
        <div
          className={classnames(classes.gridRowCellContent, classes.bodyTypo)}
          style={contentStyle}>
          {content}
        </div>
      </div>
    );
  }

  _headerCellRenderer({columnIndex, key, rowIndex, style}, columns) {
    const {classes} = this.props;
    const {sortBy, sortDirection} = this.state;
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
          carets = <ArrowDropUpIcon />;
        } else {
          carets = <ArrowDropDownIcon />;
        }
      } else {
        carets = (
          <div style={{display: 'inline-block'}}>
            <UnfoldMoreIcon style={{color: unselectedColor}} />
          </div>
        );
      }
    }

    if (columns[columnIndex].filter) {
      filter = (
        <div className={classes.headerRowCellFilter}>
          <DebounceInput
            className={'CustomTable__Header__Filter'}
            minLength={1}
            debounceTimeout={50}
            onChange={event =>
              this._filterFunction(event, columns[columnIndex].key)
            }
          />
        </div>
      );
    }

    const classNames = classnames(
      classes.gridRowCell,
      'CustomTable__GridRowCell',
      'CustomTable__HeaderRowCell',
    );

    const newStyles = {
      ...style,
      height: style.height - borderThickness,
    };

    const contentStyle = {
      maxWidth: style.width - 2 * paddingLeftRight,
      maxHeight: style.height - 2 * paddingTopBottom,
    };

    return (
      <div
        key={key}
        style={newStyles}
        className={classNames}
        onClick={event =>
          this._headerClicked(
            event,
            {columnIndex, dataKey, _rowIndex: rowIndex},
            columns,
          )
        }>
        <div style={contentStyle} className={classes.gridRowCellContent}>
          <div className="CustomTable__HeaderRowCell__Title">
            <Typography variant="subtitle2">
              {columns[columnIndex].label}
            </Typography>
            {carets}
          </div>
          {filter}
        </div>
      </div>
    );
  }

  _headerClicked(event, {columnIndex, dataKey, _rowIndex}, columns) {
    if (event.target.className === 'CustomTable__Header__Filter') {
      return;
    }

    const {sortBy, sortDirection} = this.state;
    const {onSortChange} = this.props;

    // Figure out sort direction
    const isFirstTimeSort = sortBy !== dataKey;
    const newSortDirection = isFirstTimeSort
      ? SortDirection.ASC
      : sortDirection === SortDirection.DESC
      ? SortDirection.ASC
      : SortDirection.DESC;

    const column = columns[columnIndex];
    if (column.sort) {
      // Set sort params in state to trigger rerender
      this.setState(
        {
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
    const aSortBy = a[sortBy];
    const bSortBy = b[sortBy];
    if (
      !a.hasOwnProperty(sortBy) ||
      (isNaN(aSortBy) && !isNaN(bSortBy)) ||
      aSortBy < bSortBy
    ) {
      ret = -1;
    } else if (
      !b.hasOwnProperty(sortBy) ||
      (!isNaN(aSortBy) && isNaN(bSortBy)) ||
      aSortBy > bSortBy
    ) {
      ret = 1;
    }

    return sortDirection === SortDirection.ASC ? ret : 0 - ret;
  }

  _filterFunction(event, key) {
    const {filters} = this.state;

    filters[key] = String(event.target.value).toLowerCase();

    // Set new filter in state to trigger rerender
    this.setState({
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

export default withStyles(styles, {withTheme: true})(CustomTable);
