/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */
import * as React from 'react';
import * as networkPlanningAPIUtil from '@fbcnms/tg-nms/app/apiutils/NetworkPlanningAPIUtil';
import Button from '@material-ui/core/Button';
import IconButton from '@material-ui/core/IconButton';
import ListItemText from '@material-ui/core/ListItemText';
import MaterialModal from '@fbcnms/tg-nms/app/components/common/MaterialModal';
import Menu from '@material-ui/core/Menu';
import MenuItem from '@material-ui/core/MenuItem';
import MoreVertIcon from '@material-ui/icons/MoreVert';
import TextField from '@material-ui/core/TextField';
import useForm from '@fbcnms/tg-nms/app/hooks/useForm';
import {copyPlan} from '@fbcnms/tg-nms/app/features/planning/PlanningHelpers';
import {isNullOrEmptyString} from '@fbcnms/tg-nms/app/helpers/StringHelpers';
import {makeStyles} from '@material-ui/styles';
import {useModalState} from '@fbcnms/tg-nms/app/hooks/modalHooks';
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
  const deleteFolderModal = useModalState();
  const renameFolderModal = useModalState();
  const handleMenuClose = React.useCallback(() => {
    setMenuAnchorEl(null);
  }, []);
  const {formState, handleInputChange} = useForm<NetworkPlan>({
    initialState: {name: plan.name},
  });

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
      await networkPlanningAPIUtil.deletePlan({id: plan.id});
      deleteFolderModal.close();
      handleMenuClose();
      onComplete();
    })();
  }, [plan, deleteFolderModal, setSelectedPlanId, handleMenuClose, onComplete]);
  const handleRenameFolder = React.useCallback(async () => {
    await networkPlanningAPIUtil.updatePlan({
      id: plan.id,
      name: formState.name,
      dsmFileId: plan.dsmFile?.id,
      boundaryFileId: plan.boundaryFile?.id,
      sitesFileId: plan.sitesFile?.id,
    });
    renameFolderModal.close();
    handleMenuClose();
    onComplete();
  }, [plan, formState, handleMenuClose, onComplete, renameFolderModal]);
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
        <MenuItem onClick={renameFolderModal.open}>
          <ListItemText primary="Rename" />
        </MenuItem>
        <MenuItem onClick={handleCopyPlan}>
          <ListItemText primary="Duplicate" />
        </MenuItem>
        <MenuItem onClick={deleteFolderModal.open}>
          <ListItemText primary="Delete" />
        </MenuItem>
      </Menu>
      <MaterialModal
        data-testid="delete-modal"
        open={deleteFolderModal.isOpen}
        modalTitle="Confirm Deletion"
        modalContentText={'Are you sure you want to delete this plan?'}
        modalActions={
          <>
            <Button
              onClick={() => {
                deleteFolderModal.close();
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
      <MaterialModal
        data-testid="rename-modal"
        open={renameFolderModal.isOpen}
        modalTitle={'Rename Plan'}
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
            placeholder="Plan Name"
            fullWidth
          />
        }
        modalActions={
          <>
            <Button
              onClick={() => {
                renameFolderModal.close();
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
