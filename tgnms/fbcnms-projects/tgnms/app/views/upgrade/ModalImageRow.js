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
import type {ChecksumType} from './ModalImageList';
import type {SoftwareImageType} from './ModalUpgradeImages';

type Props = {|
  classes: {[key: string]: string},
  checksumType: ChecksumType,
  image: SoftwareImageType,
  onClick: (HTMLAnchorElement, SoftwareImageType) => void,
|};

const styles = theme => ({
  avatar: {
    fontSize: '1rem',
    padding: 2,
    backgroundColor: theme.palette.primary.light,
  },
  checksumText: {
    width: '90%',
    display: 'inline-block',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
});
const ModelImageRow = (props: Props) => {
  // Render a list-item row for the given image
  const {classes, image, checksumType} = props;
  const versionNumber =
    image.versionNumber != null
      ? image.versionNumber
      : getVersionNumber(getVersion(image.name));

  const handleClick = (event: SyntheticEvent<HTMLAnchorElement>) => {
    props.onClick(event.currentTarget, image);
  };

  const checksum = checksumType === 'MD5' ? image.md5 : image.sha1;

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
              <span className={classes.checksumText}>
                <strong>{`${checksumType}:`}</strong> {checksum}
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
        {!!image.magnetUri ? (
          <ListItemSecondaryAction>
            <IconButton onClick={handleClick}>
              <MoreVertIcon />
            </IconButton>
          </ListItemSecondaryAction>
        ) : null}
      </ListItem>
    </React.Fragment>
  );
};

export default withStyles(styles)(ModelImageRow);
