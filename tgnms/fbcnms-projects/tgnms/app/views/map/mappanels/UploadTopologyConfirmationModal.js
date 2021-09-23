/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import AddLocationIcon from '@material-ui/icons/AddLocation';
import Button from '@material-ui/core/Button';
import CompareArrowsIcon from '@material-ui/icons/CompareArrows';
import Grid from '@material-ui/core/Grid';
import MaterialModal from '@fbcnms/tg-nms/app/components/common/MaterialModal';
import NetworkContext from '@fbcnms/tg-nms/app/contexts/NetworkContext';
import React, {useContext, useState} from 'react';
import RouterIcon from '@material-ui/icons/Router';
import Typography from '@material-ui/core/Typography';
import {makeStyles} from '@material-ui/styles';

import type {UploadTopologyType} from '@fbcnms/tg-nms/app/constants/TemplateConstants';

const useModalStyles = makeStyles(() => ({
  root: {
    width: '40%',
    minWidth: 400,
  },
}));

type Props = {
  onSubmit: () => void,
  disabled: boolean,
  getUploadTopology: ?() => ?UploadTopologyType,
  customText?: string,
  fullWidth?: boolean,
};

export default function UploadTopologyConfirmationModal(props: Props) {
  const {onSubmit, disabled, getUploadTopology, customText, fullWidth} = props;
  const {networkName} = useContext(NetworkContext);

  const [isOpen, setIsOpen] = useState(false);
  const classes = useModalStyles();
  const [topology, setTopology] = React.useState<?UploadTopologyType>({});

  // We only call uploadTopology() when the modal opens, for efficiency.
  React.useEffect(() => {
    if (isOpen && getUploadTopology) {
      setTopology(getUploadTopology());
    }
  }, [getUploadTopology, isOpen]);

  const siteCount = topology?.sites?.length || 0;
  const nodeCount = topology?.nodes?.length || 0;
  const linkCount = topology?.links?.length || 0;
  const totalCount = siteCount + nodeCount + linkCount;

  return (
    <>
      <Button
        fullWidth={fullWidth}
        variant="contained"
        color="primary"
        size="small"
        disabled={disabled}
        onClick={() => setIsOpen(true)}>
        {customText ?? 'Upload'}
      </Button>
      <MaterialModal
        className={classes.root}
        open={isOpen}
        onClose={() => setIsOpen(false)}
        modalContent={
          <Grid container direction="column" spacing={2}>
            <Grid item container spacing={1}>
              <Grid item>
                <AddLocationIcon />
              </Grid>
              <Grid item>
                <Typography>{siteCount} new sites</Typography>
              </Grid>
            </Grid>
            <Grid item container spacing={1}>
              <Grid item>
                <RouterIcon />
              </Grid>
              <Grid item>
                <Typography>{nodeCount} new nodes</Typography>
              </Grid>
            </Grid>
            <Grid item container spacing={1}>
              <Grid item>
                <CompareArrowsIcon />
              </Grid>
              <Grid item>
                <Typography>{linkCount} new links</Typography>
              </Grid>
            </Grid>
          </Grid>
        }
        modalTitle={`The following items will be added to ${networkName}`}
        modalActions={
          <>
            <Button onClick={() => setIsOpen(false)} variant="outlined">
              Cancel
            </Button>
            <Button
              data-testid="confirm-add-topology-elements"
              disabled={totalCount == 0}
              color="primary"
              onClick={() => {
                setIsOpen(false);
                onSubmit();
              }}
              variant="contained">
              Add {totalCount} topology elements
            </Button>
          </>
        }
      />
    </>
  );
}
