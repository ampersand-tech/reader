/**
* Copyright 2018-present Ampersand Technologies, Inc.
*
*/

import * as BottomBar from 'clientjs/components/CanvasReader/BottomBar.tsx';
import { CanvasFace } from 'clientjs/components/CanvasReader/CanvasFace.tsx';
import { ProviderContext } from 'clientjs/components/CanvasReader/ContextProvider';
import { SANS_SERIF_FONT } from 'clientjs/components/CanvasReader/ReaderStyle';
import * as ReaderUX from 'clientjs/components/CanvasReader/ReaderUX.tsx';
import * as StandardAnims from 'clientjs/components/CanvasReader/StandardAnims';
import * as UserColors from 'clientjs/components/ReaderUI/UserColors.tsx';
import * as DB from 'clientjs/db';
import * as GroupUtils from 'clientjs/groupUtils';
import * as Constants from 'clientjs/shared/constants';
import { REACTION_TYPE } from 'clientjs/shared/constants';
import { ReactionSchema } from 'clientjs/shared/reactionGroupDB';
import * as Util from 'overlib/client/clientUtil';
import { DataWatcher } from 'overlib/client/components/DataWatcher.tsx';
import * as Flex from 'overlib/client/components/Flex.tsx';
import { FontDesc } from 'overlib/client/components/Layout/Font';
import * as Log from 'overlib/client/log';
import * as PropTypes from 'prop-types';
import * as React from 'react';

interface Sentiment {
  userIDs: AccountID[];
}
type Topic = StashOf<Sentiment>;
type TopicMap = StashOf<Topic>;

function topicMapFromReactions(reactions: StashOf<ReactionSchema>): TopicMap {
  const ret: TopicMap = {};
  for (const reactionID in reactions) {
    const splt = reactionID.split(':');
    const topic = splt[0];
    const sentiment = splt[1];
    if (!ret[topic]) {
      ret[topic] = {};
    }
    ret[topic][sentiment] = {
      userIDs: Object.keys(reactions[reactionID].userID) as AccountID[],
    };
  }

  return ret;
}

interface ReactionBreakdownFaceProps {
  groupID: Constants.ReactionGroupID;
  userID: AccountID;
  icon: string;
  faceSize: number;
  id: string;
  pID: string;
  sentenceIdx: number;
}

class ReactionBreakdownFace extends DataWatcher<ReactionBreakdownFaceProps, {}> {
  context: ProviderContext;
  static contextTypes = Util.shallowCloneAndCopy(DataWatcher.contextTypes, {
    readerContext: PropTypes.object.isRequired,
  });
  onClick = () => {
    if (DB.getAccountID() === this.props.userID) {
      // we can remove our own
      const id = this.props.id;
      const rc = this.context.readerContext;
      rc.readerReactions.addReactionLocal(id, 'workshop', 0, this.props.pID, this.props.sentenceIdx);
    }
  }
  render() {
    if (!this.props.icon) {
      return null;
    }
    const colorSet = GroupUtils.getColorSet(this, this.props.groupID, this.props.userID);
    const iconElem = BottomBar.getIconElem(true, this.props.icon, this.props.faceSize * 0.5, 'bot-0 right-0');
    return (
      <div classes={`m-r-5 w-${this.props.faceSize} h-${this.props.faceSize}`} onClick={this.onClick}>
        <CanvasFace accountID={this.props.userID} colorSet={colorSet} size={this.props.faceSize} classes='' noColor={true} />
        {iconElem}
      </div>
    );
  }
}

interface ReactionBreakdownProps {
  classes?: string;
  reactions: StashOf<ReactionSchema>;
  primaryID: string;
  primaryUserID: AccountID;
  marginWidth: number;
  marginHeight: number;
  buttonSize: number;
  groupID: Constants.ReactionGroupID;
  closeCB: () => void;
  pID: string;
  sentenceIdx: number;
}

class ReactionBreakdown extends DataWatcher<ReactionBreakdownProps, {}> {
  context: ProviderContext;
  static contextTypes = Util.shallowCloneAndCopy(DataWatcher.contextTypes, {
    readerContext: PropTypes.object.isRequired,
  });
  render() {
    const userReactions: JSX.Element[] = [];
    const bs = this.props.buttonSize;
    const faceSize = bs * 1.2;
    const topicMap: TopicMap = topicMapFromReactions(this.props.reactions);
    const splt = this.props.primaryID.split(':');
    const topic: Topic = topicMap[splt[0]];
    const reactionType: Constants.ReactionType = this.props.reactions[this.props.primaryID].reactionType;
    if (!topic) {
      Log.error('@sam', 'Failed to find topic map info for primary ID', {topicMap, primaryID: this.props.primaryID});
      return;
    }
    for (const sentimentID in topic) {
      const sentiment = topic[sentimentID];
      let icon;
      if (reactionType === 'workshop') {
        icon = this.context.readerContext.getRenderData(this, ['reactions', splt[0], 'subReactions', sentimentID, 'icon']);
      } else {
        icon = this.context.readerContext.getRenderData(this, ['sentiments', sentimentID, 'icon']);
      }
      for (let i = 0; i < sentiment.userIDs.length; ++i) {
        const userID = sentiment.userIDs[i];
        userReactions.push(
          <ReactionBreakdownFace
            key={userID + '-' + icon}
            groupID={this.props.groupID}
            userID={userID}
            faceSize={faceSize}
            icon={icon}
            id={splt[0] + ':' + sentimentID}
            pID={this.props.pID}
            sentenceIdx={this.props.sentenceIdx}
          />,
        );
      }
    }
    const height = bs * 2;
    const offset = this.props.marginHeight * 0.5 - height * 0.5; // center around the icon

    const descFont: FontDesc = {
      fontFamily: SANS_SERIF_FONT,
      fontSize: 17,
      fontStyle: 'normal',
      fontWeight: 400,
      textDecoration: 'none',
      lineSpacing: 1.75,
      verticalAlign: 'baseline',
    };

    return (
      <span
        classes={`c-#333333-bg h-${height} br-r-${bs} left-0 top-${offset} jc-fe ai-c`}
        onClick={this.props.closeCB}
        {...StandardAnims.fade()}
        data-parentTo={this.context.readerContext.getUXOverlayParent()}
      >
        <MarginIcon
          reactionID={this.props.primaryID}
          reactionType={reactionType}
          userID={this.props.primaryUserID}
          marginWidth={this.props.marginWidth}
          buttonSize={bs}
          marginHeight={height}
        />
        <div key='spacer' classes={`m-l-${this.props.marginWidth} m-r-10 c-white-fg`} style={descFont}>{splt[0]}</div>
        {userReactions}
        <div key='spacer2' classes={`w-${bs} h-10 `}/>
      </span>
    );
  }
}

function getPrimaryIcon(reactions: StashOf<ReactionSchema>): {id: string, userID: AccountID, type: Constants.ReactionType} {
  let firstID;
  let firstUserID;
  let firstTime = Infinity;
  let firstType: Constants.ReactionType = 'workshop';
  for (const id in reactions) {
    const reaction = reactions[id];
    for (const userID in reaction.userID) {
      const perUser = reaction.userID[userID];
      if (perUser.modTime < firstTime) {
        firstTime = perUser.modTime;
        firstID = id;
        firstType = reaction.reactionType;
        firstUserID = userID;
      }
    }
  }
  return {
    id: firstID,
    userID: firstUserID,
    type: firstType,
  };
}

interface MarginIconProps {
  userID: AccountID;
  reactionID: string;
  reactionType: Constants.ReactionType;
  buttonSize: number;
  marginWidth: number;
  marginHeight: number;
}

class MarginIcon extends DataWatcher<MarginIconProps, {}> {
  context: ProviderContext;
  static contextTypes = Util.shallowCloneAndCopy(DataWatcher.contextTypes, {
    readerContext: PropTypes.object.isRequired,
  });
  render() {
    const idSplit = this.props.reactionID.split(':');
    const animProps = StandardAnims.fade();

    const groupID = this.context.readerContext.getGroupID();
    const color = UserColors.getUserColor(this, groupID, this.props.userID);

    let bgColor;
    if (this.context.readerContext.getReaderColorMode(this) === Constants.READER_COLOR.DARK) {
      bgColor = `c-${color.trayBase}-bg-a0.5`;
    } else {
      bgColor = `c-${color.trayBase}-bg`;
    }

    const bs = this.props.buttonSize;
    const iconSize = bs * 0.6;

    let icon;
    if (this.props.reactionType === REACTION_TYPE.WORKSHOP) {
      icon = this.context.readerContext.getRenderData(this, ['reactions', idSplit[0], 'icon']);
    } else {
      let sentiment;
      if (idSplit.length === 1) {
        sentiment = idSplit[0];
      } else {
        sentiment = idSplit[1];
      }
      icon = this.context.readerContext.getRenderData(this, ['sentiments', sentiment, 'icon']);
    }
    if (!icon) {
      Log.warn('@sam', 'Unknown reaction:', this.props.reactionID);
      return null;
    }

    // This is a temporary hack to deal with old style multi-color icons that we can't tint
    const iconElem: JSX.Element = BottomBar.getIconElem(true, icon, iconSize);

    const classes = `${bgColor} br-${bs} w-${bs} h-${bs} cc ` +
      `top-${(this.props.marginHeight - bs) * 0.5} left-${(this.props.marginWidth - bs) * 0.5}`;

    return (
      <Flex.Col classes={classes} {...animProps}>
        {iconElem}
      </Flex.Col>
    );
  }
}


interface MarginReactionState {
  showBreakdown: boolean;
}

interface MarginReactionProps {
  classes?: string;
  pID: string;
  sentenceIdx: number;
  marginWidth: number;
  marginHeight: number;
  size: number;
}

export class MarginReaction extends DataWatcher<MarginReactionProps, MarginReactionState> {
  context: ProviderContext;
  static contextTypes = Util.shallowCloneAndCopy(DataWatcher.contextTypes, {
    readerContext: PropTypes.object.isRequired,
  });
  state: MarginReactionState = {
    showBreakdown: false,
  };
  key = 0;

  componentWillUnmount() {
    if (this.state.showBreakdown) {
      this.context.readerContext.replaceUIState(['showReactionBreakdown'], false);
      ReaderUX.hideFullScreenOverlay();
    }
    super.componentWillUnmount();
  }

  hideBreakdown = () => {
    this.setState({ showBreakdown: false });
    this.context.readerContext.replaceUIState(['showReactionBreakdown'], false);
    ReaderUX.hideFullScreenOverlay();
  }

  onClick = () => {
    ReaderUX.createFullScreenOverlay(this.hideBreakdown);
    this.setState({showBreakdown: true});
    this.context.readerContext.replaceUIState(['showReactionBreakdown'], true);
  }

  render() {
    if (!this.props.pID) {
      Log.error('@sam', 'Missing pID in margin reaction prop');
      return null;
    }
    const reactions: StashOf<ReactionSchema> = this.context.readerContext.getReactionGroupData(this,
      ['threads', this.props.pID, 'sentences', this.props.sentenceIdx.toString(), 'reactions'], '*');

    const {id, userID, type} = getPrimaryIcon(reactions);
    const buttonSize = this.props.size;

    return (
      <div
        classes={Util.combineClasses(this.props.classes, ` h-${this.props.marginHeight}`)}
        onClick={this.onClick}
        data-parentTo={this.context.readerContext.getOverlayParent()}
      >
        {this.state.showBreakdown ? <ReactionBreakdown
          key={this.key}
          reactions={reactions}
          primaryID={id}
          primaryUserID={userID}
          marginWidth={this.props.marginWidth}
          buttonSize={buttonSize}
          marginHeight={this.props.marginHeight}
          groupID={this.context.readerContext.getGroupID()}
          closeCB={this.hideBreakdown}
          pID={this.props.pID}
          sentenceIdx={this.props.sentenceIdx}
        /> : null }
        <MarginIcon
          reactionID={id}
          reactionType={type}
          userID={userID}
          marginWidth={this.props.marginWidth}
          buttonSize={buttonSize}
          marginHeight={this.props.marginHeight}
        />
      </div>
    );
  }
}
