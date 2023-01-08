/**
* Copyright 2017-present Ampersand Technologies, Inc.
*/

import { ProviderContext } from 'clientjs/components/CanvasReader/ContextProvider';
import { Paragraph } from 'clientjs/components/CanvasReader/Paragraph.tsx';
import { ParagraphData } from 'clientjs/components/CanvasReader/ParagraphUtils';
import { ParaLayout } from 'clientjs/components/CanvasReader/ReaderStyle';
import { Thread } from 'clientjs/components/CanvasReader/Thread.tsx';
import * as DB from 'clientjs/db';
import { Modifiers } from 'clientjs/shared/paragraphTypes';
import { ParagraphEntry } from 'clientjs/shared/readerParse';
import { DataWatcher } from 'overlib/client/components/DataWatcher.tsx';
import * as Util from 'overlib/shared/util';
import * as PropTypes from 'prop-types';
import * as React from 'react';

const THREADS_MASK = Util.objectMakeImmutable({
  sentences: {
    _ids:  {
      createUser: 1,
      comments: {
        _ids: {
          userID: 1,
        },
      },
      reactions: {
        _ids: 1,
      },
    },
  },
});

interface Props {
  entryIdx: number;
  paragraph: ParagraphEntry;
  refLayerExtBorder?: boolean;
}

export class ContentParagraph extends DataWatcher<Props, {}> {
  context: ProviderContext;
  static contextTypes = Util.shallowCloneAndCopy(DataWatcher.contextTypes, {
    readerContext: PropTypes.object.isRequired,
  });

  private dontTransition = true;

  componentDidMount() {
    this.dontTransition = false;
  }

  private isLayer(): boolean {
      const mods = this.props.paragraph.modifiers;
      if (!mods) {
        return false;
      }
      for (let mod of mods) {
        if (mod.type === Modifiers.LAYER) {
          return true;
        }
      }
    return false;
  }

  private onSentenceTap = (sentenceIdx: number) => {
    const curSelectedEntryIdx = this.context.readerContext.getUIState(null, ['selection', 'entryIdx']);
    if (curSelectedEntryIdx) {
      // already have a selection, just clear it
      this.context.readerContext.clearSelection();
      this.context.readerContext.removeUIState(['activeBar']);
      return true;
    }

    this.context.readerContext.selectSentence(this.props.entryIdx, sentenceIdx);

    return true;
  }

  render() {
    const quietMode = this.context.readerContext.getUIState(this, ['quietMode']);
    const userID = DB.getAccountID();

    const layout = ParaLayout(this.props.paragraph.type);
    const paddingX = layout.padding;
    const paddingY = layout.spacing;

    let classes = `c-readerText-fg p-y-${paddingY} w-100000`;

    if (this.isLayer()) {
      classes += ' c-readerLayerText-fg';
    }

    const selectionObj = this.context.readerContext.getEntrySelection(this, this.props.entryIdx.toString());
    const selectedSentence = selectionObj && selectionObj.index;

    // Loop over thread data, adding any missing layouts
    const threadPath = ['threads', this.props.paragraph.id];
    const thread = this.context.readerContext.getReactionGroupData(this, threadPath, THREADS_MASK);
    const threadSentences: StashOf<{ createUser: AccountID, comments: Stash, reactions: Stash}>
      = (thread && Util.clone(thread.sentences)) || {};
    const threadSentenceIdxs = Object.keys(threadSentences).map((str: string) => { return Math.max(0, parseInt(str)); });
    if (Util.isNumber(selectedSentence) && threadSentenceIdxs.indexOf(selectedSentence) < 0) {
      threadSentenceIdxs.push(selectedSentence);
    }
    threadSentenceIdxs.sort(Util.cmpNum.bind(null, false));

    const paragraphData: ParagraphData = {
      type: this.props.paragraph.paraType || 'paragraph',
      content: this.props.paragraph.content,
      modifiers: this.props.paragraph.modifiers,
      tabLevel: this.props.paragraph.tabLevel,
      ordinality: this.props.paragraph.ordinality,
    };

    const paras: JSX.Element[] = [];
    let startIdx: number|undefined;
    let nextParagraphThreads: StashOf<{ createUser: AccountID, comments: Stash, reactions: Stash}> = {};
    for (const sentenceIdx of threadSentenceIdxs) {
      const threadSentence = threadSentences[sentenceIdx];
      let hiddenComments = 0;
      const numComments = (threadSentence && threadSentence.comments) ? Object.keys(threadSentence.comments).length : 0;

      if (quietMode) {
        // check if the comment is just a comment for oneself
        let isSelfComment;
        if (threadSentence) {
          isSelfComment = threadSentence.createUser === userID;
          hiddenComments = isSelfComment ? 0 : numComments;
        } else {
          // handle case where we are creating a new comment/reaction when one doesn't exist
          isSelfComment = true;
        }

        const hideThread = sentenceIdx !== selectedSentence && !isSelfComment;
        if (hideThread) {
          // suppress splitting the paragraph if it's a thread created by another user
          continue;
        }

      }

      nextParagraphThreads[sentenceIdx] = threadSentence;


      paras.push((
        <Paragraph
          key={'sentence_' + (startIdx || 0)}
          paragraph={paragraphData}
          entryIdx={this.props.entryIdx}
          startSentence={startIdx}
          endSentence={sentenceIdx + 1}
          paddingLeft={paddingX}
          paddingRight={paddingX}
          threadSentences={nextParagraphThreads}
          onSentenceTap={this.onSentenceTap}
          refLayerExtBorder={this.props.refLayerExtBorder}
        />
      ));

      paras.push((
        <Thread
          key={'thread_' + sentenceIdx}
          selected={sentenceIdx === selectedSentence}
          classes={'p-t-10 p-x-' + paddingX}
          entryIdx={this.props.entryIdx}
          threadPath={threadPath.concat(['sentences', sentenceIdx.toString()])}
          hiddenComments={hiddenComments}
          paddingLeft={paddingX}
          paddingRight={paddingX}
          dontTransition={this.dontTransition}
        />
      ));

      nextParagraphThreads = {};
      startIdx = sentenceIdx + 1;
      hiddenComments = 0;
    }

    paras.push((
      <Paragraph
        key={'sentence_' + (startIdx || 0)}
        paragraph={paragraphData}
        entryIdx={this.props.entryIdx}
        startSentence={startIdx}
        paddingLeft={paddingX}
        paddingRight={paddingX}
        threadSentences = {nextParagraphThreads}
        onSentenceTap={this.onSentenceTap}
        refLayerExtBorder={this.props.refLayerExtBorder}
      />
    ));

    return (
      <div classes={classes}>{paras}</div>
    );
  }
}
