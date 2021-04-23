/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 * Queries ANP files by role or allows the user to upload their own file
 */
import * as React from 'react';
import * as networkPlanningAPIUtil from '@fbcnms/tg-nms/app/apiutils/NetworkPlanningAPIUtil';
import Autocomplete from '@material-ui/lab/Autocomplete';
import Button from '@material-ui/core/Button';
import CircularProgress from '@material-ui/core/CircularProgress';
import Grid from '@material-ui/core/Grid';
import Input from '@material-ui/core/Input';
import LinearProgress from '@material-ui/core/LinearProgress';
import MaterialModal from '@fbcnms/tg-nms/app/components/common/MaterialModal';
import PublishIcon from '@material-ui/icons/Publish';
import TextField from '@material-ui/core/TextField';
import Typography from '@material-ui/core/Typography';
import useTaskState, {TASK_STATE} from '@fbcnms/tg-nms/app/hooks/useTaskState';
import {bytesToMB} from '@fbcnms/tg-nms/app/helpers/MathHelpers';
import {useModalState} from '@fbcnms/tg-nms/app/hooks/modalHooks';
import type {ANPFileHandle} from '@fbcnms/tg-nms/shared/dto/ANP';

type SelectOrUploadFileProps = {|
  label: string,
  // comma separated list of file extensions to accept
  role: string,
  fileTypes: string,
  initialValue?: ?ANPFileHandle,
  onChange: (f: ANPFileHandle) => *,
|};

export default function SelectOrUploadANPFile({
  label,
  fileTypes,
  onChange,
  role,
  initialValue,
}: SelectOrUploadFileProps) {
  // state for the MaterialModal open/close
  const {isOpen, open, close} = useModalState();
  // state for autocomplete open/close
  const autocompleteState = useModalState();
  const [selectedFile, setSelectedFile] = React.useState<?ANPFileHandle>(null);
  React.useEffect(() => {
    if (initialValue != null) {
      setSelectedFile(initialValue);
    }
  }, [initialValue]);
  const [files, setFiles] = React.useState<Array<ANPFileHandle>>([]);
  const loadFilesTask = useTaskState();
  React.useEffect(() => {
    (async () => {
      try {
        loadFilesTask.setState(TASK_STATE.LOADING);
        const response = await networkPlanningAPIUtil.getPartnerFiles({role});
        if (Array.isArray(response.data)) {
          setFiles(response.data);
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

  const handleFileSelected = React.useCallback((event, file) => {
    setSelectedFile(file);
  }, []);
  const handleUploadComplete = React.useCallback(
    file => {
      setFiles(existing => [file, ...existing]);
      setSelectedFile(file);
    },
    [setFiles, setSelectedFile],
  );
  const handleConfirm = React.useCallback(() => {
    if (selectedFile) {
      onChange(selectedFile);
      close();
    }
  }, [onChange, selectedFile, close]);
  return (
    <>
      <Grid item container>
        <Grid item xs={12}>
          <Typography variant="body2" color="textSecondary">
            {label}
          </Typography>
        </Grid>
        <Grid
          container
          item
          xs={12}
          justify="space-between"
          alignItems="center">
          <Grid item xs={8}>
            {loadFilesTask.isSuccess && (
              <Typography variant="body2">
                {selectedFile
                  ? `${selectedFile.file_name}.${selectedFile.file_extension}`
                  : 'None Selected'}
              </Typography>
            )}
          </Grid>
          <Grid item xs={4}>
            <Button
              fullWidth
              onClick={open}
              variant="outlined"
              size="small"
              fontSize="small"
              endIcon={
                loadFilesTask.isLoading ? (
                  <CircularProgress
                    style={{
                      opacity: loadFilesTask.isLoading ? '1.0' : '0',
                    }}
                    color="inherit"
                    size={10}
                  />
                ) : null
              }>
              Browse
            </Button>
          </Grid>
        </Grid>
      </Grid>
      <MaterialModal
        open={isOpen}
        onClose={close}
        modalTitle="Select File"
        modalContentText={'Select how you want to choose the file'}
        modalContent={
          <>
            <Grid
              container
              justify="space-between"
              direction="column"
              spacing={3}
              data-testid="select-or-upload-anpfile">
              <Grid item xs={12}>
                <Autocomplete
                  open={autocompleteState.isOpen}
                  onOpen={autocompleteState.open}
                  onClose={autocompleteState.close}
                  options={
                    selectedFile != null ? [selectedFile].concat(files) : files
                  }
                  getOptionSelected={(option, value) => option.id === value.id}
                  getOptionLabel={option => option.file_name}
                  loading={loadFilesTask.isLoading}
                  value={selectedFile}
                  onChange={handleFileSelected}
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
              </Grid>
              <Grid item xs={12} container justify="center">
                <Typography color="textSecondary" variant="body2">
                  or
                </Typography>
              </Grid>
              <Grid item xs={12} container>
                <FileUpload
                  fileTypes={fileTypes}
                  label="Upload New File"
                  role={role}
                  onComplete={handleUploadComplete}
                />
              </Grid>
            </Grid>
          </>
        }
        modalActions={
          <>
            <Button onClick={close} variant="outlined">
              Cancel
            </Button>
            <Button
              disabled={selectedFile == null}
              onClick={handleConfirm}
              variant="contained"
              color="primary">
              Confirm
            </Button>
          </>
        }
      />
    </>
  );
}

function FileUpload({
  label,
  fileTypes,
  role,
  onComplete,
}: {
  role: string,
  onComplete: (x: ANPFileHandle) => *,
  label: string,
  // comma separated list of file extensions to accept
  fileTypes: string,
}) {
  const uploadFileTask = useTaskState();
  const [file, setFile] = React.useState<?File>(null);
  const [progress, setProgress] = React.useState(0);

  const handleStartUpload = React.useCallback(async () => {
    if (file) {
      try {
        uploadFileTask.setState(TASK_STATE.LOADING);
        const uploadedFile = await networkPlanningAPIUtil.uploadFile({
          file: file,
          name: file?.name,
          role: role,
          onProgress: setProgress,
        });
        uploadFileTask.setState(TASK_STATE.SUCCESS);
        onComplete(uploadedFile);
      } catch (err) {
        uploadFileTask.setState(TASK_STATE.ERROR);
        uploadFileTask.setMessage(err.message);
      }
    }
  }, [file, role, setProgress, uploadFileTask, onComplete]);
  return (
    <Grid item xs={12} container direction="column" spacing={2}>
      <FileSelect label={label} onChange={setFile} fileTypes={fileTypes} />
      {file != null && (
        <Grid item container spacing={2}>
          <Grid item>
            <Typography>{file.name}</Typography>
            <Typography color="textSecondary">
              {bytesToMB(file.size)}MB
            </Typography>
          </Grid>
          {uploadFileTask.isIdle && (
            <Grid item>
              <Button
                disabled={file == null}
                variant="outlined"
                color="primary"
                onClick={handleStartUpload}>
                Start Upload
              </Button>
            </Grid>
          )}
          {uploadFileTask.isLoading && (
            <Grid item xs={12}>
              <Typography color="textSecondary">
                Uploading file {bytesToMB((progress / 100) * file.size)}MB/
                {bytesToMB(file.size)}MB
              </Typography>
              <LinearProgress value={progress} variant="determinate" />
            </Grid>
          )}
        </Grid>
      )}
    </Grid>
  );
}

type FileSelectProps = {
  label: string,
  // comma separated list of file extensions to accept
  fileTypes: string,
  icon?: React.Node,
  onChange: File => *,
};
function FileSelect({label, fileTypes, icon, onChange}: FileSelectProps) {
  const handleFileSelected = React.useCallback(
    (e: SyntheticInputEvent<HTMLInputElement>) => {
      const file = e?.target?.files[0];
      onChange(file);
    },
    [onChange],
  );
  return (
    <Grid item>
      <Button
        fullWidth
        variant="contained"
        color="primary"
        component="label"
        endIcon={icon || <PublishIcon />}>
        {label}
        <Input
          data-testid="fileInput"
          onChange={handleFileSelected}
          type="file"
          inputProps={{accept: fileTypes}}
          style={{display: 'none'}}
        />
      </Button>
    </Grid>
  );
}
