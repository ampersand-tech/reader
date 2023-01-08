/**
 * Copyright 2015-present Ampersand Technologies, Inc.
 *
 */

import * as Constants from 'overlib/shared/constants';
import * as Types from 'overlib/shared/types';
import * as Util from 'overlib/shared/util';

enum _DraftIDTag {}
export type DraftID = _DraftIDTag & string;
// every ManuscriptID and DraftCopyID is also a valid DraftID, but not vice-versa

enum _DistributionID {}
export type DistributionID = _DistributionID & string;

enum _BookIDTag {}
export type BookID = _BookIDTag & string;

enum _ManuscriptIDTag {}
export type ManuscriptID = _ManuscriptIDTag & DraftID;

enum _DraftCopyIDTag {}
export type DraftCopyID = _DraftCopyIDTag & DraftID;

enum _CMSVersionIDTag {}
export type CMSVersionID = _CMSVersionIDTag & ManuscriptID;

enum _ContentItemIDTag {}
export type ContentItemID = _ContentItemIDTag & string;

enum _ReactionGroupIDTag {}
export type ReactionGroupID = _ReactionGroupIDTag & string;

enum _SkuIDTag {}
export type SkuID = _SkuIDTag & string;

enum _AlertIDTag {}
export type AlertID = _AlertIDTag & string;

export const GLOBAL_MODAL_PRIORITY = Object.freeze({
  DEFAULT: 'curModal',
  TWOFACTOR: 'twoFactor',
});

export type DraftPermLevel = 'owner' | 'author' | 'collaborator';
export const DRAFT_PERM_LEVEL = Object.freeze({
  OWNER: 'owner',
  AUTHOR: 'author',
  COLLABORATOR: 'collaborator',
} as StashOf<DraftPermLevel>);

export const DRAFT_DOCSTATE = Object.freeze({
  DEFAULT: 'default',
  ARCHIVE: 'archive',
  TRASH: 'trash',
} as StashOf<DraftDocState>);
export type DraftDocState = 'default' | 'archive' | 'trash';

export const DRAFT_SHARED_DOCSTATE = Object.freeze({
  DEFAULT: 'default',
  REMOVED: 'removed',
});

export const DRAFT_SORT_METHODS = Object.freeze({
  MODIFIED: 'modified',
  MANUSCRIPT: 'manuscript',
  FOLDER: 'folder',
});

export const CONTENT_TYPE = Object.freeze({
  BOOK: 'book' as 'book',
  WORKSHOP: 'workshop' as 'workshop',
  STORY: 'story' as 'story',
  ARTICLE: 'article' as 'article',
  LESSON: 'lesson' as 'lesson',
  CLASSIC: 'classic', // deprecated
  EXTRA: 'extra', // deprecated
});
export type ContentType = 'book' | 'workshop' | 'story' | 'article' | 'lesson';

export function contentTypeName(contentType: ContentType, useCaps?: boolean): string {
  let name = '';
  switch (contentType) {
    case CONTENT_TYPE.WORKSHOP:
      name = 'book-in-progress';
      break;
    case CONTENT_TYPE.STORY:
      if (useCaps) {
        return 'Extras & Excerpts';
      } else {
        return 'extras & excerpts';
      }
    default:
      name = contentType;
  }
  if (!useCaps) { return name; }

  let capName = name[0].toUpperCase() + name.slice(1);
  if (capName === 'Book-in-progress') {
    capName = 'Book-in-Progress';
  }
  return capName;
}

// returns plural form of content type
export function contentTypeNamePlural(contentType: ContentType, useCaps?: boolean): string {
  let name = '';
  switch (contentType) {
    case CONTENT_TYPE.WORKSHOP:
      name = 'books-in-progress';
      break;
    case CONTENT_TYPE.STORY:
      if (useCaps) {
        return 'Extras & Excerpts';
      } else {
        return 'extras & excerpts';
      }
    default:
      name = contentType + 's';
  }
  if (!useCaps) { return name; }

  let capName = name[0].toUpperCase() + name.slice(1);
  if (capName === 'Books-in-progress') {
    capName = 'Books-in-Progress';
  }
  return capName;
}


export function contentTypeAspectRatio(contentType: ContentType): number {
  if (contentType === CONTENT_TYPE.WORKSHOP) {
    return 1.0;
  }
  return 1.4;
}

export const REACTION_TYPE = Object.freeze({
  WORKSHOP: 'workshop' as 'workshop',
  SENTIMENT: 'sentiment' as 'sentiment',
  EMOJI: 'emoji' as 'emoji',
});
export type ReactionType = 'workshop' | 'sentiment' | 'emoji';

export function buildTagCommentObjectShared(authorID: AccountID, uuid: string) {
  return {
    authorID: authorID,
    replyID: uuid,
    createTime: Date.now(),
  };
}

export const COLLAB_COLORS = Object.freeze({
  // When adding colors:
  // ALWAYS add colors to the end of the list
  // Make sure it has a corresponding highlight color
  // Add the index of your color in the hue sort order array
  colors: Object.freeze([
    '#D42626', //0
    '#3012c9', //1
    '#008C5C', //2
    '#7C18C2', //3
    '#DC5E09', //4
    '#C218C0', //5
    '#245Ad3', //6
    '#64AB07', //7
    '#0091A2', //8
    '#517625', //9
    '#9953DA', //10
    '#F24878', //11
    '#A77A00', //12
  ]),
  prototypeColors: Object.freeze([
    '#FF6363', //0
    '#FF63C1', //1
    '#E063FF', //2
    '#8D70FF', //3
    '#63A1FF', //4
    '#54D9D9', //5
    '#59E691', //6
    '#74E358', //7
    '#E8CE23', //8
    '#ED9F3B', //9
  ]),
  highlightColors: Object.freeze([
    '#F9DFDF', //0
    '#E0DCF7', //1
    '#D9EEE7', //2
    '#EBDDF6', //3
    '#FAE7DA', //4
    '#F6DDF6', //5
    '#DDE4F6', //6
    '#E8F2DA', //7
    '#D9EFF1', //8
    '#E5EBDF', //9
    '#F0E5F9', //10
    '#FDE4EB', //11
    '#F2EBD9', //12
  ]),
  hueSortOrder: Object.freeze([0, 9, 7, 2, 8, 6, 1, 3, 10, 5, 11, 4, 12]),
});

export const STALE_COLLABORATOR_SESSION_TIMEOUT = 2 * 60 * 1000; // feedwatch can delay up to a minute

export const NUM_INDENT_LEVELS = 7;
export const NUM_SUPPORT_DOCS = 2;

export const PROJECT_MODAL_TABS = Object.freeze({
  INFO: 1,
  TEAM: 2,
  INDENT: 3,
  NOTIFICATIONS: 4,
  ADMIN: 5,
});

export const SETTINGS_MODAL_TABS = Object.freeze({
  ACCOUNT: 1,
  GLOBAL: 2,
  FRIENDS: 3,
});

export const PageBreakBehavior = Object.freeze({
  Normal: 'Normal',
  PageBreakBeforeChapter: 'PageBreakBeforeChapter',
});

export type LineSpacingType = 'ONEANDAHALF' | 'SINGLE' | 'DOUBLE';
export const LineSpacing = Object.freeze({
  ONEANDAHALF: 'ONEANDAHALF',
  SINGLE: 'SINGLE',
  DOUBLE: 'DOUBLE',
} as StashOf<LineSpacingType>);

export const ZoomLevels = Object.freeze([
  2,
  1.75,
  1.5,
  1.25,
  1,
  0.75,
  0.5,
]);

export const FontSetting = Object.freeze({
  TimesNewRoman: 'TimesNewRoman',
  Cambria: 'Cambria',
  Tahoma: 'Tahoma',
});

export type ParagraphStyleType = 'Spaced' | 'Indented';
export const ParagraphStyle = Object.freeze({
  Spaced: 'Spaced',
  Indented: 'Indented',
} as StashOf<ParagraphStyleType>);

export type IndentStyleType = 'Always' | 'ExcludeStarting';
export const IndentStyle = Object.freeze({
  Always: 'Always',
  ExcludeStarting: 'ExcludeStarting',
} as StashOf<IndentStyleType>);

export const DraftSettingsDefaults = Object.freeze({
  lineSpacing: LineSpacing.ONEANDAHALF,
  paragraphStyle: ParagraphStyle.Spaced,
  indentStyle: IndentStyle.Always,
  displayMode: null,
});

export const gEditorZoomBaseInch = 7;
export const gPhoneBasePx = 400;
export function getEditorZoomClass(zoom: number, isPhone = false) {
  return (isPhone) ? gPhoneBasePx * zoom + 'px' : zoom * gEditorZoomBaseInch + 'in';
}

export const AccountTags = Object.freeze({
  FRIENDS_AND_FAMILY_READER: 'FRIENDS_AND_FAMILY_READER',
  ALPHA_READER: 'ALPHA_READER',
  EMAIL_INVITE_SENT: 'EMAIL_INVITE_SENT',
});

export const READER_COLOR = Object.freeze({
  DARK: 'dark' as 'dark',
  LIGHT: 'light' as 'light',
});
export type ReaderColor = 'dark' | 'light';

export const READER_TRIGGERS = Object.freeze({
  START: 'AutoMSStart',
  END: 'AutoMSSEnd',
  THANKYOU: 'AutoMSThankYou',
  PREORDER: 'AutoMSPreOrder',
  STORE: 'AutoMSStore',
  FREEMANUSCRIPT: 'AutoMSFreeManuscript',
});

export const NOTE_TAGS = Object.freeze({
  USER_TEXT: 'UserText',
  ACCOUNT_CREATED: 'AccountCreated',
  ACCOUNT_INFO_EDIT: 'AccountEdit',
  CHANGE_PASSWORD: 'ChangePassword',
  CHANGE_STATUS: 'ChangeStatus',
  BOOK_PERMISSION: 'BookPermission',
  OUTBOUND_EMAIL: 'OutboundEmail',
  USER_TOOK_SCREENSHOT: 'UserTookScreenshot',
  USER_TOOK_EXCESSIVESCREENSHOTS: 'UserTookExcessiveScreenshots',
  GRANT_SKU: 'GrantSku',
  UNLINK_FACEBOOK: 'UnlinkFacebook',
  UNLINK_GOOGLE: 'UnlinkGoogle',
});

export function userColorFromID(id: string) {
  return (Math.abs(Util.hashCode(id)) % (COLLAB_COLORS.colors.length - 1)) + 1;
}

export function prototypeColorStringFromID(id: string) {
  return COLLAB_COLORS.prototypeColors[
    (Math.abs(Util.hashCode(id)) % (COLLAB_COLORS.prototypeColors.length - 1)) + 1];
}

export function getUnknownUserTemplate(userID: string) {
  return {
    name: 'Unknown',
    faceURL: '',
    color: userID ? userColorFromID(userID) : 1,
    userType: Constants.USER_TYPE.READER,
  };
}

export function getUnknownPersonaTemplate(_personIDIgnored) {
  return {
    name: 'Unknown',
    faceURL: '',
  };
}

export const MIN_SEARCH_TERMS_LEN = 1;

export const PrivateDraftType = Object.freeze({
  NONE: '',
  PRIVATE: 'PRIVATE',
  SIMPLESHARE: 'SIMPLESHARE',
});

export type BookSecurity = 'none' | 'basic';
export const BookSecurity = Object.freeze({
  NONE: 'none' as 'none',
  BASIC: 'basic' as 'basic',
});

export type WriterNavTypes = 'none' | 'mentions' | 'toc' | 'tagSearch' | 'textSearch' | 'writtenBy' | 'acceptReject' | 'spellcheck';

export const WriterNavTypes = Object.freeze({
  NONE: 'none',
  MENTIONS: 'mentions',
  TOC: 'toc',
  TAGS: 'tagSearch',
  TEXT: 'textSearch',
  WRITTEN_BY: 'writtenBy',
  ACCEPT_REJECT: 'acceptReject',
  SPELLCHECK: 'spellcheck',
} as StashOf<WriterNavTypes>);

export type WriterDisplayMode = 'normal' | 'trackChanges' | 'redline' | 'blame';

export const WriterDisplayMode = Object.freeze({
  NORMAL: 'normal',
  TRACKCHANGES: 'trackChanges',
  REDLINE: 'redline',
  BLAME: 'blame',
} as StashOf<WriterDisplayMode>);

export type ProjectCurtainView = 'default' | 'history' | 'inbox';
export const PROJECT_CURTAIN_VIEW = Object.freeze({
  DEFAULT: 'default',
  HISTORY: 'history',
  INBOX: 'inbox',
});

export const ManuscriptStatus = [
  'Outlining',
  'Writing',
  'Editing',
  'Rewriting',
  'Review',
  'Approved',
  'Copy Editing',
  'Finished',
];

export const EDITOR_MAX_TAB_LEVEL = 6;

export const LEGAL_DOCS = Object.freeze({
  TERMS_OF_SERVICE: 'tos',
  PRIVACY_POLICY: 'pp',
});

export const PERSONA_PERM_LEVELS = Object.freeze({
  VIEWER: '',
  EDITOR: 'editor',
});
export type PersonaPermLevels = '' | 'editor';


export const PERSONA_SUB_LEVELS = Object.freeze({
  BRONZE: 'bronze',
  SILVER: 'silver',
  GOLD: 'gold',
});

export const SUBSCRIPTION_PLAN = Object.freeze({
  NONE: 'none',
  BASIC01: 'basic01',
  MID01: 'mid01',
  HIGH01: 'high01',
});

export const PAYMENT_PROVIDER = Object.freeze({
  NONE: 'none',
  IOS: 'ios',
  STRIPE: 'stripe',
});

export const COIN_ACQUISITION_TYPE = Object.freeze({
  TEST: 'test',
  PURCHASE: 'purchase', // a la carte
  SUBSCRIPTION: 'subscription', // from a subscription
  GIFT: 'gift',
  GRANT: 'grant',
  ADMIN_ADJUSTMENT: 'admin_adjustment',
});

export const COIN_SPEND_TYPE = Object.freeze({
  TEST: 'test',
  SKU_PURCHASE: 'sku_purchase',
  ADMIN_ADJUSTMENT: 'admin_adjustment',
});

export const CMS_ITEM_STATUS = Object.freeze({
  WHITE:  'white',
  RED:    'red',
  ORANGE: 'orange',
  YELLOW: 'yellow',
  GREEN:  'green',
  BLUE:   'blue',
} as StashOf<CMSItemStatus>);
export type CMSItemStatus = 'white' | 'red' | 'orange' | 'yellow' | 'green' | 'blue';

export const CMS_ITEM_VERSION_STATUS = Object.freeze({
  STAGED: 'staged',
  CURRENT: 'current',
  RETIRED: 'retired',
});
export type CMSItemVersionStatus = 'staged' | 'current' | 'retired';

// note: order matters, and first item is default in cms editors
export const POST_FEED_TYPE = Object.freeze({
  ROOSTERTOWN: 'roosterTown',
  EXTRAS: 'extras',
  COLLECTIONS: 'collections',
  OVERRIDE: 'override',
  FOOTER: 'footer',
} as StashOf<PostFeedType>);
export type PostFeedType = 'extras' | 'collections' | 'roosterTown' | 'override' | 'footer';

export const CMS_CHANNEL_ITEMS_WIDTH = Object.freeze({
  MIN: 200,
  MAX: 600,
  DEFAULT: 280,
});

export const CHECKPOINT_FETCH_THRESHOLD = 100;
export const DRAFT_MODIFY_VERSION = 1;

export const DRAFT_SPINNER_TIMEOUT = 30000;
export const IGNORE_BANNER_TIMEOUT = 60 * 60 * 24 * 1000;

export const SEARCHINDEXER_NEXT_DOC_DELAY = 500;

export const CHARACTERS_PER_WORD = 4.5;
export const WORDS_PER_PAGE = 350;

export const DEFAULT_USER_PIC = 'icon_user_default.png';
export const DEFAULT_READER_USER_PIC = 'icon_user_default_transparent.png';
export const CANVAS_READER_DEFAULT_USER_PIC = 'images/icon_user_default.png';

export const TSHIRT_INVITATION = 'tshirt-invitation';
export const TSHIRT_SUCCESS = 'tshirt-success';

// A 1x1 transparent GIF.
export const BLANK_IMAGE_URL = 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==';

export const BOOKSECURITY_NULLABLE = Types.createEnum('BOOK_SECURITY', BookSecurity, /*nullable*/true);

export const CONTENT_DISTRIBUTION_TYPE = Object.freeze({
  DEFAULT: '',
  PREVIEW: 'preview',
} as StashOf<ContentDistributionType>);
export type ContentDistributionType = '' | 'preview';

export const CACHED_PARA_DELETED = 'deleted';

export const HIDDEN_BUTTON = (
  'p-y-2 m-y-0 lh-0 flxs-0 p-x-1 m-x-0 w-28 h-28 b-0 br-2 m-x-0.5 c-navy-f-a0.8 c-navy-fg-a0.8 c-transparent-bg ' +
  'hover:(c-navylite-bg-a0.70 c-navy-f c-navy-fg) ' +
  'active:(c-navylite-bg c-navy-f c-navy-fg) ' +
  'set:(c-navylite-bg c-navy-f c-navy-fg)'
);

export const ALERT_TYPE = Object.freeze({
  UNKNOWN: '',
  INVITATION: 'invitation',
  COMMENT: 'comment',
  DISCOUNT: 'discount',
  MENTION: 'mention',
  DRAFTINVITE: 'draftInvite',
  TEST: 'test',
  PROMOTION: 'promotion',
} as StashOf<AlertType>);
export type AlertType = '' | 'invitation' | 'comment' | 'test' | 'discount' | 'mention' | 'draftInvite' | 'promotion';

export const CONTACTS_ACCESS_STATUS = Object.freeze({
  AUTHORIZED: 'authorized' as 'authorized',
  DENIED: 'denied' as 'denied',
  NOT_DETERMINED: 'notDetermined' as 'notDetermined',
} as StashOf<ContactsAccessStatusType>);
export type ContactsAccessStatusType = 'authorized' | 'denied' | 'notDetermined';

export const WRITER_PREVIEW_CHANNEL = 'writerPreview' as DistributionID;
export const MOBILE_WRITER_CHANNEL = 'mobileWriter' as DistributionID;
export const PRIVATE_SHARE = 'private' as DistributionID;

export const READER_DOC_TYPE = Object.freeze({
  PUBLISHED: 'published' as 'published',
  PREVIEW: 'preview' as 'preview',
  WRITER: 'writer' as 'writer',
});
export type ReaderDocType = 'published' | 'preview' | 'writer';

export function makeBookID(distID: DistributionID, contentID: ContentItemID|DraftID): BookID {
  return `${distID}.${contentID}` as BookID;
}

export function splitBookID(bookID: BookID): [DistributionID, ContentItemID] {
  return bookID.split('.', 2) as [DistributionID, ContentItemID];
}

export function extractChannelID(bookID: BookID): DistributionID {
  return splitBookID(bookID)[0];
}

export function extractContentID(bookID: BookID): ContentItemID {
  return splitBookID(bookID)[1];
}

export function isWriterPreviewChannelID(distributionID: DistributionID) {
  return distributionID === WRITER_PREVIEW_CHANNEL;
}

export function isWriterPreviewBookID(bookID: BookID) {
  return isWriterPreviewChannelID(splitBookID(bookID)[0]);
}

export function isMobileWriterChannelID(distributionID: DistributionID) {
  return distributionID === MOBILE_WRITER_CHANNEL;
}

export function isMobileWriterBookID(bookID: BookID) {
  return isMobileWriterChannelID(splitBookID(bookID)[0]);
}

export function isPrivateShareChannelID(distributionID: DistributionID) {
  return distributionID === PRIVATE_SHARE;
}

export function isPseudoChannelID(distributionID: DistributionID) {
  return isWriterPreviewChannelID(distributionID) || isMobileWriterChannelID(distributionID);
}

export function isPseudoChannelBookID(bookID: BookID) {
  return isPseudoChannelID(splitBookID(bookID)[0]);
}

export function isPrivateShareBookID(bookID: BookID) {
  return isPrivateShareChannelID(splitBookID(bookID)[0]);
}

export * from 'overlib/shared/constants';
