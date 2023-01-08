/**
* Copyright 2017-present Ampersand Technologies, Inc.
*/

import { ProviderContext } from 'clientjs/components/CanvasReader/ContextProvider';
import { EMOJI_TABLE } from 'clientjs/components/CanvasReader/EmojiTable';
import { LAYOUT_CONSTANTS } from 'clientjs/components/CanvasReader/ReaderStyle';
import { NoteButtonID } from 'clientjs/components/CanvasReader/UIState';
import { REC_EMOJI_MAX } from 'clientjs/shared/settingsDB';
import * as Util from 'overlib/client/clientUtil';
import { DataWatcher } from 'overlib/client/components/DataWatcher.tsx';
import * as Flex from 'overlib/client/components/Flex.tsx';
import * as GestureControl from 'overlib/client/components/GestureControl.tsx';
import * as Sketch from 'overlib/shared/sketch';
import * as PropTypes from 'prop-types';
import * as React from 'react';

const REC_EMOJI_WIDTH = 120;  // width for the "Recently Used" text
const TITLE_BAR_HEIGHT = 37;
const EMOJI_SIZE = 30;
const EMOJI_PADDING = 10;
const EMOJI_CAROUSEL_PADDING = 15;
const EMOJI_PER_COL = Math.floor((LAYOUT_CONSTANTS.SENTIMENT_BAR_HEIGHT - EMOJI_CAROUSEL_PADDING - TITLE_BAR_HEIGHT) / (EMOJI_SIZE + EMOJI_PADDING));

const REC_EMOJI_MASK = Util.objectMakeImmutable({
  _ids: {
    time: 1,
  },
});

class EmojiButton extends DataWatcher<{emojiID: string, emoji: string}, {}> {
  context: ProviderContext;
  static contextTypes = Util.shallowCloneAndCopy(DataWatcher.contextTypes, {
    readerContext: PropTypes.object.isRequired,
  });

  private clickHelper = () => {
    if (this.props.emojiID !== NoteButtonID) {
      this.context.readerContext.readerReactions.toggleReactionLocal(this.props.emojiID, 'emoji');
      this.context.readerContext.clearSelection();
      this.context.readerContext.replaceUIState(['showReactionBar'], false);
      Sketch.runAction('readerSettings.updateEmoji', this.props.emojiID);
    }
  }

  private onClick = () => {
    const activeBar = (this.props.emojiID === NoteButtonID) ? NoteButtonID : 'sentiment';
    this.context.readerContext.ensureSelection(activeBar);
    this.clickHelper();
  }

  render() {
    return (
      <Flex.Col
        key={this.props.emojiID}
        classes='w-n-30 h-n-30 fs-30 cc'
        onClick={this.onClick}
      >
        {this.props.emoji}
      </Flex.Col>
    );
  }
}

export class ReactionBar extends DataWatcher<{}, {}> {
  context: ProviderContext;
  static contextTypes = Util.shallowCloneAndCopy(DataWatcher.contextTypes, {
    readerContext: PropTypes.object.isRequired,
  });

  dismiss = () => {
    this.context.readerContext.clearSelection();
    this.context.readerContext.replaceUIState(['showReactionBar'], false);
  }

  render() {
    let shouldShow = false;
    if (this.context.readerContext.getUIState(this, ['showReactionBar']) &&
      !this.context.readerContext.getUIState(this, ['showReactionBreakdown'])) {
      shouldShow = true;
      this.context.readerContext.postLayout(() => {
        this.context.readerContext.navTo && this.context.readerContext.navTo(
          {
            type: 'selection',
          },
          'bottom',
          false,
          'nav.scrollToSelection',
        );
      });
    }
    const alpha = shouldShow ? this.context.readerContext.getUIAlpha(this) : 0;
    const recEmojiObj: StashOf<{time: number}> = Util.clone(this.getData(['settingsGlobal', 'reader', 'recentlyUsedEmojis'],
    REC_EMOJI_MASK));
    const recEmojis = Object.keys(recEmojiObj).sort((a, b) => recEmojiObj[b].time - recEmojiObj[a].time);

    const emojiCategories: JSX.Element[] = [];
    let emojiArray: JSX.Element[] = [];

    if (recEmojis.length > 0) {
      const numColumns = Math.min(recEmojis.length, (REC_EMOJI_MAX / EMOJI_PER_COL));
      const width = Math.max(REC_EMOJI_WIDTH, Math.ceil(numColumns * (EMOJI_SIZE + EMOJI_PADDING)));
      for (const id of recEmojis) {
        const ids = id.split(':');
        const category = ids[0];
        const name = ids[1];
        const emoji = EMOJI_TABLE[category][name];

        emojiArray.push(
        <Flex.Col classes='m-x-4' key={`emoji-${name}`}>
          <EmojiButton testid={`emoji-${name}`} emojiID={id} emoji={emoji} />
        </Flex.Col>,
        );
      }
      emojiCategories.push(
      <Flex.Col key='recently_used' classes={`flxs-0 w-${width} ai-fs`}>
        <Flex.Row classes='m-l-7 c-readerTextDimmed-fg fs-13'>RECENTLY USED</Flex.Row>
        <Flex.Row classes='flxw-w'>
          {emojiArray}
        </Flex.Row>
      </Flex.Col>,
      );
    }

    for (const category in EMOJI_TABLE) {
      emojiArray = [];
      for (const name in EMOJI_TABLE[category]) {
        const emoji = EMOJI_TABLE[category][name];
        emojiArray.push(<EmojiButton testid={`emoji-${name}`} key={`emoji-${name}`} emojiID={`${category}:${name}`} emoji={emoji} />);
      }
      emojiCategories.push(
      <Flex.Col key={category} classes={`flxs-0 w-${Math.ceil((emojiArray.length / EMOJI_PER_COL) * (EMOJI_SIZE + EMOJI_PADDING))}`}>
        <Flex.Row classes='m-l-7 c-readerTextDimmed-fg fs-13'>{category.toUpperCase()}</Flex.Row>
        <Flex.Col classes='fg-1 h-200 flxw-w'>
          {emojiArray}
        </Flex.Col>
      </Flex.Col>,
      );
    }

    const classes = `h-${LAYOUT_CONSTANTS.SENTIMENT_BAR_HEIGHT} c-readerFrameBackground-bg` +
    ` pos-a bot-0 left-0 right-0 trans-o-0.2s op-${alpha} ${shouldShow ? '' : 'ptrevt-n'}`;

    return (
      <Flex.Col classes={classes}>
        <Flex.Row classes={`w-100% pos-r h-${TITLE_BAR_HEIGHT}`}>
          <Flex.Col classes='pos-a left-22 top-8 fs-14 fw-300 c-readerText-fg'>Add a reaction</Flex.Col>
          <Flex.Col classes='pos-a right-25 top-8 fs-13 c-readerAppCtaText-fg' onClick={this.dismiss}>CANCEL</Flex.Col>
        </Flex.Row>
        <Flex.Row classes={`fg-1 p-x-${EMOJI_CAROUSEL_PADDING} p-b-IPHONE_X_SAFE_AREA_BOTTOM o-x-a m-b-${EMOJI_CAROUSEL_PADDING}`}
        onTouchStart={() => GestureControl.suppress('BackSwipe')}
        onTouchEnd={() => GestureControl.unsuppress('BackSwipe')}>
          {emojiCategories}
        </Flex.Row>
      </Flex.Col>
    );
  }
}
