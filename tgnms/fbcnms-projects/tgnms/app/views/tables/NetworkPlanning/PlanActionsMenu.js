/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */
import * as React from 'react';
import IconButton from '@material-ui/core/IconButton';
import ListItemText from '@material-ui/core/ListItemText';
import Menu from '@material-ui/core/Menu';
import MenuItem from '@material-ui/core/MenuItem';
import MoreVertIcon from '@material-ui/icons/MoreVert';
import {copyPlan} from '@fbcnms/tg-nms/app/features/planning/PlanningHelpers';
import {useNetworkPlanningContext} from '@fbcnms/tg-nms/app/contexts/NetworkPlanningContext';
import {usePlanningFolderId} from '@fbcnms/tg-nms/app/features/planning/PlanningHooks';

import type {NetworkPlan} from '@fbcnms/tg-nms/shared/dto/NetworkPlan';

export default function PlanActionsMenu({
  plan,
  onComplete,
}: {
  plan: NetworkPlan,
  onComplete: () => any,
}) {
  const folderId = usePlanningFolderId();
  const {setSelectedPlanId} = useNetworkPlanningContext();
  const [menuAnchorEl, setMenuAnchorEl] = React.useState(null);
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
      </Menu>
    </div>
  );
}
