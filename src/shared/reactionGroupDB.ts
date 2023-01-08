/**
* Copyright 2017-present Ampersand Technologies, Inc.
*/

import * as blueimpMd5 from 'blueimp-md5';
import * as Constants from 'clientjs/shared/constants';
import * as Jobs from 'overlib/shared/jobs';
import * as Perms from 'overlib/shared/perms';
import * as Sketch from 'overlib/shared/sketch';
import * as Types from 'overlib/shared/types';
import * as Util from 'overlib/shared/util';

export type ReactionStyle = 'sentiment';

const MAX_COMMENT_LENGTH = 5 * 1024;


const REACTION_SCHEMA: Types.Schema = {
  reactionType: Types.createEnum('REACTION_TYPE', Constants.REACTION_TYPE),
  userID: Sketch.ACCOUNT_MAP({
    count: Types.INT,
    modTime: Types.TIME,
  }),
};

const COMMENT_SCHEMA: Types.Schema = {
  userID: Types.ACCOUNTIDSTR,
  createTime: Types.TIME,
  text: Types.LONGSTR,
};

const REACTION_ACTIVITY_SCHEMA: Types.Schema = {
  oldestTime: Types.TIME,
  mostRecentTime: Types.TIME,
  reactions: Types.INT,
  comments: Types.INT,
  activeUsers: Sketch.MAP({id: Types.IDSTR}),
};
const READING_ACTIVITY_SCHEMA: Types.Schema = {
  oldestTime: Types.TIME,
  mostRecentTime: Types.TIME,
  charsRead: Types.INT,
  activeUsers: Sketch.MAP({id: Types.IDSTR}),
};
const PROGRESS_SCHEMA: Types.Schema = {
  chars: Types.INT,
};

const REACTION_GROUP_SCHEMA = {
  name: Types.SHORTSTR,
  channelID: Types.IDSTR, // which channel this reaction group corresponds to
  createTime: Types.TIME,
  reactionStyle: Types.SHORTSTR_NULLABLE,

  content: Sketch.MAP({
    threads: Sketch.MAP({ // pID
      sentences: Sketch.MAP({
        createUser: Types.ACCOUNTIDSTR,
        modTime: Types.TIME,
        reactions: Sketch.MAP(REACTION_SCHEMA), // reaction type is key
        comments: Sketch.MAP(COMMENT_SCHEMA),
        // additional content types here or in Comment Schema
        // content cache, book checksum here
        _personal: {
          lastRead: Types.TIME,
        },
      }),
    }),
    userID: Sketch.ACCOUNT_MAP({
      lastOpened: Types.TIME,
      lastPos: Types.INT,
      reactionActivity: REACTION_ACTIVITY_SCHEMA,
      readingActivity: READING_ACTIVITY_SCHEMA,
      progress: Sketch.MAP(PROGRESS_SCHEMA), // keyed by time the progress started
    }),
    _personal: {
      lastViewedToc: Types.TIME,
    },
  }),

  members: Sketch.EACH_MEMBER({
    joinTime: Types.TIME,
    colorSet: Types.INT_NULLABLE,
    _personal: {
      _deprecated: {
        colorSetOverride: Types.INT_NULLABLE,
      },
    },
  }),

  pendingInvites: Sketch.MAP({//emails or hashes of emails
    inviteTime: Types.TIME,
    name: Types.SHORTSTR,
  }),

  memberListModTime: Types.TIME,
  _personal: {
    memberListDisplayTime: Types.TIME,
    colorSetOverrides: Sketch.ACCOUNT_MAP({
      colorSet: Types.INT_NULLABLE,
    }),
  },

  hashTags: Sketch.MAP({
    count: Types.NUMBER,
    mostRecentUsage: Types.TIME,
  }),
  _deprecated: {
    hashTagsInit: Types.BOOL,
  },
};

function isInGroup(ctx: Context, groupID: Constants.ReactionGroupID, cb: ErrDataCB<boolean>) {
  // TODO ideally this would be baked into sketch somehow; this is just a mispredict check
  Sketch.getClientData(ctx, ['reactionGroup2', groupID], 1, function(err) {
    if (Util.isNotFound(err)) {
      // throw it away, user was probably removed
      return cb(null, false);
    }
    if (err) {
      return cb(err);
    }
    cb(null, true);
  });
}

function checkCommentLength(_ctx: Context, text: string, cb: ErrDataCB<any>) {
  if (text.length > MAX_COMMENT_LENGTH) {
    return cb('comment too long');
  }
  cb();
}

export interface HashTagData {
  count: number;
  mostRecentUsage: number;
}
export interface HashTag extends HashTagData {
  tag: string;
}

export interface ReactionSchema {
  reactionType: Constants.ReactionType;
  userID: StashOf<{
    count: number;
    modTime: number;
  }>;
}

export interface CommentEntry {
  userID: AccountID;
  createTime: number;
  text: string;
}

export interface SentenceSchema {
  createUser: AccountID;
  modTime: number;
  reactions: StashOf<ReactionSchema>; // reaction type
  comments: StashOf<CommentEntry>;
  lastRead: number; // personal field
  // additional content types here or in Comment Schema
  // content cache, book checksum here
}

export interface ThreadSchema {
  sentences: StashOf<SentenceSchema>;
}
export interface ReactionActivitySchema {
  oldestTime: number;
  mostRecentTime: number;
  reactions: number;
  comments: number;
  activeUsers: StashOf<{id: string}>;
}
export interface ReadingActivitySchema {
  oldestTime: number;
  mostRecentTime: number;
  charsRead: number;
  activeUsers: StashOf<{id: string}>;
}
export interface ProgressSchema {
  chars: number;
}
export interface ReactionGroupSchema {
  name: string;
  channelID: Constants.DistributionID; // which channel this corresponds to
  createTime: number;
  reactionStyle: ReactionStyle|null;

  // Content data for the group, split by bookID
  content: StashOf<{

    // Thread data split by contentID
    // Note there is a dummy id for content-less threads
    threads: StashOf<ThreadSchema>;

    // user info within a content, split by userID
    userID: StashOf<{
      lastOpened: number;
      lastPos: number;
      reactionActivity: ReactionActivitySchema;
      readingActivity: ReadingActivitySchema;
      progress: StashOf<ProgressSchema>; // user's progress within content, split by timestamp of progress
    }>;

    lastViewedToc: number;
  }>;

  // info about members of the group, by userID
  members: StashOf<{
    joinTime: number;
    colorSet: number|null;
  }>;

  pendingInvites: StashOf<{ // emails or hashes of emails
    inviteTime: number;
    name: string;
  }>;

  memberListModTime: number;
  memberListDisplayTime: number;

  colorSetOverrides: StashOf<{
    colorSet: number|null;
  }>;

  hashTags: StashOf<HashTagData>;
}

export const reactionGroupDB = Sketch.defineSharedTable('reactionGroup2', Sketch.MAP(REACTION_GROUP_SCHEMA));

Sketch.addIndex(reactionGroupDB.sqlTables.sketchreactiongroup2, { channelID: 1 }, {});

export function emailToReactionKey(email: NormalizedEmail): string {
  return blueimpMd5(email);
}

Sketch.defineAction('reactionGroup2.create', actionCreateReactionGroup2, {
  paramTypes: {
    channelID: Types.IDSTR,
    bookID: Types.IDSTR_NULLABLE,
  },
});
function actionCreateReactionGroup2(
  ctx: Context,
  channelID: Constants.DistributionID,
  bookID: Constants.BookID | null,
  cb: ErrDataCB<Constants.ReactionGroupID>,
) {
  const groupID = Sketch.clientUUID(ctx, 'groupID') as Constants.ReactionGroupID;
  const path = ['reactionGroup2', groupID];
  const group: ReactionGroupSchema = Sketch.clientDataForCreate(ctx, path);
  group.channelID = channelID;
  group.createTime = Sketch.clientTime(ctx);
  group.members[ctx.user.id].joinTime = group.createTime;
  Sketch.insertClientData(ctx, path, group, function(err) {
    if (err) {
      return cb(err);
    }
    if (bookID === null) {
      return cb(null, groupID);
    }

    const contentPath = path.concat(['content', bookID, 'userID', ctx.user.id]);

    const d = Sketch.clientDataForCreate(ctx, contentPath);
    d.lastOpened = Sketch.clientTime(ctx);

    const jobs = new Jobs.Queue();
    jobs.add(Sketch.initializeClientPath, ctx, contentPath);
    jobs.add(Sketch.updateClientData, ctx, contentPath, d);
    jobs.drain(err2 => {
      if (err2) {
        return cb(err2);
      } else {
        return cb(null, groupID);
      }
    });
  });
}

Sketch.defineAction('reactionGroup2.setReactionCount', actionSetReactionCount, {
  paramTypes: {
    groupID: Types.IDSTR,
    contentID: Types.IDSTR,
    threadID: Types.IDSTR,
    sentenceIdx: Types.INT,
    reactionID: Types.IDSTR,
    reactionType: Types.createEnum('REACTION_TYPE', Constants.REACTION_TYPE, true),
    userID: Types.IDSTR,
    count: Types.INT,
  },
});
function actionSetReactionCount(
  ctx: Context,
  groupID: Constants.ReactionGroupID,
  contentID: Constants.BookID,
  threadID: string,
  sentenceIdx: number,
  reactionID: string,
  reactionType: Constants.ReactionType | null,
  _userID: string,
  count: number,
  cb: ErrDataCB<any>,
) {
  isInGroup(ctx, groupID, (err1, inGroup) => {
    if (err1 || !inGroup) {
      return cb(err1);
    }

    const countPath = [
      'reactionGroup2', groupID,
      'content', contentID,
      'threads', threadID,
      'sentences', (sentenceIdx).toString(),
      'reactions', reactionID,
      'userID', ctx.user.id,
    ];

    reactionType = reactionType || 'workshop';

    Sketch.getClientData(ctx, countPath.slice(0, 9), Util.IDS_MASK, function(err2, _sentence) {
      const clientTime = Sketch.clientTime(ctx);
      if (Util.isNotFound(err2)) {
        const jobs = new Jobs.Queue();
        jobs.add(Sketch.initializeClientPath, ctx, countPath);
        jobs.add(Sketch.updateClientData, ctx, countPath.slice(0, 8), { createUser: ctx.user.id, modTime: clientTime, lastRead: clientTime });
        jobs.add(Sketch.replaceClientData, ctx, countPath.slice(0, 10).concat('reactionType'), reactionType);
        jobs.add(Sketch.replaceClientData, ctx, countPath, { count: count, modTime: clientTime });
        jobs.drain(cb);
      } else if (!err2) {
        const jobs = new Jobs.Queue();
        jobs.add(Sketch.initializeClientPath, ctx, countPath);
        jobs.add(Sketch.updateClientData, ctx, countPath.slice(0, 8), { modTime: clientTime, lastRead: clientTime });
        jobs.add(Sketch.replaceClientData, ctx, countPath.slice(0, 10).concat('reactionType'), reactionType);
        jobs.add(Sketch.replaceClientData, ctx, countPath, { count: count, modTime: clientTime });
        jobs.drain(cb);
      } else {
        return cb(err2);
      }
    });
  });
}

Sketch.defineAction('reactionGroup2.deleteUserReaction', deleteUserReaction, {
  paramTypes: {
    groupID: Types.IDSTR,
    contentID: Types.IDSTR,
    threadID: Types.IDSTR,
    sentenceIdx: Types.INT,
    reactionID: Types.IDSTR,
    userID: Types.IDSTR,
  },
});
function deleteUserReaction(
  ctx: Context,
  groupID: Constants.ReactionGroupID,
  contentID: Constants.BookID,
  threadID: string,
  sentenceIdx: number,
  reactionID: string,
  _userID: string,
  cb: ErrDataCB<any>,
) {
  isInGroup(ctx, groupID, (err1, inGroup) => {
    if (err1 || !inGroup) {
      return cb(err1);
    }

    const myReactionPath = [
      'reactionGroup2', groupID,
      'content', contentID,
      'threads', threadID,
      'sentences', (sentenceIdx).toString(),
      'reactions', reactionID,
      'userID', ctx.user.id,
    ];

    const reactionPath = myReactionPath.slice(0, -2);

    Sketch.getClientData(ctx, reactionPath.concat('userID'), Util.IDS_MASK, function(err2, userIDs) {
      if (err2) {
        return cb(err2);
      }
      const userCount = Object.keys(userIDs).length;
      const isMine: Boolean = userIDs.hasOwnProperty(ctx.user.id);
      if (!isMine) {
        return cb('not allowed to remove reactions that aren\'t yours');
      }
      const jobs = new Jobs.Queue();
      if (userCount === 1) {
        // Just remove the whole thing
        jobs.add(Sketch.removeClientDataIfExists, ctx, reactionPath);
      } else {
        // only remove my reaction
        jobs.add(Sketch.removeClientDataIfExists, ctx, myReactionPath);
      }
      jobs.add(killSentenceIfEmpty, ctx, groupID, contentID, threadID, sentenceIdx);
      jobs.drain(cb);
    });
  });
}

function updateHashTag(ctx: Context, groupID: Constants.ReactionGroupID, hash: string, time: number, cb: ErrDataCB<any>) {
  const hashPath = ['reactionGroup2', groupID, 'hashTags', hash];
  Sketch.getClientData(ctx, hashPath, '*', function(err, hashTag: HashTagData) {
    if (Util.isNotFound(err)) {
      Sketch.insertClientData(ctx, hashPath, {
        count: 1,
        mostRecentUsage: time,
      }, cb);
    } else if (!err) {
      Sketch.updateClientData(ctx, hashPath, {
        count: hashTag.count + 1,
        mostRecentUsage: time,
      }, cb);
    } else {
      cb(err);
    }
  });
}

function updateHashTags(ctx: Context, groupID: Constants.ReactionGroupID, text: string, time: number, cb: ErrDataCB<any>) {
  const hashTags: string[] = Util.extractHashTags(text);
  if (!hashTags.length) {
    return cb();
  }
  const jobs = new Jobs.Queue();
  for (let i = 0; i < hashTags.length; ++i) {
    const hash = hashTags[i];
    if (hash.length > 32) { // IDSTR length
      continue;
    }
    jobs.add(updateHashTag, ctx, groupID, hash, time);
  }

  jobs.drain(cb);
}

Sketch.defineAction('reactionGroup2.addComment', actionAddComment, {
  perms: [ checkCommentLength ],
  paramTypes: {
    groupID: Types.IDSTR,
    contentID: Types.IDSTR,
    threadID: Types.IDSTR,
    sentenceIdx: Types.INT,
    userID: Types.IDSTR,
    text: Types.LONGSTR,
  },
});
function actionAddComment(
  ctx: Context,
  groupID: Constants.ReactionGroupID,
  contentID: Constants.BookID,
  threadID: string,
  sentenceIdx: number,
  _userID: string,
  text: string,
  cb: ErrDataCB<any>,
) {
  isInGroup(ctx, groupID, (err1, inGroup) => {
    if (err1 || !inGroup) {
      return cb(err1);
    }

    const commentID = Sketch.clientUUID(ctx, 'commentID');
    const countPath = [
      'reactionGroup2', groupID,
      'content', contentID,
      'threads', threadID,
      'sentences', (sentenceIdx).toString(),
      'comments', commentID,
    ];

    Sketch.getClientData(ctx, countPath.slice(0, 9), Util.IDS_MASK, function(err2, _sentence) {
      const time = Sketch.clientTime(ctx);
      if (Util.isNotFound(err2)) {
        const jobs = new Jobs.Queue();
        jobs.add(Sketch.initializeClientPath, ctx, countPath);
        jobs.add(Sketch.updateClientData, ctx, countPath.slice(0, 8), { createUser: ctx.user.id, modTime: time, lastRead: time });
        jobs.add(Sketch.replaceClientData, ctx, countPath, { userID: ctx.user.id, createTime: time, text: text });
        jobs.add(updateHashTags, ctx, groupID, text, time);
        jobs.drain(cb);
      } else if (!err2) {
        const jobs = new Jobs.Queue();
        jobs.add(Sketch.initializeClientPath, ctx, countPath);
        jobs.add(Sketch.updateClientData, ctx, countPath.slice(0, 8), { modTime: time, lastRead: time });
        jobs.add(Sketch.replaceClientData, ctx, countPath, { userID: ctx.user.id, createTime: time, text: text });
        jobs.add(updateHashTags, ctx, groupID, text, time);
        jobs.drain(cb);
      } else {
        return cb(err2);
      }
    });
  });
}

Sketch.defineAction('reactionGroup2.modifyComment', actionEditComment, {
  supersedeBy: ['groupID', 'contentID', 'threadID', 'sentenceIdx', 'commentID'],
  perms: [ checkCommentLength ],
  paramTypes: {
    groupID: Types.IDSTR,
    contentID: Types.IDSTR,
    threadID: Types.IDSTR,
    sentenceIdx: Types.INT,
    userID: Types.IDSTR,
    commentID: Types.IDSTR,
    text: Types.LONGSTR,
  },
});
function actionEditComment(
  ctx: Context,
  groupID: Constants.ReactionGroupID,
  contentID: Constants.BookID,
  threadID: string,
  sentenceIdx: number,
  _userID: string,
  commentID: string,
  text: string,
  cb: ErrDataCB<any>,
) {
  isInGroup(ctx, groupID, (err1, inGroup) => {
    if (err1 || !inGroup) {
      return cb(err1);
    }

    const commentPath = [
      'reactionGroup2', groupID,
      'content', contentID,
      'threads', threadID,
      'sentences', (sentenceIdx).toString(),
      'comments', commentID,
    ];

    const jobs = new Jobs.Queue();
    jobs.add(Sketch.initializeClientPath, ctx, commentPath);
    jobs.add(Sketch.updateClientData, ctx, commentPath, { userID: ctx.user.id, text: text });
    jobs.drain(cb);
  });
}


const SENTENCE_COUNTS_MASK = Util.objectMakeImmutable({
  comments: {
    _ids: 1,
  },
  reactions: {
    _ids: 1,
  },
});

function killSentenceIfEmpty(
  ctx: Context,
  groupID: Constants.ReactionGroupID,
  contentID: Constants.BookID,
  threadID: string,
  sentenceIdx: number,
  cb: ErrDataCB<any>,
) {
  const sentencePath = [
    'reactionGroup2', groupID,
    'content', contentID,
    'threads', threadID,
    'sentences', (sentenceIdx).toString(),
  ];
  Sketch.getClientData(ctx, sentencePath, SENTENCE_COUNTS_MASK, function(err, sentence) {
    if (Util.isNotFound(err)) {
      return cb();
    }
    if (err) {
      return cb(err);
    }
    let commentCount = Object.keys(sentence.comments).length;
    let reactionCount = Object.keys(sentence.reactions).length;
    if (!commentCount && !reactionCount) {
      // kill it
      return Sketch.removeClientDataIfExists(ctx, sentencePath, cb);
    }
    cb();
  });
}

Sketch.defineAction('reactionGroup2.deleteComment', actionDeleteComment, {
  paramTypes: {
    groupID: Types.IDSTR,
    contentID: Types.IDSTR,
    threadID: Types.IDSTR,
    sentenceIdx: Types.INT,
    commentID: Types.IDSTR,
  },
});
function actionDeleteComment(
  ctx: Context,
  groupID: Constants.ReactionGroupID,
  contentID: Constants.BookID,
  threadID: string,
  sentenceIdx: number,
  commentID: string,
  cb: ErrDataCB<any>,
) {
  isInGroup(ctx, groupID, (err1, inGroup) => {
    if (err1 || !inGroup) {
      return cb(err1);
    }

    const commentPath = [
      'reactionGroup2', groupID,
      'content', contentID,
      'threads', threadID,
      'sentences', (sentenceIdx).toString(),
      'comments', commentID,
    ];

    const jobs = new Jobs.Queue();
    jobs.add(Sketch.removeClientDataIfExists, ctx, commentPath);
    jobs.add(killSentenceIfEmpty, ctx, groupID, contentID, threadID, sentenceIdx);
    jobs.drain(cb);
  });
}

Sketch.defineAction('reactionGroup2.updatePos', actionUpdatePos, {
  supersedeBy: ['groupID', 'contentID'],
  paramTypes: {
    groupID: Types.IDSTR,
    contentID: Types.IDSTR,
    userID: Types.IDSTR,
    pos: Types.INT,
  },
});
function actionUpdatePos(
  ctx: Context,
  groupID: Constants.ReactionGroupID,
  contentID: Constants.BookID,
  _userID: string,
  pos: number,
  cb: ErrDataCB<any>,
) {
  isInGroup(ctx, groupID, (err, inGroup) => {
    if (err || !inGroup) {
      return cb(err);
    }

    const countPath = [
      'reactionGroup2', groupID,
      'content', contentID,
      'userID', ctx.user.id,
    ];

    const jobs = new Jobs.Queue();
    jobs.add(Sketch.initializeClientPath, ctx, countPath);
    jobs.add(Sketch.updateClientData, ctx, countPath, { lastPos: pos });
    jobs.drain(cb);
  });
}

Sketch.defineAction('reactionGroup2.updateLastViewedTocTime', actionUpdateLastViewedTocTime, {
  supersedeBy: ['groupID', 'contentID'],
  paramTypes: {
    groupID: Types.IDSTR,
    contentID: Types.IDSTR,
  },
});
function actionUpdateLastViewedTocTime(ctx: Context, groupID: Constants.ReactionGroupID, contentID: Constants.BookID, cb: ErrDataCB<any>) {
  isInGroup(ctx, groupID, (err1, inGroup) => {
    if (err1 || !inGroup) {
      return cb(err1);
    }

    const contentpath = ['reactionGroup2', groupID, 'content', contentID];

    Sketch.getClientData(ctx, contentpath, 1, function(err) {
      if (err && !Util.isNotFound(err)) { return cb(err); }
      if (err) { return cb(); }

      Sketch.updateClientData( ctx, contentpath, { lastViewedToc: Sketch.clientTime(ctx) }, cb);
    });
  });
}

Sketch.defineAction('reactionGroup2.updateLastReadTime', actionUpdateLastReadTime, {
  supersedeBy: ['groupID', 'contentID', 'threadID'],
  paramTypes: {
    groupID: Types.IDSTR,
    contentID: Types.IDSTR,
    threadID: Types.IDSTR,
  },
});
function actionUpdateLastReadTime(
  ctx: Context,
  groupID: Constants.ReactionGroupID,
  contentID: Constants.BookID,
  threadID: string,
  cb: ErrDataCB<any>,
) {
  isInGroup(ctx, groupID, (err1, inGroup) => {
    if (err1 || !inGroup) {
      return cb(err1);
    }

    const threadPath = ['reactionGroup2', groupID, 'content', contentID, 'threads', threadID];

    Sketch.getClientData(ctx, threadPath.concat(['sentences']), Util.IDS_MASK, function(err, data) {
      if (err && !Util.isNotFound(err)) { return cb(err); }
      const jobs = new Jobs.Queue();

      for (let id in data) {
        jobs.add(Sketch.updateClientData, ctx, threadPath.concat(['sentences', id]), { lastRead: Sketch.clientTime(ctx) });
      }

      jobs.drain(cb);
    });
  });
}

Sketch.defineAction('reactionGroup2.updateMemberListDisplayTime', actionUpdateMemberListDisplayTime, {
  supersedeBy: ['groupID'],
  paramTypes: {
    groupID: Types.IDSTR,
  },
});
function actionUpdateMemberListDisplayTime(
  ctx: ServerContext,
  groupID: Constants.ReactionGroupID,
  cb: ErrDataCB<any>,
) {
  isInGroup(ctx, groupID, (err1, inGroup) => {
    if (err1 || !inGroup) {
      return cb(err1);
    }

    const path = ['reactionGroup2', groupID];
    Sketch.updateMember( ctx, path, ctx.user.id, { memberListDisplayTime: Sketch.clientTime(ctx) }, cb);
  });
}

Sketch.defineAction('reactionGroup2.replaceColorSetOverride', actionReplaceColorSetOverride, {
  supersedeBy: ['groupID', 'userID'],
  paramTypes: {
    groupID: Types.IDSTR,
    userID: Types.IDSTR,
    colorSet: Types.INT,
  },
});
function actionReplaceColorSetOverride(
  ctx: Context,
  groupID: Constants.ReactionGroupID,
  userID: AccountID,
  colorSet: number,
  cb: ErrDataCB<any>,
) {
  isInGroup(ctx, groupID, (err1, inGroup) => {
    if (err1 || !inGroup) {
      return cb(err1);
    }

    const colorSetPath = ['reactionGroup2', groupID, 'colorSetOverrides', userID];
    const jobs = new Jobs.Queue();

    jobs.add(Sketch.initializeClientPath, ctx, colorSetPath);
    jobs.add(Sketch.updateClientData, ctx, colorSetPath, { colorSet: colorSet });

    jobs.drain(cb);
  });
}

Sketch.defineAction('reactionGroup2.createPendingInvite', actionInviteCreate, {
  paramTypes: {
    groupID: Types.IDSTR,
    email: Types.STRING,
    name: Types.STRING,
  },
  _deprecated: true,
});
function actionInviteCreate(ctx: Context, groupID: Constants.ReactionGroupID, email: string, name: string, cb: ErrDataCB<any>) {
  isInGroup(ctx, groupID, (err1, inGroup) => {
    if (err1 || !inGroup) {
      return cb(err1);
    }

    const cleanEmail = Constants.normalizeEmail(email);
    const path = ['reactionGroup2', groupID, 'pendingInvites', emailToReactionKey(cleanEmail)];
    Sketch.getClientData(ctx, path, {inviteTime: 1}, function(err, res) {
      if (err && !Util.isNotFound(err)) { return cb(err); }
      if (res) {
        return cb('invite already exists');
      }

      const jobs = new Jobs.Queue();
      jobs.add(Sketch.initializeClientPath, ctx, path);
      jobs.add(Sketch.replaceClientData, ctx, path, {name, inviteTime: Sketch.serverTime(ctx)});
      jobs.drain(cb);
    });
  });
}

Sketch.defineAction('reactionGroup2.removePendingInvite', actionInviteRemove, {
  paramTypes: {
    groupID: Types.IDSTR,
    email: Types.STRING,
  },
});
function actionInviteRemove(ctx: Context, groupID: Constants.ReactionGroupID, email: string, cb: ErrDataCB<any>) {
  isInGroup(ctx, groupID, (err1, inGroup) => {
    if (err1 || !inGroup) {
      return cb(err1);
    }

    const cleanEmail = Constants.normalizeEmail(email);
    const jobs = new Jobs.Queue();
    jobs.add(Sketch.removeClientDataIfExists, ctx, ['reactionGroup2', groupID, 'pendingInvites', cleanEmail]);
    jobs.add(Sketch.removeClientDataIfExists, ctx, ['reactionGroup2', groupID, 'pendingInvites', emailToReactionKey(cleanEmail)]);
    jobs.drain(cb);
  });
}

Sketch.defineAction('reactionGroup2.setName', actionSetName, {
  paramTypes: {
    groupID: Types.IDSTR,
    name: Types.STRING,
  },
});

function actionSetName(ctx: Context, groupID: Constants.ReactionGroupID, name: string, cb: ErrDataCB<{}>) {
  isInGroup(ctx, groupID, (err1, inGroup) => {
    if (err1 || !inGroup) {
      return cb(err1);
    }

    Sketch.updateClientData(ctx, ['reactionGroup2', groupID, 'name'], name, cb);
  });
}

Sketch.defineAction('reactionGroup2.setReactionStyle', actionSetReactionStyle, {
  perms: [Perms.adminOnly],
  paramTypes: {
    groupID: Types.IDSTR,
    reactionStyle: Types.SHORTSTR_NULLABLE,
  },
});

function actionSetReactionStyle(ctx: Context, groupID: Constants.ReactionGroupID, reactionStyle: ReactionStyle | null, cb: ErrDataCB<{}>) {
  Sketch.updateClientData(ctx, ['reactionGroup2', groupID, 'reactionStyle'], reactionStyle, cb);
}

Sketch.defineAction('reactionGroup2.deleteAllFeedback', actionDeleteAllFeedback, {
  perms: [Perms.adminOnly],
  paramTypes: {
    groupID: Types.IDSTR,
    contentID: Types.IDSTR,
  },
});

function actionDeleteAllFeedback(ctx: Context, groupID: Constants.ReactionGroupID, contentID: Constants.BookID, cb: ErrDataCB<{}>) {
  Sketch.removeClientData(ctx, ['reactionGroup2', groupID, 'content', contentID, 'threads'], cb);
}

Sketch.defineAction('reactionGroup2.updateProgress', actionUpdateProgress, {
  paramTypes: {
    groupID: Types.IDSTR,
    contentID: Types.IDSTR,
    progressID: Types.IDSTR,
    chars: Types.INT,
  },
});
function actionUpdateProgress(
  ctx: Context,
  groupID: Constants.ReactionGroupID,
  contentID: Constants.BookID,
  progressID: string,
  chars: number,
  cb: ErrDataCB<{}>,
) {
  isInGroup(ctx, groupID, (err1, inGroup) => {
    if (err1 || !inGroup) {
      return cb(err1);
    }

    const progressPath = ['reactionGroup2', groupID, 'content', contentID, 'userID', ctx.user.id, 'progress', progressID];
    const jobs = new Jobs.Queue();
    jobs.add(Sketch.initializeClientPath, ctx, progressPath);
    jobs.add(Sketch.replaceClientData, ctx, progressPath, {chars: chars});
    jobs.drain(cb);
  });
}

Sketch.defineAction('reactionGroup2.updateLastOpened', actionUpdateLastOpened, {
  paramTypes: {
    groupID: Types.IDSTR,
    contentID: Types.IDSTR,
  },
  _deprecated: true,
});
function actionUpdateLastOpened(_ctx: Context, _groupID: Constants.ReactionGroupID, _contentID: Constants.BookID, cb: ErrDataCB<{}>) {
  cb('deprecated');
}

Sketch.defineAction('reactionGroup2.updateActivity', actionUpdateActivity, {
  paramTypes: {
    groupID: Types.IDSTR,
    contentID: Types.IDSTR,
    readingActivity: READING_ACTIVITY_SCHEMA,
    reactionActivity: REACTION_ACTIVITY_SCHEMA,
  },
});
function actionUpdateActivity(ctx: Context, groupID: Constants.ReactionGroupID, contentID: Constants.BookID,
  readingActivity: ReadingActivitySchema, reactionActivity: ReactionActivitySchema, cb: ErrDataCB<{}>) {
  isInGroup(ctx, groupID, (err1, inGroup) => {
    if (err1 || !inGroup) {
      return cb(err1);
    }

    const userPath = ['reactionGroup2', groupID, 'content', contentID, 'userID', ctx.user.id];
    const lastOpenedPath = userPath.concat(['lastOpened']);
    const lastOpened = Sketch.clientTime(ctx);
    const jobs = new Jobs.Queue();
    jobs.add(Sketch.initializeClientPath, ctx, lastOpenedPath);
    jobs.add(Sketch.replaceClientData, ctx, lastOpenedPath, lastOpened);

    // update reading activity if something's new
    if (readingActivity.charsRead > 0) {
      const readingActivityPath = userPath.concat(['readingActivity']);
      jobs.add(Sketch.initializeClientPath, ctx, readingActivityPath);
      jobs.add(Sketch.replaceClientData, ctx, readingActivityPath, readingActivity);
    }

    // update reaction activity if something's new
    if (reactionActivity.reactions > 0 || reactionActivity.comments > 0) {
      const reactionActivityPath = userPath.concat(['reactionActivity']);
      jobs.add(Sketch.initializeClientPath, ctx, reactionActivityPath);
      jobs.add(Sketch.replaceClientData, ctx, reactionActivityPath, reactionActivity);
    }

    jobs.drain(cb);
  });
}

export function getPrimarySqlTable(): any {
  return reactionGroupDB.sqlTables.sketchreactiongroup2;
}

export function getContentSqlTable(): any {
  return reactionGroupDB.sqlTables.sketchreactiongroup2content;
}
