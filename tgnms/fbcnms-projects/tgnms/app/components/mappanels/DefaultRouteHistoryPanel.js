/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import CircularProgress from '@material-ui/core/CircularProgress';
import CustomAccordion from '../common/CustomAccordion';
import FormControl from '@material-ui/core/FormControl';
import List from '@material-ui/core/List';
import ListItem from '@material-ui/core/ListItem';
import MenuItem from '@material-ui/core/MenuItem';
import Paper from '@material-ui/core/Paper';
import React from 'react';
import Select from '@material-ui/core/Select';
import TimelineIcon from '@material-ui/icons/Timeline';
import Typography from '@material-ui/core/Typography';
import {KeyboardDatePicker} from '@material-ui/pickers';
import {
  currentDefaultRouteRequest,
  getDefaultRouteHistory,
} from '../../apiutils/DefaultRouteHistoryAPIUtil';
import {mapDefaultRoutes} from '../../helpers/DefaultRouteHelpers';
import {withStyles} from '@material-ui/core/styles';

import type {NodeMap, Site} from '../../contexts/NetworkContext';
import type {NodeType, TopologyType} from '../../../shared/types/Topology';
import type {Routes} from './MapPanelTypes';

type DefaultRouteType = {
  route: Array<Array<string>>,
  percent: number,
  hops: number,
  isCurrent: boolean,
};

const styles = theme => ({
  iconCentered: {
    verticalAlign: 'middle',
    paddingRight: theme.spacing(1),
  },
  formControl: {
    display: 'flex',
    wrap: 'nowrap',
  },
  route: {
    width: '100%',
  },
  sectionPadding: {
    paddingTop: theme.spacing(1),
    paddingBottom: theme.spacing(1),
  },
  closerTitle: {
    marginBottom: -theme.spacing(1),
  },
  routeSelection: {
    marginLeft: -theme.spacing(1),
  },
  unselectedRoute: {
    marginTop: theme.spacing(1),
  },
  selectedRoute: {
    background: '#e3f2fd',
    marginTop: theme.spacing(1),
  },
  centered: {
    textAlign: 'center',
  },
  routeChangesText: {
    marginTop: theme.spacing(2),
    marginBottom: -theme.spacing(1),
  },
});

type Props = {
  classes: {[string]: string},
  networkName: string,
  topology: TopologyType,
  node: NodeType,
  nodeMap: NodeMap,
  site: Site,
  onClose: () => any,
  routes: Routes,
  siteNodes: Set<string>,
};

type State = {
  expanded: boolean,
  isLoading: boolean,
  selectedDate: Date,
  highlightedSiteNode: ?number,
  defaultRoutes: ?Array<DefaultRouteType>,
  selectedRoute: ?number,
  totalChanges: number,
  selectedNode: string,
};

class DefaultRouteHistoryPanel extends React.Component<Props, State> {
  state = {
    expanded: true,
    isLoading: true,
    selectedDate: new Date(
      new Date().toISOString().split('T')[0] + 'T08:00:00Z',
    ),
    highlightedSiteNode: null,
    defaultRoutes: null,
    selectedRoute: null,
    totalChanges: -1,
    selectedNode: '',
  };

  componentDidMount() {
    this.getInitialSetup();
  }

  componentDidUpdate(prevProps) {
    const {node} = this.props;
    if (
      prevProps.node.name !== node.name &&
      node.name !== this.state.selectedNode
    ) {
      this.handleNodeChange(node.name);
    }
  }

  handleDateChange(date) {
    if (date.toString() === 'Invalid Date') {
      return;
    }
    this.setState({selectedDate: new Date(date), isLoading: true}, () => {
      this.processRoutes();
    });
  }

  handleNodeChange(nodeName) {
    this.setState({selectedNode: nodeName, isLoading: true}, () => {
      this.processRoutes();
    });
  }

  getInitialSetup() {
    const {routes} = this.props;
    if (!routes.node) {
      return;
    }
    this.setState({selectedNode: routes.node}, () => {
      this.processRoutes();
    });
  }

  renderLoading() {
    const {classes} = this.props;
    return (
      <div data-testid="loadingCircle" className={classes.centered}>
        <CircularProgress />
      </div>
    );
  }

  onSelectRoute(route, index) {
    const {links, nodes} = mapDefaultRoutes({
      mapRoutes: route.route,
      topology: this.props.topology,
    });
    this.setState({selectedRoute: index});
    // update weights (will be used in links rendering)
    this.props.routes.onUpdateRoutes({
      node: this.state.selectedNode,
      links,
      nodes,
    });
  }

  async defaultRouteHistoryRequest() {
    const {networkName} = this.props;
    const {selectedDate, selectedNode} = this.state;
    const startTime = selectedDate.toISOString().split('.')[0];
    const endTime = new Date(selectedDate.getTime() + 24 * 60 * 60 * 1000)
      .toISOString()
      .split('.')[0];
    return await getDefaultRouteHistory({
      networkName,
      nodeName: selectedNode,
      startTime,
      endTime,
    });
  }

  cleanRoute(routes) {
    //clean up the routes that bounce between multiple pops at the end
    const {nodeMap} = this.props;
    const processedRoutes = routes.map(route => {
      for (let i = route.length - 1; i > -1; i--) {
        if (!nodeMap[route[i]].pop_node) {
          return route.slice(0, i + 2);
        }
      }
      return [];
    });
    return [
      ...processedRoutes.filter(
        route => JSON.stringify(route) !== JSON.stringify(processedRoutes[0]),
      ),
      processedRoutes[0],
    ];
  }

  async processRoutes() {
    const {networkName, topology} = this.props;
    const {selectedNode} = this.state;
    const [currentDefaultRoute, defaultRouteHistory] = await Promise.all([
      currentDefaultRouteRequest({
        networkName,
        selectedNode,
      }),
      this.defaultRouteHistoryRequest(),
    ]);

    if (
      defaultRouteHistory === undefined ||
      defaultRouteHistory.utils.length === 0
    ) {
      this.setState({defaultRoutes: null, isLoading: false});
      return;
    }
    if (currentDefaultRoute !== undefined) {
      const {links, nodes} = mapDefaultRoutes({
        mapRoutes: currentDefaultRoute,
        topology,
      });
      this.props.routes.onUpdateRoutes({
        node: selectedNode,
        links,
        nodes,
      });
    }

    const {history, utils} = defaultRouteHistory;

    const routes = utils.map(util => util.routes);

    const percents = utils.map(routeUtil => routeUtil.percentage);
    const currentRouteString = JSON.stringify(currentDefaultRoute);

    const finalDefaultRoutes: Array<DefaultRouteType> = routes.map(
      (route, index) => {
        const routeString = JSON.stringify(route);
        const routeInstances = [...new Set(history)].filter(
          change => JSON.stringify(change.routes) === routeString,
        );
        const hops =
          routeInstances.find(route => route.max_hop_count !== 0)
            ?.max_hop_count || 0;

        return {
          route,
          hops,
          percent: percents[index],
          isCurrent: routeString === currentRouteString,
        };
      },
    );

    this.setState({
      defaultRoutes: finalDefaultRoutes.sort((a, b) => b.percent - a.percent),
      totalChanges: history.length,
      isLoading: false,
    });
  }

  renderRoutes() {
    const {classes} = this.props;
    const {
      highlightedSiteNode,
      defaultRoutes,
      selectedRoute,
      totalChanges,
    } = this.state;
    return (
      <div>
        {defaultRoutes ? (
          <Typography className={classes.routeChangesText} variant="body2">
            {totalChanges} route changes over {defaultRoutes.length} routes.
          </Typography>
        ) : null}
        <List className={classes.sectionPadding}>
          {defaultRoutes ? (
            defaultRoutes.map((route, index) => (
              <Paper
                className={
                  selectedRoute === index
                    ? classes.selectedRoute
                    : classes.unselectedRoute
                }
                elevation={2}
                key={'route' + index}>
                <ListItem
                  button
                  dense
                  onClick={() => this.onSelectRoute(route, index)}
                  onMouseOver={() =>
                    this.setState({highlightedSiteNode: index})
                  }
                  onMouseOut={() => this.setState({highlightedSiteNode: null})}
                  selected={index === highlightedSiteNode}>
                  <List className={classes.routeSelection}>
                    <ListItem className={classes.closerTitle}>
                      <Typography variant="subtitle2">
                        {'Route ' + (index + 1).toString()}
                      </Typography>
                      {route.isCurrent ? (
                        <Typography variant="subtitle2"> - Current</Typography>
                      ) : null}
                    </ListItem>
                    <ListItem>
                      <Typography variant="body2">
                        {route.percent + '% of the time - '}
                        {route.route.length === 0
                          ? 'no route'
                          : route.hops + ' wireless hop(s)'}
                      </Typography>
                    </ListItem>
                  </List>
                </ListItem>
              </Paper>
            ))
          ) : (
            <Typography data-testid="noRoutes" variant="subtitle1">
              No route history exists during this time period. The node could
              have been offline or not part of the topology. Try selecting
              another time period.
            </Typography>
          )}
        </List>
      </div>
    );
  }

  renderPanel() {
    const {siteNodes, classes} = this.props;
    const {isLoading, selectedDate, selectedNode} = this.state;

    return (
      <div style={{width: '100%'}}>
        <Typography variant="subtitle2">Node</Typography>
        <FormControl className={classes.formControl}>
          <Select
            labelWidth={10}
            value={selectedNode}
            variant="outlined"
            margin="dense"
            onChange={ev => this.handleNodeChange(ev.target.value)}>
            {Array.from(siteNodes).map(nodeName => (
              <MenuItem key={nodeName} value={nodeName}>
                {nodeName}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <div className={classes.sectionPadding} />
        <div className={classes.sectionPadding}>
          <Typography className={classes.closerTitle} variant="subtitle2">
            Date
          </Typography>
          <KeyboardDatePicker
            disableToolbar
            inputVariant="outlined"
            format="MM/DD/YYYY"
            margin="dense"
            id="date"
            value={selectedDate.toISOString().split('T')[0]}
            onChange={ev => this.handleDateChange(ev._d)}
            KeyboardButtonProps={{
              'aria-label': 'change date',
            }}
          />
        </div>
        {isLoading ? this.renderLoading() : this.renderRoutes()}
      </div>
    );
  }

  render() {
    const {classes, onClose} = this.props;
    const {expanded} = this.state;

    return (
      <CustomAccordion
        title="Default Routes"
        titleIcon={<TimelineIcon classes={{root: classes.iconCentered}} />}
        details={this.renderPanel()}
        expanded={expanded}
        onChange={() => this.setState({expanded: !expanded})}
        onClose={onClose}
      />
    );
  }
}

export default withStyles(styles)(DefaultRouteHistoryPanel);
