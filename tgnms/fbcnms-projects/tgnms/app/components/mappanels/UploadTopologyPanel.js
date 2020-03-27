/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import Button from '@material-ui/core/Button';
import CustomExpansionPanel from '../common/CustomExpansionPanel';
import FormLabel from '@material-ui/core/FormLabel';
import Grid from '@material-ui/core/Grid';
import Input from '@material-ui/core/Input';
import MenuItem from '@material-ui/core/MenuItem';
import PublishIcon from '@material-ui/icons/Publish';
import React, {forwardRef, useCallback, useState} from 'react';
import TextField from '@material-ui/core/TextField';
import Typography from '@material-ui/core/Typography';
import UploadTopologyConfirmationModal from './UploadTopologyConfirmationModal';
import {
  ANP_NODE_TYPE,
  ANP_STATUS_TYPE,
  uploadFileTypes,
} from '../../constants/TemplateConstants';
import {convertType, objectValuesTypesafe} from '../../helpers/ObjectHelpers';
import {makeStyles} from '@material-ui/styles';
import {uploadTopologyBuilderRequest} from '../../helpers/templateHelpers';

import type {
  AnpLink,
  AnpNode,
  AnpSite,
} from '../../constants/TemplateConstants';
import type {AnpUploadTopologyType} from '../../helpers/templateHelpers';
import type {TopologyType} from '../../../shared/types/Topology';

const useStyles = makeStyles(theme => ({
  button: {
    margin: theme.spacing(1),
    float: 'right',
  },
  errorText: {
    color: 'red',
    fontWeight: 'bold',
  },
}));

type Props = {
  expanded: boolean,
  onClose: (message?: string) => any,
  onPanelChange: () => any,
  networkName: string,
};

export const UploadTopologyPanel = forwardRef<Props, *>((props, ref) => {
  const {networkName, onClose, onPanelChange, expanded} = props;
  const classes = useStyles();

  const [fileName, setFileName] = useState('');
  const [errorText, setErrorText] = useState('');
  const [uploadTopology, setUploadTopology] = useState(null);
  const [topologyFileType, setTopologyFileType] = useState(uploadFileTypes.ANP);
  const fileReader = new FileReader();

  const handleReadingFileError = useCallback(
    () => setErrorText('Unreadable input file.'),
    [setErrorText],
  );

  const parseInput = (fileInput: AnpUploadTopologyType | TopologyType) => {
    try {
      if (topologyFileType === uploadFileTypes.ANP) {
        const input = convertType<AnpUploadTopologyType>(fileInput);
        const sites = objectValuesTypesafe<AnpSite>(input.sites)
          .filter(
            site =>
              site.status_type === ANP_STATUS_TYPE.PROPOSED ||
              site.status_type === ANP_STATUS_TYPE.EXISTING,
          )
          .map(site => ({
            name: site.site_id,
            location: site.loc,
          }));
        const nodes = objectValuesTypesafe<AnpNode>(input.nodes)
          .filter(
            node =>
              node.status_type === ANP_STATUS_TYPE.PROPOSED ||
              node.status_type === ANP_STATUS_TYPE.EXISTING,
          )
          .map(node => ({
            name: node.node_id,
            node_type:
              node.node_type === ANP_NODE_TYPE.CN
                ? ANP_NODE_TYPE.CN
                : ANP_NODE_TYPE.DN,
            is_primary: node.is_primary,
            pop_node: node.node_type === ANP_NODE_TYPE.DN_POP_CONNECTION,
            site_name: node.site_id,
            ant_azimuth: node.ant_azimuth,
            ant_elevation: node.ant_elevation,
          }));
        const links = objectValuesTypesafe<AnpLink>(input.links)
          .filter(
            link =>
              link.status_type === ANP_STATUS_TYPE.PROPOSED ||
              link.status_type === ANP_STATUS_TYPE.EXISTING,
          )
          .map(link => ({
            a_node_name: link.tx_node_id,
            z_node_name: link.rx_node_id,
          }));
        setUploadTopology({sites, nodes, links});
      } else if (topologyFileType === uploadFileTypes.TG) {
        const input = convertType<TopologyType>(fileInput);
        const links = input.links.map(link => ({
          a_node_name: link.a_node_name,
          z_node_name: link.z_node_name,
        }));
        setUploadTopology({
          sites: input.sites,
          nodes: input.nodes,
          links,
        });
      }
    } catch (_error) {
      handleReadingFileError();
    }
  };

  fileReader.onloadend = () => {
    if (typeof fileReader.result === 'string') {
      parseInput(JSON.parse(fileReader.result));
    } else {
      handleReadingFileError();
    }
  };

  const onSubmit = () => {
    if (uploadTopology) {
      uploadTopologyBuilderRequest(uploadTopology, networkName, onClose);
    }
  };

  const handleFileTypeChange = useCallback(
    fileType => {
      setTopologyFileType(fileType);
    },
    [setTopologyFileType],
  );

  const handleChosenFile = target => {
    setFileName(target.files[0].name);
    fileReader.readAsText(target.files[0]);
  };

  function renderDetails() {
    return (
      <Grid container direction="column" spacing={2}>
        <Grid item />

        <Button
          variant="contained"
          color="primary"
          component="label"
          endIcon={<PublishIcon />}>
          Select File
          <Input
            data-testid="fileInput"
            onChange={e => handleChosenFile(e.target)}
            type="file"
            inputProps={{accept: '.json'}}
            style={{display: 'none'}}
          />
        </Button>
        <Grid container direction="column" item>
          <Grid container justify="center" item>
            <Typography variant="subtitle2" gutterBottom>
              {fileName}
            </Typography>
          </Grid>
          <Grid container justify="center" item>
            <Typography
              className={classes.errorText}
              variant="subtitle2"
              gutterBottom>
              {errorText}
            </Typography>
          </Grid>
        </Grid>
        <Grid item>
          <FormLabel component="legend">
            <span>Select File Format</span>
          </FormLabel>

          <TextField
            defaultValue={uploadFileTypes.ANP}
            select
            InputLabelProps={{shrink: true}}
            margin="dense"
            fullWidth
            onChange={ev => handleFileTypeChange(ev.target.value)}>
            {objectValuesTypesafe<string>(uploadFileTypes).map(name => (
              <MenuItem key={name} value={name}>
                {name}
              </MenuItem>
            ))}
          </TextField>
        </Grid>
        <Grid item>
          <UploadTopologyConfirmationModal
            disabled={uploadTopology ? false : true}
            onSubmit={onSubmit}
            uploadTopology={uploadTopology}
          />
          <Button
            className={classes.button}
            variant="outlined"
            size="small"
            onClick={() => onClose()}>
            Cancel
          </Button>
        </Grid>
      </Grid>
    );
  }
  return (
    <CustomExpansionPanel
      ref={ref}
      title="Upload Topology"
      details={renderDetails()}
      expanded={expanded}
      onChange={onPanelChange}
    />
  );
});
