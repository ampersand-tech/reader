/**
* Copyright 2018-present Ampersand Technologies, Inc.
*/

import * as Paragraph from 'clientjs/shared/paragraph';
import * as ParagraphTypes from 'clientjs/shared/paragraphTypes';
import { Modifier, Modifiers, ParaType, QuestionModifier, ButtonReaction } from 'clientjs/shared/paragraphTypes';
import * as Log from 'overlib/shared/logCommon';
import * as Util from 'overlib/shared/util';


export const MAGIC_MORI_TAGS = {
  base: '#magicmori',
  inlineStart: '#magicmoristart', // #magicmoristart sectionID
  inlineStop: '#magicmoristop',
  inlineQuestion: '#magicmorianswer',
  button: '#magicmoributton',
  multi: '#magicmorimulti',
  preview: '#magicmoripreview',
};

export type Entry =
  ParagraphEntry |
  ImagesEntry |
  AuthorNoteEntry |
  ButtonEntry |
  CommentSummaryEntry |
  DataEntry |
  PreviewEntry |
  TerminatorEntry;

export const EntryTypes = {
  paragraph: 'paragraph' as 'paragraph',
  images: 'images' as 'images',
  authorNote: 'authorNote' as 'authorNote',
  button: 'button' as 'button',
  commentSummary: 'commentSummary' as 'commentSummary',
  data: 'data' as 'data',
  preview: 'preview' as 'preview',
  terminator: 'terminator' as 'terminator',
};

export interface BaseEntry {
  wordsSoFar: number;
  baseCharsSoFar: number;
  charsSoFar: number;
}

export interface ParagraphEntry extends BaseEntry {
  type: 'paragraph';
  id: string;
  paraType: ParaType;
  content: string;
  wordCount: number;
  tabLevel?: number;
  ordinality?: number;
  modifiers: Modifier[];
  isLayer: boolean;
  writerComments: Paragraph.ExtractedComment[];
}

export interface Image {
  width: number;
  height: number;
  url: string;
  paraID: string;
}

export interface ImagesEntry extends BaseEntry {
  type: 'images';
  images: Image[];
  isLayer: boolean;
}

export interface AuthorNoteEntry extends BaseEntry {
  type: 'authorNote';
  name: string;
  answers: string[];
  multi: boolean;
  paragraphs: StashOf<Paragraph.Paragraph>;
  paraCount: number;
  chapter: number;
}

export interface ButtonEntry extends BaseEntry {
  type: 'button';
  name: string;
  icon: string;
  directFire: boolean;
  note: boolean;
  noteText?: string;
  flyoutText?: string;
  nameMatch: string[];
  reaction: StashOf<ButtonReaction>;
}

interface CommentSummaryEntry extends BaseEntry {
  type: 'commentSummary';
  chapter: number;
  startIdx: number;
  endIdx: number;
}

export interface DataEntry extends BaseEntry {
  type: 'data';
}
export interface PreviewEntry extends BaseEntry {
  type: 'preview';
}
export interface TerminatorEntry extends BaseEntry {
  type: 'terminator';
}

interface TocEntry {
  type: ParaType;
  paraID: string;
  charsSoFar: number;
  baseCharsSoFar: number;
  snippet: string[];
  summary?: string;
}

export interface ParsedData {
  manuscript: boolean;
  totalWords: number;
  totalChars: number;
  totalChapters: number;
  totalBaseChars: number;

  entries: Entry[];
  toc: TocEntry[];
}

function fillOrdinalities(result: ParsedData) {
  // mapping from tabLevel to the count of NUMBER paragraphs at that level
  const oridinalCounts: number[] = [0];

  for (const entry of result.entries) {
    if (entry.type !== EntryTypes.paragraph) {
      // reset all
      oridinalCounts.length = 1;
      continue;
    }
    const tabLevel = entry.tabLevel || 0;
    if (!tabLevel) {
      // reset all, list items cannot exist at tabLevel 0
      oridinalCounts.length = 1;
      continue;
    }

    let isNumber = false;
    let isBullet = false;
    for (const mod of entry.modifiers) {
      if (mod.type === Modifiers.NUMBER) {
        isNumber = true;
      }
      if (mod.type === Modifiers.BULLET) {
        isBullet = true;
      }
    }
    if (!isNumber && !isBullet) {
      // not a list item, so reset count for current tabLevel
      oridinalCounts[oridinalCounts.length - 1] = 0;
      continue;
    }
    const neededDepth = tabLevel + 1;
    if (oridinalCounts.length < neededDepth) {
      // push zeros onto the array for every depth between where we were and where we are now
      for (let i = oridinalCounts.length; i < neededDepth; ++i) {
        oridinalCounts.push(0);
      }
    } else {
      // trim the array down, effectively reseting the counts for deeper tabLevels
      oridinalCounts.length = neededDepth;
    }

    if (isNumber) {
      // increment counter and assign ordinality
      entry.ordinality = ++oridinalCounts[tabLevel];
    }
  }
}

/*
function getLayerID(para) {
  if (!para) {
    return null;
  }
  for (let m = 0; m < para.modifiers.length; ++m) {
    if (para.modifiers[m].type === Modifiers.LAYER) {
      return para.modifiers[m].data.layerID;
    }
  }
  return null;
}
*/

function createCommentSummaryEntry(result: ParsedData): CommentSummaryEntry {
  return {
    type: EntryTypes.commentSummary,
    wordsSoFar: result.totalWords,
    baseCharsSoFar: result.totalBaseChars,
    charsSoFar: result.totalChapters,
    chapter: result.totalChapters,
    startIdx: result.entries.length,
    endIdx: -1,
  };
}

export function isLayerFromEntry(entry: Entry): boolean {
  if (!entry) {
    return false;
  }

  switch (entry.type) {
    case EntryTypes.paragraph:
    case EntryTypes.images:
      return entry.isLayer;

    case EntryTypes.commentSummary:
    case EntryTypes.preview:
    case EntryTypes.terminator:
      return false;

    case EntryTypes.authorNote:
    case EntryTypes.button:
    case EntryTypes.data:
      return true;

    default:
      Util.absurd(entry);
  }

  return true; // skip non-paragraph entries
}

function addEntry(result: ParsedData, entry: Entry) {

  // add entry to lookup table and update position info
  switch (entry.type) {
    case EntryTypes.paragraph: {
      const contentChars = entry.content ? entry.content.length : 0;
      result.totalWords += entry.wordCount;
      result.totalChars += contentChars;
      result.totalBaseChars += !Paragraph.findOneModifierByType(entry, Modifiers.LAYER) ? contentChars : 0;
      break;
    }
    case EntryTypes.authorNote:
      for (const paraID in entry.paragraphs) {
        const para = entry.paragraphs[paraID];
        const contentChars = para.content ? para.content.length : 0;
        result.totalWords += Paragraph.wordCount(para) || 0;
        result.totalChars += contentChars;
        result.totalBaseChars += !Paragraph.findOneModifierByType(para, Modifiers.LAYER) ? contentChars : 0;
      }
      break;
  }

  result.entries.push(entry);
}

// returns Image for paragraphs that are just a single image
function getParaImage(para): Image | undefined {
  for (const modId in para.modifiers) {
    const mod = para.modifiers[modId];

    if (ParagraphTypes.isImgWidgetModifier(mod) && mod.start === 0 && para.content.length === 1) {
      return {
        width: mod.data.w || 50,
        height: mod.data.h || 50,
        url: mod.data.url,
        paraID: para.id,
      };
    }
  }
}

function addParagraphEntry(result: ParsedData, para: Paragraph.Paragraph): Entry {
  const paraIsLayer = Paragraph.hasModifier(para, Modifiers.LAYER);

  const image = getParaImage(para);
  if (image) {
    const lastEntry = result.entries[result.entries.length - 1];
    if (lastEntry && lastEntry.type === EntryTypes.images && lastEntry.isLayer === paraIsLayer) {
      lastEntry.images.push(image);
    } else {
      const imagesEntry: ImagesEntry = {
        type: EntryTypes.images,
        images: [image],
        wordsSoFar: result.totalWords,
        baseCharsSoFar: result.totalBaseChars,
        charsSoFar: result.totalChars,
        isLayer: paraIsLayer,
      };
      addEntry(result, imagesEntry);
      return imagesEntry;
    }
  }

  const writerComments = Paragraph.extractComments(para);
  if (!para.content.length && writerComments.length) {
    para.content = ' ';
  }

  const paraEntry: ParagraphEntry = {
    id: para.id,
    type: EntryTypes.paragraph,
    paraType: para.type,
    wordsSoFar: result.totalWords,
    baseCharsSoFar: result.totalBaseChars,
    charsSoFar: result.totalChars,
    wordCount: Paragraph.wordCount(para) || 0,
    content: para.content,
    tabLevel: para.tabLevel,
    modifiers: para.modifiers,
    isLayer: paraIsLayer,
    writerComments,
  };
  addEntry(result, paraEntry);
  return paraEntry;
}

function addTocEntry(result: ParsedData, paras: Paragraph.Paragraph[], paraIdx: number) {
  const para: Paragraph.Paragraph | undefined = paras[paraIdx];
  if (!para) {
    return;
  }

  if (para.type !== ParagraphTypes.Types.CHAPTER && para.type !== ParagraphTypes.Types.SECTION && para.type !== ParagraphTypes.Types.SCENE) {
    return;
  }

  const snippet = [para.content.substring(0, 255)];
  const nextPara = paras[paraIdx + 1];
  if (nextPara) {
    snippet.push(nextPara.content.substring(0, 100) + (nextPara.content.length > 100 ? '...' : ''));
  }

  const toc: TocEntry = {
    type: para.type,
    charsSoFar: result.totalChars,
    baseCharsSoFar: result.totalBaseChars,
    snippet: snippet,
    summary: undefined, // filled in by addSummaryToLastChapter
    paraID: para.id,
  };
  result.toc.push(toc);
}

function addSummaryToLastChapter(result: ParsedData, summary: string) {
  let lastChapter: TocEntry | undefined;
  for (const entry of result.toc) {
    if (entry.type === ParagraphTypes.Types.CHAPTER) {
      lastChapter = entry;
    }
  }
  if (lastChapter) {
    lastChapter.summary = summary;
    return true;
  }
  return false;
}

interface MagicState {
  authorNote?: AuthorNoteEntry;
  errFunc: Log.LogFunction;
  metricsDimsHolder: ContextMetricDimensionsHolder;
  authorNoteNames: StashOf<boolean>;
}

function handleTheMagic(result: ParsedData, para: Paragraph.Paragraph, magicState: MagicState): boolean {
  // Check for magicMoriMarkers and fill out tag and value if found
  let moriTag: string | null = null;
  let moriValue: string | null = null;
  let match: RegExpMatchArray | null = para.content.match(/#magicmori([^\s]+)\s(.*)/);
  if (!match) {
    match = para.content.match(/#magicmori([^\s]+)/);
  }
  if (match) {
    const parts = match[1].split('-');
    moriTag = parts[0];
    moriValue = match[2] && match[2].trim();
    if (!moriValue || !moriValue.length) {
      moriValue = null;
    }
  }

  function loopErrIf(cond, msg) {
    if (cond) {
      magicState.errFunc(magicState.metricsDimsHolder, '@sam', msg);
    }
    return cond;
  }

  if (moriTag) {
    switch (moriTag) {
      case 'start':
        if (loopErrIf(magicState.authorNote, 'Got #magicmoristart inside another #magicmoristart')) {
          break;
        }
        if (loopErrIf(!moriValue, 'Missing authorNote name in #magicmoristart')) {
          break;
        }
        const name = moriValue!;

        loopErrIf(magicState.authorNoteNames[name], 'Got repeated authorNote name: ' + name);
        magicState.authorNoteNames[name] = true;

        magicState.authorNote = {
          type: EntryTypes.authorNote,
          wordsSoFar: result.totalWords,
          charsSoFar: result.totalChars,
          baseCharsSoFar: result.totalBaseChars,

          name: name,
          answers: [],
          multi: false,
          paraCount: 0,
          chapter: result.totalChapters,
          paragraphs: {},
        };
        break;

      case 'stop':
        if (loopErrIf(!magicState.authorNote, 'Got #magicmoristop without a #magicmoristart')) {
          break;
        }
        const authorNote = magicState.authorNote!;
        magicState.authorNote = undefined;
        addEntry(result, authorNote);
        break;

      case 'multi':
        if (loopErrIf(!magicState.authorNote, 'Got #magicmorimulti without a #magicmoristart')) {
          break;
        }
        magicState.authorNote!.multi = true;
        break;

      case 'answer':
        if (loopErrIf(!magicState.authorNote, 'Got #magicmorianswer without a #magicmoristart')) {
          break;
        }
        moriValue && magicState.authorNote!.answers.push(moriValue);
        break;

      case 'preview':
        if (loopErrIf(magicState.authorNote, 'Got #magicmoripreview inside a #magicmoristart')) {
          break;
        }
        const previewEntry: PreviewEntry = {
          type: EntryTypes.preview,
          wordsSoFar: result.totalWords,
          baseCharsSoFar: result.totalBaseChars,
          charsSoFar: result.totalChars,
        };
        addEntry(result, previewEntry);
        break;

      case 'button':
        if (loopErrIf(!moriValue, '#magicmoributton missing data')) {
          break;
        }
        const buttonElements: string[] = moriValue ? moriValue.split('>') : [];
        if (loopErrIf(buttonElements.length < 2, '#magicmoributton missing data')) {
          break;
        }

        const buttonElement = buttonElements[0].split(',');
        const buttonMenu = buttonElements[1].split('|');

        const buttonEntry: ButtonEntry = {
          type: 'button',
          wordsSoFar: result.totalWords,
          charsSoFar: result.totalChars,
          baseCharsSoFar: result.totalBaseChars,

          name: buttonElement[0],
          icon: buttonElement[1] || '',
          directFire: false,
          note: buttonElement[2] === 'note',
          noteText: buttonElement[3] || undefined,
          flyoutText: buttonElements[2] || undefined,
          nameMatch: [],
          reaction: {},
        };

        if (buttonElements[1].length) {
          loopErrIf(buttonEntry.note, 'Feedback buttons with name "note" can not have reaction buttons');
          for (let b = 0; b < buttonMenu.length; b++) {
            const subElement = buttonMenu[b].split(',');
            const reaction: Paragraph.ButtonReaction = {
              name: subElement[0],
              icon: subElement[1],
              note: subElement[2] === 'note',
              noteText: subElement[3],
            };
            buttonEntry.reaction[Object.keys(buttonEntry.reaction).length] = reaction;
          }
        } else {
          buttonEntry.directFire = true;
        }
        if (buttonElements[3] && buttonElements[3].length) {
          buttonEntry.nameMatch = buttonElements[3].split(',');
        }

        addEntry(result, buttonEntry);
        break;

      case 'throwexception': // note: this is the worst magicMoriMark
        // this is just for use by magicMoriParseTest
        throw new Error('got #magicmorithrowexception');

      case 'chapterinfo':
        loopErrIf(!moriValue, '#magicmorichapterinfo missing summary string');
        const success = addSummaryToLastChapter(result, moriValue || '');
        loopErrIf(!success, '#magicmorichapterinfo can\'t find chapter to put chapterinfo on');
        break;

      default:
        magicState.errFunc(magicState.metricsDimsHolder, '@sam', 'unknown magic mori mark: ' + moriTag);
        break;
    }
    return true;
  } else if (magicState.authorNote) {
    magicState.authorNote.paragraphs[para.id] = para;
    magicState.authorNote.paraCount++;
    return true;
  } else {
    return false;
  }
}

function parseInternal(
  metricsDimsHolder: ContextMetricDimensionsHolder,
  paras: Paragraph.Paragraph[],
  errFunc: Log.LogFunction,
  _activeLayers?: Stash,
): ParsedData {
  const startTime = Date.now();
  const result: ParsedData = {
    manuscript: false,
    totalWords: 0,
    totalChars: 1, // treat the title page as character 0
    totalBaseChars: 0,
    totalChapters: 0,
    entries: [],
    toc: [],
  };

  const magicState: MagicState = {
    errFunc,
    metricsDimsHolder,
    authorNoteNames: {},
  };

  // insert dummy entry for cover, we'll fill this in during rendering
  // THIS MUST BE THE FIRST PARSED ITEM
  addParagraphEntry(result, {
    id: 'cover',
    type: EntryTypes.paragraph,
    content: ' ',
    tabLevel: 0,
    modifiers: [],
    renderCache: { line: null },
  });

  let nextCommentSummaryEntry: CommentSummaryEntry = createCommentSummaryEntry(result);

  for (let i = 0; i < paras.length; ++i) {
    const para = paras[i];
    if (!para) {
      continue;
    }

    Paragraph.cleanUpModifiers(para.modifiers, para.content.length);

    addTocEntry(result, paras, i);

    switch (para.type) {
      case ParagraphTypes.Types.CHATLEFT:
      case ParagraphTypes.Types.CHATRIGHT:
      case ParagraphTypes.Types.CHATHEADER:
      case ParagraphTypes.Types.REFERENCE:
        addParagraphEntry(result, para);
        break;

      case ParagraphTypes.Types.P:

        //const buttonModifier = Paragraph.findOneModifierByType(para, Modifiers.BUTTON_TRIGGER) as ButtonTriggerModifier;
        const questionModifier = Paragraph.findOneModifierByType(para, Modifiers.QUESTION) as QuestionModifier;

        if (handleTheMagic(result, para, magicState)) {
          // already handled
        /*
        } else if (buttonModifier) {
          // button entry
          const buttonEntry : ButtonEntry = {
            type: 'button',
            wordsSoFar: result.totalWords,
            charsSoFar: result.totalChars,
            baseCharsSoFar: result.totalBaseChars,

            name: buttonModifier.data.name,
            icon: buttonModifier.data.icon,
            directFire: buttonModifier.data.directFire,
            note: buttonModifier.data.note,
            noteText: buttonModifier.data.noteText,
            flyoutText: buttonModifier.data.flyoutText,
            nameMatch: buttonModifier.data.nameMatch,
            reaction: buttonModifier.data.reaction,
          };
          addEntry(result, buttonEntry);
        */
        } else if (questionModifier) {
          // author note entry making use of all following paras that have Modifiers.RESPONSE set
          const authorNoteEntry: AuthorNoteEntry = {
            type: EntryTypes.authorNote,
            wordsSoFar: result.totalWords,
            charsSoFar: result.totalChars,
            baseCharsSoFar: result.totalBaseChars,

            name: questionModifier.data.label,
            answers: [],
            multi: questionModifier.data.type === 'multi-choice',
            paraCount: 1,
            chapter: result.totalChapters,
            paragraphs: {
              [para.id]: para,
            },
          };

          let lookAheadIndex = i + 1;
          let nextPara = paras[lookAheadIndex];
          while (nextPara) {
            const responseModifier = Paragraph.findOneModifierByType(para, Modifiers.RESPONSE);
            if (!responseModifier) {
              break;
            }

            authorNoteEntry.answers.push(nextPara.content);
            nextPara = paras[lookAheadIndex++];
          }
          i = lookAheadIndex - 1;
          addEntry(result, authorNoteEntry);
        } else {
          addParagraphEntry(result, para);
        }
        break;

      case ParagraphTypes.Types.PREVIEW:
        const previewEntry: PreviewEntry = {
          type: EntryTypes.preview,
          wordsSoFar: result.totalWords,
          baseCharsSoFar: result.totalBaseChars,
          charsSoFar: result.totalChars,
        };
        addEntry(result, previewEntry);
        break;

      case ParagraphTypes.Types.CHAPTER:
      case ParagraphTypes.Types.SECTION:
        if (Paragraph.hasModifier(para, Modifiers.LAYER)) {
          // ignore chapters/sections within a layer
          break;
        }

        if (para.type === ParagraphTypes.Types.CHAPTER) {
          result.totalChapters++;
        } else if (para.type === ParagraphTypes.Types.SECTION) {
          // clear chapter for this comment summary to avoid chapter numbering weirdness
          //  when a manuscript has both chapters and sections
          nextCommentSummaryEntry.chapter = -1;
        }
        nextCommentSummaryEntry.endIdx = result.entries.length - 1;
        addEntry(result, nextCommentSummaryEntry);
        nextCommentSummaryEntry = createCommentSummaryEntry(result);

        addParagraphEntry(result, para);
        break;

      default:
        Log.warn(metricsDimsHolder, '@conor', 'Reader ignoring paragraph of type: ' + para.type);
        break;
    }
  }

  nextCommentSummaryEntry.endIdx = result.entries.length - 1;
  if (nextCommentSummaryEntry.endIdx >= nextCommentSummaryEntry.startIdx) {
    addEntry(result, nextCommentSummaryEntry);
  }

  // preview has its own terminator
  const terminator: TerminatorEntry = {
    type: EntryTypes.terminator,
    wordsSoFar: result.totalWords,
    baseCharsSoFar: result.totalBaseChars,
    charsSoFar: result.totalChars,
  };
  addEntry(result, terminator);

  Log.info(metricsDimsHolder, 'BookData parsed in ' + (Date.now() - startTime) + 'ms.');
  fillOrdinalities(result);
  return result;
}

export function parse(metricsDimsHolder: ContextMetricDimensionsHolder, paras: Paragraph.Paragraph[], activeLayers?: Stash) {
  let parseResult: ParsedData | string = '';
  try {
    parseResult = parseInternal(metricsDimsHolder, paras, Log.error, activeLayers);
  } catch (e) {
    Log.info(metricsDimsHolder, 'Caught exception in readerParse.', e);
    parseResult = Util.errorToString(e, false) || 'exception parsing book data';
  }

  return parseResult;
}

export function validate(metricsDimsHolder: ContextMetricDimensionsHolder, paras: Readonly<Readonly<Paragraph.Paragraph>[]>) {
  const validationParas = Util.clone(paras) as Paragraph.Paragraph[];

  let error: string | undefined;
  function errFunc(_metricsDimsHolder: ContextMetricDimensionsHolder, _userIgnored: Log.ProgrammerTag, msg, obj) {
    error = msg + (obj ? Util.safeStringify(obj) : '');
    return null;
  }

  let parseResult: ParsedData | string = '';
  try {
    parseResult = parseInternal(metricsDimsHolder, validationParas, errFunc as any);
  } catch (e) {
    parseResult = Util.errorToString(e, false) || 'exception parsing book data';
  }

  return error || parseResult;
}
