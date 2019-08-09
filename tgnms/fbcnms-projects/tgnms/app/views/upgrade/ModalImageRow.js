/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @flow strict-local
 * @format
 */

import Avatar from '@material-ui/core/Avatar';
import IconButton from '@material-ui/core/IconButton';
import ListItem from '@material-ui/core/ListItem';
import ListItemAvatar from '@material-ui/core/ListItemAvatar';
import ListItemSecondaryAction from '@material-ui/core/ListItemSecondaryAction';
import ListItemText from '@material-ui/core/ListItemText';
import MoreVertIcon from '@material-ui/icons/MoreVert';
import React from 'react';
import {getVersion, getVersionNumber} from '../../helpers/VersionHelper';
import {withStyles} from '@material-ui/core/styles';
import type {UpgradeImageType} from '../../../shared/types/Controller';

type Props = {|
  classes: {[key: string]: string},
  image: UpgradeImageType,
  onClick: (HTMLAnchorElement, UpgradeImageType) => void,
|};

const styles = theme => ({
  avatar: {
    fontSize: '1rem',
    padding: 2,
    backgroundColor: theme.palette.primary.light,
  },
});
const ModelImageRow = (props: Props) => {
  // Render a list-item row for the given image
  const {classes, image} = props;
  const versionNumber = getVersionNumber(getVersion(image.name));

  const handleClick = (event: SyntheticEvent<HTMLAnchorElement>) => {
    props.onClick(event.currentTarget, image);
  };

  return (
    <React.Fragment key={image.name}>
      <ListItem>
        <ListItemAvatar>
          <Avatar className={classes.avatar}>{versionNumber}</Avatar>
        </ListItemAvatar>
        <ListItemText
          primary={image.name}
          secondary={
            <>
              <span>
                <strong>MD5:</strong> {image.md5}
              </span>
              <br />
              {image.hardwareBoardIds && image.hardwareBoardIds.length > 0 ? (
                <span>
                  <strong>Boards:</strong> {image.hardwareBoardIds.join(', ')}
                </span>
              ) : null}
            </>
          }
        />
        <ListItemSecondaryAction>
          <IconButton onClick={handleClick}>
            <MoreVertIcon />
          </IconButton>
        </ListItemSecondaryAction>
      </ListItem>
    </React.Fragment>
  );
};

export default withStyles(styles)(ModelImageRow);
