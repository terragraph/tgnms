/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow strict-local
 */

import CorrelationVisualization from './CorrelationVisualization';
import Grid from '@material-ui/core/Grid';
import MenuItem from '@material-ui/core/MenuItem';
import NodeSelector from '../../components/taskBasedConfig/NodeSelector';
import Paper from '@material-ui/core/Paper';
import React from 'react';
import TextField from '@material-ui/core/TextField';
import {
  CONFIG_MODES,
  SELECTED_NODE_QUERY_PARAM,
} from '../../constants/ConfigConstants';
import {convertType} from '../../helpers/ObjectHelpers';
import {getTopologyNodeList} from '../../helpers/ConfigHelpers';
import {makeStyles} from '@material-ui/styles';
import {useHistory} from 'react-router';
import {useNetworkContext} from '../../contexts/NetworkContext';

const useStyles = makeStyles(theme => ({
  visualization: {
    margin: theme.spacing(),
    height: `calc(100vh - ${theme.spacing(18)}px)`,
    overflowY: 'scroll',
    overflowX: 'hidden',
  },
  nodeSelectorWrapper: {
    width: '105%',
  },
  visualizationWrapper: {
    width: 'calc(100vw - 390px)',
  },
  sideBarWrapper: {margin: '8px', width: '300px'},
  spacing: {marign: theme.spacing()},
}));

export const NODE_FILTER_MODES = {
  NETWORK: 'Network',
  NODE: 'All Nodes',
  POP: 'POP Nodes',
  CN: 'Client Nodes',
};

export const TIME_OPTIONS = {
  QUARTER_HOUR: 'Last 15 minutes',
  HALF_HOUR: 'Last 30 minutes',
  HOUR: 'Last hour',
  DAY: 'Today',
  WEEK: 'This week',
  MONTH: 'This month',
};

export const TIME_DIFFERENCE_IN_MINUTES = {
  [TIME_OPTIONS.QUARTER_HOUR]: 15,
  [TIME_OPTIONS.HALF_HOUR]: 30,
  [TIME_OPTIONS.HOUR]: 60,
  [TIME_OPTIONS.DAY]: 60 * 24,
  [TIME_OPTIONS.WEEK]: 60 * 24 * 7,
  [TIME_OPTIONS.MONTH]: 60 * 24 * 30,
};

export default function RootCause() {
  const {networkConfig} = useNetworkContext();
  const history = useHistory();
  const classes = useStyles();

  const initiallySelectedNode = React.useMemo(() => {
    const values = new URL(window.location).searchParams;
    const name = values.get(SELECTED_NODE_QUERY_PARAM);
    if (name == null) {
      return null;
    }
    const nodes = getTopologyNodeList(networkConfig, null);
    return nodes.find(node => node.name === name) || null;
  }, [networkConfig]);

  const [selectedNode, setSelectedNode] = React.useState(initiallySelectedNode);

  const [mode, setMode] = React.useState(
    Object.keys(NODE_FILTER_MODES)[initiallySelectedNode ? 1 : 0],
  );

  const handleChangeMode = React.useCallback(
    e => {
      const newMode = e.target.value;
      if (NODE_FILTER_MODES[newMode] === NODE_FILTER_MODES.NETWORK) {
        setSelectedNode(null);
      }
      setMode(newMode);
    },
    [setMode],
  );

  const [timeOffset, setTimeOffset] = React.useState(TIME_OPTIONS.WEEK);

  const handleChangeTimeOffset = React.useCallback(
    e => {
      setTimeOffset(e.target.value);
    },
    [setTimeOffset],
  );

  const handleSelectNode = React.useCallback(
    newSelectedNode => {
      history.replace({
        search: `?${SELECTED_NODE_QUERY_PARAM}=${
          newSelectedNode ? newSelectedNode.name : ''
        }`,
      });
      setSelectedNode(newSelectedNode);
    },
    [setSelectedNode, history],
  );

  return (
    <Grid container spacing={2} direction="row">
      <Grid item>
        <div className={classes.sideBarWrapper}>
          <TextField
            className={classes.spacing}
            label="Time"
            select
            InputLabelProps={{shrink: true}}
            margin="dense"
            value={timeOffset}
            fullWidth
            onChange={handleChangeTimeOffset}>
            {Object.keys(TIME_OPTIONS).map(key => (
              <MenuItem key={key} value={TIME_OPTIONS[key]}>
                {TIME_OPTIONS[key]}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            className={classes.spacing}
            label="View"
            select
            InputLabelProps={{shrink: true}}
            margin="dense"
            value={mode}
            fullWidth
            onChange={handleChangeMode}>
            {Object.keys(NODE_FILTER_MODES).map(mode => (
              <MenuItem key={mode} value={mode}>
                {NODE_FILTER_MODES[mode]}
              </MenuItem>
            ))}
          </TextField>
          {NODE_FILTER_MODES[mode] !== NODE_FILTER_MODES.NETWORK && (
            <div className={classes.nodeSelectorWrapper}>
              <NodeSelector
                mode={convertType<$Keys<typeof CONFIG_MODES>>(mode)}
                onSelectNode={handleSelectNode}
                selectedNodeName={selectedNode?.name || null}
              />
            </div>
          )}
        </div>
      </Grid>
      <Grid item className={classes.visualizationWrapper}>
        <Paper elevation={2} className={classes.visualization}>
          <CorrelationVisualization
            selectedNodeName={selectedNode?.name || null}
            timeOffset={timeOffset}
          />
        </Paper>
      </Grid>
    </Grid>
  );
}
