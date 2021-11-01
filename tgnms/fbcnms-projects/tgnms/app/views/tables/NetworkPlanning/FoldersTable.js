/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */
import * as networkPlanningAPIUtil from '@fbcnms/tg-nms/app/apiutils/NetworkPlanningAPIUtil';
import ArrowDropDownIcon from '@material-ui/icons/ArrowDropDown';
import CreateFolderModal from './CreateFolderModal';
import CreatePlanModal from './CreatePlanModal';
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
import type {NetworkTableProps} from '../NetworkTables';
import type {PlanFolder} from '@fbcnms/tg-nms/shared/dto/NetworkPlan';

export default function FoldersTable({tableHeight}: NetworkTableProps) {
  const location = useLocation();
  const history = useHistory();
  const [lastRefreshDate, setLastRefreshDate] = React.useState(
    new Date().getTime(),
  );
  const [plans, setFolders] = React.useState<?Array<PlanFolder>>();
  const loadPlansTask = useTaskState();
  const createFolderModal = useModalState();
  const createPlanModal = useModalState();
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
        title: 'Projects',
        field: 'name',
        grouping: false,
        width: 100,
      },
    ],
    [],
  );
  const tableOptions = React.useMemo(() => {
    const computedheight =
      tableHeight != null
        ? tableHeight -
          NETWORK_TABLE_HEIGHTS.MTABLE_PAGINATION -
          NETWORK_TABLE_HEIGHTS.MTABLE_TOOLBAR
        : NETWORK_TABLE_HEIGHTS.MTABLE_MAX_HEIGHT;
    return {
      showTitle: false,
      minBodyHeight: computedheight,
      maxBodyHeight: computedheight,
      pageSize: 20,
      pageSizeOptions: [20, 50, 100],
      padding: 'dense',
      tableLayout: 'fixed',
      toolbarButtonAlignment: 'right',
      searchFieldStyle: {
        marginRight: '16px',
      },
      emptyRowsWhenPaging: false,
    };
  }, [tableHeight]);

  const handleRowClick = (event, row: PlanFolder) => {
    const match = matchPath(location.pathname, {
      path: PLANNING_BASE_PATH,
    });
    const newPath = generatePath(PLANNING_FOLDER_PATH, {
      view: match?.params?.view ?? '',
      networkName: match?.params?.networkName ?? '',
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
        title="Projects"
        data={plans}
        options={tableOptions}
        columns={columns}
        onRowClick={handleRowClick}
        isLoading={loadPlansTask.isLoading}
        actions={[
          {
            position: 'toolbar',
            Component: CTAComponent,
            // these props prevent material-table's prop-types from complaining
            icon: 'none',
            onClick: empty,
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
      <CreatePlanModal
        isOpen={createPlanModal.isOpen}
        onClose={createPlanModal.close}
      />
    </>
  );
}
function empty() {}

type CTAProps = {|
  onFolderCreated: () => void,
|};
export function FoldersTableCTA({onFolderCreated}: CTAProps) {
  const createFolderModal = useModalState();
  const createPlanModal = useModalState();
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
        <MenuItem onClick={createFolderModal.open}>Project</MenuItem>
        <MenuItem onClick={createPlanModal.open}>Plan</MenuItem>
      </MenuButton>
      <CreateFolderModal
        isOpen={createFolderModal.isOpen}
        onClose={createFolderModal.close}
        onComplete={onFolderCreated}
      />
      <CreatePlanModal
        isOpen={createPlanModal.isOpen}
        onClose={createPlanModal.close}
      />
    </>
  );
}
