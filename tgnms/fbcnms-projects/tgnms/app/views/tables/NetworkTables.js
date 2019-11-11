/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import NetworkContext from '../../NetworkContext.js';
import NetworkEventsTable from './NetworkEventsTable';
import NetworkLinksTable from './NetworkLinksTable';
import NetworkNodesTable from './NetworkNodesTable';
import NetworkTestTable from './NetworkTestTable';
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
    borderBottom: '1px solid #e8e8e8',
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
});

const TABLE_TYPE = Object.freeze({
  nodes: 'nodes',
  links: 'links',
  events: 'events',
  tests: 'tests',
});

type Props = {
  classes: Object,
  selectedElement: ?Object,
  isEmbedded?: boolean,
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
        this.setState({selectedTable: TABLE_TYPE.nodes});
      } else if (selectedElement.type === TopologyElementType.LINK) {
        this.setState({selectedTable: TABLE_TYPE.links});
      }
    }
  }

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
          } else if (selectedTable === TABLE_TYPE.events) {
            return <NetworkEventsTable context={context} />;
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
    const {classes, match, location} = this.props;
    const {selectedTable} = this.state;
    return (
      <div className={classes.root}>
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
          {isFeatureEnabled('EVENTS_V1_ENABLED') && (
            <Tab
              classes={{root: classes.tabRoot, selected: classes.tabSelected}}
              disableRipple
              label="Events"
              component={Link}
              to={`${match.url}/${TABLE_TYPE.events}${location.search}`}
              value={TABLE_TYPE.events}
            />
          )}
          {isFeatureEnabled('NETWORK_TEST_ENABLED') && (
            <Tab
              classes={{root: classes.tabRoot, selected: classes.tabSelected}}
              disableRipple
              label="Tests"
              component={Link}
              to={`${match.url}/${TABLE_TYPE.tests}${location.search}`}
              value={TABLE_TYPE.tests}
            />
          )}
        </Tabs>
        <Switch>
          <Route
            path={`${match.path}/:table(${TABLE_TYPE.nodes}|${TABLE_TYPE.links}|${TABLE_TYPE.events}|${TABLE_TYPE.tests})`}
            component={this.renderNetworkTable}
          />
          <Redirect exact from={`${match.path}/:table`} to="/404" />
          {/** fixes a routing bug when this view is embedded in another page*/}
          {this.props.isEmbedded !== true && (
            <>
              <Redirect
                strict
                exact
                from={match.path}
                to={`${match.url}/${TABLE_TYPE.nodes}`}
              />
              {/* Handle trailing slash */}
              <Redirect
                exact
                from={match.path}
                to={`${match.url}${TABLE_TYPE.nodes}`}
              />
            </>
          )}
        </Switch>
      </div>
    );
  }
}

export default withStyles(styles)(NetworkTables);
