/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 * Queries ANP files by role
 */
import * as React from 'react';
import * as networkPlanningAPIUtil from '@fbcnms/tg-nms/app/apiutils/NetworkPlanningAPIUtil';
import Autocomplete from '@material-ui/lab/Autocomplete';
import CircularProgress from '@material-ui/core/CircularProgress';
import TextField from '@material-ui/core/TextField';
import useTaskState, {TASK_STATE} from '@fbcnms/tg-nms/app/hooks/useTaskState';
import {FILE_SOURCE} from '@fbcnms/tg-nms/shared/dto/NetworkPlan';
import {useModalState} from '@fbcnms/tg-nms/app/hooks/modalHooks';
import type {ANPFileHandle} from '@fbcnms/tg-nms/shared/dto/ANP';
import type {InputFile} from '@fbcnms/tg-nms/shared/dto/NetworkPlan';

type SelectOrUploadFileProps = {|
  id: string,
  role: string,
  value?: ?InputFile,
  onChange: (f: InputFile) => *,
|};
export default function SelectANPPartnerFile({
  id,
  value,
  onChange,
  role,
}: SelectOrUploadFileProps) {
  const autocompleteState = useModalState();
  const [files, setFiles] = React.useState<Array<InputFile>>([]);
  const loadFilesTask = useTaskState();
  React.useEffect(() => {
    (async () => {
      try {
        loadFilesTask.setState(TASK_STATE.LOADING);
        const response = await networkPlanningAPIUtil.getPartnerFiles({role});
        if (Array.isArray(response.data)) {
          const _files = response.data.map(anpFileHandleToInputFile);
          setFiles(_files);
          loadFilesTask.setState(TASK_STATE.SUCCESS);
        } else {
          throw new Error(`Could not load files`);
        }
      } catch (err) {
        loadFilesTask.setState(TASK_STATE.ERROR);
        loadFilesTask.setMessage(err.message);
      }
    })();
  }, [role, loadFilesTask, setFiles]);
  const handleFBIDFileSelected = (event, file) => {
    onChange(file);
  };
  return (
    <Autocomplete
      id={id}
      data-testid={id}
      open={autocompleteState.isOpen}
      onOpen={autocompleteState.open}
      onClose={autocompleteState.close}
      options={value != null ? [value].concat(files) : files}
      getOptionSelected={(option, val) => option.fbid === val?.fbid}
      getOptionLabel={option => option.name}
      loading={loadFilesTask.isLoading}
      value={value}
      onChange={handleFBIDFileSelected}
      renderInput={params => (
        <TextField
          {...params}
          label="Select Existing File"
          InputProps={{
            ...params.InputProps,
            endAdornment: (
              <>
                {loadFilesTask.isLoading ? (
                  <CircularProgress color="inherit" size={20} />
                ) : null}
                {params.InputProps.endAdornment}
              </>
            ),
          }}
        />
      )}
    />
  );
}

function anpFileHandleToInputFile(anpFile: ANPFileHandle): InputFile {
  const inputFile: $Shape<InputFile> = {
    name: anpFile.file_name,
    role: anpFile.file_role,
    source: FILE_SOURCE.fbid,
    fbid: anpFile.id,
  };
  return inputFile;
}
