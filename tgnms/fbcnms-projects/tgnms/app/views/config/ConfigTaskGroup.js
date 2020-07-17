/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import * as React from 'react';
import CardContent from '@material-ui/core/CardContent';
import CardHeader from '@material-ui/core/CardHeader';
import Grid from '@material-ui/core/Grid';
import Typography from '@material-ui/core/Typography';

/**
 * A group of settings which are edited and tested together. ex:
 * MYSQL
 *  MYSQL_HOST,MYSQL_PASS,MYSQL_USER
 * */
export default function ConfigTaskGroup({
  title,
  description,
  children,
}: {
  title?: React.Node,
  description?: React.Node,
  children: React.Node,
}) {
  return (
    <Grid item>
      {title && (
        <CardHeader title={<Typography variant="h6">{title}</Typography>} />
      )}
      {description && (
        <Typography variant="body2" color="textSecondary">
          {description}
        </Typography>
      )}
      <CardContent>
        <Grid container direction="column" spacing={3}>
          {children}
        </Grid>
      </CardContent>
    </Grid>
  );
}
