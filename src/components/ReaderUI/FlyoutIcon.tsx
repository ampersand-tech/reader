/**
* Copyright 2017-present Ampersand Technologies, Inc.
*/

import * as IconConstants from 'clientjs/iconConstants';
import { DataWatcher } from 'overlib/client/components/DataWatcher.tsx';
import { Flyout } from 'overlib/client/components/Flyout.tsx';
import { SvgIcon } from 'overlib/client/components/SvgIcon.tsx';
import * as FlyoutGlobals from 'overlib/client/FlyoutGlobals';
import * as Constants from 'overlib/shared/constants';
import * as PropTypes from 'prop-types';
import * as React from 'react';

interface Props {
  classes?: string;
  iconID?: string;
  iconClasses?: string;
  arrowX?: number;
  arrowY?: number;
  arrowSize?: number;
  position?: Constants.FlyoutPositionType;
  startOpen?: boolean;
  noClick?: boolean;
}

interface State {
  showFlyout: boolean;
}

export class FlyoutIcon extends DataWatcher<Props, State> {
  static propTypes = {
    classes: PropTypes.string,
    iconID: PropTypes.string,
    iconClasses: PropTypes.string,
    arrowX: PropTypes.number,
    arrowY: PropTypes.number,
    arrowSize: PropTypes.number,
    position: PropTypes.string,
    startOpen: PropTypes.bool,
    noClick: PropTypes.bool,
  };
  static defaultProps = {
    arrowX: 40,
    arrowY: 30,
    arrowSize: 40,
  };
  state = {
    showFlyout: Boolean(this.props.startOpen),
  };

  showFlyout = () => {
    if (!FlyoutGlobals.didJustClose() && !this.props.noClick) {
      this.setState({ showFlyout: true });
    }
  }

  hideFlyout = () => {
    this.setState({showFlyout: false});
  }

  render() {
    let iconElem: JSX.Element | null = null;
    let divClasses: string | undefined;
    let divOnclick;
    if (this.props.iconID) {
      const icon = IconConstants.getIcon(this.props.iconID, true);
      iconElem = <SvgIcon svgName={icon} classes={this.props.iconClasses} onClick={this.showFlyout}/>;
    } else {
      divClasses = 'pos-a top-0 left-0 right-0 bot-0';
      divOnclick = this.showFlyout;
    }
    return (
      <div classes={divClasses} onClick={divOnclick}>
        {iconElem}
        {this.state.showFlyout ?
        <Flyout
          closeCB={this.hideFlyout}
          parentNode={this}
          classes={this.props.classes}
          xOffset={this.props.arrowX}
          yOffset={this.props.arrowY}
          arrowSize={this.props.arrowSize}
          position={this.props.position}
          closeOnScroll={true}
        >
          {this.props.children}
        </Flyout> : null}
      </div>
    );
  }
}
