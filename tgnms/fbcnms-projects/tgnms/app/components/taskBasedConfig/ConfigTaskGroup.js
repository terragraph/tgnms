/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import * as React from 'react';
import Checkbox from '@material-ui/core/Checkbox';
import Collapse from '@material-ui/core/Collapse';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import Grid from '@material-ui/core/Grid';
import Paper from '@material-ui/core/Paper';
import Typography from '@material-ui/core/Typography';
import {GRAY_BORDER} from '@fbcnms/tg-nms/app/MaterialTheme';
import {get} from 'lodash';
import {makeStyles} from '@material-ui/styles';
import {useConfigTaskContext} from '@fbcnms/tg-nms/app/contexts/ConfigTaskContext';

const useStyles = makeStyles(theme => ({
  root: {
    padding: theme.spacing(2),
    borderBottom: GRAY_BORDER,
  },
}));

/**
 * A group of configs which are edited and set together. ex:
 * env params group contains:
 * CPE_INTERFACE, Open R IP, and Timezone
 * */
export default function ConfigTaskGroup({
  title,
  description,
  children,
  enabler,
}: {
  title?: React.Node,
  description?: ?React.Node,
  children: React.Node,
  enabler?: ?{configField?: string, label: string},
}) {
  const {configField, label} = enabler ?? {};
  const {configOverrides, onUpdate} = useConfigTaskContext();
  const initialValue = get(configOverrides, configField?.split('.'));
  const [enabled, setEnabled] = React.useState(initialValue);
  const classes = useStyles();

  React.useEffect(() => {
    if (initialValue) {
      setEnabled(initialValue);
    }
  }, [initialValue]);

  React.useEffect(() => {
    if (configField) {
      onUpdate({configField, draftValue: enabled});
    }
  }, [configField, enabled, onUpdate]);

  const handleInputChange = React.useCallback(
    e => setEnabled(e.target.checked),
    [setEnabled],
  );
  return (
    <Grid item xs={12}>
      <Paper classes={{root: classes.root}} elevation={0} square>
        <Grid container direction="column" spacing={2}>
          <Grid item>
            {title && <Typography variant="h6">{title}</Typography>}
            {description && (
              <Typography variant="body2" color="textSecondary">
                {description}
              </Typography>
            )}
          </Grid>
          {!enabler ? (
            <Grid item container direction="column" spacing={3}>
              {children}
            </Grid>
          ) : (
            <Grid item container direction="column" spacing={3}>
              <Grid item>
                <FormControlLabel
                  data-testid="checkbox"
                  control={React.createElement(Checkbox, {
                    checked: enabled === true,
                    onChange: handleInputChange,
                    value: String(enabled) || '',
                    color: 'primary',
                  })}
                  label={label}
                />
              </Grid>
              <Grid item>
                <Collapse in={enabled}>
                  <Grid container direction="column" spacing={3}>
                    {children}
                  </Grid>
                </Collapse>
              </Grid>
            </Grid>
          )}
        </Grid>
      </Paper>
    </Grid>
  );
}
