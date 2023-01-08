/**
* Copyright 2017-present Ampersand Technologies, Inc.
*/

import { ProviderContext } from 'clientjs/components/CanvasReader/ContextProvider';
import * as Nav from 'clientjs/components/CanvasReader/Nav';
import { EntryTypes } from 'clientjs/shared/readerParse';
import * as Util from 'overlib/client/clientUtil';
import { DataWatcher } from 'overlib/client/components/DataWatcher.tsx';
import * as Flex from 'overlib/client/components/Flex.tsx';
import * as PropTypes from 'prop-types';
import * as React from 'react';

const THREADS_MASK = Util.objectMakeImmutable({
  sentences: {
    _ids:  {
      createUser: 1,
    },
  },
});

const COMMENTS_MASK = Util.objectMakeImmutable({
  _ids:  {
    userID: 1,
  },
});

interface CommentSummaryProps {
  entryIdx: number;
}

export class CommentSummary extends DataWatcher<CommentSummaryProps, {}> {
  context: ProviderContext;
  static contextTypes = Util.shallowCloneAndCopy(DataWatcher.contextTypes, {
    readerContext: PropTypes.object.isRequired,
  });

  private scrollTo = (paraEntryIdx : number) => {
    this.context.readerContext.setQuietMode(false);
    const target: Nav.NavTargetParagraph = {
      type: 'paragraph',
      entryIdx: paraEntryIdx || 0,
    };
    this.context.readerContext.navTo && this.context.readerContext.navTo(target, Nav.NAV_PLACEMENT.TOP, false, 'nav.CommentSummary');
  }

  private getNumComments = (pID) => {
    const threadPath = ['threads', pID];
    const thread = this.context.readerContext.getReactionGroupData(this, threadPath, THREADS_MASK);
    const threadSentences: StashOf<{ createUser: string }> = (thread && Util.clone(thread.sentences)) || {};
    const threadSentenceIdxs = Object.keys(threadSentences).map((str: string) => { return parseInt(str); });

    let numComments = 0;
    for (const sentenceIdx of threadSentenceIdxs) {
      const commentPath = threadPath.concat(['sentences', sentenceIdx.toString(), 'comments']);
      const commentStash: StashOf<{userID: string}> = this.context.readerContext.getReactionGroupData(this, commentPath, COMMENTS_MASK);
      numComments += commentStash ? Object.keys(commentStash).length : 0;
    }
    return numComments;
  }

  render() {
    const quietMode = this.context.readerContext.getUIState(this, ['quietMode']);
    if (!quietMode) {
      return null;
    }

    const parsedData = this.context.readerContext.getRawParsedData();
    const entry = parsedData.entries[this.props.entryIdx];
    if (entry.type !== EntryTypes.commentSummary) {
      return null;
    }
    let numCommentsInChapter = 0;
    for (let i = entry.startIdx; i <= entry.endIdx; ++i) {
      const curPara = parsedData.entries[i];
      if (curPara.type !== EntryTypes.paragraph) {
        continue;
      }

      numCommentsInChapter += this.getNumComments(curPara.id);
    }

    const headerText = entry.chapter > -1 ?
      'You missed ' + numCommentsInChapter + ' comments in Chapter ' + entry.chapter :
      'You missed ' + numCommentsInChapter + ' comments';
    const buttonText = 'Read Comments ↑';

    const pageWidth = this.context.readerContext.getUIState(this, ['page', 'width']);
    return (
      <Flex.Col classes={`m-t-25 fs-20 m-b-25 h-150px c-#242224-bg w-${pageWidth} jc-c`}>
        <div style={this.context.readerContext.getFontStyle(this, 'commentSummary')} classes='m-t-30 c-#7af0ff-fg as-c'>{headerText}</div>
        <div classes='fs-40 m-b-30 m-t-12 p-t-8 p-b-8 p-l-15 p-r-15 as-c ta-c br-20 c-charcoal-bg w-150px'
             onClick={this.scrollTo.bind(this, entry.startIdx)}>
          <div style={this.context.readerContext.getFontStyle(this, 'commentSummaryButton')} classes='c-pearl-fg as-c'>{buttonText}</div>
        </div>
      </Flex.Col>
    );
  }
}
