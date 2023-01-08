/**
* Copyright 2014-present Ampersand Technologies, Inc.
*/

import * as Util from 'overlib/shared/util';

export const fallBackTypes = {
  'h1': 'title',
  'h2': 'section',
  'h3': 'chapter',
  'h4': 'scene',
};

export type TCModifierType =
  | 'ud'
  | 'ui'
  | 'uc'
  | 'up'
  | 'ad'
  | 'ai'
  | 'ac'
  | 'ap'
  | 'noop'
;

export type TagCommentModifierType =
  | 'tagComment'
  | 'tagCommentMuted'
  | 'tagCommentTemp';

export type StyleModifierType =
  | 'b'
  | 'i'
  | 'u'
  | 's'
  | 'monospace'
  | 'sup'
  | 'sub'
  | 'highlight'
;

// -1, -1 mods
export type ParaModifierType =
  | 'bullet'
  | 'number'
  | 'tar'
  | 'tac'
  | 'taj'
  | 'layer'
  | 'question'
  | 'response'
  | 'buttonTrigger'
  | 'indent'
;

export type ParaCompareModifierType =
  | 'add'
  | 'del'
  | 'madd'
  | 'mdel'
  | 'moved'
  | 'res';
const PARA_COMPARE_MODIFIER_TYPES = Util.arrayToObj(['add', 'del', 'madd', 'mdel', 'moved', 'res']);

export type ModifierType =
  | TCModifierType
  | TagCommentModifierType
  | StyleModifierType
  | ParaModifierType
  | 'tag'
  | 'spl'
  | 'img'
  | 'img2'
  | 'widget'
  | 'emoji'
  | 'a'
  | 'link'
  | 'nav'
  | 'name'
  | ParaCompareModifierType
  | 'norm'
  | 'noedit'
  | 'mention'
  | 'indent'
  | 'tempmark'
  | 'templike'
  | 'templaugh'
  | 'temphuh'
  | 'tempbored'
  | 'tempdislike'
  | 'tempoops'
  | 'tempnote'
  | 'snippetHighlight'
  | 'location'
  | 'conflict'
  | 'autoc'
  | 'autocap'
  | 'typo';

export const Modifiers = {
  B: 'b' as 'b',
  STRONG: 'b' as 'b',
  I: 'i' as 'i',
  EM: 'i' as 'i',
  U: 'u' as 'u',
  S: 's' as 's',
  MONOSPACE: 'monospace' as 'monospace',
  TAR: 'tar' as 'tar', // text align right
  TAC: 'tac' as 'tac', // text align center
  TAJ: 'taj' as 'taj', // text align justified
  SUP: 'sup' as 'sup',
  SUB: 'sub' as 'sub',
  TAG: 'tag' as 'tag',
  SPL: 'spl' as 'spl',
  IMG: 'img' as 'img', // deprecated
  IMG2: 'img2' as 'img2', // deprecated
  WIDGET: 'widget' as 'widget', // general placeholder for content in editor
  EMOJI: 'emoji' as 'emoji', // general placeholder for content in editor
  A: 'a' as 'a',
  LINK: 'link' as 'link', // deprecated
  HIGHLIGHT: 'highlight' as 'highlight',
  NAV: 'nav' as 'nav',
  NAME_DEPRECATED: 'name' as 'name',

  // para comparison modifiers
  ADD: 'add' as 'add',
  DEL: 'del' as 'del',
  MODADD: 'madd' as 'madd', // mod add
  MODDEL: 'mdel' as 'mdel', // mod delete
  MOVED_DEPRECATED: 'moved' as 'moved',
  RES_DEPRECATED: 'res' as 'res', // a changed modifier

  NORM: 'norm' as 'norm',
  NOEDIT: 'noedit' as 'noedit',
  TAGCOMMENT: 'tagComment' as 'tagComment',
  TAGCOMMENTMUTED: 'tagCommentMuted' as 'tagCommentMuted',
  TAGCOMMENTTEMP: 'tagCommentTemp' as 'tagCommentTemp',
  MENTION: 'mention' as 'mention',
  BULLET: 'bullet' as 'bullet',
  NUMBER: 'number' as 'number',
  INDENT: 'indent' as 'indent',
  LAYER: 'layer' as 'layer',
  QUESTION: 'question' as 'question',
  RESPONSE: 'response' as 'response',
  //BUTTON_TRIGGER: 'buttonTrigger' as 'buttonTrigger',
  UD: 'ud' as 'ud', // unaccepted delete
  UI: 'ui' as 'ui', // unaccepted insert
  UC: 'uc' as 'uc', // unaccepted change
  UP: 'up' as 'up', // unaccepted paragraph delete
  AD: 'ad' as 'ad', // accepted delete
  AI: 'ai' as 'ai', // accepted insert
  AC: 'ac' as 'ac', // accepted change
  AP: 'ap' as 'ap', // accepted paragraph delete
  TEMPMARK: 'tempmark' as 'tempmark',
  TEMPLIKE: 'templike' as 'templike',
  TEMPLAUGH: 'templaugh' as 'templaugh',
  TEMPHUH: 'temphuh' as 'temphuh',
  TEMPBORED: 'tempbored' as 'tempbored',
  TEMPDISLIKE: 'tempdislike' as 'tempdislike',
  TEMPOOPS: 'tempoops' as 'tempoops',
  TEMPNOTE: 'tempnote' as 'tempnote',
  SNIPPETHIGHLIGHT: 'snippetHighlight' as 'snippetHighlight',
  LOCATION: 'location' as 'location',
  CONFLICT: 'conflict' as 'conflict',
  AUTOCORRECT: 'autoc' as 'autoc',
  AUTOCAPITALIZE: 'autocap' as 'autocap',
  TYPO: 'typo' as 'typo',
};

export type ParaType = 'paragraph'
  | 'title'
  | 'section'
  | 'chapter'
  | 'scene'
  | 'section'
  | 'scene'
  | 'pagebreak'
  | 'preview'
  | 'sectionbreak'
  | 'reaction'
  | 'reactionnote'
  | 'infoblob'
  | 'list'
  | 'comment'
  | 'chatleft'
  | 'chatright'
  | 'chatheader'
  | 'reference';

export type WidgetType =
  | 'img'
  | 'location'
  | 'emoji'
  | 'break'
  | 'link'
;

export interface TypoModifier {
  type: 'typo';
  start: number;
  end: number;
}

export interface RangedModifier {
  start: number;
  end: number;
}

export interface WidgetModifier extends RangedModifier {
  type: 'widget';
  data: {
    widget: WidgetType;
  };
}
export function isWidgetModifier(mod): mod is WidgetModifier {
  return mod && mod.type === Modifiers.WIDGET && mod.data;
}

export interface Range {
  start: number;
  end: number;
}

export interface ModImgData {
  url: string;
  widget ?: string;
  id ?: string;
  w ?: number;
  h ?: number;
}

export interface ModEmojiData {
  name: string;
  widget ?: string;
  id ?: string;
}

export interface ModLocationData {
  widget ?: string;
  manuscriptID?: string;
  draftID?: string;
  title?: string;
  paraID?: string;
  idx?: number;
  start?: number;
  content?: string;
  id?: string;
}

export interface ModMentionData {
  id: string;
  authorID: AccountID;
  mentionID: AccountID | '_all_'; // this is the person being mentioned
  content: string;
  time: number;
}

export interface ModTagCommentData {
  authorID: AccountID;
  replyID: string;
  createTime: number|undefined;
}

export interface ModLayerData {
  id: string;
  color: number;
}

export interface ModQuestionData {
  type: QuestionType;
  label: string;
  widget?: string;
  id: string;
}

export type QuestionType =
  'single-choice' |
  'multi-choice';

export interface ModButtonTriggerData {
  name: string;
  icon: string;
  directFire: boolean;
  note: boolean;
  noteText?: string;
  flyoutText?: string;
  nameMatch: string[];
  reaction: StashOf<ButtonReaction>;
}

export interface ButtonReaction {
  name: string;
  icon: string;
  note: boolean;
  noteText?: string;
}

export type UndoCountData = StashOf<string>; // {[draftID]: uuid}
export type TCRevertType = 'delete' | 'pmod' | 'split' | 'merge' | 'palign';
export type TCRevertData =
  | ModifierType // for pmod
  | {
    type ?: ParaType;
    tabLevel ?: number;
    bullet ?: boolean;
    number ?: number;
  };

export interface ModTCData {
  authorID: AccountID;
  undoCount: UndoCountData;
  editTime: number;
  createTime ?: number;
  revert ?: TCRevertType;
  revertData ?: TCRevertData;
}

export interface ModParaCompareData {
  type: StyleModifierType;
}

export type ModData =
  ModImgData
  | ModMentionData
  | number // for NUMBER modifiers
  | ModTCData
  | ModParaCompareData
  | ModTagCommentData
  | ModLayerData
  | ModQuestionData
  | ModButtonTriggerData
  | ModEmojiData
  | ModLocationData
;

export interface TCModifier extends RangedModifier {
  type: TCModifierType;
  data: ModTCData;
}

export interface NavModifier extends RangedModifier {
  type: 'nav';
  data: ParaType;
}

export function isNavModifier(mod): mod is NavModifier {
  return mod && mod.type === 'nav';
}

export interface TagCommentModifier extends RangedModifier {
  type: TagCommentModifierType;
  data: ModTagCommentData;
}
export function isTagCommentModifier(mod): mod is TagCommentModifier {
  if (!mod) {
    return false;
  }

  switch (mod.type) {
    case 'tagComment':
    case 'tagCommentMuted':
    case 'tagCommentTemp':
      return true;
    default:
      return false;
  }
}

export interface StyleModifier extends RangedModifier {
  type: StyleModifierType;
}

export interface ParaModifier {
  type: ParaModifierType;
  start: -1;
  end: -1;
}

export interface ParaNumberModifier extends ParaModifier {
  type: 'number';
  data: number; // the current number
}
export function isParaNumberModifier(mod): mod is ParaNumberModifier {
  return mod && mod.type === 'number';
}

export interface QuestionModifier extends ParaModifier {
  type: 'question';
  data: ModQuestionData;
}

export interface ResponseModifier extends ParaModifier {
  type: 'response';
}

export interface ButtonTriggerModifier extends ParaModifier {
  type: 'buttonTrigger';
  data: ModButtonTriggerData;
}

export interface ParaCompareModifier {
  type: ParaCompareModifierType;
  start: number;
  end: number;
  data: {
    type: StyleModifierType;
  };
}
export function isParaCompareModifier(mod): mod is ParaCompareModifier {
  return mod && mod.type in PARA_COMPARE_MODIFIER_TYPES;
}

export interface MentionModifier extends RangedModifier {
  type: 'mention';
  data: ModMentionData;
}
export function isMentionModifier(mod): mod is MentionModifier {
  return mod && mod.type === 'mention';
}

export interface ImgWidgetModifier extends WidgetModifier {
  data: {
    id: string;
    widget: 'img';
    url: string;
    w?: number;
    h?: number;
  };
}

export function isImgWidgetModifier(mod): mod is ImgWidgetModifier {
  return isWidgetModifier(mod) && mod.data.widget === WidgetTypes.IMG;
}

export interface LocationWidgetModifier extends WidgetModifier {
  data: {
    widget: 'location';
    manuscriptID?: string;
    draftID?: string;
    title?: string;
    paraID?: string;
    idx?: number;
    start?: number;
    content?: string;
    id?: string;
  };
}

export function isLocationWidgetModifier(mod): mod is LocationWidgetModifier {
  return isWidgetModifier(mod) && mod.data.widget === WidgetTypes.LOCATION;
}

export interface EmojiWidgetModifier extends WidgetModifier {
  data: {
    widget: 'emoji';
    name: string;
    id?: string;
  };
}

export function isEmojiWidgetModifier(mod): mod is EmojiWidgetModifier {
  return isWidgetModifier(mod) && mod.data.widget === WidgetTypes.EMOJI;
}

export interface SnippetHighlightModifier extends RangedModifier {
  type: 'snippetHighlight';
  data: {
    domID: string;
  };
}

export interface LayerModifier extends RangedModifier {
  type: 'layer';
  data: {
    layerID: string;
  };
}

export function isLayerModifier(mod): mod is LayerModifier {
  return mod && mod.type === 'layer';
}

interface DeprecatedImgModifier extends RangedModifier {
  type: 'img';
  data: string | {
    url: string;
    w: number;
    h: number;
  };
}

interface DeprecatedImg2Modifier extends RangedModifier {
  type: 'img2';
  data: {
    url: string;
    w: number;
    h: number;
  };
}

interface DeprecatedNameModifier extends RangedModifier {
  type: 'name';
}

export type Modifier =
  | TCModifier
  | TagCommentModifier
  | ParaCompareModifier
  | StyleModifier
  | ParaModifier
  | ParaNumberModifier
  | MentionModifier
  | SnippetHighlightModifier
  | LayerModifier
  | NavModifier
  | WidgetModifier
  | ButtonTriggerModifier
  | TypoModifier
  | DeprecatedImgModifier
  | DeprecatedImg2Modifier
  | DeprecatedNameModifier
;

export interface RenderCache {
  line: number | null;
}

export interface Para {
  content: string;
  modifiers: Modifier[];
}

export interface Paragraph extends Para {
  id: string;
  type: ParaType;
  tabLevel ?: number;
  renderCache: RenderCache;
  undoCount ?: number;
}

export interface RemoveParagraph {
  remove: 1;
  id ?: string;
  renderCache: RenderCache;
}

export function isRemoveParagraph(p): p is RemoveParagraph {
  return p.hasOwnProperty('remove');
}

export const MoriMarks = Object.seal({
  PLAY: '#play',
  PLOTPOINT: '#plotpoint',
});
export const MoriMarkFromTag = Util.dictFlip(MoriMarks);

export const Types = {
  P: 'paragraph' as 'paragraph',
  TITLE: 'title' as 'title',
  SECTION: 'section' as 'section',
  CHAPTER: 'chapter' as 'chapter',
  SCENE: 'scene' as 'scene',
  H1: 'section' as 'section',
  H2: 'chapter' as 'chapter',
  H3: 'scene' as 'scene',
  H4: 'scene' as 'scene',
  H5: 'scene' as 'scene',
  H6: 'scene' as 'scene',
  CODE: 'code' as 'code',
  PAGE: 'pagebreak' as 'pagebreak',
  PREVIEW: 'preview' as 'preview',
  SECTIONBREAK_DEPRECATED: 'sectionbreak' as 'sectionbreak',
  REACTION: 'reaction' as 'reaction',
  REACTIONNOTE: 'reactionnote' as 'reactionnote',
  INFOBLOB: 'infoblob' as 'infoblob',
  LI_DEPRECATED: 'list' as 'list',
  COMMENT_DEPRECATED: 'comment' as 'comment',
  CHATLEFT: 'chatleft' as 'chatleft',
  CHATRIGHT: 'chatright' as 'chatright',
  CHATHEADER: 'chatheader' as 'chatheader',
  REFERENCE: 'reference' as 'reference',
};
export const TypeValuesMap = Util.dictFlip(Types, true);
export const DeprecatedTypes = Util.arrayToObj([Types.LI_DEPRECATED, Types.COMMENT_DEPRECATED]);

// for stuff that requires TCModifier type
export const TCModifiers = {
  UD: Modifiers.UD, // unaccepted delete
  UI: Modifiers.UI, // unaccepted insert
  UC: Modifiers.UC, // unaccepted change
  UP: Modifiers.UP, // unaccepted paragraph delete
  AD: Modifiers.AD, // accepted delete
  AI: Modifiers.AI, // accepted insert
  AC: Modifiers.AC, // accepted change
  AP: Modifiers.AP, // accepted paragraph delete
};

export const WidgetTypes = {
  IMG: 'img' as 'img',
  LINK: 'link' as 'link',
  LOCATION: 'location' as 'location',
  BREAK: 'break' as 'break',
  EMOJI: 'emoji' as 'emoji',
};

export const WidgetSettings = {
  INLINE: 'inline',
};

export const ModifierValuesMap = Util.objectMakeImmutable(Util.dictFlip(Modifiers, true));
export const allDiffModifiers = Util.objectMakeImmutable(Util.arrayToObj([Modifiers.DEL, Modifiers.ADD, Modifiers.MODDEL, Modifiers.MODADD]));
export const allTrackChangesModifiers = Util.objectMakeImmutable({ui: true, ud: true, uc: true, up: true, ai: true, ad: true, ap: true, ac: true});
export function isTCModifier(mod): mod is TCModifier {
  return mod.type in allTrackChangesModifiers;
}

export const unacceptedModifiers = Util.objectMakeImmutable({ui: 'ai', ud: 'ad', uc: 'ac', up: 'ap'});
export const acceptedModifiers = Util.objectMakeImmutable({ai: 'ai', ad: 'ad', ac: 'ac', ap: 'ap'});
export const rejectModifiers = Util.objectMakeImmutable({ud: 'ai', uc: 'ac', up: 'ai'});
export const renderOnlyModifiers = Util.objectMakeImmutable({typo: null, tagCommentMuted: 'tagComment'});

export const StripTrackChangeDeletes = Util.objectMakeImmutable({ap: true, up: true, ad: true, ud: true});
export const ParagraphRemoved = Util.objectMakeImmutable({ap: true, up: true});

export interface DiffRemoveParagraph {
  remove: 1;
  line: number | undefined;
}

export const NeverSplitOrMergeMods = Util.objectMakeImmutable({
  'location': true,
  'img2': true,
  'widget': true,
});

export const wordOnlyMods = Util.objectMakeImmutable({
  'autoc': {allowZeroLength: true},
  'typo': true,
  'autocap': {allowZeroLength: true},
});

export function isImgMod(mod) {
  // 'img' is deprecated, but still check for it
  return mod && (mod.type === Modifiers.IMG || mod.type === Modifiers.IMG2 || isImgWidgetModifier(mod));
}
