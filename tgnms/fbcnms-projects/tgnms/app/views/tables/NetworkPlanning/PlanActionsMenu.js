/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */
import * as React from 'react';
import Button from '@material-ui/core/Button';
import IconButton from '@material-ui/core/IconButton';
import ListItemText from '@material-ui/core/ListItemText';
import MaterialModal from '@fbcnms/tg-nms/app/components/common/MaterialModal';
import Menu from '@material-ui/core/Menu';
import MenuItem from '@material-ui/core/MenuItem';
import MoreVertIcon from '@material-ui/icons/MoreVert';
import {
  copyPlan,
  deletePlan,
} from '@fbcnms/tg-nms/app/features/planning/PlanningHelpers';
import {makeStyles} from '@material-ui/styles';
import {useNetworkPlanningContext} from '@fbcnms/tg-nms/app/contexts/NetworkPlanningContext';
import {usePlanningFolderId} from '@fbcnms/tg-nms/app/features/planning/PlanningHooks';

import type {NetworkPlan} from '@fbcnms/tg-nms/shared/dto/NetworkPlan';

const useStyles = makeStyles(theme => ({
  deleteButton: {
    backgroundColor: theme.palette.error.main,
    color: 'white',
    '&:hover': {
      backgroundColor: theme.palette.error.dark,
    },
  },
}));

export default function PlanActionsMenu({
  plan,
  onComplete,
}: {
  plan: NetworkPlan,
  onComplete: () => any,
}) {
  const classes = useStyles();
  const folderId = usePlanningFolderId();
  const {setSelectedPlanId} = useNetworkPlanningContext();
  const [menuAnchorEl, setMenuAnchorEl] = React.useState(null);
  const [deleteModalOpen, setDeleteModalOpen] = React.useState(false);
  const handleMenuClose = React.useCallback(() => {
    setMenuAnchorEl(null);
  }, []);

  const handleCopyPlan = React.useCallback(() => {
    (async () => {
      setSelectedPlanId('');
      const newPlan = await copyPlan({plan, folderId});
      if (newPlan) setSelectedPlanId(newPlan.id);
      handleMenuClose();
      onComplete();
    })();
  }, [plan, folderId, setSelectedPlanId, handleMenuClose, onComplete]);

  const handleDeletePlan = React.useCallback(() => {
    (async () => {
      // Setting selectedPlanId to null so that we close the
      // network planning panel, if it was open.
      setSelectedPlanId(null);
      await deletePlan({plan});
      setDeleteModalOpen(false);
      handleMenuClose();
      onComplete();
    })();
  }, [
    plan,
    setDeleteModalOpen,
    setSelectedPlanId,
    handleMenuClose,
    onComplete,
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
        <MenuItem onClick={handleCopyPlan}>
          <ListItemText primary="Duplicate" />
        </MenuItem>
        <MenuItem onClick={() => setDeleteModalOpen(true)}>
          <ListItemText primary="Delete Plan" />
        </MenuItem>
      </Menu>
      <MaterialModal
        open={deleteModalOpen}
        modalTitle="Confirm Deletion"
        modalContentText={'Are you sure you want to delete this plan?'}
        modalActions={
          <>
            <Button
              onClick={() => {
                setDeleteModalOpen(false);
                handleMenuClose();
              }}
              variant="outlined">
              Cancel
            </Button>
            <Button
              className={classes.deleteButton}
              onClick={handleDeletePlan}
              variant="contained">
              Delete
            </Button>
          </>
        }
      />
    </div>
  );
}
