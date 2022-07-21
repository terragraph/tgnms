/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 * @flow
 */

import Chip from '@material-ui/core/Chip';
import CircularProgress from '@material-ui/core/CircularProgress';
import CustomAccordion from '@fbcnms/tg-nms/app/components/common/CustomAccordion';
import MenuItem from '@material-ui/core/MenuItem';
import React from 'react';
import Slide from '@material-ui/core/Slide';
import TextField from '@material-ui/core/TextField';
import Typography from '@material-ui/core/Typography';
import useConfirmationModal from '@fbcnms/tg-nms/app/hooks/useConfirmationModal';
import useForm from '@fbcnms/tg-nms/app/hooks/useForm';
import {
  PANELS,
  PANEL_STATE,
} from '@fbcnms/tg-nms/app/features/map/usePanelControl';
import {SlideProps} from '@fbcnms/tg-nms/app/constants/MapPanelConstants';
import {makeStyles} from '@material-ui/styles';
import {useNetworkContext} from '@fbcnms/tg-nms/app/contexts/NetworkContext';

import type {PanelStateControl} from '@fbcnms/tg-nms/app/features/map/usePanelControl';

const useStyles = makeStyles(theme => ({
  sectionSpacer: {
    height: theme.spacing(1),
  },
  centered: {
    textAlign: 'center',
  },
  chip: {
    marginBottom: theme.spacing(0.5),
    marginRight: theme.spacing(0.5),

    // Override fixed height of 32px...
    height: 'auto',
    minHeight: theme.spacing(4),
  },
  chipLabel: {
    whiteSpace: 'normal',
  },
}));

export default function IgnitionStatePanel({
  panelControl,
}: {
  panelControl: PanelStateControl,
}) {
  const {getIsHidden, getIsOpen, toggleOpen, setPanelState} = panelControl;
  const classes = useStyles();
  const {refreshNetworkConfig, networkConfig} = useNetworkContext();
  const {ignition_state} = networkConfig;
  const {igParams} = ignition_state;
  const {formState, updateFormState} = useForm({
    initialState: {
      networkIgnition: igParams.enable,
      linkName: null,
      confirmationContent: '',
      confirmationTitle: '',
    },
  });

  const {ConfirmationModal, openConfirmation} = useConfirmationModal({
    onSuccess: refreshNetworkConfig,
  });

  // Render ignition stateigParams.enable;
  const linkAutoIgnite = igParams.linkAutoIgnite ?? {};
  const linkIgnitionOff = Object.keys(linkAutoIgnite).filter(
    linkName => linkAutoIgnite[linkName] === false,
  );

  const handleDelete = React.useCallback(
    linkName => {
      updateFormState({
        linkName,
        confirmationContent: (
          <div>
            This will turn on automatic ignition of <strong>{linkName}</strong>.
          </div>
        ),
        confirmationTitle: 'Turn On Link Ignition',
      });
      openConfirmation<{[string]: {[string]: boolean}}>({
        endpoint: 'setIgnitionState',
        data: {linkAutoIgnite: {[formState.linkName]: true}},
        successMessage: `Successfully enabled automatic ignition for ${linkName}.`,
      });
    },
    [openConfirmation, updateFormState, formState],
  );

  const handleNetworkIgnitionChange = React.useCallback(
    e => {
      const enable = e.target.value;
      updateFormState({
        networkIgnition: enable,
        confirmationContent: (
          <div>
            This will{' '}
            <span style={{color: enable ? 'green' : 'red'}}>
              {enable ? 'enable' : 'disable'}
            </span>{' '}
            automatic ignition across the network.
          </div>
        ),
        confirmationTitle: 'Change Network Ignition',
        successMessage: `Successfully ${
          enable ? 'enabled' : 'disabled'
        } automatic ignition for network.`,
      });
      openConfirmation<{enable: string}>({
        endpoint: 'setIgnitionState',
        data: {enable},
      });
    },
    [openConfirmation, updateFormState],
  );

  if (!ignition_state || !ignition_state.igParams) {
    return (
      <div style={{width: '100%'}}>
        {
          <div className={classes.centered}>
            <CircularProgress />
          </div>
        }
      </div>
    );
  }

  return (
    <Slide
      {...SlideProps}
      unmountOnExit
      in={!getIsHidden(PANELS.IGNITION_STATE)}>
      <CustomAccordion
        title="Ignition State"
        details={
          <div style={{width: '100%'}}>
            <>
              <Typography variant="subtitle2">Network Ignition</Typography>
              <TextField
                select
                margin="dense"
                fullWidth
                onChange={handleNetworkIgnitionChange}
                value={formState.networkIgnition}>
                <MenuItem key="enabled" value={true}>
                  Enabled
                </MenuItem>
                <MenuItem key="disabled" value={false}>
                  Disabled
                </MenuItem>
              </TextField>
              {linkIgnitionOff.length > 0 ? (
                <>
                  <div className={classes.sectionSpacer} />
                  <Typography variant="subtitle2" gutterBottom>
                    Links with Ignition Disabled
                  </Typography>
                  <div>
                    {linkIgnitionOff.map(linkName => (
                      <Chip
                        data-testid={`${linkName}-chip`}
                        key={linkName}
                        label={linkName}
                        classes={{
                          root: classes.chip,
                          label: classes.chipLabel,
                        }}
                        variant="outlined"
                        onDelete={() => handleDelete(linkName)}
                      />
                    ))}
                  </div>
                </>
              ) : null}
            </>
            <ConfirmationModal
              title={formState.confirmationTitle}
              content={formState.confirmationContent}
            />
          </div>
        }
        expanded={getIsOpen(PANELS.IGNITION_STATE)}
        onChange={() => toggleOpen(PANELS.IGNITION_STATE)}
        onClose={() => setPanelState(PANELS.IGNITION_STATE, PANEL_STATE.HIDDEN)}
      />
    </Slide>
  );
}
