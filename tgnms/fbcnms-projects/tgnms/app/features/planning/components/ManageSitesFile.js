/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */
import * as React from 'react';
import * as networkPlanningAPIUtil from '@fbcnms/tg-nms/app/apiutils/NetworkPlanningAPIUtil';
import EditIcon from '@material-ui/icons/Edit';
import IconButton from '@material-ui/core/IconButton';
import InputAdornment from '@material-ui/core/InputAdornment';
import ManageInputFile from './ManageInputFile';
import {FILE_ROLE} from '@fbcnms/tg-nms/shared/dto/ANP';
import {
  PLANNING_FOLDER_PATH,
  PLANNING_SITESFILE_PATH,
} from '@fbcnms/tg-nms/app/constants/paths';
import {
  PLAN_ID_QUERY_KEY,
  useNetworkPlanningContext,
} from '@fbcnms/tg-nms/app/contexts/NetworkPlanningContext';
import {
  generatePath,
  matchPath,
  useHistory,
  useLocation,
} from 'react-router-dom';
import type {InputFile} from '@fbcnms/tg-nms/shared/dto/NetworkPlan';

const ROLE = FILE_ROLE.URBAN_SITE_FILE;

export default function ManageSitesFile({
  initialValue,
  id,
  onChange,
}: {
  id: string,
  initialValue: ?InputFile,
  onChange: (?InputFile) => void,
}) {
  const handleCreateSitesFile = React.useCallback(
    f =>
      networkPlanningAPIUtil.createSitesFile({
        name: f.name,
      }),
    [],
  );

  return (
    <ManageInputFile
      id={id}
      label="Sites file"
      initialValue={initialValue}
      onChange={onChange}
      onCreateFile={handleCreateSitesFile}
      role={ROLE}
      fileTypes=".csv"
      EditInputFileComponent={initialValue != null ? EditInputFileButton : null}
    />
  );
}

function EditInputFileButton({inputFile}: {inputFile: ?InputFile}) {
  const goToSitesFile = useEditSitesFileRoute();
  if (inputFile == null) {
    return null;
  }
  return (
    <InputAdornment position="start">
      <IconButton
        size="small"
        title="edit sites file"
        aria-label="edit sites file"
        onClick={goToSitesFile}>
        <EditIcon fontSize="small" />
      </IconButton>
    </InputAdornment>
  );
}

function useEditSitesFileRoute() {
  const history = useHistory();
  const location = useLocation();
  const {selectedPlanId} = useNetworkPlanningContext();

  const navigate = React.useCallback(() => {
    const match = matchPath(location.pathname, {
      path: PLANNING_FOLDER_PATH,
    });
    const newPath = generatePath(PLANNING_SITESFILE_PATH, {
      view: match?.params?.view ?? '',
      networkName: match?.params?.networkName ?? '',
      folderId: match?.params?.folderId ?? '',
    });
    history.replace({
      pathname: newPath,
      search: selectedPlanId ? `?${PLAN_ID_QUERY_KEY}=${selectedPlanId}` : '',
    });
  }, [history, location, selectedPlanId]);

  return navigate;
}
