/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import Checkbox from '@material-ui/core/Checkbox';
import CustomTable from '../../components/common/CustomTable';
import Divider from '@material-ui/core/Divider';
import FormControl from '@material-ui/core/FormControl';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import FormGroup from '@material-ui/core/FormGroup';
import FormLabel from '@material-ui/core/FormLabel';
import NetworkContext from '../../contexts/NetworkContext';
import Radio from '@material-ui/core/Radio';
import RadioGroup from '@material-ui/core/RadioGroup';
import React from 'react';
import ReactPlotlyEventChart from './ReactPlotlyEventChart';
import {
  LinkTypeValueMap,
  NodeTypeValueMap as NodeType,
} from '../../../shared/types/Topology';
import {SortDirection} from 'react-virtualized';
import {
  TIME_WINDOWS,
  TopologyElementType,
} from '../../constants/NetworkConstants.js';
import {availabilityColor} from '../../helpers/NetworkHelpers';
import {
  beamAngleToOrientation,
  beamIndexToAngle,
} from '../../helpers/TgFeatures';
import {formatNumber} from '../../helpers/StringHelpers';
import {get} from 'lodash';
import {renderDashboardLinks, renderGrafanaLink} from './FbInternal';
import {renderStatusColor} from '../../helpers/TableHelpers';
import {withStyles} from '@material-ui/core/styles';
import type {LinkType} from '../../../shared/types/Topology';
import type {NetworkContextType} from '../../contexts/NetworkContext';
import type {Node} from 'react';

// Invalid analyzer value, ignore any fields that have this value.
const INVALID_VALUE = 255;

const styles = theme => {
  return {
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

const LinkTable = {
  MINIMAL: 'MINIMAL',
  EVENTS_CHART: 'EVENTS_CHART',
  ANALYZER: 'ANALYZER',
};

type Props = {
  classes: {[string]: string},
  context: NetworkContextType,
};

type State = {
  selectedLink: ?LinkType,
  topLink: ?LinkType,
  keepTopLink: boolean,
  hideDnToDnLinks: boolean,
  hideWired: boolean,
  sortBy: string,
  sortDirection: $Values<typeof SortDirection>,
  linkTable: $Values<typeof LinkTable>,
};

class NetworkLinksTable extends React.Component<Props, State> {
  state = {
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
  };

  static getDerivedStateFromProps(nextProps, prevState) {
    // Update selected row
    const {selectedElement} = nextProps.context;
    if (selectedElement && selectedElement.type === TopologyElementType.LINK) {
      if (prevState.selectedLink !== selectedElement.name) {
        // TODO - HACK! - When selecting a row, don't change topLink
        // (only change it when another component sets the state)
        if (prevState.keepTopLink) {
          return {
            selectedLink: selectedElement.name,
            keepTopLink: false,
          };
        } else {
          return {
            selectedLink: selectedElement.name,
            topLink: selectedElement.name,
          };
        }
      }
      return {};
    } else {
      return {selectedLink: null, topLink: null};
    }
  }

  eventChartColumns = [
    {
      filter: true,
      isKey: true,
      key: 'name',
      label: 'Name',
      render: renderGrafanaLink.bind(this),
      sort: true,
      sortFunc: this.linkSortFunc.bind(this),
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
      render: this.renderLinkAvailability.bind(this),
      sort: true,
      width: 810,
    },
    {
      key: 'avail_perc',
      label: 'Availability',
      appendAvailWindow: true,
      render: this.renderAlivePerc.bind(this),
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
      render: this.renderDistance.bind(this),
      sort: true,
      width: 120,
    },
  ];

  analyzerChartColumns = [
    {
      filter: true,
      isKey: true,
      key: 'name',
      label: 'Name',
      render: renderDashboardLinks.bind(this),
      sort: true,
      sortFunc: this.linkSortFunc.bind(this),
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
      render: cell => this.renderFloatPoint('mcs', cell),
      sort: true,
      width: 60,
    },
    {
      key: 'snr',
      label: 'Avg SNR',
      render: cell => this.renderFloatPoint('snr', cell),
      sort: true,
      width: 60,
    },
    {
      key: 'per',
      label: 'Avg PER',
      render: cell => this.renderFloatPoint('per', cell),
      sort: true,
      width: 60,
    },
    {
      key: 'tput',
      label: 'Avg tput(PPS)',
      render: cell => this.renderFloatPoint('tput', cell),
      sort: true,
      width: 60,
    },
    {
      key: 'txpower',
      label: 'Avg txPower',
      render: cell => this.renderFloatPoint('txpower', cell),
      sort: true,
      width: 60,
    },
    {
      key: 'fw_restarts',
      label: '#Restarts',
      render: cell => this.renderFloatPoint('fw_restarts', cell),
      sort: true,
      width: 60,
    },
    {
      key: 'tx_beam_angle',
      label: <span>TX Beam &deg;</span>,
      render: cell => this.renderFloatPoint('tx_beam_angle', cell),
      sort: true,
      sortFunc: this.beamAngleSortFunc.bind(this),
      width: 60,
    },
    {
      key: 'rx_beam_angle',
      label: <span>RX Beam &deg;</span>,
      render: cell => this.renderFloatPoint('rx_beam_angle', cell),
      sort: true,
      sortFunc: this.beamAngleSortFunc.bind(this),
      width: 60,
    },
    {
      key: 'alive_perc',
      label: 'Uptime',
      appendAvailWindow: true,
      render: this.renderAlivePerc.bind(this),
      sort: true,
      width: 80,
    },
    {
      key: 'distance',
      label: 'Distance (m)',
      render: this.renderDistance.bind(this),
      sort: true,
      width: 60,
    },
  ];

  minimalChartColumns = [
    {
      filter: true,
      isKey: true,
      key: 'name',
      label: 'Name',
      render: renderGrafanaLink.bind(this),
      sort: true,
      sortFunc: this.linkSortFunc.bind(this),
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
      render: this.renderAlivePerc.bind(this),
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
      render: this.renderDistance.bind(this),
      sort: true,
      width: 120,
    },
  ];

  rowHeight = 80;
  headerHeight = 80;
  overscanRowCount = 10;

  linkSortFuncHelper(a, b, order) {
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

  linkSortFunc(a, b, order) {
    // order is desc or asc
    const {topLink} = this.state;
    if (topLink) {
      // Move selected link to the top
      if (a.name === topLink) {
        if (a.name === b.name) {
          return this.linkSortFuncHelper(a, b, order);
        } else {
          return -1;
        }
      } else if (b.name === topLink) {
        if (a.name === b.name) {
          return this.linkSortFuncHelper(a, b, order);
        } else {
          return 1;
        }
      }
    }
    return this.linkSortFuncHelper(a, b, order);
  }

  beamAngleSortFunc(a, b, order) {
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

  formatAnalyzerValue(obj, propertyName) {
    if (
      obj.hasOwnProperty(propertyName) &&
      obj[propertyName] !== INVALID_VALUE
    ) {
      return typeof obj !== 'number'
        ? Number.parseFloat(obj[propertyName])
        : obj[propertyName];
    }
    return '-';
  }

  getTableRows(
    context,
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
      if (
        link.link_type === LinkTypeValueMap.ETHERNET &&
        this.state.hideWired
      ) {
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
        this.state.hideDnToDnLinks &&
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
        type:
          link.link_type === LinkTypeValueMap.WIRELESS ? 'Wireless' : 'Wired',
        z_node_name: link.z_node_name,
      });
    });
    return rows;
  }

  getTableRowsAnalyzer(
    context,
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
      if (link.link_type == LinkTypeValueMap.ETHERNET && this.state.hideWired) {
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
        this.state.hideDnToDnLinks &&
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
        mcs: this.formatAnalyzerValue(analyzerLinkA, 'avg_mcs'),
        // snr is the receive signal strength which needs to come from the
        // other side of the link
        snr: this.formatAnalyzerValue(analyzerLinkZ, 'avg_snr'),
        per: this.formatAnalyzerValue(analyzerLinkA, 'avg_per'),
        tput: this.formatAnalyzerValue(analyzerLinkA, 'avg_tput'),
        txpower: this.formatAnalyzerValue(analyzerLinkA, 'avg_tx_power'),
        tx_beam_angle: beamIndexToAngle(
          formatNumber(analyzerLinkA.tx_beam_idx),
        ),
        rx_beam_angle: beamIndexToAngle(
          formatNumber(analyzerLinkA.rx_beam_idx),
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
        fw_restarts: analyzerLinkA.flaps,
        mcs: this.formatAnalyzerValue(analyzerLinkZ, 'avg_mcs'),
        // snr is the receive signal strength which needs to come from the
        // other side of the link
        snr: this.formatAnalyzerValue(analyzerLinkA, 'avg_snr'),
        per: this.formatAnalyzerValue(analyzerLinkZ, 'avg_per'),
        tput: this.formatAnalyzerValue(analyzerLinkZ, 'avg_tput'),
        txpower: this.formatAnalyzerValue(analyzerLinkZ, 'avg_tx_power'),
        tx_beam_angle: beamIndexToAngle(
          formatNumber(analyzerLinkZ.tx_beam_idx),
        ),
        rx_beam_angle: beamIndexToAngle(
          formatNumber(analyzerLinkZ.rx_beam_idx),
        ),
        distance: link._meta_.distance,
      });
    });
    return rows;
  }

  tableOnRowSelect = row => {
    // Select a row
    const {context} = this.props;
    this.setState({keepTopLink: true}, () =>
      context.setSelected(TopologyElementType.LINK, row.name),
    );
  };

  renderAlivePerc(cell, row) {
    let cellColor = 'red';
    let cellText = '-';
    if (row.type === 'Wired') {
      // color wired links as unavailable
      cellColor = 'grey';
      cellText = 'X';
    } else if (cell) {
      cellText = formatNumber(cell, 2);
      cellColor = availabilityColor(cellText);
    }
    return <span style={{color: cellColor}}>{'' + cellText}</span>;
  }

  renderDistance(cell, _row) {
    return <span>{formatNumber(cell, 1)}</span>;
  }

  variableColorUp(value, thresh1, thresh2) {
    if (value >= thresh1) {
      return 'green';
    } else if (value >= thresh2) {
      return 'orange';
    } else {
      return 'red';
    }
  }

  variableColorDown(value, thresh1, thresh2) {
    if (value <= thresh1) {
      return 'green';
    } else if (value <= thresh2) {
      return 'orange';
    } else {
      return 'red';
    }
  }

  // round and set color
  renderFloatPoint = (tpxx, cell, _row) => {
    let cellColor = 'red';
    let cellText = '-';
    if (!isNaN(cell)) {
      switch (tpxx) {
        case 'mcs':
          if (cell === 254) {
            cellText = 'N/A';
            cellColor = 'black';
          } else {
            cellText = formatNumber(cell, 1);
            // if value>thresh1 green, elseif >thresh2 orange, else red
            cellColor = this.variableColorUp(cell, 9, 5);
          }
          break;
        case 'snr':
          cellText = formatNumber(cell, 1);
          cellColor = this.variableColorUp(cell, 12, 9);
          break;
        case 'txpower':
          cellText = formatNumber(cell, 1);
          // TODO - combine link metrics overlay thresholds
          cellColor = this.variableColorDown(cell, 9, 19);
          break;
        case 'tput':
          cellText = formatNumber(cell, 0);
          cellColor = this.variableColorUp(cell, 0, 0);
          break;
        case 'per':
          cellText = formatNumber(cell, 2) + '%'; //cell.toExponential(2);
          // if value<thresh1 green, elseif <thresh2 orange, else red
          cellColor = this.variableColorDown(cell, 0.5, 1);
          break;
        case 'fw_restarts':
          cellText = formatNumber(cell, 0);
          cellColor = this.variableColorDown(cell, 0, 1);
          break;
        case 'tx_beam_angle':
        case 'rx_beam_angle':
          cellText = beamAngleToOrientation(cell);
          // beam angles 0-35=green, 36-40=yellow, 41+=red
          cellColor = this.variableColorDown(Math.abs(cell), 35, 40);
          break;
      }
    }

    return <span style={{color: cellColor}}>{'' + cellText}</span>;
  };

  renderLinkAvailability(cell, row, style) {
    if (row && row.name) {
      return (
        <NetworkContext.Consumer>
          {({linkMap, networkLinkHealth}) => {
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
            return null;
          }}
        </NetworkContext.Consumer>
      );
    }
    return null;
  }

  onSortChange(sortBy, sortDirection) {
    this.setState({
      sortBy,
      sortDirection,
      topLink: sortBy === 'name' ? this.state.topLink : null,
    });
  }

  insertTimeWindowText(columns, context) {
    // add time window text to tables
    const availWindowTitle = TIME_WINDOWS.filter(
      ({hours}) => hours === context.networkHealthTimeWindowHrs,
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

  renderLinksTable(context) {
    const {linkTable, sortBy, sortDirection, selectedLink} = this.state;

    let columns;
    let data;
    if (linkTable === LinkTable.ANALYZER) {
      columns = this.insertTimeWindowText(this.analyzerChartColumns, context);
      data = this.getTableRowsAnalyzer(context);
    } else if (linkTable === LinkTable.EVENTS_CHART) {
      columns = this.insertTimeWindowText(this.eventChartColumns, context);
      data = this.getTableRows(context);
    } else {
      columns = this.insertTimeWindowText(this.minimalChartColumns, context);
      data = this.getTableRows(context);
    }
    return (
      <CustomTable
        rowHeight={this.rowHeight}
        headerHeight={this.headerHeight}
        overscanRowCount={this.overscanRowCount}
        columns={columns}
        data={data}
        sortBy={sortBy}
        sortDirection={sortDirection}
        onRowSelect={this.tableOnRowSelect}
        onSortChange={(sortBy, sortDirection) =>
          this.onSortChange(sortBy, sortDirection)
        }
        selected={selectedLink ? [selectedLink] : []}
        additionalRenderParams={{context}}
      />
    );
  }

  render() {
    return (
      <NetworkContext.Consumer>{this.renderContext}</NetworkContext.Consumer>
    );
  }

  renderContext = context => {
    const {classes} = this.props;

    // render display with or without events chart
    const linksTable = this.renderLinksTable(context);
    return (
      <>
        <div className={classes.tableOptions}>
          <FormControl>
            <FormLabel component="legend">Link Options</FormLabel>
            <FormGroup row>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={this.state.hideWired}
                    onChange={event => {
                      this.setState({hideWired: event.target.checked});
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
                    checked={this.state.hideDnToDnLinks}
                    onChange={event => {
                      this.setState({hideDnToDnLinks: event.target.checked});
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
              value={this.state.linkTable}
              onChange={event => this.setState({linkTable: event.target.value})}
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
        {linksTable}
      </>
    );
  };
}

export default withStyles(styles, {withTheme: true})(NetworkLinksTable);
