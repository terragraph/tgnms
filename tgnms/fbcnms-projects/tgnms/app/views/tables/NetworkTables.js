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
import NetworkLinksTable from './NetworkLinksTable';
import NetworkNodesTable from './NetworkNodesTable';
import NetworkPlanningTable from './NetworkPlanning/NetworkPlanningTable';
import NetworkTestTable from './NetworkTestTable';
import OpenInBrowserIcon from '@material-ui/icons/OpenInBrowser';
import ScanTable from './ScanTable';
import Tab from '@material-ui/core/Tab';
import Tabs from '@material-ui/core/Tabs';
import {
  Link,
  Route,
  Switch,
  generatePath,
  matchPath,
  useHistory,
  useLocation,
} from 'react-router-dom';
import {
  NETWORK_BASE,
  NETWORK_TABLES_BASE_PATH,
} from '@fbcnms/tg-nms/app/constants/paths';

import {TOPOLOGY_ELEMENT} from '@fbcnms/tg-nms/app/constants/NetworkConstants.js';
import {isFeatureEnabled} from '@fbcnms/tg-nms/app/constants/FeatureFlags';
import {makeStyles} from '@material-ui/styles';
import {useExport} from '@fbcnms/tg-nms/app/apiutils/ExportAPIUtil';
import {useNetworkContext} from '@fbcnms/tg-nms/app/contexts/NetworkContext';

const styles = theme => ({
  root: {
    display: 'flex',
    height: '100%',
    flexGrow: 1,
    flexFlow: 'column',
    overflow: 'hidden',
  },
  menuBar: {
    paddingRight: theme.spacing(2),
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
    '&:focus': {
      color: '#40a9ff',
    },
  },

  rotated: {
    transform: 'rotate(180deg)',
  },
  expandTableButton: {borderBottom: '1px solid #e8e8e8'},
});
const useStyles = makeStyles(styles);

export const TABLE_TYPE = Object.freeze({
  nodes: 'nodes',
  links: 'links',
  tests: 'tests',
  scans: 'scans',
  planning: 'planning',
});

export type NetworkTableProps = {|
  tableHeight?: ?number,
|};

export const TABLE_LIMITS = {minHeight: 360, maxHeight: 720};

export type Props = {|
  onResize?: number => void,
  ...NetworkTableProps,
|};

//Matches the current URL against the route pattern for network tables
function matchNetworkTablePath(pathname: string) {
  const match = matchPath(pathname, {
    path: NETWORK_TABLES_BASE_PATH,
    exact: false,
    strict: false,
  });
  return match;
}

export default function NetworkTables(props: Props) {
  const {tableHeight} = props;
  const networkContext = useNetworkContext();
  const {selectedElement} = networkContext;
  const classes = useStyles();
  const {pathname} = useLocation();
  const history = useHistory();
  const match = matchNetworkTablePath(pathname);
  const selectedTable = match?.params?.table ?? TABLE_TYPE.nodes;
  const makeTablePath = React.useCallback(
    (tableName: string) => {
      const match = matchNetworkTablePath(pathname);
      const path = generatePath(NETWORK_TABLES_BASE_PATH, {
        ...match?.params,
        table: tableName,
      });
      return path;
    },
    [pathname],
  );

  /**
   * If a topology table is selected or no table is selected, switch tables
   * to reflect the currently selected topology element.
   */
  React.useEffect(
    () => {
      if (
        selectedTable != TABLE_TYPE.nodes &&
        selectedTable != TABLE_TYPE.links
      ) {
        return;
      }
      if (
        selectedElement?.type === TOPOLOGY_ELEMENT.NODE ||
        selectedElement?.type === TOPOLOGY_ELEMENT.SITE
      ) {
        const newPath = makeTablePath(TABLE_TYPE.nodes);
        if (newPath !== pathname) {
          history.replace(newPath);
        }
      } else if (selectedElement?.type === TOPOLOGY_ELEMENT.LINK) {
        const newPath = makeTablePath(TABLE_TYPE.links);
        if (newPath !== pathname) {
          history.replace(newPath);
        }
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selectedElement],
  );

  const handleTableResize = () => {
    const {onResize, tableHeight} = props;
    if (onResize) {
      onResize(
        tableHeight === TABLE_LIMITS.maxHeight
          ? TABLE_LIMITS.minHeight
          : TABLE_LIMITS.maxHeight,
      );
    }
  };

  const renderPlanningTab = pathname => {
    return !pathname.startsWith('/tables/');
  };

  return (
    <div className={classes.root}>
      <Grid container className={classes.menuBar}>
        <Grid item xs={8}>
          <Tabs
            value={selectedTable}
            classes={{
              root: classes.tabsRoot,
              indicator: classes.tabsIndicator,
            }}
            data-test-selected={selectedTable}
            data-testid="network-tables-tabs">
            <Tab
              classes={{root: classes.tabRoot}}
              disableRipple
              label="Nodes"
              component={Link}
              to={makeTablePath(TABLE_TYPE.nodes)}
              value={TABLE_TYPE.nodes}
            />
            <Tab
              classes={{root: classes.tabRoot}}
              disableRipple
              label="Links"
              component={Link}
              to={makeTablePath(TABLE_TYPE.links)}
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
                to={makeTablePath(TABLE_TYPE.tests)}
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
                to={makeTablePath(TABLE_TYPE.scans)}
                value={TABLE_TYPE.scans}
              />
            )}
            {isFeatureEnabled('NETWORK_PLANNING_ENABLED') &&
              renderPlanningTab(pathname) && (
                <Tab
                  classes={{
                    root: classes.tabRoot,
                  }}
                  disableRipple
                  label="Planning"
                  component={Link}
                  to={makeTablePath(TABLE_TYPE.planning)}
                  value={TABLE_TYPE.planning}
                />
              )}
          </Tabs>
        </Grid>
        <Grid
          container
          item
          xs={4}
          justifyContent="flex-end"
          alignItems="center">
          {selectedTable === TABLE_TYPE.nodes && ( //export nodes only for now
            <Grid item>
              <ExportMenu selectedTable={selectedTable} />
            </Grid>
          )}
          <Grid item>
            {!isNaN(tableHeight) && (
              <IconButton
                onClick={handleTableResize}
                title={'Expand Table'}
                data-testid="expand-table"
                edge="end">
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
          path={`${NETWORK_BASE}/${TABLE_TYPE.links}`}
          render={() => <NetworkLinksTable />}
        />
        <Route
          path={`${NETWORK_BASE}/${TABLE_TYPE.tests}`}
          render={() => <NetworkTestTable />}
        />
        <Route
          path={`${NETWORK_BASE}/${TABLE_TYPE.scans}`}
          render={() => <ScanTable />}
        />
        <Route
          path={`${NETWORK_BASE}/${TABLE_TYPE.planning}`}
          render={() => <NetworkPlanningTable />}
        />
        {/** Don't put any new routes below here, nodes is the default */}
        <Route
          path={`${NETWORK_BASE}(/${TABLE_TYPE.nodes})?`}
          exact={false}
          render={() => <NetworkNodesTable />}
        />
      </Switch>
    </div>
  );
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
