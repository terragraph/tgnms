/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */
import * as React from 'react';
import * as networkPlanningAPIUtil from '@fbcnms/tg-nms/app/apiutils/NetworkPlanningAPIUtil';
import Button from '@material-ui/core/Button';
import Grid from '@material-ui/core/Grid';
import Input from '@material-ui/core/Input';
import LinearProgress from '@material-ui/core/LinearProgress';
import PublishIcon from '@material-ui/icons/Publish';
import Typography from '@material-ui/core/Typography';
import useTaskState, {TASK_STATE} from '@fbcnms/tg-nms/app/hooks/useTaskState';
import {bytesToMB} from '@fbcnms/tg-nms/app/helpers/MathHelpers';
import {makeStyles} from '@material-ui/styles';
import type {FileRoles} from '@fbcnms/tg-nms/shared/dto/ANP';
import type {InputFile} from '@fbcnms/tg-nms/shared/dto/NetworkPlan';

const useStyles = makeStyles(_theme => ({
  fileName: {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
}));

export default function UploadInputFile({
  label,
  fileTypes,
  role,
  onComplete,
}: {
  role: FileRoles,
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
    <Grid item xs={12}>
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
