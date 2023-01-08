/**
* Copyright 2017-present Ampersand Technologies, Inc.
*/

import { CANVAS_TOUCH_EVENTS } from 'clientjs/components/CanvasReader/CanvasConstants';
import { ProviderContext } from 'clientjs/components/CanvasReader/ContextProvider';
import { ReaderContext } from 'clientjs/components/CanvasReader/ReaderContext';
import { LAYOUT_CONSTANTS } from 'clientjs/components/CanvasReader/ReaderStyle';
import * as UserColors from 'clientjs/components/ReaderUI/UserColors.tsx';
import * as Util from 'overlib/client/clientUtil';
import { DataWatcher } from 'overlib/client/components/DataWatcher.tsx';
import { AnimationDef } from 'overlib/client/components/Layout/LayoutAnimator';
import { ScrollEventData } from 'overlib/client/components/Layout/MomentumScroller';
import { WatcherOpt } from 'overlib/shared/dataStore';
import * as PropTypes from 'prop-types';
import * as React from 'react';

const SCROLL_BAR_WIDTH = 6;
const SCROLL_BAR_HEIGHT = 16;
const RXN_SIZE = 4;
const SCROLL_BAR_RIGHT_OFFSET = 4;
const RXN_OPACITY = 0.5;


const THREADS_MASK = Util.objectMakeImmutable({
  _ids: {
    sentences: {
      _ids:  {
        reactions: {
          _ids: {
            userID: {
              _ids: 1,
            },
          },
        },
        comments: {
          _ids: {
            userID: 1,
          },
        },
      },
    },
  },
});

function getHeight(readerContext: ReaderContext, watcher: WatcherOpt) {
  const bottomBarHeight = readerContext.getUIState(watcher, ['bottomBarHeight']);
  return readerContext.getUIState(watcher, ['page', 'height'])
    - LAYOUT_CONSTANTS.TOP_BAR_HEIGHT - bottomBarHeight - SCROLL_BAR_HEIGHT;
}

function findFirstUserID(sentence): AccountID|undefined {
  for (const id in sentence) {
    for (const rxn in sentence[id].reactions) {
      for (const userID in sentence[id].reactions[rxn].userID) {
        return userID as AccountID;
      }
    }
    for (const comment in sentence[id].comments) {
      return sentence[id].comments[comment].userID;
    }
  }
}

class ScrollBarMeepleOverlay extends DataWatcher<{}, {}> {
  context: ProviderContext;
  static contextTypes = Util.shallowCloneAndCopy(DataWatcher.contextTypes, {
    readerContext: PropTypes.object.isRequired,
  });

  render() {
    const height = getHeight(this.context.readerContext, this);
    const allCharCount: number = this.context.readerContext.getParsedData(this, ['totalChars']) || 0;


    // All reactions / comments
    const reactions = this.context.readerContext.getReactionGroupData(this, ['threads'], THREADS_MASK);
    const children: JSX.Element[] = [];
    for (const pID in reactions) {
      const rxnPos = this.context.readerContext.getCharByParaID(pID);
      if (!rxnPos) {
        continue;
      }
      const key = pID + '.rxn';
      const userID = findFirstUserID(reactions[pID].sentences);
      if (!userID) {
        continue;
      }

      const reactionTop = height * rxnPos / allCharCount;
      const groupID = this.context.readerContext.getGroupID();
      const color = UserColors.getUserColor(this, groupID, userID).inlineBase;
      const style = {
        width: RXN_SIZE,
        height: RXN_SIZE,
        left: 1,
        top: reactionTop - 0.5 * RXN_SIZE,
        opacity: RXN_OPACITY,
      };
      children.push(
        <div
          key={key}
          classes={`c-${color}-bg br-${RXN_SIZE * 0.5}`}
          style={style}
        />,
      );
    }

    return (
      <div data-cacheable={true} classes='top-0'>
        {children}
      </div>
    );
  }
}

export class ScrollBar extends DataWatcher<{}, {animFadeID: number}> {
  context: ProviderContext;
  static contextTypes = Util.shallowCloneAndCopy(DataWatcher.contextTypes, {
    readerContext: PropTypes.object.isRequired,
  });

  constructor(props, context) {
    super(props, context);
    this.state = {
      animFadeID: 0,
    };
  }

  componentDidMount() {
    this.context.readerContext.registerEventCallback(CANVAS_TOUCH_EVENTS.SCROLL_CHANGE, this.onScrollChange);
  }

  componentWillUnmount() {
    super.componentWillUnmount();
    this.context.readerContext.unregisterEventCallback(CANVAS_TOUCH_EVENTS.SCROLL_CHANGE, this.onScrollChange);
  }

  onScrollChange = (_scrollData: ScrollEventData) => {
    this.setState({animFadeID: this.state.animFadeID + 1});
  }

  render() {
    const height = getHeight(this.context.readerContext, this);
    const allCharCount: number = this.context.readerContext.getParsedData(this, ['totalChars']) || 0;

    const alpha = this.context.readerContext.getUIAlpha(this);

    const currentChars = this.context.readerContext.getUIState(this, ['curPos']);
    const quietMode = this.context.readerContext.getUIState(this, ['quietMode']);

    const markerStyle: React.CSSProperties = {
      // we may want to adjust this height based on length of book
      // currentChars is the middle of the page, so center the scrollbar marker around it
      top: height * currentChars / allCharCount - SCROLL_BAR_HEIGHT * 0.5,
      width: SCROLL_BAR_WIDTH + 'px',
      height: SCROLL_BAR_HEIGHT + 'px',
    };

    const anims: AnimationDef[] = [];
    anims.push({
      key: 'scrollBarFade' + this.state.animFadeID,
      motivator: {
        source: 'time',
        easingFunction: 'easeOutQuart',
        start: 1500,
        end: 2500,
      },
      modifier: {
        field: 'alpha',
        start: alpha,
        end: '0%',
      },
    });

    return (
      <div
        classes={`m-t-${LAYOUT_CONSTANTS.TOP_BAR_HEIGHT + SCROLL_BAR_HEIGHT * 0.3} w-${SCROLL_BAR_WIDTH} m-r-${SCROLL_BAR_RIGHT_OFFSET}`}
        style={{ opacity: alpha }}
        data-anims={anims}
      >
        {(!quietMode ? <ScrollBarMeepleOverlay/> : null)}
        <div style={markerStyle} classes='c-readerText-bg op-0.3 br-4'/>
      </div>
    );
  }
}
