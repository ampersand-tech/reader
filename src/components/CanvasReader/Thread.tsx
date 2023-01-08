/**
* Copyright 2017-present Ampersand Technologies, Inc.
*/

import * as BottomBar from 'clientjs/components/CanvasReader/BottomBar.tsx';
import { ProviderContext } from 'clientjs/components/CanvasReader/ContextProvider';
import { EMOJI_TABLE } from 'clientjs/components/CanvasReader/EmojiTable';
import { LayoutTrackerComment } from 'clientjs/components/CanvasReader/LayoutTracker';
import { Paragraph } from 'clientjs/components/CanvasReader/Paragraph.tsx';
import { ParagraphData } from 'clientjs/components/CanvasReader/ParagraphUtils';
import { NoteButtonID } from 'clientjs/components/CanvasReader/UIState';
import * as UserColors from 'clientjs/components/ReaderUI/UserColors.tsx';
import * as DB from 'clientjs/db';
import * as KnownData from 'clientjs/KnownData';
import * as Constants from 'clientjs/shared/constants';
import { REACTION_TYPE } from 'clientjs/shared/constants';
import { CommentEntry } from 'clientjs/shared/reactionGroupDB';
import * as Util from 'overlib/client/clientUtil';
import { DataWatcher } from 'overlib/client/components/DataWatcher.tsx';
import * as Flex from 'overlib/client/components/Flex.tsx';
import { AnimationDef } from 'overlib/client/components/Layout/LayoutAnimator';
import { LayoutNode } from 'overlib/client/components/Layout/LayoutNode';
import * as Log from 'overlib/client/log';
import * as PropTypes from 'prop-types';
import * as React from 'react';

const REACTION_XMARGIN = 6;
const REACTION_XPADDING = 10;

const REACTIONS_MASK = Util.objectMakeImmutable({
  _ids: {
    userID: {
      _ids: {
        modTime: 1,
        count: 1,
      },
    },
  },
});

const CONTACT_MASK = Object.freeze({
  name: 1,
});

const COMMENTS_MASK = Util.objectMakeImmutable({
  _ids:  {
    userID: 1,
    createTime: 1,
  },
});

type CommentsData = StashOf<{ userID: string, createTime: number }>;


class PlusButton extends DataWatcher<{ sentenceIdx: number, entryIdx: number }, {}> {
  context: ProviderContext;
  static contextTypes = Util.shallowCloneAndCopy(DataWatcher.contextTypes, {
    readerContext: PropTypes.object.isRequired,
  });

  onClick = () => {
    this.context.readerContext.selectSentence(this.props.entryIdx, this.props.sentenceIdx);
    if (!this.context.readerContext.isWorkshop(this)) {
      this.context.readerContext.replaceUIState(['showReactionBar'], true);
      this.context.readerContext.replaceUIState(['plusButtonOpen'], false);
    }
  }

  render() {
    return (
      <Flex.Row onClick={this.onClick}>
        <svg classes='c-slate-f w-20 h-20 m-x-5' name='icons/icon_plus_28x28.svg' />
      </Flex.Row>
    );
  }
}

interface ReactionProps {
  reactionID: string;
  width: number;
  users: any;
  reactionPath: string[];
  dontTransition: boolean;
}

class Reaction extends DataWatcher<ReactionProps, {}> {
  context: ProviderContext;
  static contextTypes = Util.shallowCloneAndCopy(DataWatcher.contextTypes, {
    readerContext: PropTypes.object.isRequired,
  });

  private dontTransition = true;

  componentWillMount() {
    super.componentWillMount();
    this.dontTransition = this.props.dontTransition;
  }

  componentDidMount() {
    this.dontTransition = false;
  }

  private toggleReaction = (reactionType) => {
    const userID = DB.getAccountID();
    const path = this.props.reactionPath;  // ['threads', <pid>, 'sentences', <sid>, 'reactions]
    const pid = path[1];
    const sid = path[3];

    for (const id in this.props.users) {
      if (id === userID) {
        this.context.readerContext.readerReactions.addReactionLocal(this.props.reactionID, reactionType, 0, pid, sid);
        return;
      }
    }

    this.context.readerContext.readerReactions.addReactionLocal(this.props.reactionID, reactionType, 1, pid, sid);
  }

  render() {
    const reactionType = this.context.readerContext.getReactionGroupData(this,
      this.props.reactionPath.concat([this.props.reactionID, 'reactionType']));
    const ids = this.props.reactionID.split(':');
    let icon = '';
    switch (reactionType) {
      case REACTION_TYPE.WORKSHOP:
        icon = this.context.readerContext.getRenderData(this, ['reactions', ids[0], 'subReactions', ids[1], 'icon']) || '';
        break;
      case REACTION_TYPE.SENTIMENT:
        let sentiment;
        if (ids.length === 1) {
          sentiment = ids[0];
        } else {
          sentiment = ids[1];
        }
        icon = this.context.readerContext.getRenderData(this, ['sentiments', sentiment, 'icon']) || '';
        break;
      case REACTION_TYPE.EMOJI:
        icon = EMOJI_TABLE[ids[0]][ids[1]];
        break;
      default:
        Log.error('@unassigned', 'invalid reactionType');
    }
    const width = this.props.width - 2 * REACTION_XMARGIN - 2 * REACTION_XPADDING;
    const reactionCount = Object.keys(this.props.users).length;
    const readerID = DB.getAccountID();
    let readerReacted = false;

    for (const id in this.props.users) {
      if (id === readerID && this.props.users[id].count > 0) {
        readerReacted = true;
        break;
      }
    }

    const anims: AnimationDef[] = [];
    const iconAnims: AnimationDef[] = [];
    const heightAnim: AnimationDef = {
      motivator: {
        source: 'time',
        easingFunction: 'easeOutElastic',
        start: 0,
        end: 500,
      },
      modifier: {
        field: 'height',
        start: '80%',
        end: '100%',
      },
    };
    const widthAnim: AnimationDef = {
      motivator: {
        source: 'time',
        easingFunction: 'easeOutElastic',
        start: 0,
        end: 500,
      },
      modifier: {
        field: 'width',
        start: '80%',
        end: '100%',
      },
    };
    const height = 33;

    if (!this.dontTransition) {
      anims.push(heightAnim);
      anims.push(widthAnim);
      anims.push({
        motivator: {
          source: 'time',
          easingFunction: 'easeOutElastic',
          start: 0,
          end: 500,
        },
        modifier: {
          field: 'offsetY',
          start: height * .2,
          end: 0,
        },
      });
      anims.push({
        motivator: {
          source: 'time',
          easingFunction: 'easeOutElastic',
          start: 0,
          end: 500,
        },
        modifier: {
          field: 'offsetX',
          start: this.props.width * .1,
          end: 0,
        },
      });
      iconAnims.push(heightAnim);
      iconAnims.push(widthAnim);
    }

    const iconElem: JSX.Element = reactionType === REACTION_TYPE.EMOJI ?
    <Flex.Col classes='fs-24'>{icon}</Flex.Col> : BottomBar.getIconElem(true, icon, 20);

    const borderColor = readerReacted ? 'readerReactionSelected' : 'readerReactionBorder';
    const countColor = readerReacted ? 'readerReactionSelected' : 'readerTextDimmed';

    return reactionCount === 0 ? null : (
      <Flex.Col classes={`p-x-${REACTION_XMARGIN} p-y-5`} onClick={() => this.toggleReaction(reactionType)}>
        <Flex.Row
          data-anims={anims}
          classes={`w-${width} h-${height} br-8 c-readerReactionBG-bg b-1 c-${borderColor}-b p-x-${REACTION_XPADDING} ai-c`}
        >
          <div data-anims={iconAnims}>
            {iconElem}
          </div>
          <div classes='fg-1' />
          <div data-anims={iconAnims} classes={`c-${countColor}-fg m-r-4`} style={this.context.readerContext.getFontStyle(this, 'reactionCount')}>
            {reactionCount}
          </div>
        </Flex.Row>
      </Flex.Col>
    );
  }
}

class Reactions extends DataWatcher<{ reactionPath: string[], entryIdx: number, dontTransition: boolean }, {}> {
  context: ProviderContext;
  static contextTypes = Util.shallowCloneAndCopy(DataWatcher.contextTypes, {
    readerContext: PropTypes.object.isRequired,
  });
  private dontTransition = true;

  componentWillMount() {
    super.componentWillMount();
    this.dontTransition = this.props.dontTransition;
  }

  componentDidMount() {
    this.dontTransition = false;
  }

  handleShowBreakdown = () => {
    this.context.readerContext.replaceUIState(['showReactionBreakdown'], true);
    this.context.readerContext.replaceUIState(['reactionPath'], this.props.reactionPath);
  }

  render() {
    let children: JSX.Element[] = [];
    const rows: JSX.Element[] = [];

    // todo: replace this logic with flex wrap?
    const maxWidth = this.context.readerContext.getUIState(null, ['page', 'width']) - 20;

    const reactions: Stash = this.context.readerContext.getReactionGroupData(this, this.props.reactionPath, REACTIONS_MASK);
    let accumWidth = 0;
    const width = 79;
    const rowClasses = ''; // none right now but may need later
    const reactionElems: JSX.Element[] = [];
    const sentenceIdx = parseInt(this.props.reactionPath[3]) || 0;

    for (const rid in reactions) {
      const reaction: JSX.Element =
      <Reaction
      key={rid}
      reactionID={rid}
      users={reactions[rid].userID}
      reactionPath={this.props.reactionPath}
      width={width}
      dontTransition={this.dontTransition}/>;

      if (reaction !== null) {
        reactionElems.push(reaction);
      }
    }

    if (reactionElems.length > 0) {
      reactionElems.push(<PlusButton key={'plusButton'} sentenceIdx={sentenceIdx} entryIdx={this.props.entryIdx}/>);
    }

    for (const reaction of reactionElems) {
      if (accumWidth + width > maxWidth) {
        rows.push(
          <Flex.Row key={'row-' + rows.length} classes={rowClasses}>
            {children}
          </Flex.Row>,
        );
        children = [];
        accumWidth = 0;
      }
      accumWidth += width;
      children.push(reaction);
    }

    if (children.length) {
      rows.push(
        <Flex.Row key={'row-' + rows.length} classes={rowClasses}>
          {children}
        </Flex.Row>,
      );
    }

    return <Flex.Col classes='m-b-10 m-l--10' onLongPress={this.handleShowBreakdown}>{rows}</Flex.Col>;
  }
}


interface CommentProps {
  commentPath: string[];
  entryIdx: number;
  attribution: boolean;
  paddingLeft?: number;
  paddingRight?: number;
  dontTransition: boolean;
}

class Comment extends DataWatcher<CommentProps, {}> {
  context: ProviderContext;
  static contextTypes = Util.shallowCloneAndCopy(DataWatcher.contextTypes, {
    readerContext: PropTypes.object.isRequired,
  });

  private dontTransition = true;

  componentWillMount() {
    super.componentWillMount();
    this.dontTransition = this.props.dontTransition;
  }

  componentDidMount() {
    this.dontTransition = false;
  }

  private editComment = () => {
    this.context.readerContext.replaceUIState(['selection'], {
      pID: this.props.commentPath[1],
      entryIdx: (this.props.entryIdx).toString(),
      index: parseInt(this.props.commentPath[3]),
    });
    this.context.readerContext.replaceUIState(['editCommentID'], this.props.commentPath[5]);
    this.context.readerContext.replaceUIState(['activeBar'], NoteButtonID);
  }

  render() {
    const comment: CommentEntry = this.context.readerContext.getReactionGroupData(this, this.props.commentPath, '*');
    if (!comment) {
      return null;
    }

    let attrText = '';
    if (this.props.attribution) {
      const userID: string = this.context.readerContext.getReactionGroupData(this, this.props.commentPath.concat('userID'));
      if (userID === DB.getAccountID()) {
        attrText = 'you said';
      } else {
        let user = KnownData.getKnownInfo(this, 'contacts', userID, CONTACT_MASK);
        attrText = user && user.name ? user.name + ' said' : 'unknown said ';
      }
    }

    const groupID = this.context.readerContext.getGroupID();
    const commentColor = UserColors.getUserColor(this, groupID, comment.userID).inlineBase;

    const commentPara: ParagraphData = {
      type: 'reaction',
      content: comment.text,
    };

    const layoutTracker: LayoutTrackerComment = {
      type: 'comment',
      entryIdx: this.props.entryIdx,
      sentenceIdx: parseInt(this.props.commentPath[3]),
      commentID: this.props.commentPath[this.props.commentPath.length - 1],
    };

    const selection = this.context.readerContext.getEntrySelection(this, this.props.entryIdx.toString());
    const isSelected = Boolean(selection && selection.pID === this.props.commentPath[1] && selection.index === parseInt(this.props.commentPath[3]));
    const showEdit =
      isSelected &&
      comment.userID === DB.getAccountID() &&
      this.context.readerContext.getReaderDocType() !== Constants.READER_DOC_TYPE.WRITER;

    const anims: AnimationDef[] = [];
    if (!this.dontTransition) {
      const pageWidth = this.context.readerContext.getUIState(null, ['page', 'width']);
      anims.push({
        motivator: {
          source: 'time',
          easingFunction: 'easeInOutQuad',
          start: 0,
          end: 250,
        },
        modifier: {
          field: 'height',
          start: '0%',
          end: '100%',
        },
      });
      anims.push({
        motivator: {
          source: 'time',
          easingFunction: 'easeInOutQuad',
          start: 250,
          end: 500,
        },
        modifier: {
          field: 'offsetX',
          start: pageWidth,
          end: 0,
        },
      });
    }

    const editAnims = [{
      motivator: {
        source: 'time',
        easingFunction: 'easeInOutQuad',
        start: 0,
        end: 250,
      },
      modifier: {
        field: 'alpha',
        start: 0,
        end: 1,
      },
    }];

    return (
      <div data-anims={anims} data-layoutTracker={layoutTracker}>
        {!attrText ? null : (
          <div style={this.context.readerContext.getFontStyle(this, 'attribution')} classes='c-#888-fg'>
            {attrText}
          </div>
        )}

        <Flex.Row classes='ai-s'>
          <Paragraph
            paragraph={commentPara}
            classes={`c-${commentColor}-fg m-y-10 p-x-0 fg-1`}
            paddingLeft={this.props.paddingLeft}
            paddingRight={this.props.paddingRight}
          />

          {!showEdit ? null : (
            <div
              style={this.context.readerContext.getFontStyle(this, 'editButton')}
              classes='c-#888-fg'
              onClick={this.editComment}
              data-anims={editAnims}
            >
              edit
            </div>
          )}
        </Flex.Row>
      </div>
    );
  }
}

interface CommentsProps {
  commentPath: string[];
  entryIdx: number;
  paddingLeft?: number;
  paddingRight?: number;
  dontTransition: boolean;
  selected: boolean;
}

class Comments extends DataWatcher<CommentsProps, {}> {
  context: ProviderContext;
  static contextTypes = Util.shallowCloneAndCopy(DataWatcher.contextTypes, {
    readerContext: PropTypes.object.isRequired,
  });

  private dontTransition = true;

  componentWillMount() {
    super.componentWillMount();
    this.dontTransition = this.props.dontTransition;
  }

  componentDidMount() {
    this.dontTransition = false;
  }

  private replyToComment = () => {
    this.context.readerContext.replaceUIState(['selection'], {
      pID: this.props.commentPath[1],
      entryIdx: (this.props.entryIdx).toString(),
      index: parseInt(this.props.commentPath[3]),
    });
    this.context.readerContext.removeUIState(['editCommentID']);
    this.context.readerContext.replaceUIState(['activeBar'], NoteButtonID);

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

  render() {
    const children: JSX.Element[] = [];

    const commentStash: CommentsData = this.context.readerContext.getReactionGroupData(this, this.props.commentPath, COMMENTS_MASK);
    const comments: { userID: string, time: number, cID: string }[] = [];
    for (const cid in commentStash) {
      comments.push({
        userID: commentStash[cid].userID,
        time: commentStash[cid].createTime,
        cID: cid,
      });
    }
    comments.sort(function(b, a) {
      return b.time - a.time;
    });

    let prevUID;
    let commentCTA;
    for (const comment of comments) {
      let attribution: boolean = false;
      if (comment.userID !== prevUID) {
        attribution = true;
      }
      prevUID = comment.userID;
      const cID = comment.cID;

      children.push((
        <Comment
          key={'comment_' + cID}
          entryIdx={this.props.entryIdx}
          commentPath={this.props.commentPath.concat(cID)}
          attribution={attribution}
          paddingLeft={this.props.paddingLeft}
          paddingRight={this.props.paddingRight}
          dontTransition={this.dontTransition}
        />
      ));

      if (this.context.readerContext.getUIState(this, ['activeBar']) !== NoteButtonID) {
        if (comments.length) {
          commentCTA = 'Reply →';
        }
      }
    }

    return (
      <div onClick={this.replyToComment}>
        {children}
        {!commentCTA ? null : (
          <div classes='c-readerReply-fg p-b-30' style={this.context.readerContext.getFontStyle(this, 'replyButton')}>
            {commentCTA}
          </div>
        )}
      </div>
    );
  }
}

interface ThreadProps {
  entryIdx: number;
  threadPath: string[];
  classes?: string;
  paddingLeft?: number;
  paddingRight?: number;
  dontTransition: boolean;
  hiddenComments?: number;
  selected: boolean;
}

export class Thread extends DataWatcher<ThreadProps, {}> {
  private dontTransition = true;
  private registeredAsSelected: boolean = false;
  private node: LayoutNode;

  context: ProviderContext;
  static contextTypes = Util.shallowCloneAndCopy(DataWatcher.contextTypes, {
    readerContext: PropTypes.object.isRequired,
  });

  componentWillMount() {
    super.componentWillMount();
    this.dontTransition = this.props.dontTransition;
  }

  componentDidMount() {
    this.dontTransition = false;
    if (this.props.selected) {
      this.handleSelectedStatus(this.props);
    }
  }

  componentWillReceiveProps(nextProps) {
    if (this.props.selected !== nextProps.selected) {
      this.handleSelectedStatus(nextProps);
    }
  }

  private handleSelectedStatus = (props: ThreadProps) => {
    if (props.selected) {
      this.context.readerContext.registerLayoutID('selectedThread', this.node);
    } else if (this.registeredAsSelected) {
      this.context.readerContext.registerLayoutID('selectedThread', null);
      this.registeredAsSelected = false;
    }
  }

  private setLayoutNode = (node: any) => {
    this.node = node;
  }

  render() {

    const quietMode = this.context.readerContext.getUIState(this, ['quietMode']);
    const hiddenComments = this.props.hiddenComments || 0;
    const showHint = quietMode && this.props.selected && hiddenComments > 0;

    return (
      <div classes={this.props.classes} ref={this.setLayoutNode}>
        <Reactions key='reactions'
          reactionPath={this.props.threadPath.concat('reactions')}
          entryIdx={this.props.entryIdx}
          dontTransition={this.dontTransition}
        />
        {showHint ?
          <CommentHint key='commentHint'
            numComments={hiddenComments}
            paddingLeft={this.props.paddingLeft}
            paddingRight={this.props.paddingRight} /> :
          <Comments key='comments'
            commentPath={this.props.threadPath.concat('comments')}
            entryIdx={this.props.entryIdx}
            paddingLeft={this.props.paddingLeft}
            paddingRight={this.props.paddingRight}
            dontTransition={this.dontTransition}
            selected={this.props.selected}
          />
        }
      </div>
    );
  }
}

class CommentHint extends DataWatcher<{numComments: number, paddingLeft?: number, paddingRight?: number}, {}> {
  context: ProviderContext;
  static contextTypes = Util.shallowCloneAndCopy(DataWatcher.contextTypes, {
    readerContext: PropTypes.object.isRequired,
  });

  onClick = () => {
    this.context.readerContext.setQuietMode(false);
  }

  render() {
    const pageWidth = this.context.readerContext.getUIState(this, ['page', 'width']);
    const commentString = this.props.numComments === 1 ? 'Comment' : 'Comments';
    const text = this.props.numComments + ' ' + commentString + ' has been left here';
    const paddingLeft = this.props.paddingLeft || 0;
    const paddingRight = this.props.paddingRight || 0;
    return (
      <Flex.Col classes={`w-${pageWidth} p-l-${paddingLeft} p-r-${paddingRight} ai-fs m-b-10`} onClick={this.onClick}>
        <div style={this.context.readerContext.getFontStyle(this, 'commentHintHeader')}
             classes='p-t-5'>{text}</div>
        <div style={this.context.readerContext.getFontStyle(this, 'commentHintFooter')}
             classes='as-fs c-#7af0ff-fg p-b-5'>SHOW ALL COMMENTS</div>
      </Flex.Col>
    );
  }
}
