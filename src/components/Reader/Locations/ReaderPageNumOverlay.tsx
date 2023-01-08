/**
* Copyright 2017-present Ampersand Technologies, Inc.
*/

import { ProviderContext } from 'clientjs/components/CanvasReader/ContextProvider.tsx';
import { LAYOUT_CONSTANTS } from 'clientjs/components/CanvasReader/ReaderStyle';
import { DataWatcher } from 'overlib/client/components/DataWatcher.tsx';
import * as Flex from 'overlib/client/components/Flex.tsx';
import * as Constants from 'overlib/shared/constants';
import * as Util from 'overlib/shared/util';
import * as PropTypes from 'prop-types';
import * as React from 'react';

const FADE_TRANSITION_TIME_MS = 500;
const SHOW_DURATION_MS = 1800;
const DIAMETER_MOBILE = 70;
const DIAMETER_TABLET = 140;
const FONT_SIZE_MOBILE = 35;
const FONT_SIZE_TABLET = 70;
const VISIBLE_OPACITY = .8;

const APP_MASK = Util.objectMakeImmutable({
  width: 1,
  height: 1,
  platform: 1,
});

interface ReaderPageNumOverlayState {
  show: boolean;
  curPage: number;
  tocOn: boolean;
}

export class ReaderPageNumOverlay extends DataWatcher<{}, ReaderPageNumOverlayState> {
  context: ProviderContext;

  static contextTypes = Util.shallowCloneAndCopy(DataWatcher.contextTypes, {
    readerContext: PropTypes.object.isRequired,
  });

  state = {
    show: false,
    curPage: 0,
    tocOn: false,
  };

  fadeIn() {
    this.setState({show: true});
    this.setNamedTimeout('fade', () => this.fadeOut(), SHOW_DURATION_MS);
  }

  fadeOut() {
    this.setState({show: false});
  }

  componentDidUpdate() {
    const tocOn = this.context.readerContext.getUIState(null, ['showToc']);
    const curPage = this.context.readerContext.getContentWindowPage(null);
    if (curPage !== this.state.curPage || tocOn !== this.state.tocOn) {
      this.clearNamedTimeout('fade');
      this.setNamedTimeout('fade', () => this.fadeIn(), 0);
      this.setState({curPage, tocOn});
    }
  }

  render() {
    const sf = this.context.readerContext.getUIState(this, ['scaleFactor']);
    const app = this.getData(['App'], APP_MASK);
    const di = app.platform === Constants.LAYOUT_PLATFORM.IPAD ? DIAMETER_TABLET : DIAMETER_MOBILE ;
    const fs = app.platform === Constants.LAYOUT_PLATFORM.IPAD ? FONT_SIZE_TABLET : FONT_SIZE_MOBILE ;
    const left = (sf * app.width) / 2 - (di / 2);
    const top = (app.height) / 2 - (di / 2);
    const style = {
      opacity: this.state.show ? VISIBLE_OPACITY : 0,
      transition: 'opacity ' + FADE_TRANSITION_TIME_MS + 'ms ease',
    };

    const curPage = this.context.readerContext.getContentWindowPage(this);

    return (sf === LAYOUT_CONSTANTS.MIN_SCALE_FACTOR) ?
      (<Flex.Col
        style={style}
        classes={`pos-a w-${di} w-n-${di} h-${di} h-n-${di} top-${top} right-0 left-${left} br-${(di / 2)} c-black-bg ptrevt-n cc`} >
        <div
        classes={`c-white-fg fs-${fs} fw-400`}>
          {curPage}
        </div>
      </Flex.Col>) : null;
  }
}
