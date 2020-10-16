/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import Button from '@material-ui/core/Button';
import CustomAccordion from '../../common/CustomAccordion';
import FormLabel from '@material-ui/core/FormLabel';
import Grid from '@material-ui/core/Grid';
import Input from '@material-ui/core/Input';
import MenuItem from '@material-ui/core/MenuItem';
import PublishIcon from '@material-ui/icons/Publish';
import React, {forwardRef, useCallback, useState} from 'react';
import TextField from '@material-ui/core/TextField';
import Typography from '@material-ui/core/Typography';
import UploadTopologyConfirmationModal from './UploadTopologyConfirmationModal';
import {DOMParser} from 'xmldom';
import {
  convertType,
  objectValuesTypesafe,
} from '../../../helpers/ObjectHelpers';
import {kml as kmlToGeojson} from '@mapbox/togeojson';
import {makeStyles} from '@material-ui/styles';
import {
  parseAnpJson,
  parseAnpKml,
  uploadTopologyBuilderRequest,
} from '../../../helpers/TopologyTemplateHelpers';
import {
  sectorCountOptions,
  uploadFileTypes,
} from '../../../constants/TemplateConstants';

import type {
  AnpUploadKmlType,
  AnpUploadTopologyType,
} from '../../../constants/TemplateConstants';
import type {TopologyType} from '../../../../shared/types/Topology';

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

  const [loading, setLoading] = useState(false);
  const [fileName, setFileName] = useState('');
  const [errorText, setErrorText] = useState('');
  const [uploadTopology, setUploadTopology] = useState(null);
  const [topologyFileType, setTopologyFileType] = useState(uploadFileTypes.KML);
  const [kmlNodeNumber, setKmlNodeNumber] = useState('4');
  const fileReader = new FileReader();

  const handleReadingFileError = useCallback(
    () => setErrorText('Unreadable input file.'),
    [setErrorText],
  );

  const parseInput = (
    fileInput: AnpUploadTopologyType | TopologyType | Array<AnpUploadKmlType>,
  ) => {
    setLoading(false);
    try {
      if (topologyFileType === uploadFileTypes.ANP) {
        const {sites, nodes, links} = parseAnpJson(
          convertType<AnpUploadTopologyType>(fileInput),
        );
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
      } else if (topologyFileType === uploadFileTypes.KML) {
        const input = convertType<Array<AnpUploadKmlType>>(fileInput);
        const {sites, nodes, links} = parseAnpKml(input, Number(kmlNodeNumber));
        setUploadTopology({sites, nodes, links});
      }
    } catch (_error) {
      handleReadingFileError();
    }
  };

  fileReader.onloadend = () => {
    if (topologyFileType === uploadFileTypes.KML) {
      const kml = new DOMParser().parseFromString(
        fileReader.result,
        'text/xml',
      );
      // remove the styles in xml because kml parser fails with style tags
      const Styles = kml.getElementsByTagName('Style');
      [].forEach.call(Styles, style => {
        style.parentNode.removeChild(style);
      });
      const StyleMaps = kml.getElementsByTagName('StyleMap');
      [].forEach.call(StyleMaps, style => {
        style.parentNode.removeChild(style);
      });
      const features = kmlToGeojson(kml).features;
      parseInput(features);
    } else if (typeof fileReader.result === 'string') {
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

  const handleNodeNumberChange = useCallback(ev => {
    setKmlNodeNumber(ev.target.value);
  }, []);

  const handleChosenFile = target => {
    const file = target.files[0];
    setFileName(file.name);
    setLoading(true);
    setTimeout(() => fileReader.readAsText(file), 500);
  };

  return (
    <CustomAccordion
      ref={ref}
      title="Upload Topology"
      details={
        <Grid container direction="column" spacing={2}>
          <Grid item />
          <Button
            variant="contained"
            disabled={loading}
            color="primary"
            component="label"
            endIcon={<PublishIcon />}>
            Select File
            <Input
              data-testid="fileInput"
              onChange={e => handleChosenFile(e.target)}
              type="file"
              inputProps={{accept: '.json, .kml'}}
              style={{display: 'none'}}
            />
          </Button>
          <Grid container direction="column" item>
            <Grid container justify="center" item>
              <Typography variant="subtitle2" gutterBottom>
                {loading ? 'Loading...' : fileName}
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
              defaultValue={uploadFileTypes.KML}
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
          {topologyFileType === uploadFileTypes.KML && (
            <Grid item>
              <FormLabel component="legend">
                <span>Sectors Per Site </span>
              </FormLabel>
              <TextField
                defaultValue={'4'}
                select
                InputLabelProps={{shrink: true}}
                margin="dense"
                fullWidth
                onChange={handleNodeNumberChange}>
                {sectorCountOptions.map(name => (
                  <MenuItem key={name} value={name}>
                    {name}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
          )}
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
      }
      expanded={expanded}
      onChange={onPanelChange}
    />
  );
});
