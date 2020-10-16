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
import MaterialModal from '../../../components/common/MaterialModal';
import NetworkContext from '../../../contexts/NetworkContext';
import React, {useContext, useState} from 'react';
import RouterIcon from '@material-ui/icons/Router';
import Typography from '@material-ui/core/Typography';
import {makeStyles} from '@material-ui/styles';
import type {UploadTopologyType} from '../../../constants/TemplateConstants';

const useModalStyles = makeStyles(theme => ({
  root: {
    width: '40%',
    minWidth: 400,
  },
  button: {
    margin: theme.spacing(1),
    float: 'right',
  },
}));

type Props = {
  onSubmit: () => void,
  disabled: boolean,
  uploadTopology: ?UploadTopologyType,
  customText?: string,
};

export default function UploadTopologyConfirmationModal(props: Props) {
  const {onSubmit, disabled, uploadTopology, customText} = props;
  const {networkName} = useContext(NetworkContext);

  const [isOpen, setIsOpen] = useState(false);
  const classes = useModalStyles();

  const siteCount = uploadTopology?.sites.length || 0;
  const nodeCount = uploadTopology?.nodes.length || 0;
  const linkCount = uploadTopology?.links.length || 0;
  const totalCount = siteCount + nodeCount + linkCount;

  return (
    <>
      <Button
        className={classes.button}
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
            <Button
              className={classes.button}
              onClick={() => setIsOpen(false)}
              variant="outlined">
              Cancel
            </Button>
            <Button
              className={classes.button}
              color="primary"
              onClick={onSubmit}
              variant="contained">
              Add {totalCount} topology elements
            </Button>
          </>
        }
      />
    </>
  );
}
