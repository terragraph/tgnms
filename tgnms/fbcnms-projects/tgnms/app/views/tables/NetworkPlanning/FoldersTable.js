/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */
import * as networkPlanningAPIUtil from '@fbcnms/tg-nms/app/apiutils/NetworkPlanningAPIUtil';
import ArrowDropDownIcon from '@material-ui/icons/ArrowDropDown';
import CreateFolderModal from './CreateFolderModal';
import MaterialTable from '@fbcnms/tg-nms/app/components/common/MaterialTable';
import MenuButton from '@fbcnms/tg-nms/app/components/common/MenuButton';
import MenuItem from '@material-ui/core/MenuItem';
import React from 'react';
import TableToolbar, {
  TableToolbarAction,
  TableToolbarActions,
} from './TableToolbar';
import useInterval from '@fbcnms/ui/hooks/useInterval';
import useTaskState, {TASK_STATE} from '@fbcnms/tg-nms/app/hooks/useTaskState';
import {NETWORK_TABLE_HEIGHTS} from '@fbcnms/tg-nms/app/constants/StyleConstants';
import {
  PLANNING_BASE_PATH,
  PLANNING_FOLDER_PATH,
} from '@fbcnms/tg-nms/app/constants/paths';
import {
  generatePath,
  matchPath,
  useHistory,
  useLocation,
} from 'react-router-dom';
import {useModalState} from '@fbcnms/tg-nms/app/hooks/modalHooks';
import {useNetworkPlanningContext} from '@fbcnms/tg-nms/app/contexts/NetworkPlanningContext';
import type {ANPFolder} from '@fbcnms/tg-nms/shared/dto/ANP';
import type {NetworkTableProps} from '../NetworkTables';

export default function FoldersTable({tableHeight}: NetworkTableProps) {
  const location = useLocation();
  const history = useHistory();
  const [lastRefreshDate, setLastRefreshDate] = React.useState(
    new Date().getTime(),
  );
  const [plans, setFolders] = React.useState<?Array<ANPFolder>>();
  const loadPlansTask = useTaskState();
  const createFolderModal = useModalState();
  React.useEffect(() => {
    (async () => {
      try {
        loadPlansTask.setState(TASK_STATE.LOADING);
        const folders = await networkPlanningAPIUtil.getFolders();
        setFolders(folders);
        loadPlansTask.setState(TASK_STATE.SUCCESS);
      } catch (err) {
        loadPlansTask.setState(TASK_STATE.ERROR);
      }
    })();
  }, [lastRefreshDate, loadPlansTask]);
  const refreshTable = React.useCallback(
    () => setLastRefreshDate(new Date().getTime()),
    [setLastRefreshDate],
  );
  useInterval(() => {
    refreshTable();
  }, 30000);

  const columns = React.useMemo(
    () => [
      {
        title: 'Name',
        field: 'folder_name',
        grouping: false,
        width: 100,
      },
    ],
    [],
  );
  const tableOptions = React.useMemo(
    () => ({
      showTitle: true,
      maxBodyHeight:
        tableHeight != null
          ? tableHeight -
            NETWORK_TABLE_HEIGHTS.MTABLE_FILTERING -
            NETWORK_TABLE_HEIGHTS.MTABLE_TOOLBAR
          : NETWORK_TABLE_HEIGHTS.MTABLE_MAX_HEIGHT,
      pageSize: 20,
      pageSizeOptions: [20, 50, 100],
      padding: 'dense',
      tableLayout: 'fixed',
      toolbarButtonAlignment: 'right',
      searchFieldStyle: {
        marginRight: '16px',
      },
    }),
    [tableHeight],
  );

  const handleRowClick = (event, row: ANPFolder) => {
    const match = matchPath(location.pathname, {
      path: PLANNING_BASE_PATH,
    });
    const newPath = generatePath(PLANNING_FOLDER_PATH, {
      view: match?.params.view ?? '',
      networkName: match?.params.networkName ?? '',
      folderId: row.id,
    });
    history.push(newPath);
  };

  /**
   * Passing a lambda with every render causes Component to unmount/remount
   * on every render. This normally isn't a problem, but FoldersTableCTA uses a
   * MenuButton. If a render occurs while the user has the menu open,
   * the menu will close.
   */
  const CTAComponent = React.useCallback(
    _props => <FoldersTableCTA onFolderCreated={refreshTable} />,
    [refreshTable],
  );
  return (
    <>
      <MaterialTable
        title="Folders"
        data={plans}
        options={tableOptions}
        columns={columns}
        onRowClick={handleRowClick}
        isLoading={loadPlansTask.isLoading}
        actions={[
          {
            position: 'toolbar',
            Component: CTAComponent,
          },
        ]}
        components={{
          Toolbar: TableToolbar,
          Action: TableToolbarAction,
          Actions: TableToolbarActions,
        }}
      />
      <CreateFolderModal
        isOpen={createFolderModal.isOpen}
        onClose={createFolderModal.close}
        onComplete={refreshTable}
      />
    </>
  );
}

type CTAProps = {|
  onFolderCreated: () => void,
|};
export function FoldersTableCTA({onFolderCreated}: CTAProps) {
  const {setSelectedPlanId} = useNetworkPlanningContext();
  const createFolderModal = useModalState();

  return (
    <>
      <MenuButton
        label={
          <>
            Add <ArrowDropDownIcon fontSize="small" />
          </>
        }
        id="folders-table-cta"
        ButtonProps={{variant: 'outlined'}}>
        <MenuItem onClick={createFolderModal.open}>Folder</MenuItem>
        <MenuItem onClick={() => setSelectedPlanId('')}>Plan</MenuItem>
      </MenuButton>
      <CreateFolderModal
        isOpen={createFolderModal.isOpen}
        onClose={createFolderModal.close}
        onComplete={onFolderCreated}
      />
    </>
  );
}
