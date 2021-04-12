/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import * as React from 'react';
import CircularProgress from '@material-ui/core/CircularProgress';
import Grid from '@material-ui/core/Grid';
import IconButton from '@material-ui/core/IconButton';
import MenuButton from '@fbcnms/tg-nms/app/components/common/MenuButton';
import MenuItem from '@material-ui/core/MenuItem';
import NetworkContext from '@fbcnms/tg-nms/app/contexts/NetworkContext.js';
import NetworkLinksTable from './NetworkLinksTable';
import NetworkNodesTable from './NetworkNodesTable';
import NetworkPlanningTable from './NetworkPlanningTable';
import NetworkTestTable from './NetworkTestTable';
import OpenInBrowserIcon from '@material-ui/icons/OpenInBrowser';
import ScanTable from './ScanTable';
import Tab from '@material-ui/core/Tab';
import Tabs from '@material-ui/core/Tabs';
import {Link, Redirect, Route, Switch} from 'react-router-dom';
import {NETWORK_TABLE_HEIGHTS} from '@fbcnms/tg-nms/app/constants/StyleConstants';
import {TopologyElementType} from '@fbcnms/tg-nms/app/constants/NetworkConstants.js';
import {isEqual} from 'lodash';
import {isFeatureEnabled} from '@fbcnms/tg-nms/app/constants/FeatureFlags';
import {useExport} from '@fbcnms/tg-nms/app/apiutils/ExportAPIUtil';
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
  menuBar: {
    paddingRight: theme.spacing(1),
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
    color: theme.palette.text.primary,
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
  scans: 'scans',
  plans: 'plans',
});

export type NetworkTableProps = {|
  tableHeight?: ?number,
|};

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
      // dont jump to another tab if on the test or scan tab
      this.state.selectedTable !== TABLE_TYPE.tests &&
      this.state.selectedTable !== TABLE_TYPE.scans &&
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

  renderNetworkTable = () => {
    // Render the selected table
    const {selectedTable} = this.state;
    const tableRootHeight = this.props.tableHeight;
    const tableProps: NetworkTableProps = {
      tableHeight:
        tableRootHeight != null
          ? tableRootHeight - NETWORK_TABLE_HEIGHTS.TABS
          : null,
    };
    return (
      <NetworkContext.Consumer>
        {context => {
          if (selectedTable === TABLE_TYPE.nodes) {
            return <NetworkNodesTable {...tableProps} />;
          } else if (selectedTable === TABLE_TYPE.links) {
            return <NetworkLinksTable context={context} />;
          } else if (selectedTable === TABLE_TYPE.tests) {
            return <NetworkTestTable />;
          } else if (selectedTable === TABLE_TYPE.scans) {
            return <ScanTable />;
          } else if (selectedTable === TABLE_TYPE.plans) {
            return <NetworkPlanningTable {...tableProps} />;
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
        <Grid container className={classes.menuBar}>
          <Grid item xs={8}>
            <Tabs
              value={selectedTable}
              onChange={this.handleTableChange}
              classes={{
                root: classes.tabsRoot,
                indicator: classes.tabsIndicator,
              }}>
              <Tab
                classes={{root: classes.tabRoot}}
                disableRipple
                label="Nodes"
                component={Link}
                to={`${match.url}/${TABLE_TYPE.nodes}${location.search}`}
                value={TABLE_TYPE.nodes}
              />
              <Tab
                classes={{root: classes.tabRoot}}
                disableRipple
                label="Links"
                component={Link}
                to={`${match.url}/${TABLE_TYPE.links}${location.search}`}
                value={TABLE_TYPE.links}
              />
              {isFeatureEnabled('NETWORKTEST_ENABLED') && (
                <Tab
                  classes={{
                    root: classes.tabRoot,
                  }}
                  disableRipple
                  label="Tests"
                  component={Link}
                  to={`${match.url}/${TABLE_TYPE.tests}${location.search}`}
                  value={TABLE_TYPE.tests}
                />
              )}
              {isFeatureEnabled('SCANSERVICE_ENABLED') && (
                <Tab
                  classes={{
                    root: classes.tabRoot,
                  }}
                  disableRipple
                  label="Scans"
                  component={Link}
                  to={`${match.url}/${TABLE_TYPE.scans}${location.search}`}
                  value={TABLE_TYPE.scans}
                />
              )}
              {isFeatureEnabled('NETWORK_PLANNING_ENABLED') && (
                <Tab
                  classes={{
                    root: classes.tabRoot,
                  }}
                  disableRipple
                  label="Plans"
                  component={Link}
                  to={`${match.url}/${TABLE_TYPE.plans}${location.search}`}
                  value={TABLE_TYPE.plans}
                />
              )}
            </Tabs>
          </Grid>
          <Grid container item xs={4} justify="flex-end" alignItems="center">
            {selectedTable === 'nodes' && ( //export nodes only for now
              <Grid item>
                <ExportMenu selectedTable={selectedTable} />
              </Grid>
            )}
            <Grid item>
              {isEmbedded && (
                <IconButton
                  className={classes.expandButton}
                  onClick={this.handleTableResize}
                  title={'Expand Table'}>
                  {tableHeight === TABLE_LIMITS.maxHeight ? (
                    <OpenInBrowserIcon className={classes.rotated} />
                  ) : (
                    <OpenInBrowserIcon />
                  )}
                </IconButton>
              )}
            </Grid>
          </Grid>
        </Grid>
        <Switch>
          <Route
            path={`${match.path}/:table(${TABLE_TYPE.nodes}|${TABLE_TYPE.links}|${TABLE_TYPE.tests}|${TABLE_TYPE.scans}|${TABLE_TYPE.plans})`}
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

function ExportMenu({selectedTable}: {selectedTable: string}) {
  const {exportCSV, exportState} = useExport({table: selectedTable});
  return (
    <MenuButton
      label={
        <>
          Export {selectedTable}{' '}
          {exportState === 'LOADING' && <CircularProgress size={15} />}
        </>
      }
      id="export-menu">
      <MenuItem onClick={exportCSV}>CSV</MenuItem>
    </MenuButton>
  );
}

export default withStyles(styles)(NetworkTables);
