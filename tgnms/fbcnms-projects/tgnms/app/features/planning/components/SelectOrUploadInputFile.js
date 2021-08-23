/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 * Queries ANP files by role or allows the user to upload their own file
 */
import * as React from 'react';
import * as networkPlanningAPIUtil from '@fbcnms/tg-nms/app/apiutils/NetworkPlanningAPIUtil';
import Button from '@material-ui/core/Button';
import Grid from '@material-ui/core/Grid';
import Input from '@material-ui/core/Input';
import LinearProgress from '@material-ui/core/LinearProgress';
import MaterialModal from '@fbcnms/tg-nms/app/components/common/MaterialModal';
import PublishIcon from '@material-ui/icons/Publish';
import SelectANPPartnerFile from './SelectANPPartnerFile';
import Typography from '@material-ui/core/Typography';
import useTaskState, {TASK_STATE} from '@fbcnms/tg-nms/app/hooks/useTaskState';
import {bytesToMB} from '@fbcnms/tg-nms/app/helpers/MathHelpers';
import {makeStyles} from '@material-ui/styles';
import {useModalState} from '@fbcnms/tg-nms/app/hooks/modalHooks';
import type {InputFile} from '@fbcnms/tg-nms/shared/dto/NetworkPlan';

type SelectOrUploadFileProps = {|
  id: string,
  label: string,
  // comma separated list of file extensions to accept
  role: string,
  fileTypes: string,
  initialValue?: ?InputFile,
  onChange: (f: InputFile) => *,
|};

const useStyles = makeStyles(_theme => ({
  fileName: {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
}));

export default function SelectOrUploadInputFile({
  id,
  label,
  fileTypes,
  onChange,
  role,
  initialValue,
}: SelectOrUploadFileProps) {
  const classes = useStyles();
  // state for the MaterialModal open/close
  const {isOpen, open, close} = useModalState();
  // state for autocomplete open/close
  const [selectedFile, setSelectedFile] = React.useState<?InputFile>(null);
  React.useEffect(() => {
    if (initialValue != null) {
      setSelectedFile(initialValue);
    }
  }, [initialValue]);

  /**
   * User has selected a file which has already been uploaded to FB and is
   * immutable.
   */
  const handleFBIDFileSelected = React.useCallback(
    async file => {
      setSelectedFile(file);
    },
    [setSelectedFile],
  );
  const handleUploadComplete = React.useCallback(
    async file => {
      /**
       * Remove the old input file from the plan.
       * For now, this will prevent us from using multiple files of the same
       * role on one plan (like ANP's multiple DSM feature).
       * Likely we'll just use a flag in the future.
       */
      if (selectedFile != null) {
        await networkPlanningAPIUtil.deleteInputFile({id: selectedFile.id});
      }
      setSelectedFile(file);
    },
    [selectedFile, setSelectedFile],
  );
  const handleConfirm = React.useCallback(async () => {
    if (selectedFile) {
      onChange(selectedFile);
      close();
    }
  }, [onChange, selectedFile, close]);
  const labelId = `${id}-label`;
  return (
    <>
      <Grid item container>
        <Grid item xs={12}>
          <Typography variant="body2" color="textSecondary" id={labelId}>
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
            <Typography className={classes.fileName} variant="body2">
              {selectedFile ? selectedFile.name : 'None Selected'}
              <input
                name={`${id}`}
                type="hidden"
                value={selectedFile?.id ?? ''}
                aria-labelledby={labelId}
              />
            </Typography>
          </Grid>
          <Grid item xs={4}>
            <Button
              fullWidth
              onClick={open}
              variant="outlined"
              size="small"
              fontSize="small"
              data-testid={`${id}-btn`}>
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
        data-testid="select-or-upload-anpfile"
        modalContent={
          <>
            <Grid
              container
              justify="space-between"
              direction="column"
              spacing={3}>
              <Grid item xs={12}>
                <SelectANPPartnerFile
                  id={`${id}-partnerfile`}
                  value={selectedFile}
                  onChange={handleFBIDFileSelected}
                  role={role}
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
  onComplete: (x: InputFile) => *,
  label: string,
  // comma separated list of file extensions to accept
  fileTypes: string,
}) {
  const classes = useStyles();
  const uploadFileTask = useTaskState();
  const [file, setFile] = React.useState<?File>(null);
  const [progress, setProgress] = React.useState(0);
  const handleStartUpload = React.useCallback(async () => {
    if (file) {
      try {
        uploadFileTask.setState(TASK_STATE.LOADING);
        const fileRef = await networkPlanningAPIUtil.createInputFile({
          name: file?.name,
          role: role,
          source: 'local',
        });
        await networkPlanningAPIUtil.uploadInputFileData({
          file: file,
          fileId: fileRef.id,
          onProgress: pct => {
            setProgress(pct);
          },
        });
        uploadFileTask.setState(TASK_STATE.SUCCESS);
        onComplete(fileRef);
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
            <Typography classes={{root: classes.fileName}}>
              {file.name}
            </Typography>
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
          onChange={handleFileSelected}
          type="file"
          inputProps={{accept: fileTypes, 'data-testid': 'fileInput'}}
          style={{display: 'none'}}
        />
      </Button>
    </Grid>
  );
}
