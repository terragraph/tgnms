/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import CircularProgress from '@material-ui/core/CircularProgress';
import CustomExpansionPanel from '../common/CustomExpansionPanel';
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
import {apiServiceRequest} from '../../apiutils/ServiceAPIUtil';
import {getDefaultRouteHistory} from '../../apiutils/DefaultRouteHistoryAPIUtil';
import {objectValuesTypesafe} from '../../helpers/ObjectHelpers';
import {withStyles} from '@material-ui/core/styles';

import type {NodeMap, Site} from '../../contexts/NetworkContext';
import type {NodeType, TopologyType} from '../../../shared/types/Topology';
import type {Routes} from './MapPanelTypes';

type DefaultRouteType = {
  route: Array<Array<string>>,
  time: number,
  percent: string,
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

  findLinkInTopology(node1, node2) {
    const {topology} = this.props;
    const link = topology.links.filter(
      link =>
        (link.a_node_name === node1 && link.z_node_name === node2) ||
        (link.a_node_name === node2 && link.z_node_name === node1),
    );
    return link.length ? link[0] : null;
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
    this.mapDefaultRoutes(route.route);
    this.setState({selectedRoute: index});
  }

  defaultRouteHistoryRequest() {
    const {networkName} = this.props;
    const {selectedDate, selectedNode} = this.state;
    const startTime = selectedDate.toISOString();
    const endTime = new Date(
      selectedDate.getTime() + 24 * 60 * 60 * 1000,
    ).toISOString();
    return getDefaultRouteHistory({
      networkName,
      nodeName: selectedNode,
      startTime,
      endTime,
    });
  }

  currentDefaultRouteRequest() {
    const {networkName} = this.props;
    const {selectedNode} = this.state;
    const data = {nodes: [selectedNode]};

    return apiServiceRequest(networkName, 'getDefaultRoutes', data)
      .then(response => {
        const defaultRoute = this.cleanRoute(
          response.data.defaultRoutes[selectedNode],
        );
        return defaultRoute;
      })
      .catch(_error => {
        return undefined;
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

  processRoutes() {
    Promise.all([
      this.currentDefaultRouteRequest(),
      this.defaultRouteHistoryRequest(),
    ]).then(([currentDefaultRoute, routes]) => {
      if (routes === undefined) {
        this.setState({defaultRoutes: null, isLoading: false});
        return;
      }
      if (currentDefaultRoute !== undefined) {
        this.mapDefaultRoutes(currentDefaultRoute);
      }
      const defaultRoutes: {[string]: DefaultRouteType} = {};
      const defaultRouteKeys: Set<string> = new Set();
      const timeStamps = Object.keys(routes);
      timeStamps.forEach(timeStamp => {
        const startTime = new Date(timeStamp).getTime();
        const endTime =
          new Date(timeStamps[timeStamps.indexOf(timeStamp) + 1]).getTime() ||
          new Date(timeStamp.split(' ')[0] + ' 23:59:59').getTime();
        const currentRoute = this.cleanRoute(routes[timeStamp]);
        const currentRouteKey = JSON.stringify(currentRoute);
        if (defaultRouteKeys.has(currentRouteKey)) {
          defaultRoutes[currentRouteKey].time += endTime - startTime;
        } else if (currentRouteKey !== '[null]') {
          defaultRouteKeys.add(currentRouteKey);
          defaultRoutes[currentRouteKey] = {
            route: currentRoute,
            time: endTime - startTime,
            isCurrent: currentRouteKey === JSON.stringify(currentDefaultRoute),
            percent: '',
          };
        }
      });
      // sort the routes based on time
      const finalDefaultRoutes = objectValuesTypesafe<DefaultRouteType>(
        defaultRoutes,
      ).sort((a, b) => b.time - a.time);

      const totalTime = finalDefaultRoutes.reduce(
        (total, route) => total + route.time,
        0,
      );
      //give route names, check which is current, and do percents
      finalDefaultRoutes.map((route, index) => {
        route.percent = ((100 * route.time) / totalTime).toFixed(1);
        if (route.isCurrent) {
          this.setState({selectedRoute: index});
        }
      });
      this.setState({
        defaultRoutes: finalDefaultRoutes,
        totalChanges: timeStamps.length,
        isLoading: false,
      });
    });
  }

  mapDefaultRoutes(mapRoutes) {
    const {routes} = this.props;
    const {selectedNode} = this.state;

    const weights = {};
    const nodes = new Set();
    let max_weight = 0;

    // for each possible route
    mapRoutes.map(route => {
      let prev_node = null;
      // iterate through all nodes
      route.map(node_name => {
        if (prev_node) {
          // find link in topology
          const link = this.findLinkInTopology(prev_node, node_name);
          if (link) {
            // increment weights for this link
            if (!weights[link.name]) {
              weights[link.name] = 0;
            }
            weights[link.name] += 1;
            // keep track of maximum weight
            max_weight = Math.max(weights[link.name], max_weight);
          }
        }
        prev_node = node_name;
        nodes.add(node_name);
      });
    });

    // normalize weights to [0-1] range
    const normalized_weights = {};
    if (max_weight > 0) {
      Object.keys(weights).forEach(key => {
        normalized_weights[key] = (weights[key] * 1.0) / max_weight;
      });
    }

    // update weights (will be used in links rendering)
    routes.onUpdateRoutes({
      node: selectedNode,
      links: normalized_weights,
      nodes,
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
                        {route.percent}% of the time -{' '}
                        {route.route[0]?.length || 0} hops
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
      <CustomExpansionPanel
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
