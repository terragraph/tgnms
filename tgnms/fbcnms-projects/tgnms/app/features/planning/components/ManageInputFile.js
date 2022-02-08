/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */
import * as React from 'react';
import Autocomplete, {createFilterOptions} from '@material-ui/lab/Autocomplete';
import Button from '@material-ui/core/Button';
import FormControl from '@material-ui/core/FormControl';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import FormLabel from '@material-ui/core/FormLabel';
import Grid from '@material-ui/core/Grid';
import MaterialModal from '@fbcnms/tg-nms/app/components/common/MaterialModal';
import NoteAddIcon from '@material-ui/icons/NoteAdd';
import Radio from '@material-ui/core/Radio';
import RadioGroup from '@material-ui/core/RadioGroup';
import TextField from '@material-ui/core/TextField';
import Typography from '@material-ui/core/Typography';
import UploadInputFile from './UploadInputFile';
import useLiveRef from '@fbcnms/tg-nms/app/hooks/useLiveRef';
import {FILE_ROLE} from '@fbcnms/tg-nms/shared/dto/ANP';
import {useInputFiles} from '@fbcnms/tg-nms/app/features/planning/PlanningHooks';
import {useModalState} from '@fbcnms/tg-nms/app/hooks/modalHooks';
import type {InputFile} from '@fbcnms/tg-nms/shared/dto/NetworkPlan';

const filter = createFilterOptions();

export const ADD_NEW_FILE_OPTION = {name: '+ New file'};

type EditableInputFileProps = {|
  fileTypes: string,
  role: $Keys<typeof FILE_ROLE>,
  onCreateFile?: (newFileState: $Shape<InputFile>) => Promise<InputFile>,
  EditInputFileComponent?: ?React.ComponentType<{inputFile: ?InputFile}>,
|};

export default function ManageInputFile({
  initialValue,
  id,
  onChange,
  label,
  role,
  onCreateFile,
  fileTypes,
  EditInputFileComponent,
}: {
  id: string,
  initialValue: ?InputFile,
  onChange: (?InputFile) => void,
  label: string,
  ...EditableInputFileProps,
}) {
  const onChangeRef = useLiveRef(onChange);
  const [value, setValue] = React.useState(initialValue ?? ADD_NEW_FILE_OPTION);
  React.useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);
  const {files, task: loadFilesTask} = useInputFiles({
    role,
  });
  const autocompleteState = useModalState();
  const newFileState = useModalState();
  const handleNewFileCreated = React.useCallback(
    file => {
      newFileState.close();
      setValue(file);
      onChangeRef.current(file);
    },
    [newFileState, onChangeRef],
  );

  const handleAutocompleteChange = React.useCallback(
    (event, val) => {
      // user selects "New file"
      if (val === ADD_NEW_FILE_OPTION) {
        newFileState.open();
        setValue(null);
      }
      // user selects any other file
      else if (typeof val === 'object') {
        setValue(val);
        onChangeRef.current(val);
      }
      // user clears out their choice
      else {
        setValue(initialValue);
        onChangeRef.current(val);
      }
    },
    [newFileState, initialValue, setValue, onChangeRef],
  );

  return (
    <>
      <Autocomplete
        id={id}
        size="small"
        value={value}
        open={autocompleteState.isOpen}
        onOpen={autocompleteState.open}
        onClose={autocompleteState.close}
        loading={loadFilesTask.isLoading}
        options={files || []}
        getOptionSelected={(option, val) => option.id === val?.id}
        getOptionLabel={option => option.name}
        onChange={handleAutocompleteChange}
        filterOptions={(options, params) => {
          const filtered = filter(options, params);
          filtered.unshift(ADD_NEW_FILE_OPTION);
          return filtered;
        }}
        renderOption={(option, _state) => (
          <Typography
            color={option === ADD_NEW_FILE_OPTION ? 'primary' : 'textPrimary'}>
            {option.name}
          </Typography>
        )}
        renderInput={params => (
          <TextField
            {...params}
            variant="outlined"
            label={label}
            InputProps={{
              ...(params.InputProps ?? {}),
              startAdornment:
                typeof EditInputFileComponent === 'function' ? (
                  <EditInputFileComponent
                    inputFile={value !== ADD_NEW_FILE_OPTION ? value : null}
                  />
                ) : null,
            }}
          />
        )}
      />
      <NewFileModal
        isOpen={newFileState.isOpen}
        onClose={() => {
          setValue(initialValue);
          newFileState.close();
        }}
        onChange={handleNewFileCreated}
        fileTypes={fileTypes}
        role={role}
        onCreateFile={onCreateFile}
      />
    </>
  );
}

const MODES = {
  INITIAL: 'INITIAL',
  CREATE_FILE: 'CREATE_FILE',
  UPLOAD_FILE: 'UPLOAD_FILE',
};
/**
 * Allow user to create/upload a file
 */
function NewFileModal({
  isOpen,
  onClose,
  onChange,
  role,
  onCreateFile,
  fileTypes,
}: {
  isOpen: boolean,
  onClose: () => void,
  onChange: InputFile => void,
  ...EditableInputFileProps,
}) {
  const canEnterCreateMode = typeof onCreateFile === 'function';
  const [mode, setMode] = React.useState<$Keys<typeof MODES>>(
    MODES.UPLOAD_FILE,
  );
  const [newFileState, setNewFileState] = React.useState<$Shape<InputFile>>({
    name: '',
    role,
  });
  const handleModeChange = e => {
    setMode(e.target.value);
  };
  const handleCreateFileClick = async () => {
    if (onCreateFile) {
      const createdFile = await onCreateFile(newFileState);
      setNewFileState(createdFile);
      onChange(createdFile);
    }
  };

  const handleUploadComplete = React.useCallback(file => onChange(file), [
    onChange,
  ]);

  return (
    <MaterialModal
      open={isOpen}
      onClose={onClose}
      modalTitle="Manage input file"
      data-testid="select-or-upload-anpfile"
      modalContent={
        <Grid container direction="column" spacing={2}>
          {canEnterCreateMode && (
            <Grid item xs={12}>
              <FormControl component="fieldset">
                <FormLabel component="legend">
                  Select how you want to provide the file
                </FormLabel>
                <RadioGroup
                  aria-label="quiz"
                  name="quiz"
                  value={mode}
                  onChange={handleModeChange}>
                  <FormControlLabel
                    value={MODES.CREATE_FILE}
                    control={<Radio />}
                    label="Create new file"
                  />
                  <FormControlLabel
                    value={MODES.UPLOAD_FILE}
                    control={<Radio />}
                    label="Upload existing file"
                  />
                </RadioGroup>
              </FormControl>
            </Grid>
          )}

          <Grid item xs={12} container direction="column" spacing={2}>
            {mode === MODES.CREATE_FILE && (
              <Grid container item xs={12} direction="column" spacing={1}>
                <Grid item xs={12}>
                  <TextField
                    value={newFileState?.name || ''}
                    fullWidth
                    label="File name"
                    helperText={
                      'Hint: Give this file a descriptive name to reuse it in future plans'
                    }
                    onChange={e => setNewFileState({name: e.target.value})}
                  />
                </Grid>
                <Grid item xs={12}>
                  <Button
                    fullWidth
                    variant="contained"
                    color="primary"
                    endIcon={<NoteAddIcon />}
                    onClick={handleCreateFileClick}>
                    Create file
                  </Button>
                </Grid>
              </Grid>
            )}
            {mode === MODES.UPLOAD_FILE && (
              <UploadInputFile
                label="Select file to upload"
                fileTypes={fileTypes}
                role={role}
                onComplete={handleUploadComplete}
              />
            )}
          </Grid>
        </Grid>
      }
      modalActions={
        <>
          <Button onClick={onClose} variant="outlined">
            Cancel
          </Button>
        </>
      }
    />
  );
}
