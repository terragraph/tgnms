/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */
import * as React from 'react';
import * as networkPlanningAPIUtil from '@fbcnms/tg-nms/app/apiutils/NetworkPlanningAPIUtil';
import Button from '@material-ui/core/Button';
import CircularProgress from '@material-ui/core/CircularProgress';
import IconButton from '@material-ui/core/IconButton';
import ListItemText from '@material-ui/core/ListItemText';
import MaterialModal from '@fbcnms/tg-nms/app/components/common/MaterialModal';
import Menu from '@material-ui/core/Menu';
import MenuItem from '@material-ui/core/MenuItem';
import MoreVertIcon from '@material-ui/icons/MoreVert';
import TextField from '@material-ui/core/TextField';
import Typography from '@material-ui/core/Typography';
import useForm from '@fbcnms/tg-nms/app/hooks/useForm';
import useTaskState from '@fbcnms/tg-nms/app/hooks/useTaskState';
import {isNullOrEmptyString} from '@fbcnms/tg-nms/app/helpers/StringHelpers';
import {makeStyles} from '@material-ui/styles';
import {useModalState} from '@fbcnms/tg-nms/app/hooks/modalHooks';

import type {PlanFolder} from '@fbcnms/tg-nms/shared/dto/NetworkPlan';

const useStyles = makeStyles(theme => ({
  deleteButton: {
    backgroundColor: theme.palette.error.main,
    color: 'white',
    '&:hover': {
      backgroundColor: theme.palette.error.dark,
    },
  },
  error: {color: theme.palette.error.main},
}));

export default function FolderActionsMenu({
  folder,
  onComplete,
}: {
  folder: PlanFolder,
  onComplete: () => any,
}) {
  const classes = useStyles();
  const deleteFolderTask = useTaskState();
  const [menuAnchorEl, setMenuAnchorEl] = React.useState(null);
  const {
    isOpen: deleteModalIsOpen,
    open: openDeleteModal,
    close: closeDeleteModal,
  } = useModalState();
  const {
    isOpen: renameModalIsOpen,
    open: openRenameModal,
    close: closeRenameModal,
  } = useModalState();
  const handleMenuClose = React.useCallback(() => {
    setMenuAnchorEl(null);
  }, []);
  const {formState, handleInputChange} = useForm<PlanFolder>({
    initialState: {id: folder.id, name: folder.name},
  });

  const handleDeleteFolder = React.useCallback(() => {
    (async () => {
      try {
        deleteFolderTask.loading();
        await networkPlanningAPIUtil.deleteFolder({
          folderId: folder.id.toString(),
        });
        deleteFolderTask.success();
        closeDeleteModal();
        handleMenuClose();
        onComplete();
      } catch (err) {
        deleteFolderTask.error();
        deleteFolderTask.setMessage(
          'Something went wrong while deleting, please try again later.',
        );
      }
    })();
  }, [folder, closeDeleteModal, handleMenuClose, onComplete, deleteFolderTask]);
  const handleRenameFolder = React.useCallback(async () => {
    await networkPlanningAPIUtil.updateFolder({
      id: formState.id,
      name: formState.name,
    });
    closeRenameModal();
    handleMenuClose();
    onComplete();
  }, [formState, handleMenuClose, onComplete, closeRenameModal]);

  return (
    <div
      onClick={e => {
        // Prevents clicks from propagating to parent components.
        e.stopPropagation();
      }}>
      <IconButton
        onClick={ev => {
          setMenuAnchorEl(ev.currentTarget);
        }}>
        <MoreVertIcon data-testid="more-vert-button" />
      </IconButton>
      <Menu
        anchorEl={menuAnchorEl}
        open={Boolean(menuAnchorEl)}
        onClose={handleMenuClose}
        getContentAnchorEl={null}
        anchorOrigin={{vertical: 'bottom', horizontal: 'right'}}
        transformOrigin={{vertical: 'top', horizontal: 'right'}}>
        <MenuItem onClick={openRenameModal}>
          <ListItemText primary="Rename" />
        </MenuItem>
        <MenuItem onClick={openDeleteModal}>
          <ListItemText primary="Delete Project" />
        </MenuItem>
      </Menu>
      <MaterialModal
        open={deleteModalIsOpen}
        data-testid="delete-modal"
        modalTitle="Confirm Deletion"
        modalContentText={
          'Are you sure you want to delete this project and ALL its plans?'
        }
        modalActions={
          <>
            <Typography className={classes.error} variant="caption">
              {deleteFolderTask.message}
            </Typography>
            <Button
              onClick={() => {
                closeDeleteModal();
                handleMenuClose();
              }}
              variant="outlined">
              Cancel
            </Button>
            <Button
              disabled={deleteFolderTask.isLoading}
              className={classes.deleteButton}
              onClick={handleDeleteFolder}
              variant="contained">
              Delete
              {deleteFolderTask.isLoading && <CircularProgress size={10} />}
            </Button>
          </>
        }
      />
      <MaterialModal
        open={renameModalIsOpen}
        data-testid="rename-modal"
        modalTitle={'Rename Project'}
        modalContent={
          <TextField
            id="name"
            error={isNullOrEmptyString(formState.name)}
            helperText={
              isNullOrEmptyString(formState.name)
                ? 'You must provide a name.'
                : ''
            }
            onChange={handleInputChange(x => ({name: x}))}
            value={formState.name}
            placeholder="Project Name"
            fullWidth
          />
        }
        modalActions={
          <>
            <Button
              onClick={() => {
                closeRenameModal();
                handleMenuClose();
              }}
              variant="outlined">
              Cancel
            </Button>
            <Button
              disabled={isNullOrEmptyString(formState.name)}
              onClick={handleRenameFolder}
              color="primary"
              variant="contained">
              Rename
            </Button>
          </>
        }
      />
    </div>
  );
}
