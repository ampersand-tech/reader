/**
* Copyright 2017-present Ampersand Technologies, Inc.
*/

import { ReaderContext } from 'clientjs/components/CanvasReader/ReaderContext';
import * as DB from 'clientjs/db';
import * as GroupUtils from 'clientjs/groupUtils';
import * as Constants from 'clientjs/shared/constants';
import * as Util from 'overlib/shared/util';

const commentMask = Util.objectMakeImmutable({_ids: {createTime: 1, userID: 1}});

export class ReaderReactions {
  context: ReaderContext;
  constructor(context) {
    this.context = context;
  }

  private getOrigComment = (pID, sIdx) => {
    const existingComments = this.context.getReactionGroupData(null, ['threads', pID, 'sentences', sIdx, 'comments'], commentMask);
    let origCommentID: string|null = null;

    for (let id in existingComments) {
      if (!origCommentID || existingComments[origCommentID].createTime > existingComments[id].createTime) {
        origCommentID = id;
      }
    }

    if (origCommentID) {
      return Util.copyFields(existingComments[origCommentID], {id: origCommentID});
    }

    return null;
  }

  public addReactionLocal = (
    reactionKey: string,
    reactionType: Constants.ReactionType,
    count: number,
    rxnPID?: string,
    rxnIndex?: number | string,
  ) => {
    const selPID = this.context.getUIState(null, ['selection', 'pID']);
    const entry = this.context.getUIState(null, ['selection']);
    const entryIndex = entry ? entry.index : -1;
    const pID = rxnPID === undefined ? selPID : rxnPID;
    const index = rxnIndex === undefined ? entryIndex : Number(rxnIndex);
    if (!pID) {
      return;
    }
    if (index === undefined || index === -1) {
      return;
    }
    const reactionGroupID = this.context.getGroupID();
    const contentID = this.context.getBookID();
    const origComment = this.getOrigComment(pID, index);

    if (count) {
      const paraContent = this.context.getParagraphContent(pID);
      GroupUtils.addReaction(reactionGroupID, contentID, pID, index, reactionKey, reactionType, count, paraContent);
      this.context.recordMetric('mark.add', {
        markID: reactionKey,
        startParaID: pID,
        sentenceIdx: index,
        reaction: reactionKey,
        count: count + 1,
        isReply: !!origComment,
        origPoster: origComment ? origComment.userID : null,
      });
    } else {
      GroupUtils.removeReaction(reactionGroupID, contentID, pID, index, reactionKey);
      this.context.recordMetric('mark.remove', {
        markID: reactionKey,
        startParaID: pID,
        sentenceIdx: index,
        reaction: reactionKey,
        isReply: !!origComment,
        origPoster: origComment ? origComment.userID : null,
      });
    }
  }

  public toggleReactionLocal = (reactionKey: string, reactionType: Constants.ReactionType, rxnPID?: string, rxnIndex?: number | string) => {
    const selPID = this.context.getUIState(null, ['selection', 'pID']);
    const entry = this.context.getUIState(null, ['selection']);
    const entryIndex = entry ? entry.index : -1;
    const pID = rxnPID === undefined ? selPID : rxnPID;
    const index = rxnIndex === undefined ? entryIndex : Number(rxnIndex);
    if (!pID) {
      return;
    }
    if (index === undefined || index === -1) {
      return;
    }
    // is it already set?
    const reactionPath = ['threads', pID, 'sentences', index, 'reactions', reactionKey, 'userID', DB.getAccountID(), 'count'];
    const count = this.context.getReactionGroupData(null, reactionPath) || 0;
    this.addReactionLocal(reactionKey, reactionType, count ? 0 : 1, pID, index);
  }

  public addCommentLocal = (note: string) => {
    const pID = this.context.getUIState(null, ['selection', 'pID']);
    const entry = this.context.getUIState(null, ['selection']);
    const index = entry ? entry.index : -1;
    if (!pID) {
      return;
    }
    if (index === undefined || index === -1) {
      return;
    }
    const reactionGroupID = this.context.getGroupID();
    const contentID = this.context.getBookID();
    const commentID = this.context.getUIState(null, ['editCommentID']);
    const origComment = this.getOrigComment(pID, index);

    if (note || commentID) {
      if (commentID) {
        if (!note) {
          GroupUtils.removeComment(reactionGroupID, contentID, entry.pID, entry.index, commentID);
        } else {
          GroupUtils.modifyComment(reactionGroupID, contentID, entry.pID, entry.index, commentID, note);
        }
      } else {
        const paraContent = this.context.getParagraphContent(pID);
        GroupUtils.addComment(reactionGroupID, contentID, entry.pID, entry.index, note, paraContent);
      }
      this.context.recordMetric('comment.add', {
        markID: 'note',
        startParaID: entry.pID,
        sentenceIdx: entry.index,
        reaction: 'note',
        note: note.slice(0, 1024),
        isEdit: !!commentID,
        isReply: !!origComment && origComment.id !== pID,
        origPoster: origComment ? origComment.userID : null,
      });
    }
    this.context.clearSelection();
  }
}
