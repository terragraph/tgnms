/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */
import * as React from 'react';
import * as networkPlanningAPIUtil from '@fbcnms/tg-nms/app/apiutils/NetworkPlanningAPIUtil';
import BackButton from './BackButton';
import FileCopyIcon from '@material-ui/icons/FileCopy';
import Grid from '@material-ui/core/Grid';
import MaterialTable from '@fbcnms/tg-nms/app/components/common/MaterialTable';
import NearMeIcon from '@material-ui/icons/NearMe';
import RemoveIcon from '@material-ui/icons/Remove';
import useLiveRef from '@fbcnms/tg-nms/app/hooks/useLiveRef';
import useUnmount from '@fbcnms/tg-nms/app/hooks/useUnmount';
import {
  PLANNING_FOLDER_PATH,
  PLANNING_SITESFILE_PATH,
} from '@fbcnms/tg-nms/app/constants/paths';
import {SITES_FILE_SITE_TYPES} from '@fbcnms/tg-nms/shared/dto/NetworkPlan';
import {getBBox} from '@fbcnms/tg-nms/app/helpers/GeoHelpers';
import {throttle} from 'lodash';
import {useMapContext} from '@fbcnms/tg-nms/app/contexts/MapContext';
import {useNetworkPlanningContext} from '@fbcnms/tg-nms/app/contexts/NetworkPlanningContext';
import type {NetworkTableProps} from '../NetworkTables';
import type {SitesFileRow} from '@fbcnms/tg-nms/shared/dto/NetworkPlan';

export default function SitesFileTable({}: NetworkTableProps) {
  const {moveMapTo} = useMapContext();
  const {
    plan,
    selectedSites,
    setSelectedSites,
    sitesFileTask,
  } = useNetworkPlanningContext();
  useLoadSitesFile();
  const {
    sites,
    pendingSitesFileTask,
    updateSiteById,
    deleteSiteById,
    addSite,
  } = useEditSitesFile();
  const handleRowClick = React.useCallback(
    (_, row: SitesFileRow) => {
      setSelectedSites(sites => [...sites, row.id]);
    },
    [setSelectedSites],
  );
  const columns = React.useMemo(
    () => [
      {
        title: 'Site Name',
        field: 'name',
        grouping: false,
        width: 100,
        initialEditValue: 'Site',
      },
      {
        title: 'Type',
        field: 'type',
        width: 30,
        lookup: {
          CN: 'CN',
          DN: 'DN',
          POP: 'POP',
        },
        initialEditValue: 'CN',
      },
      {
        title: 'Latitude',
        field: 'location.latitude',
        width: 100,
        type: 'numeric',
        render: ({location}) => location.latitude.toFixed(5),
      },
      {
        title: 'Longitude',
        field: 'location.longitude',
        width: 100,
        type: 'numeric',
        render: ({location}) => location.longitude.toFixed(5),
      },
    ],
    [],
  );

  const tableOptions = React.useMemo(() => {
    return {
      showTitle: true,
      selection: true,
      // when a new row is created, add to the top of the table
      addRowPosition: 'first',
    };
  }, []);
  const data = React.useMemo(() => {
    const _set = new Set(selectedSites);
    return (
      sites.map(site => ({
        ...site,
        tableData: {checked: _set.has(site.id)},
      })) ?? []
    );
  }, [selectedSites, sites]);

  const isImmutableFile = plan?.sitesFile?.source === 'fbid';
  const editTableProps = React.useMemo(() => {
    return {
      isEditHidden: () => isImmutableFile,
      isDeleteHidden: () => true,
      isEditable: () => !pendingSitesFileTask.isLoading && !isImmutableFile,
      onRowAdd: async (newRow: SitesFileRow) => {
        if (!validateAddRow(newRow)) {
          throw new Error('Row is invalid');
        }
        addSite(newRow);
      },
      onRowUpdate: async (newData, _oldData) => {
        if (!validateUpdateRow(newData)) {
          throw new Error('Row is invalid');
        }
        updateSiteById(newData.id, newData);
      },
      onRowDelete: async row => {
        deleteSiteById(row.id);
      },
    };
  }, [
    isImmutableFile,
    pendingSitesFileTask,
    addSite,
    updateSiteById,
    deleteSiteById,
  ]);
  const duplicateRows = (event, rows: SitesFileRow | Array<SitesFileRow>) => {
    const _rows = Array.isArray(rows) ? rows : [rows];
    _rows.forEach(r => addSite(r));
    setSelectedSites(_rows.map(x => x.id));
  };
  const deleteRows = (event, rows: SitesFileRow | Array<SitesFileRow>) => {
    const _rows = Array.isArray(rows) ? rows : [rows];
    _rows.forEach(r => deleteSiteById(r.id));
    setSelectedSites([]);
  };
  const moveToSitesFile = () => {
    const bbox = getBBox(sites.map(x => x.location));
    if (!bbox) {
      return;
    }
    moveMapTo({bbox});
  };

  return (
    <MaterialTable
      title={
        <Grid container alignContent="center" alignItems="center" spacing={1}>
          <Grid item>
            <BackButton
              from={PLANNING_SITESFILE_PATH}
              to={PLANNING_FOLDER_PATH}
              label="Back to Plans"
              data-testid="back-to-plans"
              keepSelectedPlan={true}
            />
          </Grid>
        </Grid>
      }
      data-testid="sites-file-table"
      columns={columns}
      actions={[
        {
          isFreeAction: true,
          icon: NearMeIcon,
          onClick: moveToSitesFile,
          tooltip: 'Move map to sites',
        },
        {
          icon: FileCopyIcon,
          onClick: duplicateRows,
          tooltip: 'Duplicate',
        },
        {
          icon: RemoveIcon,
          onClick: deleteRows,
          tooltip: 'Delete',
        },
      ]}
      data={data}
      isLoading={sitesFileTask.isLoading}
      options={tableOptions}
      onSelectionChange={rows => {
        setSelectedSites(rows.map(x => x.id));
      }}
      onRowClick={handleRowClick}
      editable={editTableProps}
    />
  );
}

/**
 * Stores an editable copy of the sites file and replaces the sites-file in the
 * context when it's updated on the server.
 */
export function useEditSitesFile() {
  const {
    sitesFile,
    setSitesFile,
    setSelectedSites,
    pendingSitesFile,
    setPendingSitesFile,
    pendingSitesFileTask,
  } = useNetworkPlanningContext();
  const sitesFileRef = useLiveRef(sitesFile);
  React.useEffect(() => {
    setPendingSitesFile(sitesFile);
  }, [sitesFile, setPendingSitesFile]);
  useUnmount(() => {
    setPendingSitesFile(null);
    setSitesFile(null);
  });
  const updateSiteById = React.useCallback(
    (id: number, update: ?SitesFileRow) => {
      setPendingSitesFile(f => {
        if (f == null) {
          return f;
        }
        const newRows = [...(f?.sites ?? [])];
        if (update == null) {
          newRows.splice(id, 1);
        } else {
          newRows[id] = update;
        }
        return {...f, sites: newRows};
      });
    },
    [setPendingSitesFile],
  );
  const deleteSiteById = React.useCallback(
    (id: number) => {
      // remove deleted sites from selected
      setSelectedSites(curr => curr.filter(x => x !== id));
      setPendingSitesFile(f => {
        if (f == null) {
          return f;
        }
        return {
          ...f,
          sites: f?.sites?.filter(x => x.id !== id) ?? [],
        };
      });
    },
    [setSelectedSites, setPendingSitesFile],
  );

  const addSite = React.useCallback(
    (site: SitesFileRow) => {
      setPendingSitesFile(f => {
        if (f == null) {
          return f;
        }
        site.id = f?.sites.length ?? 0;
        return {...f, sites: [...(f?.sites ?? []), site]};
      });
    },
    [setPendingSitesFile],
  );
  const updateSitesFile = React.useMemo(
    () =>
      throttle(async f => {
        try {
          pendingSitesFileTask.loading();
          await networkPlanningAPIUtil.updateSitesFile(f);
          setSitesFile(f);
          pendingSitesFileTask.success();
        } catch (err) {
          console.error(err);
          pendingSitesFileTask.error();
        }
      }, 1000),
    [setSitesFile, pendingSitesFileTask],
  );
  React.useEffect(() => {
    (async () => {
      if (sitesFileRef.current == null) {
        return;
      }
      if (
        pendingSitesFile != sitesFileRef.current &&
        pendingSitesFile != null
      ) {
        await updateSitesFile(pendingSitesFile);
      }
    })();
  }, [pendingSitesFile, updateSitesFile, sitesFileRef]);

  return {
    sites: pendingSitesFile?.sites ?? [],
    pendingSitesFileTask,
    updateSiteById,
    deleteSiteById,
    addSite,
  };
}

function useLoadSitesFile() {
  const {
    plan,
    sitesFile,
    setSitesFile,
    sitesFileTask,
  } = useNetworkPlanningContext();
  const sitesInputFile = plan?.sitesFile;
  React.useEffect(() => {
    (async () => {
      if (sitesFileTask.isLoading) {
        return;
      }
      try {
        if (sitesInputFile != null) {
          sitesFileTask.loading();
          const _sitesFileData = await networkPlanningAPIUtil.getSitesFile({
            id: sitesInputFile.id,
          });
          if (_sitesFileData.sites != null) {
            setSitesFile(_sitesFileData);
          }
          sitesFileTask.success();
        }
      } catch (err) {
        sitesFileTask.error();
      }
    })();
  }, [sitesInputFile, setSitesFile, sitesFileTask]);
  return {sitesFile};
}

// validate everything except the row's ID since it doesnt exist yet
function validateAddRow(row: SitesFileRow) {
  if (row?.location?.latitude == null || row?.location?.longitude == null) {
    return false;
  }
  if (!SITES_FILE_SITE_TYPES.has(row.type)) {
    console.error(
      `Error: type:${row.type} must be one of: ${Array.from(
        SITES_FILE_SITE_TYPES,
      ).join()}`,
    );
    return false;
  }
  return true;
}
function validateUpdateRow(row: SitesFileRow) {
  if (typeof row.id !== 'number') {
    return false;
  }
  return validateAddRow(row);
}
