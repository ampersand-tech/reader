/**
* Copyright 2018-present Ampersand Technologies, Inc.
*/

import { FixedTemplate, registerContextSchema } from 'clientjs/components/FixedTemplate';
import * as DB from 'clientjs/db';
import * as GroupUtils from 'clientjs/groupUtils';
import { getGroupName } from 'clientjs/groupUtils';
import * as KnownData from 'clientjs/KnownData';
import * as ReaderRoutes from 'clientjs/readerRoutes';
import * as Constants from 'clientjs/shared/constants';
import { TEST_FUNC } from 'clientjs/shared/constants';
import * as Util from 'overlib/client/clientUtil';
import { DataWatcher } from 'overlib/client/components/DataWatcher';
import * as Navigation from 'overlib/client/navigation';
import * as ObjSchema from 'overlib/shared/objSchema';
import * as Sketch from 'overlib/shared/sketch';
import * as Types from 'overlib/shared/types';
import * as React from 'react';

import moment = require('moment');
import { hasGroupReads } from 'clientjs/components/ReaderApp/CreateGroup';

const GROUPS_MASK = Util.objectMakeImmutable({
  _ids: {
    channelID: 1,
    createTime: 1,
    members: { _ids: 1 },
    content: { _ids: 1 },
  },
});

const NAME_MASK = Util.objectMakeImmutable({
  name: 1,
});

interface GroupData {
  channelID: Constants.DistributionID;
  createTime: number;
  members: StashOf<1>; // key is accountID
  content: StashOf<1>; // key is contentID (which is distributionID '.' manuscriptID)
}

interface Group {
  name: string;
  imageURL: string;
  square: boolean;
  activityMessage: string | null;
  activityCount: number; // The number of new activity items.  Used for sorting.
  lastReadTimeStamp: number | null;
  lastReadTime: string;
  onClick: (event: React.SyntheticEvent<any>) => void;
  viewGroup: (event: React.SyntheticEvent<any>) => void;
  viewNewActivity: (event: React.SyntheticEvent<any>) => void;
}

function cmpGroups(a: Group, b: Group) {
  const activityDelta = Math.sign(b.activityCount - a.activityCount);
  if (activityDelta !== 0) {
    return activityDelta;
  }

  if (a.lastReadTimeStamp === null) {
    return 1;
  }
  if (b.lastReadTimeStamp === null) {
    return -1;
  }
  return b.lastReadTimeStamp - a.lastReadTimeStamp;
}

export class Groups extends DataWatcher {
  static noTransition = true;

  private loadChannel(groupID: Constants.ReactionGroupID, bookID: Constants.BookID, event: React.SyntheticEvent<any>) {
    Util.eatEvent(event);
    const [channelID] = Constants.splitBookID(bookID);
    Sketch.runAction('distribution.setReactionGroup', channelID, groupID);
    Navigation.go(ReaderRoutes.content2(bookID, groupID));
  }

  private viewGroup(groupID: Constants.ReactionGroupID, bookID: Constants.BookID, event: React.SyntheticEvent<any>) {
    Util.eatEvent(event);
    Navigation.go(ReaderRoutes.group2(groupID, bookID));
  }

  private viewNewActivity(groupID: Constants.ReactionGroupID, bookID: Constants.BookID, event: React.SyntheticEvent<any>) {
    Util.eatEvent(event);
    Navigation.go(ReaderRoutes.content3(bookID, groupID, 'newComments'));
  }

  private startNewGroup = () => {
    Navigation.go(ReaderRoutes.createGroup);
  }

  render() {
    const hasReads = hasGroupReads(this);
    const context = {
      groups: [] as Group[],
      startNewGroup: this.startNewGroup,
      hasReads,
      goToDiscover: () => {
        Navigation.go(ReaderRoutes.discover);
      },
    };

    const groups: StashOf<GroupData> = this.getData(['reactionGroup2'], GROUPS_MASK);

    for (const gid in groups) {
      const groupID = gid as Constants.ReactionGroupID;
      const group = groups[groupID];

      const name = getGroupName(this, groupID);

      for (const _bookID in group.content) {
        const bookID = _bookID as Constants.BookID;
        const [distID, itemID] = Constants.splitBookID(bookID);
        if (!this.getData(['distributions', distID, 'items', itemID], 1)) {
          continue;
        }
        const myAccountID = DB.getAccountID();
        let lastReadTimeStamp: number | null =
          this.getData(['reactionGroup2', groupID, 'content', bookID, 'userID', myAccountID, 'lastOpened'], 1) || null;
        let imageURL = '';
        let activityMessage: string | null = null;
        let lastReadTime: string = '';
        let activityCount = 0;
        let contentType = Constants.CONTENT_TYPE.BOOK;


        const userIDs = GroupUtils.getMemberIDs(this, groupID);

        const lastOpened: number = this.getData(['reactionGroup2', groupID, 'content', bookID, 'userID', myAccountID, 'lastOpened'], 1);

        contentType = this.getData(['distributions', distID, 'items', itemID, 'contentType'], 1) || Constants.CONTENT_TYPE.BOOK;

        imageURL = this.getData(['distributions', distID, 'items', itemID, 'coverImageURL'], 1) || '';
        const activity = GroupUtils.findReactionActivity(this, groupID, bookID, userIDs, lastOpened);

        activityCount = activity.comments;

        const activeUsers = Object.keys(activity.activeUsers).filter(u => u !== myAccountID);

        if (activity.comments > 0 && activeUsers.length > 0) {
          if (activeUsers.length === 1) {
            const userName = KnownData.getKnownInfo(this, 'contacts', activeUsers[0], NAME_MASK, false).name;
            activityMessage = `${userName} left `;
          } else {
            activityMessage = `${activeUsers.length} people left `;
          }

          if (activity.comments > 0) {
            activityMessage += `${Util.pluralize('comment', activity.comments)}`;
          }
        }

        lastReadTime = lastReadTimeStamp ? moment(lastReadTimeStamp).fromNow() : '';

        context.groups.push({
          onClick: (e) => {this.loadChannel(groupID, bookID, e); },
          viewGroup: (e) => {this.viewGroup(groupID, bookID, e); },
          viewNewActivity: (e) => {this.viewNewActivity(groupID, bookID, e); },
          name,
          activityMessage,
          activityCount,
          lastReadTimeStamp,
          lastReadTime,
          imageURL,
          square: Constants.contentTypeAspectRatio(contentType) === 1.0,
        });
      }
    }
    context.groups.sort(cmpGroups);

    return (
      <FixedTemplate template='Groups' testid='Groups' context={context} />
    );
  }
}

const CONTEXT_SCHEMA = {
  groups: ObjSchema.ARRAY_OF({
    name: Types.STRING,
    imageURL: Types.STRING,
    square: Types.BOOL,
    activityMessage: Types.STRING_NULLABLE,
    activityCount: Types.NUMBER,
    lastReadTimeStamp: Types.NUMBER_NULLABLE,
    lastReadTime: Types.STRING,
    onClick: Types.FUNCTION,
    viewGroup: Types.FUNCTION,
    viewNewActivity: Types.FUNCTION,
  }),

  startNewGroup: Types.FUNCTION,
  hasReads: Types.BOOL,
  goToDiscover: Types.FUNCTION,
};

const SAMPLE_CONTEXT = {
  groups: [
    {
      name: 'My First Group',
      imageURL: '',
      square: true,
      activityMessage: 'Andy left a comment',
      activityCount: 1,
      lastReadTimeStamp: Date.now() - 60000,
      lastReadTime: '2d ago',
      onClick: TEST_FUNC,
      viewGroup: TEST_FUNC,
      viewNewActivity: TEST_FUNC,
    },
    {
      name: 'My Second Group',
      imageURL: '',
      square: true,
      activityMessage: null,
      activityCount: 0,
      lastReadTimeStamp: Date.now() - 60000,
      lastReadTime: '2d ago',
      onClick: TEST_FUNC,
      viewGroup: TEST_FUNC,
      viewNewActivity: TEST_FUNC,
    },
    {
      name: 'My Third Group',
      imageURL: '',
      square: false,
      activityMessage: 'Andy left a comment',
      activityCount: 1,
      lastReadTimeStamp: Date.now() - 60000,
      lastReadTime: '2d ago',
      onClick: TEST_FUNC,
      viewGroup: TEST_FUNC,
      viewNewActivity: TEST_FUNC,

    },
    {
      name: 'My Fourth Group',
      imageURL: '',
      square: true,
      activityMessage: null,
      activityCount: 0,
      lastReadTimeStamp: Date.now() - 60000,
      lastReadTime: '2d ago',
      onClick: TEST_FUNC,
      viewGroup: TEST_FUNC,
      viewNewActivity: TEST_FUNC,

    },
    {
      name: 'My Fifth Group',
      imageURL: '',
      square: true,
      activityMessage: 'Andy left a comment',
      activityCount: 1,
      lastReadTimeStamp: Date.now() - 60000,
      lastReadTime: '2d ago',
      onClick: TEST_FUNC,
      viewGroup: TEST_FUNC,
      viewNewActivity: TEST_FUNC,
    },
  ],

  startNewGroup: TEST_FUNC,
  hasReads: true,
  goToDiscover: TEST_FUNC,
};

registerContextSchema(module, 'Groups', CONTEXT_SCHEMA, SAMPLE_CONTEXT);
