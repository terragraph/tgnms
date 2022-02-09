/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow strict-local
 */

import * as React from 'react';
import * as mapApi from '@fbcnms/tg-nms/app/apiutils/MapAPIUtil';
import AddIcon from '@material-ui/icons/Add';
import Button from '@material-ui/core/Button';
import Checkbox from '@material-ui/core/Checkbox';
import Divider from '@material-ui/core/Divider';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import Grid from '@material-ui/core/Grid';
import MenuIconButton from '@fbcnms/tg-nms/app/components/common/MenuIconButton';
import MenuItem from '@material-ui/core/MenuItem';
import MoreVertIcon from '@material-ui/icons/MoreVert';
import SettingsGroup from '../SettingsGroup';
import TextField from '@material-ui/core/TextField';
import Typography from '@material-ui/core/Typography';
import useForm from '@fbcnms/tg-nms/app/hooks/useForm';
import useRouter from '@fbcnms/ui/hooks/useRouter';
import {RESPONSE_TYPE} from '@fbcnms/tg-nms/shared/dto/RemoteOverlay';
import {makeStyles} from '@material-ui/styles';
import {matchPath} from 'react-router-dom';

import type {
  OverlayResponse,
  RemoteOverlay,
} from '@fbcnms/tg-nms/shared/dto/RemoteOverlay';

export type Props = {|
  overlays: Array<RemoteOverlay>,
  onChange: (Array<RemoteOverlay>) => void,
|};

const useStyles = makeStyles(_theme => ({}));
export default function RemoteOverlaysEditor({overlays, onChange}: Props) {
  const classes = useStyles();
  const {
    formState,
    setFormState,
    addListItem,
    updateListItem,
    removeListItem,
  } = useForm<{
    remoteOverlays: Array<RemoteOverlay>,
  }>({
    initialState: {
      remoteOverlays: overlays,
    },
    onFormUpdated: ({remoteOverlays}) => onChange(remoteOverlays),
  });
  React.useEffect(() => {
    setFormState({
      remoteOverlays: overlays,
    });
  }, [overlays, setFormState]);
  const handleAddOverlay = React.useCallback(() => {
    addListItem('remoteOverlays', {
      id: '',
      name: '',
      url: '',
      enabled: true,
      httpMethod: 'GET',
      useProxy: false,
    });
  }, [addListItem]);

  return (
    <SettingsGroup
      title="Remote Overlays"
      description="Configure NMS to request map overlay data from a custom API">
      <Grid item container direction="column" spacing={6}>
        {formState.remoteOverlays &&
          formState.remoteOverlays.map((overlay, idx) => (
            <Grid
              container
              key={idx}
              item
              xs={12}
              alignItems="flex-start"
              justifyContent="space-between"
              spacing={2}
              className={classes.overlayWrapper}>
              <Grid item xs={10}>
                <OverlayForm
                  overlay={overlay}
                  key={idx}
                  onChange={change =>
                    updateListItem('remoteOverlays', idx, change)
                  }
                />
              </Grid>
              <Grid item>
                <MenuIconButton
                  id={`overlay-menu-${idx}`}
                  size="small"
                  edge="end"
                  icon={<MoreVertIcon />}>
                  <MenuItem
                    onClick={() => removeListItem('remoteOverlays', idx)}>
                    Delete Overlay
                  </MenuItem>
                </MenuIconButton>
              </Grid>
              <Grid item xs={12}>
                <Divider />
              </Grid>
            </Grid>
          ))}
        <Grid item xs={12} container justifyContent="center">
          <Grid item xs={4}>
            <Button
              variant="contained"
              color="primary"
              fullWidth
              onClick={handleAddOverlay}>
              <AddIcon />
              New Overlay
            </Button>
          </Grid>
        </Grid>
      </Grid>
    </SettingsGroup>
  );
}

type OverlayFormProps = {|
  overlay: RemoteOverlay,
  onChange: ($Shape<RemoteOverlay>) => void,
|};
function OverlayForm({overlay, onChange}: OverlayFormProps) {
  const [testResponse, setTestResponse] = React.useState(null);

  // there is no NetworkContext so network name must be parsed from the url
  const {location} = useRouter();
  const match = matchPath(location.pathname, {
    path: '/:viewName/:networkName',
    strict: false,
    exact: false,
  });
  const networkName = match?.params?.networkName || '';

  const handleChange = e => {
    onChange({
      [e.target.name]: e.target.value,
    });
  };

  const handleTestClicked = React.useCallback(async () => {
    const response = await mapApi.queryRemoteOverlay({
      network_name: networkName,
      overlay,
    });
    setTestResponse(response);
  }, [overlay, networkName]);

  return (
    <Grid
      container
      spacing={1}
      direction="column"
      data-testid={`overlay-form-${overlay.id}`}>
      <Grid item>
        <FormControlLabel
          label="Enabled"
          color="secondary"
          control={
            <Checkbox
              checked={overlay.enabled}
              onChange={e => onChange({enabled: e.target.checked})}
              fontSize="small"
            />
          }
          size="sm"
        />
      </Grid>
      <Grid item xs={8}>
        <TextField
          name={'name'}
          label="Name"
          placeholder="Name"
          value={overlay.name}
          onChange={handleChange}
          fullWidth
        />
      </Grid>
      <Grid item xs={8}>
        <TextField
          name={'id'}
          label="ID"
          placeholder="ID"
          helperText="Must be unique"
          value={overlay.id}
          onChange={handleChange}
          fullWidth
        />
      </Grid>
      <Grid item xs={8}>
        <TextField
          name={'url'}
          label="URL"
          placeholder="Url"
          value={overlay.url ?? ''}
          onChange={handleChange}
          fullWidth
        />
      </Grid>
      <Grid item xs={8}>
        <TextField
          name={'httpMethod'}
          label="HTTP Method"
          value={overlay.httpMethod ?? ''}
          onChange={handleChange}
          select
          fullWidth>
          <MenuItem value="GET">GET</MenuItem>
          <MenuItem value="POST">POST</MenuItem>
        </TextField>
      </Grid>
      <Grid item xs={8}>
        <FormControlLabel
          label="Use HTTP Proxy"
          color="secondary"
          control={
            <Checkbox
              checked={overlay.useProxy ?? false}
              onChange={e => onChange({useProxy: e.target.checked})}
              fontSize="small"
            />
          }
          size="sm"
        />
      </Grid>
      <Grid item xs={12}>
        <Button variant="contained" onClick={handleTestClicked}>
          Test
        </Button>
      </Grid>
      {testResponse && (
        <Grid item xs={12}>
          <OverlayTestPreview response={testResponse} />
        </Grid>
      )}
    </Grid>
  );
}

function OverlayTestPreview({response}: {response: OverlayResponse}) {
  return (
    <Grid container item direction="column">
      <Grid item>
        <Typography color="secondary">Response Type: </Typography>
        <Typography>{response.type}</Typography>
      </Grid>

      <Grid item>
        {response.type === RESPONSE_TYPE.error && (
          <Typography>Error: {response.error.message}</Typography>
        )}
        {response.type === RESPONSE_TYPE.topology && (
          <Typography component="pre" color="textSecondary">
            {JSON.stringify(response, null, 2)}
          </Typography>
        )}
      </Grid>
    </Grid>
  );
}
