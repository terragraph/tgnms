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
import Typography from '@material-ui/core/Typography';
import useTaskState from '@fbcnms/tg-nms/app/hooks/useTaskState';
import {makeStyles} from '@material-ui/styles';

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
  const [deleteModalOpen, setDeleteModalOpen] = React.useState(false);
  const handleMenuClose = React.useCallback(() => {
    setMenuAnchorEl(null);
  }, []);

  const handleDeleteFolder = React.useCallback(() => {
    (async () => {
      try {
        deleteFolderTask.loading();
        await networkPlanningAPIUtil.deleteFolder({
          folderId: folder.id.toString(),
        });
        deleteFolderTask.success();
        setDeleteModalOpen(false);
        handleMenuClose();
        onComplete();
      } catch (err) {
        deleteFolderTask.error();
        deleteFolderTask.setMessage(
          'Something went wrong while deleting, please try again later.',
        );
      }
    })();
  }, [
    folder,
    setDeleteModalOpen,
    handleMenuClose,
    onComplete,
    deleteFolderTask,
  ]);

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
        <MenuItem onClick={() => setDeleteModalOpen(true)}>
          <ListItemText primary="Delete Project" />
        </MenuItem>
      </Menu>
      <MaterialModal
        open={deleteModalOpen}
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
                setDeleteModalOpen(false);
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
    </div>
  );
}
