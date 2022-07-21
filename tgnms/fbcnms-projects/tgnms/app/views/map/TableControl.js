/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 * @flow
 */

import * as React from 'react';
import TableChartIcon from '@material-ui/icons/TableChart';
import classNames from 'classnames';
import {Link} from 'react-router-dom';
import {withStyles} from '@material-ui/core/styles';
import type {ContextRouter} from 'react-router-dom';

/* Styling copied from: https://github.com/alex3165/react-mapbox-gl/blob/master/src/rotation-control.tsx */

const styles = {
  root: {
    position: 'absolute',
    zIndex: 10,
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0px 1px 4px rgba(0, 0, 0, .3)',
    border: '1px solid rgba(0, 0, 0, 0.1)',
  },
  buttonContainer: {
    display: 'flex',
    justifyContent: 'center',
    backgroundColor: '#f9f9f9',
    opacity: 0.95,
    transition: 'background-color 0.16s ease-out',
    cursor: 'pointer',
    border: 0,
    height: 26,
    width: 26,
    outline: 0,
    padding: 3,
    '&:hover': {
      backgroundColor: '#fff',
      opacity: 1,
    },
  },
  flexContainer: {
    display: 'flex',
    justifyContent: 'center',
  },
  button: {
    fontSize: 20,
    color: '#333',
  },
};

type Props = {
  classes: {[className: $Keys<typeof styles>]: string},
  style?: Object,
  baseUrl: string,
  onToggleTable: (show: boolean) => any,
  ...ContextRouter,
};

class TableControl extends React.Component<Props> {
  previousTable: ?string;
  componentDidMount() {
    this.props.onToggleTable(this.isTableVisible(this.props));
  }

  componentDidUpdate(prevProps: Props) {
    /**
     * when closing/reopening the network tables, restore the previously
     * selected tab
     */
    const isTableVisible = this.isTableVisible(this.props);
    const wasTableVisible = this.isTableVisible(prevProps);
    if (isTableVisible !== wasTableVisible) {
      if (!isTableVisible) {
        this.previousTable = prevProps.match.params.tableName;
      }
      this.props.onToggleTable(isTableVisible);
    }
  }

  render() {
    const {classes, style, baseUrl} = this.props;
    return (
      <Link
        className={classNames(classes.root, classes.buttonContainer)}
        style={style}
        tabIndex={-1}
        to={
          this.isTableVisible(this.props)
            ? this.makeUrl(baseUrl)
            : this.makeUrl(
                `${baseUrl}${baseUrl.slice(-1) !== '/' ? '/' : ''}${
                  this.previousTable || 'nodes'
                }`,
              )
        }>
        <span className={classes.flexContainer}>
          <TableChartIcon className={classes.button} />
        </span>
      </Link>
    );
  }

  isTableVisible = (props: Props): boolean =>
    typeof props.match.params.tableName === 'string' &&
    props.match.params.tableName.trim() !== '';

  // change the path but keep the querystring
  makeUrl = path => {
    const url = new URL(window.location);
    url.pathname = path;
    return `${url.pathname}${url.search}`;
  };
}

export default withStyles(styles)(TableControl);
