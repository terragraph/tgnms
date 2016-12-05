import React from 'react';
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
        actionType: 'viewSelected',
        viewName: viewName,
      });
    }
  }

  render() {
    // update active class for selected topology
    let className = this.props.active ?
      "metismenu-link metismenu-link-active" :
      "metismenu-link";
    return (
      <a onClick={this.viewSelected.bind(this)} className={className}>
        {this.props.children}
      </a>
    );
  }
}
