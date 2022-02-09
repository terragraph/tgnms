/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import * as React from 'react';
import Card from '@material-ui/core/Card';
import CardContent from '@material-ui/core/CardContent';
import CardHeader from '@material-ui/core/CardHeader';
import Divider from '@material-ui/core/Divider';
import Grid from '@material-ui/core/Grid';
import Typography from '@material-ui/core/Typography';

/**
 * A group of settings which are edited and tested together. ex:
 * MYSQL
 *  MYSQL_HOST,MYSQL_PASS,MYSQL_USER
 * */
export default function SettingsGroup({
  title,
  description,
  children,
  tester,
}: {
  title: React.Node,
  children: React.Node,
  description?: React.Node,
  tester?: React.Node,
}) {
  return (
    <Grid item>
      <Card elevation={0}>
        <CardHeader
          title={
            <>
              <Typography variant="h6">{title}</Typography>
              {description && (
                <Typography variant="body2" color="textSecondary">
                  {description}
                </Typography>
              )}
            </>
          }
        />
        <CardContent>
          <Grid container direction="column" spacing={3}>
            {children}
            {tester && (
              <Grid item container justifyContent="flex-end">
                {tester}
              </Grid>
            )}
          </Grid>
        </CardContent>
      </Card>
      <Divider />
    </Grid>
  );
}
