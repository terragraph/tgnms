/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import Button from '@material-ui/core/Button';
import CustomAccordion from '@fbcnms/tg-nms/app/components/common/CustomAccordion';
import FormLabel from '@material-ui/core/FormLabel';
import Grid from '@material-ui/core/Grid';
import Input from '@material-ui/core/Input';
import MenuItem from '@material-ui/core/MenuItem';
import PublishIcon from '@material-ui/icons/Publish';
import React, {useCallback, useState} from 'react';
import Slide from '@material-ui/core/Slide';
import TextField from '@material-ui/core/TextField';
import Typography from '@material-ui/core/Typography';
import UploadTopologyConfirmationModal from './UploadTopologyConfirmationModal';
import {DOMParser} from 'xmldom';
import {
  PANELS,
  PANEL_STATE,
} from '@fbcnms/tg-nms/app/features/map/usePanelControl';
import {SlideProps} from '@fbcnms/tg-nms/app/constants/MapPanelConstants';
import {
  convertType,
  objectValuesTypesafe,
} from '@fbcnms/tg-nms/app/helpers/ObjectHelpers';
import {
  handleTopologyChangeSnackbar,
  parseANPJson,
  parseANPKml,
  uploadTopologyBuilderRequest,
} from '@fbcnms/tg-nms/app/helpers/TopologyTemplateHelpers';
import {kml as kmlToGeojson} from '@mapbox/togeojson';
import {makeStyles} from '@material-ui/styles';
import {
  sectorCountOptions,
  uploadFileTypes,
} from '@fbcnms/tg-nms/app/constants/TemplateConstants';
import {useNetworkContext} from '@fbcnms/tg-nms/app/contexts/NetworkContext';
import {useSnackbars} from '@fbcnms/tg-nms/app/hooks/useSnackbar';
import {useTopologyBuilderContext} from '@fbcnms/tg-nms/app/contexts/TopologyBuilderContext';

import type {
  ANPUploadKmlType,
  ANPUploadTopologyType,
} from '@fbcnms/tg-nms/app/constants/TemplateConstants';
import type {PanelStateControl} from '@fbcnms/tg-nms/app/features/map/usePanelControl';
import type {TopologyType} from '@fbcnms/tg-nms/shared/types/Topology';

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

export default function UploadTopologyPanel({
  panelControl,
}: {
  panelControl: PanelStateControl,
}) {
  const classes = useStyles();
  const {networkName} = useNetworkContext();
  const {setPanelState} = panelControl;
  const [loading, setLoading] = useState(false);
  const [fileName, setFileName] = useState('');
  const [errorText, setErrorText] = useState('');
  const [uploadTopology, setUploadTopology] = useState(null);
  const topologyFileTypeDefault = uploadFileTypes.KML;
  const [topologyFileType, setTopologyFileType] = useState(
    topologyFileTypeDefault,
  );
  const kmlNodeNumberDefault = '4';
  const [kmlNodeNumber, setKmlNodeNumber] = useState(kmlNodeNumberDefault);
  const snackbars = useSnackbars();
  const {setSelectedTopologyPanel} = useTopologyBuilderContext();

  const handleReadingFileError = useCallback(
    () => setErrorText('Unreadable input file.'),
    [setErrorText],
  );

  const onClose = React.useCallback(
    status => {
      resetTopologyInput();
      setKmlNodeNumber(kmlNodeNumberDefault);
      setTopologyFileType(topologyFileTypeDefault);
      setSelectedTopologyPanel(null);
      setPanelState(PANELS.TOPOLOGY_UPLOAD, PANEL_STATE.HIDDEN);
      if (status) {
        handleTopologyChangeSnackbar(status, snackbars);
      }
    },
    [
      setPanelState,
      setSelectedTopologyPanel,
      snackbars,
      topologyFileTypeDefault,
    ],
  );

  const parseInput = (
    fileInput: ANPUploadTopologyType | TopologyType | Array<ANPUploadKmlType>,
  ) => {
    setLoading(false);
    try {
      if (topologyFileType === uploadFileTypes.ANP) {
        const {sites, nodes, links} = parseANPJson(
          convertType<ANPUploadTopologyType>(fileInput),
        );
        setUploadTopology({sites, nodes, links});
      } else if (topologyFileType === uploadFileTypes.TG) {
        const input = convertType<TopologyType>(fileInput);
        setUploadTopology({
          sites: input.sites,
          nodes: input.nodes,
          links: input.links,
        });
      } else if (topologyFileType === uploadFileTypes.KML) {
        const input = convertType<Array<ANPUploadKmlType>>(fileInput);
        const {sites, nodes, links} = parseANPKml(input, Number(kmlNodeNumber));
        setUploadTopology({sites, nodes, links});
      }
    } catch (_error) {
      handleReadingFileError();
    }
  };

  const onSubmit = () => {
    if (uploadTopology) {
      uploadTopologyBuilderRequest(uploadTopology, networkName, onClose);
    }
  };

  const resetTopologyInput = () => {
    setFileName('');
    setLoading(false);
    setErrorText(false);
    setUploadTopology(null);
  };

  const handleFileTypeChange = useCallback(
    fileType => {
      setTopologyFileType(fileType);
      resetTopologyInput();
    },
    [setTopologyFileType],
  );

  const handleNodeNumberChange = useCallback(ev => {
    setKmlNodeNumber(ev.target.value);
    resetTopologyInput();
  }, []);

  const readUploadedFileAsText = async (inputFile: File) => {
    const fileReader = new FileReader();
    return new Promise((resolve, _) => {
      fileReader.onload = () => {
        resolve(fileReader.result);
      };
      fileReader.readAsText(inputFile);
    });
  };

  const handleChosenFile = async target => {
    setLoading(true);
    const file = target.files[0];
    setFileName(file.name);
    const result = await readUploadedFileAsText(file);

    if (topologyFileType === uploadFileTypes.KML) {
      const kml = new DOMParser().parseFromString(result, 'text/xml');
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
    } else if (typeof result === 'string') {
      parseInput(JSON.parse(result));
    } else {
      handleReadingFileError();
    }
  };

  const getAcceptableUploadFormat = fileType => {
    switch (fileType) {
      case uploadFileTypes.ANP:
      case uploadFileTypes.TG:
        return '.json';
      case uploadFileTypes.KML:
        return '.kml';
      default:
        throw new Error(`Unsupported file type ${fileType}`);
    }
  };

  return (
    <Slide
      {...SlideProps}
      unmountOnExit
      in={!panelControl.getIsHidden(PANELS.TOPOLOGY_UPLOAD)}>
      <CustomAccordion
        title="Upload Topology"
        details={
          <Grid container direction="column" spacing={2}>
            <Grid item>
              <FormLabel component="legend">
                <span>File Format</span>
              </FormLabel>
              <TextField
                data-testid="fileFormatInput"
                defaultValue={topologyFileTypeDefault}
                select
                InputLabelProps={{shrink: true}}
                margin="dense"
                fullWidth
                onChange={ev => {
                  handleFileTypeChange(ev.target.value);
                }}>
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
                  defaultValue={kmlNodeNumberDefault}
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
                onChange={e => {
                  handleChosenFile(e.target);
                  // When parameters (File Format or Sectors Per Site) change
                  // the file needs to be re-parsed. This allows the onChange
                  // to fire even if the same file is uploaded.
                  e.target.value = '';
                }}
                type="file"
                inputProps={{
                  accept: getAcceptableUploadFormat(topologyFileType),
                }}
                style={{display: 'none'}}
              />
            </Button>
            <Grid container direction="column" item>
              <Grid container justifyContent="center" item>
                <Typography variant="subtitle2" gutterBottom>
                  {loading ? 'Loading...' : fileName}
                </Typography>
              </Grid>
              <Grid container justifyContent="center" item>
                <Typography
                  className={classes.errorText}
                  variant="subtitle2"
                  gutterBottom>
                  {errorText}
                </Typography>
              </Grid>
            </Grid>
            <Grid item>
              <div className={classes.button}>
                <UploadTopologyConfirmationModal
                  disabled={uploadTopology ? false : true}
                  onSubmit={onSubmit}
                  getUploadTopology={() => uploadTopology}
                />
              </div>
              <Button
                className={classes.button}
                variant="outlined"
                size="small"
                onClick={() => onClose(null)}>
                Cancel
              </Button>
            </Grid>
          </Grid>
        }
        expanded={panelControl.getIsOpen(PANELS.TOPOLOGY_UPLOAD)}
        onChange={() => panelControl.toggleOpen(PANELS.TOPOLOGY_UPLOAD)}
      />
    </Slide>
  );
}
