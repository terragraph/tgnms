/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */
import Button from '@material-ui/core/Button';
import Checkbox from '@material-ui/core/Checkbox';
import DashboardLink from '@fbcnms/tg-nms/app/components/common/DashboardLink';
import FormControl from '@material-ui/core/FormControl';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import FormGroup from '@material-ui/core/FormGroup';
import FormLabel from '@material-ui/core/FormLabel';
import GrafanaIcon from '@fbcnms/tg-nms/app/components/common/GrafanaIcon';
import MaterialTable from '@fbcnms/tg-nms/app/components/common/MaterialTable';
import Radio from '@material-ui/core/Radio';
import RadioGroup from '@material-ui/core/RadioGroup';
import React from 'react';
import ReactPlotlyEventChart from './ReactPlotlyEventChart';
import grey from '@material-ui/core/colors/grey';
import {
  LinkTypeValueMap,
  NodeTypeValueMap as NodeType,
} from '@fbcnms/tg-nms/shared/types/Topology';
import {MTableBodyRow} from '@material-table/core';
import {
  TIME_WINDOWS,
  TOPOLOGY_ELEMENT,
} from '@fbcnms/tg-nms/app/constants/NetworkConstants.js';
import {availabilityColor} from '@fbcnms/tg-nms/app/helpers/NetworkHelpers';
import {beamAngleToOrientation} from '@fbcnms/tg-nms/app/helpers/TgFeatures';
import {formatNumber} from '@fbcnms/tg-nms/app/helpers/StringHelpers';
import {get} from 'lodash';
import {makeStyles} from '@material-ui/styles';
import {renderStatusColor} from '@fbcnms/tg-nms/app/helpers/TableHelpers';
import {useHardwareProfiles} from '@fbcnms/tg-nms/app/features/hwprofiles/hooks';
import {useNetworkContext} from '@fbcnms/tg-nms/app/contexts/NetworkContext';

import type {LinkType} from '@fbcnms/tg-nms/shared/types/Topology';
import type {NetworkContextType} from '@fbcnms/tg-nms/app/contexts/NetworkContext';
import type {NetworkTableProps} from './NetworkTables';
import type {Node} from 'react';

// Invalid analyzer value, ignore any fields that have this value.
const INVALID_VALUE = 255;
const styles = theme => {
  return {
    root: {
      minHeight: 600,
    },
    button: {
      marginLeft: theme.spacing(),
      marginRight: theme.spacing(),
    },
    cell: {
      whiteSpace: 'nowrap',
      overflow: 'hidden',
    },
    tableOptions: {
      padding: `0 ${theme.spacing()}px`,
    },
  };
};
const useStyles = makeStyles(styles);

const LinkTable = {
  MINIMAL: 'MINIMAL',
  EVENTS_CHART: 'EVENTS_CHART',
  ANALYZER: 'ANALYZER',
};

type Props = {|...NetworkTableProps|};

type State = {
  topLink: ?string,
  hideDnToDnLinks: boolean,
  hideWired: boolean,
  linkTable: $Values<typeof LinkTable>,
};

export default function NetworkLinksTableNew(_props: Props) {
  const [state, updateState] = useNetworkLinksTableState({
    // Link filters
    hideDnToDnLinks: false,
    hideWired: true,
    // The type of link table to display
    linkTable: LinkTable.EVENTS_CHART,
  });
  return (
    <div style={{height: '100%', overflow: 'auto'}}>
      <LinksTable state={state} updateState={updateState} />
    </div>
  );
}

function useNetworkLinksTableState(initialState?: $Shape<State>) {
  const [state, setState] = React.useState<State>(initialState ?? {});
  const updateState = React.useCallback(
    (update: $Shape<State>) => setState(curr => ({...curr, ...update})),
    [],
  );
  return [state, updateState];
}

function LinksTable({
  state,
  updateState,
}: {|
  state: State,
  updateState: ($Shape<State>) => void,
|}) {
  const classes = useStyles();
  const {linkTable} = state;
  const context = useNetworkContext();
  const {selectedElement, setSelected, networkHealthTimeWindowHrs} = context;

  const eventChartColumns = React.useMemo(
    () => [
      {
        filter: true,
        field: 'name',
        title: 'Name',
        render: row => <GrafanaLinkCell row={row} />,
        sort: true,
        width: 350,
      },
      {
        field: 'alive',
        title: 'Alive',
        render: renderStatusColor,
        sort: true,
        width: 100,
      },
      {
        field: 'availability_chart',
        title: 'Availability Chart',
        appendAvailWindow: true,
        render: row => (
          <LinkAvailabilityCell row={row} style={{width: 810, height: 80}} />
        ),
        sort: true,
        width: 810,
      },
      {
        field: 'avail_perc',
        title: 'Availability',
        appendAvailWindow: true,
        render: row => <AlivePercCell row={row} />,
        sort: true,
        width: 120,
      },
      {
        field: 'linkup_attempts',
        title: 'Ignition Attempts (1d)',
        sort: true,
        width: 100,
      },
      {
        field: 'distance',
        title: 'Length (m)',
        render: row => <DistanceCell distance={row.distance} />,
        sort: true,
        width: 120,
      },
    ],
    [],
  );

  const analyzerChartColumns = React.useMemo(
    () => [
      {
        filter: true,
        field: 'name',
        title: 'Name',
        render: row => <GrafanaLinkCell row={row} />,
        sort: true,
        width: 350,
      },
      {
        filter: true,
        field: 'a_node_name',
        title: 'A-Node',
        sort: true,
        width: 200,
      },
      {
        filter: true,
        field: 'z_node_name',
        title: 'Z-Node',
        sort: true,
        width: 200,
      },
      {
        field: 'alive',
        title: 'Alive',
        render: renderStatusColor,
        sort: true,
        width: 80,
      },
      {
        field: 'mcs',
        title: 'Avg MCS',
        render: row => <FloatPointCell tpxx={'mcs'} row={row} />,
        sort: true,
        tooltip: 'Modulation and Coding Scheme',
        width: 80,
      },
      {
        field: 'snr',
        title: 'Avg SNR',
        render: row => <FloatPointCell tpxx={'snr'} row={row} />,
        sort: true,
        tooltip: 'Signal-to-noise ratio',
        width: 80,
      },
      {
        field: 'per',
        title: 'Avg PER',
        render: row => <FloatPointCell tpxx={'per'} row={row} />,
        sort: true,
        tooltip: 'Packet Error Rate',
        width: 80,
      },
      {
        field: 'tput',
        title: 'Avg tput(PPS)',
        render: row => <FloatPointCell tpxx={'tput'} row={row} />,
        sort: true,
        tooltip: 'Throughput (packets per second)',
        width: 80,
      },
      {
        field: 'txpower',
        title: 'Avg txPower',
        render: row => <FloatPointCell tpxx={'txpower'} row={row} />,
        sort: true,
        tooltip: 'Transmission power',
        width: 80,
      },
      {
        field: 'fw_restarts',
        title: '#Restarts',
        render: row => <FloatPointCell tpxx={'fw_restarts'} row={row} />,
        sort: true,
        width: 80,
      },
      {
        field: 'tx_beam_angle',
        title: <span>TX Beam &deg;</span>,
        render: row => <FloatPointCell tpxx={'tx_beam_angle'} row={row} />,
        sort: true,
        sortFunc: beamAngleSortFunc,
        width: 80,
      },
      {
        field: 'rx_beam_angle',
        title: <span>RX Beam &deg;</span>,
        render: row => <FloatPointCell tpxx={'rx_beam_angle'} row={row} />,
        sort: true,
        sortFunc: beamAngleSortFunc,
        width: 80,
      },
      {
        field: 'alive_perc',
        title: 'Uptime',
        appendAvailWindow: true,
        render: row => <AlivePercCell row={row} />,
        sort: true,
        width: 80,
      },
      {
        field: 'distance',
        title: 'Distance (m)',
        render: row => <DistanceCell distance={row.distance} />,
        sort: true,
        width: 80,
      },
    ],
    [],
  );

  const minimalChartColumns = React.useMemo(
    () => [
      {
        filter: true,
        field: 'name',
        title: 'Name',
        render: row => <GrafanaLinkCell row={row} />,
        sort: true,
        width: 350,
      },
      {filter: true, field: 'a_node_name', title: 'A-Node', width: 180},
      {filter: true, field: 'z_node_name', title: 'Z-Node', width: 180},
      {
        field: 'alive',
        title: 'Alive',
        render: renderStatusColor,
        sort: true,
        width: 100,
      },
      {
        field: 'alive_perc',
        title: 'Uptime',
        appendAvailWindow: true,
        render: row => <AlivePercCell row={row} />,
        sort: true,
        width: 140,
      },
      {field: 'type', title: 'Type', width: 100},
      {
        field: 'linkup_attempts',
        title: 'Ignition Attempts (1d)',
        sort: true,
        width: 100,
      },
      {
        field: 'distance',
        title: 'Distance (m)',
        render: row => <DistanceCell distance={row.distance} />,
        sort: true,
        width: 120,
      },
    ],
    [],
  );

  const handleRowSelect = React.useCallback(
    (e, row) => setSelected(TOPOLOGY_ELEMENT.LINK, row.name),
    [setSelected],
  );

  const makeRowStyle = React.useCallback(
    (rowData: LinkType) => ({
      backgroundColor:
        selectedElement?.type === TOPOLOGY_ELEMENT.LINK &&
        rowData.name === selectedElement?.name
          ? grey[300]
          : undefined,
    }),
    [selectedElement],
  );
  const tableOptions = React.useMemo(
    () => ({
      grouping: false,
      filtering: true,
      search: false,
      showTitle: false,
      rowStyle: makeRowStyle,
      draggable: false,
    }),
    [makeRowStyle],
  );

  const columns = React.useMemo(() => {
    if (linkTable === LinkTable.ANALYZER) {
      return insertTimeWindowText(
        analyzerChartColumns,
        networkHealthTimeWindowHrs,
      );
    } else if (linkTable === LinkTable.EVENTS_CHART) {
      return insertTimeWindowText(
        eventChartColumns,
        networkHealthTimeWindowHrs,
      );
    } else {
      return insertTimeWindowText(
        minimalChartColumns,
        networkHealthTimeWindowHrs,
      );
    }
  }, [
    linkTable,
    networkHealthTimeWindowHrs,
    analyzerChartColumns,
    eventChartColumns,
    minimalChartColumns,
  ]);
  const {getBeamAngle} = useBeamAngleMapping();
  const data = React.useMemo(() => {
    if (linkTable === LinkTable.ANALYZER) {
      return getTableRowsAnalyzer(state, context, getBeamAngle);
    } else {
      return getTableRows(state, context);
    }
  }, [linkTable, state, context, getBeamAngle]);

  const components = React.useMemo(
    () => ({
      Row: props => {
        const {name, a_node_name, z_node_name} = props.data;
        const idx = a_node_name < z_node_name ? 0 : 1;
        return <MTableBodyRow data-testid={`${name}-${idx}`} {...props} />;
      },
      Toolbar: _props => (
        <div className={classes.tableOptions} data-testid="network-links-table">
          <FormControl>
            <FormLabel component="legend">Link Options</FormLabel>
            <FormGroup row>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={state.hideWired}
                    onChange={event => {
                      updateState({hideWired: event.target.checked});
                    }}
                    value="hideWired"
                    color="primary"
                  />
                }
                label="Hide Wired Links"
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={state.hideDnToDnLinks}
                    onChange={event => {
                      updateState({hideDnToDnLinks: event.target.checked});
                    }}
                    value="hideDnToDnLinks"
                    color="primary"
                  />
                }
                label="CNs only"
              />
            </FormGroup>
          </FormControl>
          <FormControl>
            <FormLabel component="legend">Link Table</FormLabel>
            <RadioGroup
              aria-label="Link Table"
              name="linkTable"
              value={state.linkTable}
              onChange={event => updateState({linkTable: event.target.value})}
              row>
              <FormControlLabel
                value={LinkTable.MINIMAL}
                control={<Radio color="primary" />}
                label="Minimal"
              />
              <FormControlLabel
                value={LinkTable.EVENTS_CHART}
                control={<Radio color="primary" />}
                label="Link Events"
              />
              <FormControlLabel
                value={LinkTable.ANALYZER}
                control={<Radio color="primary" />}
                label="Link Stats"
              />
            </RadioGroup>
          </FormControl>
        </div>
      ),
    }),
    [classes, state, updateState],
  );
  return (
    <MaterialTable
      title="Links"
      columns={columns}
      data={data}
      onRowClick={handleRowSelect}
      options={tableOptions}
      components={components}
    />
  );
}

function getTableRows(
  state: State,
  context: NetworkContextType,
): Array<{
  name: string,
  a_node_name: string,
  z_node_name: string,
  alive: boolean,
}> {
  const rows = [];
  Object.keys(context.linkMap).forEach(linkName => {
    const link = context.linkMap[linkName];
    let alivePerc = null;
    let availPerc = null;
    let linkupAttempts = null;
    if (
      context.networkLinkHealth &&
      context.networkLinkHealth.hasOwnProperty('events') &&
      context.networkLinkHealth.events.hasOwnProperty(link.name)
    ) {
      const linkHealth = context.networkLinkHealth.events[link.name];
      alivePerc = linkHealth.linkAlive;
      availPerc = linkHealth.linkAvailForData || NaN;
    }
    if (link.link_type === LinkTypeValueMap.ETHERNET && state.hideWired) {
      return;
    }
    // check if either side of the node is a CN
    if (
      !context.nodeMap.hasOwnProperty(link.a_node_name) ||
      !context.nodeMap.hasOwnProperty(link.z_node_name)
    ) {
      return;
    }
    const aNode = context.nodeMap[link.a_node_name];
    const zNode = context.nodeMap[link.z_node_name];
    if (
      state.hideDnToDnLinks &&
      aNode.node_type === NodeType.DN &&
      zNode.node_type === NodeType.DN
    ) {
      // skip since it's DN to DN
      return;
    }
    linkupAttempts = get(
      context,
      ['networkLinkMetrics', 'ignitionAttempts', link.name],
      null,
    );
    linkupAttempts = linkupAttempts ? Number.parseInt(linkupAttempts) : '-';
    rows.push({
      a_node_name: link.a_node_name,
      alive: link.is_alive,
      alive_perc: alivePerc,
      avail_perc: availPerc,
      distance: link._meta_.distance,
      linkup_attempts: linkupAttempts,
      name: link.name,
      type: link.link_type === LinkTypeValueMap.WIRELESS ? 'Wireless' : 'Wired',
      z_node_name: link.z_node_name,
    });
  });
  return rows;
}

function getTableRowsAnalyzer(
  state: State,
  context: NetworkContextType,
  getBeamAngle: (nodeName: string, beamIdx: string) => number,
): Array<{
  name: string,
  a_node_name: string,
  z_node_name: string,
  alive: boolean,
  alive_perc: number,
  fw_restarts: string,
  mcs: Node,
  snr: Node,
  per: Node,
  tput: Node,
  txpower: Node,
  tx_beam_angle: Node,
  rx_beam_angle: Node,
  distance: number,
}> {
  const rows = [];

  if (!context.linkMap) {
    return rows;
  }
  Object.keys(context.linkMap).forEach(linkName => {
    const link = context.linkMap[linkName];
    // link availability
    let alivePerc = NaN;
    if (
      context.networkLinkHealth &&
      context.networkLinkHealth.hasOwnProperty('events') &&
      context.networkLinkHealth.events.hasOwnProperty(link.name)
    ) {
      const linkHealth = context.networkLinkHealth.events[link.name];
      alivePerc = linkHealth.linkAlive;
    }
    if (!context.networkAnalyzerData) {
      return;
    }
    const analyzerLink = context.networkAnalyzerData.hasOwnProperty(linkName)
      ? context.networkAnalyzerData[linkName]
      : {};
    const analyzerLinkA = analyzerLink.A ?? {};
    const analyzerLinkZ = analyzerLink.Z ?? {};
    if (link.link_type == LinkTypeValueMap.ETHERNET && state.hideWired) {
      return;
    }
    // check if either side of the node is a CN
    if (
      !context.nodeMap.hasOwnProperty(link.a_node_name) ||
      !context.nodeMap.hasOwnProperty(link.z_node_name)
    ) {
      return;
    }
    const aNode = context.nodeMap[link.a_node_name];
    const zNode = context.nodeMap[link.z_node_name];
    if (
      state.hideDnToDnLinks &&
      aNode.node_type === NodeType.DN &&
      zNode.node_type === NodeType.DN
    ) {
      // skip since it's DN to DN
      return;
    }

    // this is the A->Z link
    rows.push({
      name: link.name,
      a_node_name: link.a_node_name,
      z_node_name: link.z_node_name,
      alive: link.is_alive,
      alive_perc: alivePerc,
      fw_restarts: analyzerLinkA.flaps,
      mcs: formatAnalyzerValue(analyzerLinkA, 'avg_mcs'),
      // snr is the receive signal strength which needs to come from the
      // other side of the link
      snr: formatAnalyzerValue(analyzerLinkZ, 'avg_snr'),
      per: formatAnalyzerValue(analyzerLinkA, 'avg_per'),
      tput: formatAnalyzerValue(analyzerLinkA, 'avg_tput'),
      txpower: formatAnalyzerValue(analyzerLinkA, 'avg_tx_power'),
      tx_beam_angle: formatNumber(
        getBeamAngle(link.a_node_name, analyzerLinkA.tx_beam_idx),
      ),
      rx_beam_angle: formatNumber(
        getBeamAngle(link.z_node_name, analyzerLinkA.rx_beam_idx),
      ),
      distance: link._meta_.distance,
    });
    // this is the Z->A link
    rows.push({
      name: link.name,
      a_node_name: link.z_node_name,
      z_node_name: link.a_node_name,
      alive: link.is_alive,
      alive_perc: alivePerc,
      fw_restarts: analyzerLinkZ.flaps,
      mcs: formatAnalyzerValue(analyzerLinkZ, 'avg_mcs'),
      // snr is the receive signal strength which needs to come from the
      // other side of the link
      snr: formatAnalyzerValue(analyzerLinkA, 'avg_snr'),
      per: formatAnalyzerValue(analyzerLinkZ, 'avg_per'),
      tput: formatAnalyzerValue(analyzerLinkZ, 'avg_tput'),
      txpower: formatAnalyzerValue(analyzerLinkZ, 'avg_tx_power'),
      tx_beam_angle: formatNumber(
        getBeamAngle(link.a_node_name, analyzerLinkZ.tx_beam_idx),
      ),
      rx_beam_angle: formatNumber(
        getBeamAngle(link.z_node_name, analyzerLinkZ.rx_beam_idx),
      ),
      distance: link._meta_.distance,
    });
  });
  return rows;
}

function insertTimeWindowText(columns, networkHealthTimeWindowHrs) {
  // add time window text to tables
  const availWindowTitle = TIME_WINDOWS.filter(
    ({hours}) => hours === networkHealthTimeWindowHrs,
  ).map(({title}) => title);
  return columns.map(column => {
    if (
      column.hasOwnProperty('appendAvailWindow') &&
      column.appendAvailWindow
    ) {
      return {
        ...column,
        title: `${column.title} (${availWindowTitle[0]})`,
      };
    }
    return column;
  });
}

function GrafanaLinkCell({row}: {row: $Shape<LinkType>}) {
  const classes = useStyles();
  return (
    <>
      <div className={classes.cell}>{row.name}</div>
      <DashboardLink data-testid="grafana-link" linkName={row.name}>
        <Button
          className={classes.button}
          color="primary"
          size="small"
          title="View in Grafana"
          variant="outlined">
          <GrafanaIcon />
        </Button>
      </DashboardLink>
    </>
  );
}

function LinkAvailabilityCell({row, style}: {row: Object, style: Object}) {
  const {linkMap, networkLinkHealth} = useNetworkContext();
  if (row && row.name) {
    const link = linkMap[row.name];
    if (link) {
      const startTime = networkLinkHealth.startTime;
      const endTime = networkLinkHealth.endTime;
      if (
        networkLinkHealth.hasOwnProperty('events') &&
        networkLinkHealth.events.hasOwnProperty(link.name)
      ) {
        const linkHealth = networkLinkHealth.events[link.name];
        const events = linkHealth.events;
        if (events.length > 0) {
          return (
            <ReactPlotlyEventChart
              linkName={link.name}
              events={events}
              startTime={startTime}
              endTime={endTime}
              size={'small'}
              width={style.width - 10}
              height={style.height - 10}
            />
          );
        }
      }
    }
  }
  return null;
}

function AlivePercCell({row}: {row: Object}) {
  let cellColor = 'red';
  let cellText = '-';
  const perc = row.alive_perc;
  if (row.type === 'Wired') {
    // color wired links as unavailable
    cellColor = 'grey';
    cellText = 'X';
  } else if (perc) {
    cellText = formatNumber(perc, 2);
    cellColor = availabilityColor(perc);
  }
  return <span style={{color: cellColor}}>{'' + cellText}</span>;
}

function DistanceCell({distance}: {distance: number}) {
  return <span>{formatNumber(distance, 1)}</span>;
}

// round and set color
function FloatPointCell({tpxx, row}: {tpxx: string, row: Object}) {
  let cellColor = 'red';
  let cellText = '-';
  const val = row[tpxx];
  if (!isNaN(val)) {
    switch (tpxx) {
      case 'mcs':
        if (val === INVALID_VALUE) {
          cellText = 'N/A';
          cellColor = 'black';
        } else {
          cellText = formatNumber(val, 1);
          // if value>thresh1 green, elseif >thresh2 orange, else red
          cellColor = variableColorUp(val, 9, 5);
        }
        break;
      case 'snr':
        cellText = formatNumber(val, 1);
        cellColor = variableColorUp(val, 12, 9);
        break;
      case 'txpower':
        cellText = formatNumber(val, 1);
        // TODO - combine link metrics overlay thresholds
        cellColor = variableColorDown(val, 9, 19);
        break;
      case 'tput':
        cellText = formatNumber(val, 0);
        cellColor = variableColorUp(val, 0, 0);
        break;
      case 'per':
        cellText = formatNumber(val, 2) + '%'; //cell.toExponential(2);
        // if value<thresh1 green, elseif <thresh2 orange, else red
        cellColor = variableColorDown(val, 0.5, 1);
        break;
      case 'fw_restarts':
        cellText = formatNumber(val, 0);
        cellColor = variableColorDown(val, 0, 1);
        break;
      case 'tx_beam_angle':
      case 'rx_beam_angle':
        cellText = beamAngleToOrientation(val);
        // beam angles 0-35=green, 36-40=yellow, 41+=red
        cellColor = variableColorDown(Math.abs(val), 35, 40);
        break;
    }
  }

  return <span style={{color: cellColor}}>{'' + cellText}</span>;
}

function variableColorUp(value, thresh1, thresh2) {
  if (value >= thresh1) {
    return 'green';
  } else if (value >= thresh2) {
    return 'orange';
  } else {
    return 'red';
  }
}

function variableColorDown(value, thresh1, thresh2) {
  if (value <= thresh1) {
    return 'green';
  } else if (value <= thresh2) {
    return 'orange';
  } else {
    return 'red';
  }
}

function beamAngleSortFunc(a, b, order) {
  // use -1 as beam angle when sorting if unset
  const aAbs = Math.abs(
    typeof a.tx_beam_angle !== 'number' || isNaN(a.tx_beam_angle)
      ? -1
      : a.tx_beam_angle,
  );
  const bAbs = Math.abs(
    typeof b.tx_beam_angle !== 'number' || isNaN(b.tx_beam_angle)
      ? -1
      : b.tx_beam_angle,
  );
  const sortVal = aAbs === bAbs ? 0 : aAbs > bAbs ? 1 : -1;
  return order === 'ASC' ? sortVal : -sortVal;
}

function formatAnalyzerValue(obj: {[string]: string}, propertyName: string) {
  if (obj.hasOwnProperty(propertyName) && obj[propertyName] !== INVALID_VALUE) {
    return typeof obj === 'string'
      ? Number.parseFloat(obj[propertyName])
      : obj[propertyName];
  }
  return '-';
}

function useBeamAngleMapping() {
  const {getProfileByNodeName} = useHardwareProfiles();
  const getBeamAngle = React.useCallback(
    (nodeName: string, beamIdx: string) => {
      const profile = getProfileByNodeName(nodeName);
      if (!profile) {
        return 0;
      }
      try {
        const indexToAngle = profile['beam_angle_map']['0']['0'];
        return indexToAngle[beamIdx];
      } catch (err) {
        console.error(`Invalid hardware profile for ${nodeName}:`, profile);
        return 0;
      }
    },
    [getProfileByNodeName],
  );
  return {
    getBeamAngle,
  };
}
