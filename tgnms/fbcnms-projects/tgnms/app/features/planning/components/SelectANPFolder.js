/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */
import * as React from 'react';
import Autocomplete from '@material-ui/lab/Autocomplete';
import TextField from '@material-ui/core/TextField';
import {objectValuesTypesafe} from '@fbcnms/tg-nms/app/helpers/ObjectHelpers';
import {useFolders} from '@fbcnms/tg-nms/app/features/planning/PlanningHooks';
import {useModalState} from '@fbcnms/tg-nms/app/hooks/modalHooks';

import type {ANPFolder} from '@fbcnms/tg-nms/shared/dto/ANP';

export type Props = {|folderId: string, onChange: (folderId: string) => void|};

export default function SelectANPFolder({folderId, onChange}: Props) {
  const autocompleteState = useModalState();
  const {folders, taskState: loadFoldersTask} = useFolders();
  const options = React.useMemo<Array<ANPFolder>>(
    () => (folders != null ? objectValuesTypesafe<ANPFolder>(folders) : []),
    [folders],
  );
  const [folder, setFolder] = React.useState();
  React.useEffect(() => {
    if (folderId != null && folders != null) {
      setFolder(folders[folderId]);
    }
  }, [folderId, setFolder, folders]);
  return (
    <Autocomplete
      size="small"
      open={autocompleteState.isOpen}
      onOpen={autocompleteState.open}
      onClose={autocompleteState.close}
      loading={loadFoldersTask.isLoading}
      value={folder ?? null}
      onChange={(e, val) => {
        onChange(val.id);
      }}
      options={options}
      getOptionSelected={(option, value) => {
        return option.id === value.id;
      }}
      getOptionLabel={opt => opt?.folder_name ?? ''}
      renderInput={params => <TextField {...params} label="Select Folder" />}
    />
  );
}
