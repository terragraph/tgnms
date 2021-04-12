/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import * as React from 'react';
import ArrowDropDownIcon from '@material-ui/icons/ArrowDropDown';
import Button from '@material-ui/core/Button';
import Checkbox from '@material-ui/core/Checkbox';
import Menu from '@material-ui/core/Menu';
import MenuItem from '@material-ui/core/MenuItem';
import useForm from '@fbcnms/tg-nms/app/hooks/useForm';
import {makeStyles} from '@material-ui/styles';

const useStyles = makeStyles(theme => ({
  dropDownStyle: {
    marginTop: theme.spacing(),
    borderBottom: '1px solid',
    marginRight: theme.spacing(),
  },
  dropDownButton: {
    fontWeight: 400,
    textTransform: 'capitalize',
    marginLeft: -theme.spacing(0.75),
    fontSize: theme.spacing(2),
    marginBottom: -theme.spacing(3),
  },
  checkBoxItem: {
    paddingTop: 0,
    paddingBottom: 0,
  },
  dropDownIcon: {
    padding: theme.spacing(),
  },
}));

type Props = {
  title: string,
  name: string,
  menuItems: Array<{value: string, enabled?: boolean, title: string}>,
  onChange: (string, Array<string>) => void,
};

export default function CheckBoxDropDown(props: Props) {
  const {title, menuItems, onChange, name} = props;
  const classes = useStyles();

  const {formState, updateFormState} = useForm({
    initialState: menuItems.reduce((res, option) => {
      res[option.value] = option.enabled || false;
      return res;
    }, {}),
  });

  const anchorEl = React.useRef<?HTMLElement>(null);
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);

  const handleClick = React.useCallback(_ => {
    setIsMenuOpen(true);
  }, []);

  const handleClose = React.useCallback(() => {
    setIsMenuOpen(false);
  }, []);

  React.useEffect(() => {
    onChange(
      name,
      Object.keys(formState).filter(key => formState[key] === true),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formState, name]);

  const setCheckboxState = (name: string, value: boolean) =>
    updateFormState({[name]: value});

  const handleCheckBoxChange = event => {
    setCheckboxState(event.target.name, event.target.checked);
  };

  const handleMenuItemClick = event => {
    const checkBoxTarget = event.target.getElementsByTagName('input')[0];
    if (checkBoxTarget) {
      setCheckboxState(checkBoxTarget.name, !checkBoxTarget.checked);
    }
  };

  return (
    <div className={classes.dropDownStyle}>
      <Button
        ref={(anchorEl: any)}
        onClick={handleClick}
        className={classes.dropDownButton}>
        {title} <ArrowDropDownIcon className={classes.dropDownIcon} />
      </Button>
      <Menu
        anchorEl={anchorEl.current}
        keepMounted
        open={isMenuOpen}
        onClose={handleClose}>
        {menuItems.map(item => (
          <MenuItem
            className={classes.checkBoxItem}
            key={item.title}
            onClick={handleMenuItemClick}>
            <Checkbox
              data-testid="checkbox"
              checked={formState[item.value]}
              onChange={handleCheckBoxChange}
              name={item.value}
            />
            {item.title}
          </MenuItem>
        ))}
      </Menu>
    </div>
  );
}
