/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import MaterialTable from '@fbcnms/tg-nms/app/components/common/MaterialTable';
import React from 'react';
import green from '@material-ui/core/colors/green';
import grey from '@material-ui/core/colors/grey';
import red from '@material-ui/core/colors/red';
import {NETWORK_TABLE_HEIGHTS} from '@fbcnms/tg-nms/app/constants/StyleConstants';
import {NodeTypeValueMap as NodeType} from '@fbcnms/tg-nms/shared/types/Topology';
import {TopologyElementType} from '@fbcnms/tg-nms/app/constants/NetworkConstants';
import {isNodeAlive} from '@fbcnms/tg-nms/app/helpers/NetworkHelpers';
import {makeStyles} from '@material-ui/styles';
import {objectValuesTypesafe} from '@fbcnms/tg-nms/app/helpers/ObjectHelpers';
import {useNetworkContext} from '@fbcnms/tg-nms/app/contexts/NetworkContext';
import type {NetworkTableProps} from './NetworkTables';

type NetworkNodeRowType = {
  name: string,
  mac_addr: string,
  node_type: string,
  alive: boolean,
  site_name: string,
  pop_node: boolean,
  ipv6: ?string,
  minion_restarts: ?number,
  hw_board_id: ?string,
};
const useStyles = makeStyles(_theme => ({
  root: {
    height: '100%',
    overflow: 'auto',
  },
}));
export default function NetworkNodesTable({tableHeight}: NetworkTableProps) {
  const {
    nodeMap,
    networkConfig,
    networkNodeHealthPrometheus,
    networkNodeHealth,
    setSelected,
    selectedElement,
  } = useNetworkContext();
  const classes = useStyles();
  const columns = React.useMemo(
    () => [
      {
        title: 'Name',
        field: 'name',
        grouping: false,
        width: 160,
      },
      {
        title: 'Site',
        field: 'site_name',
        defaultGroupOrder: 0,
        width: 160,
      },
      {title: 'MAC', field: 'mac_addr', grouping: false, width: 120},
      {
        title: 'IPv6',
        field: 'ipv6',
        grouping: false,
        width: 120,
      },
      {
        title: 'Type',
        field: 'node_type',
        width: 50,
      },
      {
        title: 'Board ID',
        field: 'hw_board_id',
        width: 100,
      },
      {
        title: 'Online',
        field: 'alive',
        type: 'boolean',
        width: 60,
        cellStyle: (val: boolean) => ({
          color: val ? green[500] : red[500],
        }),
      },
      {
        title: 'POP?',
        field: 'pop_node',
        type: 'boolean',
        width: 50,
      },
      {
        title: 'Restarts',
        field: 'minion_restarts',
        grouping: false,
        width: 80,
      },
    ],
    [],
  );

  const data = React.useMemo<Array<NetworkNodeRowType>>(
    () => {
      const nodes = objectValuesTypesafe(nodeMap);
      const {status_dump} = networkConfig;
      return nodes.map(node => {
        const statusReport =
          status_dump &&
          status_dump.statusReports &&
          status_dump.statusReports.hasOwnProperty(node.mac_addr)
            ? status_dump.statusReports[node.mac_addr]
            : null;
        const ipv6 = statusReport ? statusReport.ipv6Address : null;

        const hw_board_id = statusReport?.hardwareBoardId ?? '';
        let minionRestarts = null;
        if (
          networkNodeHealthPrometheus &&
          networkNodeHealthPrometheus.hasOwnProperty(node.name)
        ) {
          minionRestarts = Number.parseInt(
            networkNodeHealthPrometheus[node.name]['resets_e2e_minion_uptime'],
          );
        } else if (
          networkNodeHealth &&
          networkNodeHealth.hasOwnProperty('events') &&
          networkNodeHealth.events.hasOwnProperty(node.name)
        ) {
          minionRestarts = networkNodeHealth.events[node.name].events.length;
        }
        return {
          name: node.name,
          mac_addr: node.mac_addr,
          site_name: node.site_name,
          alive: isNodeAlive(node.status),
          pop_node: node.pop_node,
          hw_board_id,
          ipv6,
          node_type: node.node_type === NodeType.DN ? 'DN' : 'CN',
          minion_restarts: minionRestarts,
        };
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const handleRowClick = React.useCallback(
    (event, row) => {
      setSelected(TopologyElementType.NODE, row.name);
    },
    [setSelected],
  );

  const makeRowStyle = React.useCallback(
    (rowData: NetworkNodeRowType) => ({
      backgroundColor:
        selectedElement?.type === TopologyElementType.NODE &&
        rowData.name === selectedElement?.name
          ? grey[300]
          : undefined,
    }),
    [selectedElement],
  );

  const tableOptions = React.useMemo(
    () => ({
      showTitle: false,
      maxBodyHeight:
        /**
         * Subtract the height of enabled mtable components to stretch the table
         * vertically in the network tables view. prevents double scrollbar
         */
        tableHeight != null
          ? tableHeight -
            NETWORK_TABLE_HEIGHTS.MTABLE_FILTERING -
            NETWORK_TABLE_HEIGHTS.MTABLE_GROUPING -
            NETWORK_TABLE_HEIGHTS.MTABLE_TOOLBAR
          : NETWORK_TABLE_HEIGHTS.MTABLE_MAX_HEIGHT,
      pageSize: 20,
      pageSizeOptions: [20, 50, 100],
      padding: 'dense',
      grouping: true,
      filtering: true,
      rowStyle: makeRowStyle,
      filterCellStyle: {
        padding: 4,
      },
      headerStyle: {
        padding: 4,
      },
      tableLayout: 'fixed',
    }),
    [makeRowStyle, tableHeight],
  );

  return (
    <div className={classes.root} data-testid="network-nodes-table">
      <MaterialTable
        title="Sites"
        columns={columns}
        data={data}
        onRowClick={handleRowClick}
        options={tableOptions}
      />
    </div>
  );
}
