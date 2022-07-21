/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
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
import type {PlanFolder} from '@fbcnms/tg-nms/shared/dto/NetworkPlan';

export type Props = {|
  folderId: string,
  onChange: (folderId: string) => void,
  id: string,
  hideLabel?: boolean,
|};

export default function SelectPlanFolder({
  folderId,
  onChange,
  id,
  hideLabel,
}: Props) {
  const autocompleteState = useModalState();
  const {folders, taskState: loadFoldersTask} = useFolders();
  const options = React.useMemo<Array<PlanFolder>>(
    () => (folders != null ? objectValuesTypesafe<PlanFolder>(folders) : []),
    [folders],
  );
  const [folder, setFolder] = React.useState();
  React.useEffect(() => {
    if (folderId != null && folders != null) {
      setFolder(folders[parseInt(folderId)]);
    }
  }, [folderId, setFolder, folders]);
  return (
    <Autocomplete
      id={id}
      data-testid={`${id}-autocomplete`}
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
      getOptionLabel={opt => opt?.name ?? ''}
      renderInput={params => (
        <TextField {...params} label={!hideLabel ? 'Select Folder' : null} />
      )}
    />
  );
}
