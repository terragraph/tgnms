/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */
import * as React from 'react';
import * as api from '../../../apiutils/NetworkTestAPIUtil';
import Button from '@material-ui/core/Button';
import Checkbox from '@material-ui/core/Checkbox';
import EditIcon from '@material-ui/icons/Edit';
import FormControl from '@material-ui/core/FormControl';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import FormGroup from '@material-ui/core/FormGroup';
import FormLabel from '@material-ui/core/FormLabel';
import Grid from '@material-ui/core/Grid';
import IconButton from '@material-ui/core/IconButton';
import LoadingBox from '../../common/LoadingBox';
import MaterialReactSelect from '../../common/MaterialReactSelect';
import NetworkContext from '../../../contexts/NetworkContext';
import RouteContext from '../../../contexts/RouteContext';
import Tooltip from '@material-ui/core/Tooltip';
import Typography from '@material-ui/core/Typography';
import swal from 'sweetalert2';
import {TopologyElementType} from '../../../constants/NetworkConstants';
import {getTopologyNodeList} from '../../../helpers/ConfigHelpers';
import {makeStyles} from '@material-ui/styles';
import {useNetworkRoutes} from '../../../hooks/MapHooks';
import type {Element} from '../../../contexts/NetworkContext';

const useSpeedTestStyles = makeStyles(theme => ({
  actions: {
    marginTop: theme.spacing(2),
  },
  errorMessage: {
    marginTop: theme.spacing(2),
  },
  useNearestPop: {
    marginBottom: theme.spacing(),
  },
}));

export default function ConfigureSpeedTest({
  selectedElement,
  onTestStarted,
}: {
  selectedElement: Element,
  onTestStarted: string => any,
}) {
  const classes = useSpeedTestStyles();
  const networkContext = React.useContext(NetworkContext);
  const {routeData} = React.useContext(RouteContext);
  const [useNearestPop, setUseNearestPop] = React.useState(true);
  const [nodes, setNodes] = React.useState<Array<Element>>([]);
  const setNode = React.useCallback(
    (node, index) => {
      const newNodes = [...nodes];
      newNodes[index] = node;
      setNodes(newNodes);
      setReplaceIndex(null);
      if (index === 0) {
        networkContext.setSelected(TopologyElementType.NODE, node.name);
      }
    },
    [nodes, setNodes, networkContext],
  );
  /**
   * When setReplaceIndex(0) is called, the next element that the user selects
   * will replace the first node.
   **/
  const [replaceIndex, setReplaceIndex] = React.useState(null);
  React.useEffect(() => {
    if (
      !selectedElement ||
      selectedElement.type !== TopologyElementType.NODE ||
      nodes.some(node => node.name === selectedElement.name)
    ) {
      return;
    }

    // if useNearestPop is set, only replace node1. node2 is implied
    if (useNearestPop) {
      setNodes([selectedElement]);
    } else {
      if (replaceIndex !== null) {
        setNode(selectedElement, replaceIndex);
      }
      // if node2 has not been selected, node2 will be the next selected node
      if (nodes.length < 2) {
        setReplaceIndex(1);
      } else {
        setReplaceIndex(null);
      }
    }
  }, [selectedElement, setNode, nodes, replaceIndex, useNearestPop]);

  const handleFormSubmit = React.useCallback(
    async e => {
      e.preventDefault();
      const nodeRoutes = routeData[nodes[0].name][0].path;
      const speedTestPair = {
        pop: nodes[0].name,
        node: useNearestPop ? nodeRoutes[nodeRoutes.length - 1] : nodes[1].name,
      };
      const request = {
        topology_id: networkContext.networkConfig.id,
        pop_to_node_link: speedTestPair,
        //TODO: make these configurable
        session_duration: 30,
        test_push_rate: 2000000000, //2 gigabits
        protocol: 'UDP',
      };

      try {
        const response = await api.startSpeedTest(request);
        if (response.data.error === true) {
          throw new Error(response.data.msg);
        }
        onTestStarted(response.data.id);
      } catch (e) {
        swal({
          type: 'error',
          title: 'Starting speed test failed',
          text: e.message,
        });
      }
    },
    [nodes, networkContext, routeData, useNearestPop, onTestStarted],
  );

  const isFormValid = React.useMemo(() => {
    if (useNearestPop && nodes.length > 0) {
      return true;
    } else if (nodes.length === 2) {
      return true;
    }
    return false;
  }, [useNearestPop, nodes]);

  const {loading: routesLoading, error: routesLoadingError} = useNetworkRoutes({
    nodes: nodes ? nodes.map(x => x.name) : [],
    useNearestPop,
  });

  const [nodeA, nodeZ] = nodes;
  return (
    <form onSubmit={handleFormSubmit}>
      <Grid container direction="column">
        <Grid item>
          <FormGroup>
            <FormControl>
              <FormLabel htmlFor="node1">Node 1</FormLabel>
              <Grid item container>
                <Grid item xs={10}>
                  <NodeSelect
                    id="node1"
                    selected={nodeA}
                    setSelected={selected => setNode(selected, 0)}
                  />
                </Grid>
                <Grid item xs={2}>
                  <ReplaceNodeButton onClick={() => setReplaceIndex(0)} />
                </Grid>
              </Grid>
            </FormControl>
          </FormGroup>
        </Grid>
        <Grid item className={classes.useNearestPop}>
          <FormControlLabel
            control={
              <Checkbox
                name="usePop"
                id="usePop"
                checked={useNearestPop}
                onChange={e => setUseNearestPop(e.target.checked)}
              />
            }
            label="Use Nearest Pop"
          />
        </Grid>
        {!useNearestPop && (
          <Grid item>
            <FormGroup>
              <FormControl>
                <FormLabel htmlFor="node2">Node 2</FormLabel>
                <Grid item container>
                  <Grid item xs={10}>
                    <NodeSelect
                      id="node2"
                      selected={nodeZ}
                      setSelected={selected => setNode(selected, 1)}
                    />
                  </Grid>
                  <Grid item xs={2}>
                    <ReplaceNodeButton onClick={() => setReplaceIndex(1)} />
                  </Grid>
                </Grid>
              </FormControl>
            </FormGroup>
          </Grid>
        )}

        <Grid item container>
          <Grid item xs={4}>
            {routesLoading && <LoadingBox fullScreen={false} />}
          </Grid>
          <Grid
            className={classes.actions}
            container
            item
            justify="flex-end"
            xs={8}>
            <Button
              color="primary"
              type="submit"
              variant="contained"
              disabled={!isFormValid}>
              Start Test
            </Button>
          </Grid>
        </Grid>
        {routesLoadingError && (
          <Typography variant="body1" className={classes.errorMessage}>
            {routesLoadingError}
          </Typography>
        )}
      </Grid>
    </form>
  );
}

const useNodeSelectStyles = makeStyles(_theme => ({
  select: {
    minWidth: 180,
  },
}));
// manually select a node from the list of nodes
function NodeSelect({
  selected,
  setSelected,
}: {
  selected: Element,
  setSelected: (e: Element) => any,
}) {
  const classes = useNodeSelectStyles();
  const context = React.useContext(NetworkContext);
  const nodes = getTopologyNodeList(context.networkConfig);
  return (
    <MaterialReactSelect
      options={nodes}
      getOptionValue={option => option.name || ''}
      getOptionLabel={option => option.name}
      value={selected}
      onChange={setSelected}
      className={classes.select}
    />
  );
}

/**
 * clicking this will replace the current value with
 * the next node selected on the map view
 */
function ReplaceNodeButton({onClick}: {onClick: () => any}) {
  return (
    <Tooltip title={<span>Select a new node</span>} placement="top-start">
      <IconButton onClick={onClick}>
        <EditIcon fontSize="small" />
      </IconButton>
    </Tooltip>
  );
}
