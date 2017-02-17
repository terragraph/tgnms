import React from 'react';

import Actions from './NetworkActionConstants.js';
import Dispatcher from './NetworkDispatcher.js';

export default class PaneMenuItem extends React.Component {
  constructor(props) {
    super();
  }

  componentWillMount() {
  }

  viewSelected(e) {
    let viewName = this.props.to
    // show sub-menu
    if (this.props.hasSubMenu) {
      this.props.toggleSubMenu(e);
    } else {
      // dispatch event
      Dispatcher.dispatch({
        actionType: Actions.VIEW_SELECTED,
        viewName: viewName,
      });
    }
  }

  render() {
    // update active class for selected topology
    let className = this.props.active ?
      "metismenu-link metismenu-link-active" :
      "metismenu-link";
    if (this.props.hasSubMenu) {
      return (
        <a onClick={this.viewSelected.bind(this)} className={className}>
          {this.props.children}
        </a>
      );
    }
    return (
      <a onClick={this.viewSelected.bind(this)} className={className}>
        <img src={"/static/images/" + this.props.to + ".png"}
             className="leftNav" />
        {this.props.children}
      </a>
    );
  }
}
