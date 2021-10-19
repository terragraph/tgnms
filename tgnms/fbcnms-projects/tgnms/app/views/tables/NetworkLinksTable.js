/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */
import Button from '@material-ui/core/Button';
import Checkbox from '@material-ui/core/Checkbox';
import CustomTable from '@fbcnms/tg-nms/app/components/common/CustomTable';
import DashboardLink from '@fbcnms/tg-nms/app/components/common/DashboardLink';
import Divider from '@material-ui/core/Divider';
import FormControl from '@material-ui/core/FormControl';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import FormGroup from '@material-ui/core/FormGroup';
import FormLabel from '@material-ui/core/FormLabel';
import GrafanaIcon from '@fbcnms/tg-nms/app/components/common/GrafanaIcon';
import Radio from '@material-ui/core/Radio';
import RadioGroup from '@material-ui/core/RadioGroup';
import React from 'react';
import ReactPlotlyEventChart from './ReactPlotlyEventChart';
import {
  LinkTypeValueMap,
  NodeTypeValueMap as NodeType,
} from '@fbcnms/tg-nms/shared/types/Topology';
import {SortDirection} from 'react-virtualized';
import {
  TIME_WINDOWS,
  TOPOLOGY_ELEMENT,
} from '@fbcnms/tg-nms/app/constants/NetworkConstants.js';
import {availabilityColor} from '@fbcnms/tg-nms/app/helpers/NetworkHelpers';
import {
  beamAngleToOrientation,
  beamIndexToAngle,
} from '@fbcnms/tg-nms/app/helpers/TgFeatures';
import {formatNumber} from '@fbcnms/tg-nms/app/helpers/StringHelpers';
import {get} from 'lodash';
import {makeStyles} from '@material-ui/styles';
import {renderStatusColor} from '@fbcnms/tg-nms/app/helpers/TableHelpers';
import {useNetworkContext} from '@fbcnms/tg-nms/app/contexts/NetworkContext';

import type {LinkType} from '@fbcnms/tg-nms/shared/types/Topology';
import type {NetworkContextType} from '@fbcnms/tg-nms/app/contexts/NetworkContext';
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
      padding: `${theme.spacing()}px ${theme.spacing(2)}px`,
    },
  };
};
const useStyles = makeStyles(styles);

const LinkTable = {
  MINIMAL: 'MINIMAL',
  EVENTS_CHART: 'EVENTS_CHART',
  ANALYZER: 'ANALYZER',
};

type Props = {||};

type State = {
  selectedLink: ?string,
  topLink: ?string,
  keepTopLink: boolean,
  hideDnToDnLinks: boolean,
  hideWired: boolean,
  sortBy: string,
  sortDirection: $Values<typeof SortDirection>,
  linkTable: $Values<typeof LinkTable>,
};

export default function NetworkLinksTableNew({}: Props) {
  const [state, updateState] = useNetworkLinksTableState({
    // Selected element (derived from NetworkContext)
    selectedLink: null,
    topLink: null,
    keepTopLink: false,
    // Link filters
    hideDnToDnLinks: false,
    hideWired: true,
    // Keep track of current sort state
    sortBy: 'name',
    sortDirection: SortDirection.ASC,
    // The type of link table to display
    linkTable: LinkTable.EVENTS_CHART,
  });

  const context = useNetworkContext();
  const {selectedElement} = context;
  const classes = useStyles();
  React.useEffect(() => {
    if (selectedElement && selectedElement.type === TOPOLOGY_ELEMENT.LINK) {
      if (state.selectedLink !== selectedElement.name) {
        if (state.keepTopLink) {
          updateState({
            selectedLink: selectedElement.name,
            keepTopLink: false,
          });
        } else {
          updateState({
            selectedLink: selectedElement.name,
            topLink: selectedElement.name,
          });
        }
      }
    } else {
      updateState({selectedLink: null, topLink: null});
    }
  }, [selectedElement, updateState, state.selectedLink, state.keepTopLink]);
  return (
    <>
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
      <Divider variant="middle" />
      <LinksTable state={state} updateState={updateState} />
    </>
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
  const rowHeight = 80;
  const headerHeight = 80;
  const overscanRowCount = 10;
  const {linkTable, sortBy, sortDirection, selectedLink} = state;
  const context = useNetworkContext();
  let columns;
  let data;

  const eventChartColumns = React.useMemo(
    () => [
      {
        filter: true,
        isKey: true,
        key: 'name',
        label: 'Name',
        render: (cell, row, style) => (
          <GrafanaLinkCell {...{cell, row, style}} />
        ),
        sort: true,
        sortFunc: (a, b, order) => linkSortFunc(state, a, b, order),
        width: 350,
      },
      {
        key: 'alive',
        label: 'Alive',
        render: renderStatusColor,
        sort: true,
        width: 100,
      },
      {
        key: 'availability_chart',
        label: 'Availability Chart',
        appendAvailWindow: true,
        render: (cell, row, style) => (
          <LinkAvailabilityCell {...{cell, row, style}} />
        ),
        sort: true,
        width: 810,
      },
      {
        key: 'avail_perc',
        label: 'Availability',
        appendAvailWindow: true,
        render: (cell, row, style) => <AlivePercCell {...{cell, row, style}} />,
        sort: true,
        width: 120,
      },
      {
        key: 'linkup_attempts',
        label: 'Ignition Attempts (1d)',
        sort: true,
        width: 100,
      },
      {
        key: 'distance',
        label: 'Length (m)',
        render: (cell, row, style) => <DistanceCell {...{cell, row, style}} />,
        sort: true,
        width: 120,
      },
    ],
    [state],
  );

  const analyzerChartColumns = React.useMemo(
    () => [
      {
        filter: true,
        isKey: true,
        key: 'name',
        label: 'Name',
        render: (cell, row, style) => (
          <GrafanaLinkCell {...{cell, row, style}} />
        ),
        sort: true,
        sortFunc: (a, b, order) => linkSortFunc(state, a, b, order),
        width: 350,
      },
      {
        filter: true,
        key: 'a_node_name',
        label: 'A-Node',
        sort: true,
        width: 140,
      },
      {
        filter: true,
        key: 'z_node_name',
        label: 'Z-Node',
        sort: true,
        width: 140,
      },
      {
        key: 'alive',
        label: 'Alive',
        render: renderStatusColor,
        sort: true,
        width: 60,
      },
      {
        key: 'mcs',
        label: 'Avg MCS',
        render: (cell, row, style) => (
          <FloatPointCell tpxx={'mcs'} {...{cell, row, style}} />
        ),
        sort: true,
        tooltip: 'Modulation and Coding Scheme',
        width: 60,
      },
      {
        key: 'snr',
        label: 'Avg SNR',
        render: (cell, row, style) => (
          <FloatPointCell tpxx={'snr'} {...{cell, row, style}} />
        ),
        sort: true,
        tooltip: 'Signal-to-noise ratio',
        width: 60,
      },
      {
        key: 'per',
        label: 'Avg PER',
        render: (cell, row, style) => (
          <FloatPointCell tpxx={'per'} {...{cell, row, style}} />
        ),
        sort: true,
        tooltip: 'Packet Error Rate',
        width: 60,
      },
      {
        key: 'tput',
        label: 'Avg tput(PPS)',
        render: (cell, row, style) => (
          <FloatPointCell tpxx={'tput'} {...{cell, row, style}} />
        ),
        sort: true,
        tooltip: 'Throughput (packets per second)',
        width: 60,
      },
      {
        key: 'txpower',
        label: 'Avg txPower',
        render: (cell, row, style) => (
          <FloatPointCell tpxx={'txpower'} {...{cell, row, style}} />
        ),
        sort: true,
        tooltip: 'Transmission power',
        width: 60,
      },
      {
        key: 'fw_restarts',
        label: '#Restarts',
        render: (cell, row, style) => (
          <FloatPointCell tpxx={'fw_restarts'} {...{cell, row, style}} />
        ),
        sort: true,
        width: 60,
      },
      {
        key: 'tx_beam_angle',
        label: <span>TX Beam &deg;</span>,
        render: (cell, row, style) => (
          <FloatPointCell tpxx={'tx_beam_angle'} {...{cell, row, style}} />
        ),
        sort: true,
        sortFunc: beamAngleSortFunc,
        width: 60,
      },
      {
        key: 'rx_beam_angle',
        label: <span>RX Beam &deg;</span>,
        render: (cell, row, style) => (
          <FloatPointCell tpxx={'rx_beam_angle'} {...{cell, row, style}} />
        ),
        sort: true,
        sortFunc: beamAngleSortFunc,
        width: 60,
      },
      {
        key: 'alive_perc',
        label: 'Uptime',
        appendAvailWindow: true,
        render: (cell, row, style) => <AlivePercCell {...{cell, row, style}} />,
        sort: true,
        width: 80,
      },
      {
        key: 'distance',
        label: 'Distance (m)',
        render: (cell, row, style) => <DistanceCell {...{cell, row, style}} />,
        sort: true,
        width: 60,
      },
    ],
    [state],
  );

  const minimalChartColumns = React.useMemo(
    () => [
      {
        filter: true,
        isKey: true,
        key: 'name',
        label: 'Name',
        render: (cell, row, style) => (
          <GrafanaLinkCell {...{cell, row, style}} />
        ),
        sort: true,
        sortFunc: (a, b, order) => linkSortFunc(state, a, b, order),
        width: 350,
      },
      {filter: true, key: 'a_node_name', label: 'A-Node', width: 180},
      {filter: true, key: 'z_node_name', label: 'Z-Node', width: 180},
      {
        key: 'alive',
        label: 'Alive',
        render: renderStatusColor,
        sort: true,
        width: 100,
      },
      {
        key: 'alive_perc',
        label: 'Uptime',
        appendAvailWindow: true,
        render: (cell, row, style) => <AlivePercCell {...{cell, row, style}} />,
        sort: true,
        width: 140,
      },
      {key: 'type', label: 'Type', width: 100},
      {
        key: 'linkup_attempts',
        label: 'Ignition Attempts (1d)',
        sort: true,
        width: 100,
      },
      {
        key: 'distance',
        label: 'Distance (m)',
        render: (cell, row, style) => <DistanceCell {...{cell, row, style}} />,
        sort: true,
        width: 120,
      },
    ],
    [state],
  );

  const handleRowSelect = row => {
    // Select a row
    updateState({keepTopLink: true});
    context.setSelected(TOPOLOGY_ELEMENT.LINK, row.name);
  };

  const onSortChange = (sortBy, sortDirection) => {
    updateState({
      sortBy,
      sortDirection,
      topLink: sortBy === 'name' ? state.topLink : null,
    });
  };

  if (linkTable === LinkTable.ANALYZER) {
    columns = insertTimeWindowText(
      analyzerChartColumns,
      context.networkHealthTimeWindowHrs,
    );
    data = getTableRowsAnalyzer(state, context);
  } else if (linkTable === LinkTable.EVENTS_CHART) {
    columns = insertTimeWindowText(
      eventChartColumns,
      context.networkHealthTimeWindowHrs,
    );
    data = getTableRows(state, context);
  } else {
    columns = insertTimeWindowText(
      minimalChartColumns,
      context.networkHealthTimeWindowHrs,
    );
    data = getTableRows(state, context);
  }
  return (
    <CustomTable
      rowHeight={rowHeight}
      headerHeight={headerHeight}
      overscanRowCount={overscanRowCount}
      columns={columns}
      data={data}
      sortBy={sortBy}
      sortDirection={sortDirection}
      onRowSelect={handleRowSelect}
      onSortChange={(sortBy, sortDirection) =>
        onSortChange(sortBy, sortDirection)
      }
      selected={selectedLink ? [selectedLink] : []}
      additionalRenderParams={{context}}
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
): Array<{
  name: string,
  a_node_name: string,
  z_node_name: string,
  alive: boolean,
  alive_perc: number,
  fw_restarts: number,
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
    const analyzerLinkA = analyzerLink.hasOwnProperty('A')
      ? analyzerLink.A
      : analyzerLink;
    const analyzerLinkZ = analyzerLink.hasOwnProperty('Z')
      ? analyzerLink.Z
      : analyzerLink;
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
      fw_restarts:
        typeof analyzerLinkA.flaps !== 'number'
          ? Number.parseInt(analyzerLinkA.flaps)
          : analyzerLinkA.flaps,
      mcs: formatAnalyzerValue(analyzerLinkA, 'avg_mcs'),
      // snr is the receive signal strength which needs to come from the
      // other side of the link
      snr: formatAnalyzerValue(analyzerLinkZ, 'avg_snr'),
      per: formatAnalyzerValue(analyzerLinkA, 'avg_per'),
      tput: formatAnalyzerValue(analyzerLinkA, 'avg_tput'),
      txpower: formatAnalyzerValue(analyzerLinkA, 'avg_tx_power'),
      tx_beam_angle: formatNumber(beamIndexToAngle(analyzerLinkA.tx_beam_idx)),
      rx_beam_angle: formatNumber(beamIndexToAngle(analyzerLinkA.rx_beam_idx)),
      distance: link._meta_.distance,
    });
    // this is the Z->A link
    rows.push({
      name: link.name,
      a_node_name: link.z_node_name,
      z_node_name: link.a_node_name,
      alive: link.is_alive,
      alive_perc: alivePerc,
      fw_restarts: analyzerLinkA.flaps,
      mcs: formatAnalyzerValue(analyzerLinkZ, 'avg_mcs'),
      // snr is the receive signal strength which needs to come from the
      // other side of the link
      snr: formatAnalyzerValue(analyzerLinkA, 'avg_snr'),
      per: formatAnalyzerValue(analyzerLinkZ, 'avg_per'),
      tput: formatAnalyzerValue(analyzerLinkZ, 'avg_tput'),
      txpower: formatAnalyzerValue(analyzerLinkZ, 'avg_tx_power'),
      tx_beam_angle: formatNumber(beamIndexToAngle(analyzerLinkZ.tx_beam_idx)),
      rx_beam_angle: formatNumber(beamIndexToAngle(analyzerLinkZ.rx_beam_idx)),
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
        label: `${column.label} (${availWindowTitle[0]})`,
      };
    }
    return column;
  });
}

function GrafanaLinkCell({cell, row}: {cell: string, row: $Shape<LinkType>}) {
  const classes = useStyles();
  return (
    <>
      <div className={classes.cell}>{cell}</div>
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

function LinkAvailabilityCell({
  row,
  style,
}: {
  cell: number,
  row: Object,
  style: Object,
}) {
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

function AlivePercCell({cell, row}: {cell: number, row: Object}) {
  let cellColor = 'red';
  let cellText = '-';
  if (row.type === 'Wired') {
    // color wired links as unavailable
    cellColor = 'grey';
    cellText = 'X';
  } else if (cell) {
    cellText = formatNumber(cell, 2);
    cellColor = availabilityColor(cell);
  }
  return <span style={{color: cellColor}}>{'' + cellText}</span>;
}

function DistanceCell({cell}: {cell: number, row: Object}) {
  return <span>{formatNumber(cell, 1)}</span>;
}

// round and set color
function FloatPointCell({
  tpxx,
  cell,
}: {
  tpxx: string,
  cell: number,
  row: Object,
}) {
  let cellColor = 'red';
  let cellText = '-';
  if (!isNaN(cell)) {
    switch (tpxx) {
      case 'mcs':
        if (cell === INVALID_VALUE) {
          cellText = 'N/A';
          cellColor = 'black';
        } else {
          cellText = formatNumber(cell, 1);
          // if value>thresh1 green, elseif >thresh2 orange, else red
          cellColor = variableColorUp(cell, 9, 5);
        }
        break;
      case 'snr':
        cellText = formatNumber(cell, 1);
        cellColor = variableColorUp(cell, 12, 9);
        break;
      case 'txpower':
        cellText = formatNumber(cell, 1);
        // TODO - combine link metrics overlay thresholds
        cellColor = variableColorDown(cell, 9, 19);
        break;
      case 'tput':
        cellText = formatNumber(cell, 0);
        cellColor = variableColorUp(cell, 0, 0);
        break;
      case 'per':
        cellText = formatNumber(cell, 2) + '%'; //cell.toExponential(2);
        // if value<thresh1 green, elseif <thresh2 orange, else red
        cellColor = variableColorDown(cell, 0.5, 1);
        break;
      case 'fw_restarts':
        cellText = formatNumber(cell, 0);
        cellColor = variableColorDown(cell, 0, 1);
        break;
      case 'tx_beam_angle':
      case 'rx_beam_angle':
        cellText = beamAngleToOrientation(cell);
        // beam angles 0-35=green, 36-40=yellow, 41+=red
        cellColor = variableColorDown(Math.abs(cell), 35, 40);
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

function linkSortFuncHelper(
  a: LinkType,
  b: LinkType,
  order: $Keys<typeof SortDirection>,
) {
  if (order === SortDirection.DESC) {
    if (a.name > b.name) {
      return -1;
    } else if (a.name < b.name) {
      return 1;
    }
    // both entries have the same name, sort based on a/z node name
    if (a.a_node_name > a.z_node_name) {
      return -1;
    } else {
      return 1;
    }
  } else {
    if (a.name < b.name) {
      return -1;
    } else if (a.name > b.name) {
      return 1;
    }
    // both entries have the same name, sort based on a/z node name
    if (a.a_node_name < a.z_node_name) {
      return -1;
    } else {
      return 1;
    }
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

function linkSortFunc(
  state: State,
  a: LinkType,
  b: LinkType,
  order: $Keys<typeof SortDirection>,
) {
  // order is desc or asc
  const {topLink} = state;
  if (topLink) {
    // Move selected link to the top
    if (a.name === topLink) {
      if (a.name === b.name) {
        return linkSortFuncHelper(a, b, order);
      } else {
        return -1;
      }
    } else if (b.name === topLink) {
      if (a.name === b.name) {
        return linkSortFuncHelper(a, b, order);
      } else {
        return 1;
      }
    }
  }
  return linkSortFuncHelper(a, b, order);
}

function formatAnalyzerValue(
  obj: {[string]: string | number},
  propertyName: string,
) {
  if (obj.hasOwnProperty(propertyName) && obj[propertyName] !== INVALID_VALUE) {
    return typeof obj === 'string'
      ? Number.parseFloat(obj[propertyName])
      : obj[propertyName];
  }
  return '-';
}
