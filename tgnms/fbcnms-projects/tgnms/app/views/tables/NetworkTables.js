/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import Grid from '@material-ui/core/Grid';
import IconButton from '@material-ui/core/IconButton';
import NetworkContext from '../../contexts/NetworkContext.js';
import NetworkLinksTable from './NetworkLinksTable';
import NetworkNodesTable from './NetworkNodesTable';
import NetworkTestTable from './NetworkTestTable';
import OpenInBrowserIcon from '@material-ui/icons/OpenInBrowser';
import React from 'react';
import Tab from '@material-ui/core/Tab';
import Tabs from '@material-ui/core/Tabs';
import {Link, Redirect, Route, Switch} from 'react-router-dom';
import {TopologyElementType} from '../../constants/NetworkConstants.js';
import {isEqual} from 'lodash';
import {isFeatureEnabled} from '../../constants/FeatureFlags';
import {withStyles} from '@material-ui/core/styles';
import type {ContextRouter} from 'react-router-dom';

const styles = theme => ({
  root: {
    display: 'flex',
    height: '100%',
    flexGrow: 1,
    flexFlow: 'column',
    overflow: 'hidden',
  },
  tabsRoot: {
    flex: '0 1 auto',
    marginBottom: theme.spacing(),
    paddingTop: theme.spacing(),
    paddingLeft: theme.spacing(),
  },
  tabsIndicator: {
    backgroundColor: '#1890ff',
  },
  tabRoot: {
    textTransform: 'initial',
    minWidth: 72,
    fontWeight: theme.typography.fontWeightRegular,
    fontSize: 16,
    '&:hover': {
      color: '#40a9ff',
      opacity: 1,
    },
    '&$tabSelected': {
      color: '#1890ff',
      fontWeight: theme.typography.fontWeightMedium,
    },
    '&:focus': {
      color: '#40a9ff',
    },
  },
  tabSelected: {},
  expandButton: {
    float: 'right',
    margin: theme.spacing(2),
    padding: theme.spacing(1),
  },
  rotated: {
    transform: 'rotate(180deg)',
  },
  expandTableButton: {borderBottom: '1px solid #e8e8e8'},
});

const TABLE_TYPE = Object.freeze({
  nodes: 'nodes',
  links: 'links',
  tests: 'tests',
});

const TABLE_LIMITS = {minHeight: 360, maxHeight: 720};

type Props = {
  classes: Object,
  selectedElement: ?Object,
  isEmbedded?: boolean,
  onResize?: number => void,
  tableHeight?: number,
  ...ContextRouter,
};

type State = {
  selectedTable: string,
};

class NetworkTables extends React.Component<Props, State> {
  constructor(props) {
    super(props);

    // Set initial table using path (if specified)
    const splitPath = props.location.pathname.split('/');
    const selectedTable =
      splitPath.length > 3 && TABLE_TYPE.hasOwnProperty(splitPath[3])
        ? splitPath[3]
        : TABLE_TYPE.nodes;

    this.state = {selectedTable};
  }

  componentDidUpdate(prevProps: Props, _prevState: State) {
    // Render table containing selected element (from NetworkContext)
    const {selectedElement} = this.props;
    if (
      // dont jump to another tab if on the tests tab
      this.state.selectedTable !== TABLE_TYPE.tests &&
      selectedElement &&
      !isEqual(selectedElement, prevProps.selectedElement)
    ) {
      if (
        selectedElement.type === TopologyElementType.NODE ||
        selectedElement.type === TopologyElementType.SITE
      ) {
        this.handleTableChange(null, TABLE_TYPE.nodes);
      } else if (selectedElement.type === TopologyElementType.LINK) {
        this.handleTableChange(null, TABLE_TYPE.links);
      }
    }
  }

  handleTableResize = () => {
    const {onResize, tableHeight} = this.props;
    if (onResize) {
      onResize(
        tableHeight === TABLE_LIMITS.maxHeight
          ? TABLE_LIMITS.minHeight
          : TABLE_LIMITS.maxHeight,
      );
    }
  };

  handleTableChange = (event, value) => {
    // Handle a table change
    this.setState({selectedTable: value});
  };

  renderNetworkTable = routeProps => {
    // Render the selected table
    const {selectedTable} = this.state;

    return (
      <NetworkContext.Consumer>
        {context => {
          if (selectedTable === TABLE_TYPE.nodes) {
            return <NetworkNodesTable context={context} />;
          } else if (selectedTable === TABLE_TYPE.links) {
            return <NetworkLinksTable context={context} />;
          } else if (selectedTable === TABLE_TYPE.tests) {
            return <NetworkTestTable {...routeProps} />;
          } else {
            return null;
          }
        }}
      </NetworkContext.Consumer>
    );
  };

  render() {
    const {classes, match, location, isEmbedded, tableHeight} = this.props;
    const {selectedTable} = this.state;
    return (
      <div className={classes.root}>
        <Grid container>
          <Grid item xs={8}>
            <Tabs
              value={selectedTable}
              onChange={this.handleTableChange}
              classes={{
                root: classes.tabsRoot,
                indicator: classes.tabsIndicator,
              }}>
              <Tab
                classes={{root: classes.tabRoot, selected: classes.tabSelected}}
                disableRipple
                label="Nodes"
                component={Link}
                to={`${match.url}/${TABLE_TYPE.nodes}${location.search}`}
                value={TABLE_TYPE.nodes}
              />
              <Tab
                classes={{root: classes.tabRoot, selected: classes.tabSelected}}
                disableRipple
                label="Links"
                component={Link}
                to={`${match.url}/${TABLE_TYPE.links}${location.search}`}
                value={TABLE_TYPE.links}
              />
              {isFeatureEnabled('NETWORK_TEST_ENABLED') && (
                <Tab
                  classes={{
                    root: classes.tabRoot,
                    selected: classes.tabSelected,
                  }}
                  disableRipple
                  label="Tests"
                  component={Link}
                  to={`${match.url}/${TABLE_TYPE.tests}${location.search}`}
                  value={TABLE_TYPE.tests}
                />
              )}
            </Tabs>
          </Grid>
          <Grid item xs={4}>
            {isEmbedded && (
              <IconButton
                className={classes.expandButton}
                onClick={this.handleTableResize}>
                {tableHeight === TABLE_LIMITS.maxHeight ? (
                  <OpenInBrowserIcon className={classes.rotated} />
                ) : (
                  <OpenInBrowserIcon />
                )}
              </IconButton>
            )}
          </Grid>
        </Grid>

        <Switch>
          <Route
            path={`${match.path}/:table(${TABLE_TYPE.nodes}|${TABLE_TYPE.links}|${TABLE_TYPE.tests})`}
            component={this.renderNetworkTable}
          />
          {/** fixes a routing bug when this view is embedded in another page*/}
          {this.props.isEmbedded !== true && (
            <>
              <Redirect
                exact
                from={match.path}
                to={`${match.url}/${TABLE_TYPE.nodes}`}
              />
            </>
          )}
        </Switch>
      </div>
    );
  }
}

export default withStyles(styles)(NetworkTables);
