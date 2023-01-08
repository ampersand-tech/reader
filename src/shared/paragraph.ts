/**
* Copyright 2014-present Ampersand Technologies, Inc.
*/

import * as Constants from 'clientjs/shared/constants';
import { MAGIC_MORI_TAGS } from 'clientjs/shared/readerParse';
import * as Log from 'overlib/shared/logCommon';
import * as Util from 'overlib/shared/util';

import {
  allDiffModifiers,
  allTrackChangesModifiers,
  DiffRemoveParagraph,
  fallBackTypes,
  isMentionModifier,
  isParaCompareModifier,
  isParaNumberModifier,
  isTagCommentModifier,
  isTCModifier,
  ModData,
  Modifier,
  Modifiers,
  ModifierType,
  ModifierValuesMap,
  ModMentionData,
  ModTagCommentData,
  ModTCData,
  NeverSplitOrMergeMods,
  Para,
  ParaCompareModifier,
  ParaCompareModifierType,
  Paragraph,
  ParagraphRemoved,
  ParaModifier,
  ParaModifierType,
  ParaType,
  Range,
  RemoveParagraph,
  renderOnlyModifiers,
  StripTrackChangeDeletes,
  StyleModifierType,
  TagCommentModifierType,
  TCModifier,
  TCModifierType,
  TCRevertData,
  TCRevertType,
  Types,
  TypeValuesMap,
  unacceptedModifiers,
  UndoCountData,
  WidgetTypes,
  wordOnlyMods,
  ResponseModifier,
} from 'clientjs/shared/paragraphTypes';

export * from 'clientjs/shared/paragraphTypes';

type UUIDFunc = () => string;


export function create(id: string | undefined | null, type: ParaType, content: string, modifiers ?: Modifier[], tabLevel ?: number): Paragraph {
  content = content || '';

  if (!(type in TypeValuesMap)) {
    // fixup old checkpoints that include deprecated styling
    type = fallBackTypes[type];
    if (!type) {
      Log.errorNoCtx('@unassigned', 'Paragraph.create needs valid type or fallback type', {type: type});
    }
  }
  if (modifiers && !Array.isArray(modifiers)) {
    Log.errorNoCtx('@unassigned', 'Paragraph.create.invalidModifiers', {id: id, modifiers: modifiers});
    modifiers = undefined;
  }
  const p: Paragraph = {
    id: id || '',
    type: type,
    content: (content || ''),
    modifiers: (Util.clone(modifiers) || []),
    renderCache: { line: null },
  };
  if (tabLevel) {
    p.tabLevel = tabLevel;
  }
  return p;
}

export function createDiffRemove(line?: number): DiffRemoveParagraph {
  return {remove: 1, line: line};
}

export function createRemove(line?: number, id?: string): RemoveParagraph {
  const p: RemoveParagraph = {remove: 1, renderCache: { line: null }};
  if (Util.isNumber(line)) {
    p.renderCache.line = line;
  }
  if (id) {
    p.id = id;
  }
  return p;
}

export function createConflict(id: string, content: string, data, tagCommentData: ModTagCommentData) {
  content = '#mori_conflict ' + content;
  const p = create(id, Types.P, content);
  addModifier(p, Modifiers.CONFLICT, -1, -1, data);
  addModifier(p, 'tagComment', 0, content.length, tagCommentData);
  return p;
}

export function createShort(type: ParaType) {
  return create(undefined, type, '');
}

function putEndingModsIntoRes(res: Modifier[], act: Modifier[], iText: number) {
  const resActive: Modifier[] = [];
  for (let i = 0; i < act.length; ++i) {
    const m = act[i];
    if (m.end === iText) {
      res.push(m);
    } else {
      resActive.push(m);
    }
  }
  return resActive;
}

function splitActiveModsIntoRes(res: Modifier[], act: Modifier[], iText: number) {
  const resActive: Modifier[] = [];
  for (let i = 0; i < act.length; ++i) {
    const m = act[i];
    const mNew = Util.clone(m);
    m.end = iText;
    mNew.start = iText;
    res.push(m);
    resActive.push(mNew);
  }
  return resActive;
}

/**
* get a set of modifiers that don't overlap. This is needed for converting to markup
*  {start: 1, end: 3, type: Paragraph.Modifiers.B},
*  {start: 3, end: 4, type: Paragraph.Modifiers.B},
*  {start: 3, end: 4, type: Paragraph.Modifiers.I},
*/
export function getUncollapsedModifiers(p: Paragraph, specialsToIncludeIn ?: ModifierType | ModifierType[]) {
  let specialsToInclude: ModifierType[];
  if (!Array.isArray(specialsToIncludeIn)) {
    specialsToInclude = specialsToIncludeIn ? [specialsToIncludeIn] : [];
  } else {
    specialsToInclude = specialsToIncludeIn;
  }
  let modsRes: Modifier[] = [];
  const modStarts = {};
  const modEnds = {};
  let i;
  for (i = 0; i < p.modifiers.length; ++i) {
    const m = p.modifiers[i];
    if (specialsToInclude.indexOf(m.type) !== -1) {
      modsRes.push(m);
      continue;
    }
    if (m.start === m.end) {
      // zero-length mods screw up this logic
      continue;
    }
    if (!(m.start in modStarts)) {
      modStarts[m.start] = [];
    }
    modStarts[m.start].push(m);
    if (!(m.end in modEnds)) {
      modEnds[m.end] = [];
    }
    modEnds[m.end].push(m);
  }

  let active: Modifier[] = [];
  for (i = 0; p.content && i < p.content.length; ++i) {
    // if any actives end here, pull them out into the results
    // and split any active that are still going
    if (i in modEnds) {
      active = putEndingModsIntoRes(modsRes, active, i);
      active = splitActiveModsIntoRes(modsRes, active, i);
    }

    if (!(i in modStarts)) {
      continue; // nothing new starting
    }

    // new start, all actives need a new start here as
    // well
    active = splitActiveModsIntoRes(modsRes, active, i);
    const starts = modStarts[i].map(Util.clone);
    active = active.concat(starts);
  }
  // finally, any active ones left should be added
  modsRes = modsRes.concat(active);

  // sort
  modsRes.sort((a, b) => {
    return Util.cmpNum(false, a.start, b.start);
  });
  return modsRes;
}

/*
* creates a list of modifiers for each range in the paragraph:
* [
*   {start: 0, end: 1, modifiers: []},
*   {start: 1, end: 3, modifiers: [Paragraph.Modifiers.B]},
*   {start: 3, end: 4, modifiers: [Paragraph.Modifiers.B, Paragraph.Modifiers.I]},
*   {start: 4, end: 5, modifiers: [Paragraph.Modifiers.B, Paragraph.Modifiers.I, Paragraph.Modifiers.S]},
*   {start: 5, end: 9, modifiers: [Paragraph.Modifiers.I, Paragraph.Modifiers.S]},
*   {start: 9, end: 14, modifiers: [Paragraph.Modifiers.S]},
* ];
*/
export function getModifiersForContent(p: Paragraph, specialsToInclude ?: ModifierType[]) {
  const modifiers = getUncollapsedModifiers(p, specialsToInclude);
  const res: {start: number; end: number; modifiers: (Modifier|ModifierType)[]}[] = [];

  const specialMods = {start: -1, end: -1, modifiers: [] as Modifier[]};
  let i = 0;
  for (i = 0; i < modifiers.length; ++i) {
    const m = modifiers[i];
    if (m.start < 0) {
      specialMods.modifiers.push(m);
    } else {
      break;
    }
  }
  if (specialMods.modifiers.length > 0) {
    modifiers.splice(0, i);
    res.push(specialMods);
  }

  if (!p.content) {
    return res;
  }


  let iContent = 0;
  let iModifiers = 0;
  while (iContent < p.content.length) {
    const curMod = iModifiers < modifiers.length ? modifiers[iModifiers] : null;
    if (!curMod) {
      // stretch at the end with no modifiers
      res.push({start: iContent, end: p.content.length, modifiers: []});
      iContent = p.content.length;
    } else if (iContent < curMod.start) {
      // stretch of text with no modifiers
      res.push({start: iContent, end: curMod.start, modifiers: []});
      iContent = curMod.start;
    } else {
      const resMod = {start: curMod.start, end: curMod.end, modifiers: [] as (Modifier | ModifierType)[]};

      for (; iModifiers < modifiers.length; ++iModifiers) {
        const mod = modifiers[iModifiers];
        if (mod.start !== curMod.start) {
          break;
        }
        if (Util.isObject(mod) && specialsToInclude && specialsToInclude.indexOf(mod.type) !== -1) {
          resMod.modifiers.push(mod);
        } else {
          resMod.modifiers.push(mod.type);
        }
      }
      resMod.modifiers.sort((a, b) => {
        const aType = Util.isObject(a) ? a.type : a;
        const bType = Util.isObject(b) ? b.type : b;
        return Util.cmpString(false, aType, bType);
      });
      res.push(resMod);
      iContent = curMod.end;
    }
  }
  return res;
}

/**
* Add text of a given type to a paragraph. Note that this assumes no paragraph-like line breaks for now
* we should probably do that at some point.
* Use this to build up a paragraph as you parse it.
*/
export function addText(p: Paragraph, text: string, typeOrTypes ?: ModifierTypeIn, data ?: ModData) {
  const startPos = p.content.length;
  p.content += text;

  if (!typeOrTypes) {
    return p;
  }
  const types = typeToObj(typeOrTypes);
  for (let type in types) {
    addModifier(p, type as ModifierType, startPos, startPos + text.length, data);
  }
  return p;
}

export function insertPara(oldPara: Paragraph, newPara: Paragraph, insertPos: number) {
  let [firstP, lastP] = splitParagraph(oldPara, insertPos);
  firstP = mergeParagraphs(firstP, newPara);
  return mergeParagraphs(firstP, lastP);
}

export function addImg(p: Paragraph, imgSrc: string) {
  addText(p, ' ');
  addModifier(p, Modifiers.WIDGET, p.content.length - 1, p.content.length, {widget: WidgetTypes.IMG, url: imgSrc});
}

function stripUnacceptedContent(p: Paragraph) {
  const mods = p.modifiers;
  let i = mods.length;
  const ranges: Range[] = [];
  while (i--) {
    if (mods[i]) {
      if (ParagraphRemoved[mods[i].type]) {
        return undefined;
      } else if (StripTrackChangeDeletes[mods[i].type]) {
        ranges.push({start: mods[i].start, end: mods[i].end });
      } else if (allTrackChangesModifiers[mods[i].type]) {
        mods.splice(i, 1);
      }
    }
  }
  deleteContentRanges(p, ranges);
  return p;
}

export interface ExtractedComment {
  content: string;
  mods: Modifier[];
}

export function extractComments(paragraph: Paragraph): ExtractedComment[] {
  const mods = paragraph.modifiers;
  let i = mods.length;
  let extracted: ExtractedComment[] = [];
  while (i--) {
    const mod = mods[i];
    if (mod && mod.type === 'tagComment') {
      let start = mod.start;
      // If there is a character of leading whitespace, remove it
      // This is kind of arbitrary, but fits the most common case that catches users off guard.
      if (mod.start > 0 &&  /\s/.test(paragraph.content[mod.start - 1])) {
        start--;
      }

      // correct mod start/end for extracted mods later in the paragraph
      const removeLen = mod.end - start;
      for (const prev of extracted) {
        for (const prevMod of prev.mods) {
          prevMod.end -= removeLen;
          prevMod.start -= removeLen;
        }
      }

      const content = paragraph.content.slice(mod.start, mod.end);
      const removedMods = removeContent(paragraph, start, mod.end);
      extracted.unshift({ content, mods: removedMods });
    }
  }
  return extracted;
}

export function stripForBooks(paragraph: Paragraph, stripMorimarks = true) {
  paragraph = stripUnacceptedContent(paragraph)!;
  if (!paragraph) {
    return;
  }
  if (!stripMorimarks) {
    return paragraph;
  }

  const moriNote = checkForMagicMori(paragraph);
  if (!moriNote) {
    extractComments(paragraph);
  }
  return paragraph;
}

export function detectAndCreateMoriMarks(p: Paragraph, buildTagCommentDataFun: () => ModTagCommentData) {
  const marks = findMoriMarks(p.content);
  let i = marks.length;
  while (i-- > 0) {
    const m = marks[i];
    if (m.content[0] === '#') {
      addModifier(p, Modifiers.TAGCOMMENT, m.start, m.end, buildTagCommentDataFun());
    }
  }
}

interface FoundMoriMark {
  content: string;
  start: number;
  end: number;
}

export function findMoriMarks(content: string): FoundMoriMark[] {
  const found: FoundMoriMark[] = [];
  if (!content.length) {
    return found;
  }
  let match;
  const tagreg = /([#@][\w\?\!]+)\b/g;
  while ((match = tagreg.exec(content)) !== null) {
    const str = match[1].toLowerCase();
    if (str) {
      found.push({content: str, start: match.index, end: match.index + str.length});
    }
  }
  return found;
}

const DeleteNormalModifiers = {ad: true, ud: true, ap: true, up: true};

export function readerFeedbackToPara(para: Paragraph, offset: number | string) {
  if (!para) {
    return offset;
  }
  offset = typeof(offset) === 'string' ? parseInt(offset, 10) : offset;
  let furthestEndAdded = 0;

  for (let i = 0; i < para.modifiers.length; i++) {
    const modifier = para.modifiers[i];
    if (modifier.start > offset) {
      break;
    }
    if (!DeleteNormalModifiers[modifier.type]) {
      continue;
    }

    if (modifier.start < offset) {
      if (modifier.start >= furthestEndAdded) {
        offset += modifier.end - modifier.start;
        furthestEndAdded = modifier.end;
      } else if (modifier.end > furthestEndAdded) {
        offset += modifier.end - furthestEndAdded;
        furthestEndAdded = modifier.end;
      }
    }
  }
  return offset;
}

export function stripTrackChangeDeletes(p: Paragraph) {
  const mods = p.modifiers;
  let i = mods.length;
  while (i--) {
    if (mods[i] && StripTrackChangeDeletes[mods[i].type]) {
      removeContent(p, mods[i].start, mods[i].end);
    }
  }
}

function pickLaterTrackChangesTime(m1: Modifier, m2: Modifier) {
  if (isTCModifier(m1) && isTCModifier(m2)) {
    if (m1.data.editTime && m2.data.editTime) {
      m1.data.editTime = m2.data.editTime  = Math.max(m2.data.editTime, m1.data.editTime);
    } else if (m1.data.editTime) {
      m2.data.editTime = m1.data.editTime;
    } else {
      m1.data.editTime = m2.data.editTime;
    }
  }
}

function filterTrackChangesModifiers(modifiers: Modifier[], idx: number, newMod: Modifier) {
  const mod = modifiers[idx];
  if (mod.start === -1 && mod.end === -1 && newMod.start <= 0) {
    pickLaterTrackChangesTime(mod, newMod);
    if (newMod.type !== 'noop') {
      modifiers.splice(idx, 1);
    }
  } else if (mod.start <= newMod.end && mod.end >= newMod.start) {
    pickLaterTrackChangesTime(mod, newMod);
    if (mod.end <= newMod.end) {
      if (mod.start >= newMod.start) {
        if (newMod.type !== 'noop') {
          modifiers.splice(idx, 1);
        } else {
          mod.type = 'noop';
        }
      } else {
        mod.end = newMod.start;
      }
    } else {
      if (mod.start >= newMod.start) {
        mod.start = newMod.end;
      } else {
        const splitMod = Util.clone(mod);
        splitMod.start = newMod.end;
        splitMod.end = mod.end;
        mod.end = newMod.start;
        modifiers.push(splitMod);
        pickLaterTrackChangesTime(mod, splitMod);
      }
    }
  }
}

function cmpModData(modA, modB) {
  if (modA.data.authorID !== modB.data.authorID) {
    return false;
  }
  if (!Util.objCmpFast(modA.data.undoCount, modB.data.undoCount)) {
    return false;
  }
  return true;
}

export function reconcileTrackChangesModifiers(modifiers: Modifier[], newMod: TCModifier) {
  // TODO update comments
  // the following modifiers will impact other modifiers
  // UI - unaccepted text insertion
  //  UI
  //    if authorID and undoCount match, just add to the span
  //    if not, split the surrounding tag and surround new text with UI
  //  UD
  //    if authorID and undoCount match, just subtract from the span
  //    if not, surround text with UD
  //  UC, AI, AC, AD
  //     split the surrounding tag and surround new text with UI
  //  UP, AP
  //     split the surrounding tag, convert it to UD, AD and surround new text with UI
  // UD - unaccepted deletion
  //   UI
  //     if authorID and undoCount match, just add delete
  //   UC, AI, AC
  //     do nothing, splits happen when delete is accepted
  //   UD, AD, UP, AP
  //     ignore double deletion
  // UP - Unaccepted paragraph deletion
  //   UI
  //     if authorID and undoCount match, just subtract from the span
  //     if not, split the surrounding tag and surround new text with UP
  //   UC
  //     split the surrounding tag and surround new text with UP
  //   AI, AC
  //     split the surrounding tag and surround new text with UP
  //   UD, AD, UP, AP
  //     ignore double deletion
  // UC - Unaccepted change within tags
  //   UI
  //     if authorID and undoCount match, merge changes
  //   UC, AI, AC
  //     add change regardless
  //   UD, AD, UP, AP
  //     ignore changes to deleted ranges

  let i = modifiers.length;
  const newMods = [newMod];
  if (i === 0) { // special case paragraph with empty modifiers
    return newMods;
  }
  while (i--) {
    if (!allTrackChangesModifiers[modifiers[i].type]) {
      continue;
    }
    const mod = modifiers[i];
    let j = newMods.length;
    while (j--) {
      newMod = newMods[j];
      switch (newMod.type) {
        case Modifiers.UI:
          switch (mod.type) {
            case Modifiers.UI:
              if (cmpModData(newMod, mod)) {
                filterTrackChangesModifiers(newMods, j, mod);
              } else {
                filterTrackChangesModifiers(modifiers, i, newMod);
              }
              break;
            case Modifiers.UC:
            case Modifiers.UD:
            case Modifiers.AI:
            case Modifiers.AC:
            case Modifiers.AD:
              filterTrackChangesModifiers(modifiers, i, newMod);
              break;
            case Modifiers.UP:
              mod.type = 'ud';
              filterTrackChangesModifiers(modifiers, i, newMod);
              break;
            case Modifiers.AP:
              mod.type = 'ad';
              filterTrackChangesModifiers(modifiers, i, newMod);
              break;
          }
          break;
        case Modifiers.UD:
          switch (mod.type) {
            case Modifiers.UI:
              if (cmpModData(newMod, mod)) {
                filterTrackChangesModifiers(newMods, j, mod);
              }
              break;
            case Modifiers.UD:
            case Modifiers.UP:
              break;
            case Modifiers.AP:
            case Modifiers.AD:
              // when can this happen?
              filterTrackChangesModifiers(newMods, j, {type: 'noop', start: mod.start, end: mod.end} as TCModifier);
              break;
          }
          break;
        case Modifiers.UC:
          switch (mod.type) {
            case Modifiers.UI:
              if (cmpModData(newMod, mod)) {
                filterTrackChangesModifiers(newMods, j, mod);
              }
              break;
            case Modifiers.UC: // UC can't combine because they each contain revert data that is non-trivial
              break;
            case Modifiers.AD:
            case Modifiers.UD:
            case Modifiers.AP:
            case Modifiers.UP:
              filterTrackChangesModifiers(newMods, j, {type: 'noop', start: mod.start, end: mod.end} as TCModifier);
              break;
          }
          break;
      }
    }
  }
  return newMods;
}

// TODO add typed overrides for every modifier/data type
export function addModifier(p: Paragraph, modifier: TagCommentModifierType, textStart: number, textEnd: number, data: ModTagCommentData);
export function addModifier(p: Paragraph, modifier: 'mention', textStart: number, textEnd: number, data: ModMentionData);
export function addModifier(p: Paragraph, modifier: TCModifierType, textStart: number, textEnd: number, data: ModTCData);
export function addModifier(p: Paragraph, modifier: ModifierType, textStart: number, textEnd: number, data ?: ModData, bDontMerge?: boolean);

export function addModifier(p: Paragraph, modifier: ModifierType, textStart: number, textEnd: number, data ?: ModData, bDontMerge = false) {
  if (!(modifier in ModifierValuesMap)) {
    Log.errorNoCtx('invalid modifier ' + modifier);
    return;
  }
  if (textEnd < textStart) {
    Log.errorNoCtx('@unassigned', 'addModifier.endBelowStart', {s: textStart, e: textEnd, p: p});
    return;
  }
  if (modifier === 'tagComment' && !data) {
    Log.errorNoCtx('@mike', 'invalid data for tagComment modifier');
    return;
  }
  // a little cheating here: we're building the modifier of some type
  // so assume by the end of this function it has the correct shape
  const mod: Modifier = {type: modifier as any, start: textStart, end: textEnd};
  if (data) {
    (mod as any).data = data;
  }

  for (let i = 0; i < p.modifiers.length; i++) {
    const pMod = p.modifiers[i];
    if (mod.type === pMod.type &&
        mod.start === pMod.start &&
        mod.end === pMod.end) {
      if (isParaCompareModifier(mod) && (mod.type === 'add' || mod.type === 'del')) {
        if (mod.data as any !== '_unknown_') {
          (pMod as any).data = mod.data;
          return true;
        }
      } else if ((mod as any).data) {
        // only one nav, image per paragraph
        (pMod as any).data = (mod as any).data;
      }
      return true;
    }
  }
  p.modifiers.push(mod);
  sortModifiers(p.modifiers);
  if (bDontMerge !== true) {
    mergeAdjacentModifiers(p.modifiers);
  }
  return true;
}

export function addModifiers(p: Paragraph, modifiers: Modifier | Modifier[]) {
  if (!modifiers) {
    Log.errorNoCtx('@unassigned', 'addModifiers.nullModifiers');
    return;
  }
  if (!Array.isArray(modifiers)) {
    modifiers = [modifiers];
  }
  p.modifiers = p.modifiers.concat(modifiers);
  sortModifiers(p.modifiers);
  mergeAdjacentModifiers(p.modifiers);
  return p.modifiers;
}

/**
 * empty is defined, currently, as having no content and no images.
 */
export function isEmpty(p: Paragraph) {
  if (p.content.length > 0) {
    return false;
  }
  for (let i = 0; i < p.modifiers.length; i++) {
    if (p.modifiers[i].type === Modifiers.IMG) {
      return false;
    }
  }
  return true;
}

function deleteContentRanges(p: Para, ranges: Range[], actualDelete = false) {
  if (!ranges.length) {
    return [];
  }

  const mods = p.modifiers;
  let mod: Modifier;
  let mIdx: number;
  let i;

  // pre-sort so merging doesn't miss overlaps
  ranges = ranges.sort(function(a, b) {
    return a.start - b.start;
  });

  // merge overlapping ranges
  const merged: Range[] = [];
  for (i = 0; i < ranges.length; ++i) {
    const r = ranges[i];
    if (r.start === r.end && r.start === -1) {
      continue;
    }

    if (r.start === r.end && !actualDelete) {
      // different rules when removing track changes for display
      // treat zero-length modifiers specially; do not merge, just delete matching modifiers
      mIdx = mods.length;
      while (mIdx--) {
        mod = mods[mIdx];
        if (mod.start === mod.end && mod.start === r.start && mod.type !== Modifiers.UI) {
          mods.splice(mIdx, 1);
        }
      }
      continue;
    }

    let j;
    for (j = 0; j < merged.length; ++j) {
      const m = merged[j];
      if (r.start <= m.end && m.start <= r.end) {
        m.start = Math.min(m.start, r.start);
        m.end = Math.max(m.end, r.end);
        break;
      }
    }
    if (j === merged.length) {
      merged.push(r);
    }
  }

  const clamped: Modifier[] = [];
  for (i = merged.length - 1; i >= 0; --i) {
    const rangeStart = merged[i].start;
    const rangeEnd = merged[i].end;

    p.content = p.content.substr(0, Math.max(rangeStart, 0)) + p.content.substr(rangeEnd);

    const delta = rangeEnd - Math.max(rangeStart, 0);
    mIdx = mods.length;
    while (mIdx--) {
      mod = mods[mIdx];
      if ((mod.start === -1  && mod.end === -1) || mod.end <= rangeStart) {
        continue;
      }
      if (mod.start < rangeEnd) {
        clamped.push(Util.clone(mod));
      }
      if (rangeStart <= mod.start && rangeEnd >= mod.end && (mod.start !== 0 || mod.type !== Modifiers.UI)) {
        mods.splice(mIdx, 1);
        continue;
      }
      // at this point the mod partly overlaps or is beyond the range
      mod.start = mod.start < rangeStart ? mod.start : Math.max(rangeStart, mod.start - delta);
      mod.end = mod.end < rangeEnd ? rangeStart : mod.end - delta;

      if (isMentionModifier(mod)) {
        if (p.content.slice(mod.start, mod.end) !== mod.data.content) {
          mods.splice(mIdx, 1);
        }
      }
    }
  }

  sortModifiers(p.modifiers);
  mergeAdjacentModifiers(p.modifiers);
  return clamped.reverse();
}

export function removeContent(p: Para, rangeStart: number, rangeEnd: number) {
  return deleteContentRanges(p, [{ start: rangeStart, end: rangeEnd }], true);
}

export function getMaskedMods(mods: Modifier[]) {
  const retVal: StashOf<true> = {};
  // don't actually move any mod positions around
  let dm = mods.length;
  while (dm--) {
    if (!mods[dm]) {
      continue;
    }
    if (mods[dm].type !== Modifiers.UD && mods[dm].type !== Modifiers.AD) {
      continue;
    }
    retVal[dm] = true;
    const rangeStart = mods[dm].start;
    const rangeEnd = mods[dm].end;
    let m = mods.length;
    while (m--) {
      const mod = mods[m];
      if (mod.start === -1 || mod.end <= rangeStart) {
        continue;
      }
      if (rangeStart <= mod.start && rangeEnd >= mod.end && (mod.start !== 0 || mod.type !== Modifiers.UI)) {
        retVal[m] = true;
        continue;
      }
    }
  }
  return retVal;
}

export function getModsInRangeClamped(modsIn: Modifier[], rangeStart: number, rangeEnd: number, allowedModifiers ?: ModifierTypeIn) {
  if (!Array.isArray(modsIn)) {
    Log.warnNoCtx('@unassigned', 'getModsInRangeClamped.notArray', 'make sure you pass a modifier array in');
    return;
  }
  const mods: Modifier[] = [];
  let i;
  if (allowedModifiers) {
    allowedModifiers = typeToObj(allowedModifiers);
  }
  for (i = 0; i < modsIn.length; ++i) {
    let mod = modsIn[i];
    if (allowedModifiers && !allowedModifiers.hasOwnProperty(mod.type)) {
      continue;
    }
    if (mod.end <= rangeStart || mod.start >= rangeEnd) {
      continue;
    }
    mod = Util.clone(mod);
    if (mod.start < rangeStart) {
      mod.start = rangeStart;
    }
    if (mod.end > rangeEnd) {
      mod.end = rangeEnd;
    }
    mods.push(mod);
  }
  return mods;
}

type ModifierTypeMask = Partial<{[k in ModifierType]: any}>;
type ModifierTypeIn = ModifierType | ModifierType[] | ModifierTypeMask;

function typeToObj(typeIn: ModifierTypeIn): Partial<ModifierTypeMask> {
  let types = {};
  if (typeof(typeIn) === 'string') {
    types = {};
    types[typeIn] = true;
  } else if (Array.isArray(typeIn)) {
    types = Util.arrayToObj(typeIn);
  } else if (typeof(typeIn) === 'object') {
    types = typeIn;
  }
  return types;
}

export function findModifiersByType(p: {modifiers?: Modifier[]}, typeIn: ModifierTypeIn): Modifier[] {
  if (!p.modifiers) {
    return [];
  }
  const types = typeToObj(typeIn);
  const res: Modifier[] = [];
  for (const mod of p.modifiers) {
    if (types.hasOwnProperty(mod.type)) {
      res.push(mod);
    }
  }
  return res;
}

export function findOneModifierByType(p: {id ?: string, modifiers ?: Modifier[]}, type: ModifierTypeIn): Modifier | null {
  const mods = findModifiersByType(p, type);
  if (mods.length > 1) {
    Log.warnNoCtx('@unassigned', 'dupeModsInPara', {type: type, paragraphID: p.id});
  }
  return mods.length === 0 ? null : mods[0];
}

export function hasModifier(p: Paragraph, type: ModifierTypeIn) {
  return findModifiersByType(p, type).length > 0;
}

export function hasModifierAtPos(p: Paragraph, type: ModifierType, pos: number) {
  for (const mod of p.modifiers) {
    if (mod.type === type && mod.start <= pos && mod.end >= pos) {
      return mod;
    }
  }

  return false;
}

export function removeModifiersByType(p: Paragraph, type: ModifierTypeIn) {
  type = typeToObj(type);
  const res: Modifier[] = [];
  let mod;
  for (let i = p.modifiers.length - 1; i >= 0; i--) {
    mod = p.modifiers[i];
    if (type.hasOwnProperty(mod.type)) {
      p.modifiers.splice(i, 1);
      res.push(mod);
    }
  }
  return res.reverse();
}

function replaceModifiersByType(p: {modifiers ?: Modifier[]}, type: ModifierTypeIn) {
  if (!p.modifiers) {
    return;
  }
  type = typeToObj(type);
  let mod;
  for (let i = p.modifiers.length - 1; i >= 0; i--) {
    mod = p.modifiers[i];
    if (type[mod.type] === null) {
      p.modifiers.splice(i, 1);
    } else if (type[mod.type]) {
      mod.type = type[mod.type];
    }
  }
}

export function replaceRenderOnlyModifiers(p: {modifiers ?: Modifier[]}) {
  replaceModifiersByType(p, renderOnlyModifiers);
}

// remove mods from a range in the paragraph, and update 'uc' and 'ac' track-changes mods accordingly.
//
// don't remove change mods directly because you can have multiple 'uc' mods overlapping with different revertData
// for example you might have mods:
//  'b' ,0,5
//  'uc',0,5,revertData:'b'
//  'i' ,1,6
//  'uc',1,6,revertData:'i',
//
// if you call removeModifiersInRange(p,1,5,['b','uc']) you get:
//  'i' ,1,6
//  'uc',5,6,revertData:'i'
// and now the paragraph is in an inconsistent state (the 'uc' no longer covers the 'i').
export function removeModifiersInRangeHelper(mods: Modifier[], start: number, end: number, typesIn ?: ModifierTypeIn) {
  const types = typesIn && typeToObj(typesIn);
  if (types && (types[Modifiers.UC] || types[Modifiers.AC])) {
    Log.warnNoCtx('@unassigned', 'removeModifiersInRangeHelper.invalidTypes', {types: types});
  }
  const len = end - start;
  if (len < 0) {
    Log.errorNoCtx('@unassigned', 'removeModifiersInRangeHelper.invalidRange', {start: start, end: end});
    return;
  }
  const toRemove: number[] = [];
  let i;
  for (i = 0; i < mods.length; ++i) {
    const m = mods[i];
    if (types) {
      if (isTCModifier(m) && (m.type === Modifiers.UC || m.type === Modifiers.AC)) {
        if (!m.data || !m.data.revertData || (typeof(m.data.revertData) === 'string' && !types[m.data.revertData])) {
          continue;
        }
      } else if (!types.hasOwnProperty(m.type)) {
        continue;
      }
    }
    if (m.start >= end || m.end <= start) {
      // no overlap
      continue;
    } else if (m.start < start) {
      const m_ = Util.clone(m);
      m_.start = start;
      mods.push(m_); // a little trickery here: pushing to beginning to handle in a later iteration.
      m.end = start;
    } else if (m.end > end) {
      m.start = end;
    } else {
      // completely contained by range, remove
      toRemove.push(i);
    }
  }
  i = toRemove.length;
  while (i--) {
    mods.splice(toRemove[i], 1);
  }
  sortModifiers(mods);
  mergeAdjacentModifiers(mods);
}

export function removeModifiersInRange(p: Paragraph, start: number, end: number, types ?: ModifierTypeIn) {
  removeModifiersInRangeHelper(p.modifiers, start, end, types);
  return p;
}

export function getNonModOffset(p: Paragraph, modsToMatch, startOpt ?: number, endOpt ?: number) {
  let start = startOpt || 0;
  const end = endOpt || p.content.length;
  const mods = findModifiersByType(p, modsToMatch);
  for (let i = 0; i < mods.length; ++i) {
    const mod = mods[i];
    if (mod.start > start) {
      return start;
    }
    if (mod.end > start) {
      start = mod.end;
      if (start >= end) {
        return null;
      }
    }
  }
  return start >= end ? null : start;
}

export function getListType(p: Paragraph) {
  if (!p.tabLevel) { return; }
  if (hasModifier(p, Modifiers.BULLET)) { return Modifiers.BULLET; }
  if (hasModifier(p, Modifiers.NUMBER)) { return Modifiers.NUMBER; }
}

export function cmpModifiers(a, b) {
  if (a.start !== b.start) {
    return a.start - b.start;
  }
  if (a.end !== b.end) {
    return a.end - b.end;
  }
  if (a.data && b.data) {
    if (a.data.createTime >= 0 && b.data.createTime >= 0 && a.data.createTime !== b.data.createTime) {
      return a.data.createTime - b.data.createTime;
    }
    if (a.data.editTime >= 0 && b.data.editTime >= 0 && a.data.editTime !== b.data.editTime) {
      return a.data.editTime - b.data.editTime;
    }
  }
  // stripParagraph deletes the type if it is P
  const aType = a.type || Types.P;
  const bType = b.type || Types.P;
  if (aType !== bType) {
    return aType.localeCompare(bType);
  }
  if (a.data && b.data && a.data.type) {
    return a.data.type.localeCompare(b.data.type);
  }
  return 0;
}

export function sortModifiers(modifiers: Modifier[]) {
  if (!Array.isArray(modifiers)) {
    Log.errorNoCtx('@unassigned', 'sortModifiers.invalidModifiers', modifiers);
    return;
  }
  modifiers.sort(cmpModifiers);
}

const CopyModifiers = Util.arrayToObj([
  Modifiers.TAR,
  Modifiers.TAC,
  Modifiers.TAJ,
  Modifiers.BULLET,
  Modifiers.NUMBER,
  Modifiers.INDENT,
  Modifiers.RESPONSE,
]);

export const ChildTypes = {
  'h1': Types.P,
  'h2': Types.P,
  'h3': Types.P,
  'title': Types.P,
  'section': Types.P,
  'chapter': Types.P,
  'scene': Types.P,
  'code': Types.CODE,
  'paragraph': Types.P,
  'pagebreak': Types.P,
  'preview': Types.P,
  'sectionbreak': Types.P,
  'list': Types.LI_DEPRECATED,
  'comment': Types.P,
  'chatleft': Types.CHATRIGHT,
  'chatright': Types.CHATLEFT,
  'chatheader': Types.CHATLEFT,
  'reference': Types.REFERENCE,
};

const ClearAlignment = {
  'h1': true,
  'h2': true,
  'h3': true,
  'title': true,
  'section': true,
  'chapter': true,
  'scene': true,
  'chatleft': true,
  'chatright': true,
};

const AlignmentMods = {
  'tar': true,
  'tac': true,
  'taj': true,
};

function getCopiedModifiers(mods: Modifier[], uuidFunc ?: UUIDFunc) {
  const retMods: Modifier[] = [];
  for (let i = 0; i < mods.length; i++) {
    if (CopyModifiers[mods[i].type]) {
      const mod = Util.clone(mods[i]);

      if (isTagCommentModifier(mod)) {
        mod.data = Constants.buildTagCommentObjectShared(mod.data.authorID, uuidFunc ? uuidFunc() : 'tempID');
      }

      retMods.push(mod);
    }
  }

  return retMods;
}

function splitModifiers(oldMods: Modifier[], newMods: Modifier[], splitPos: number, uuidFunc ? : UUIDFunc) {
  let m = oldMods.length;
  while (m--) {
    const mod = oldMods[m];
    if (mod.start === -1) {
      // copied these already if needed
      continue;
    }
    if (mod.start >= splitPos) {
      // after split, move to newMods
      mod.start -= splitPos;
      mod.end -= splitPos;
      newMods.push(mod);
      oldMods.splice(m, 1);
    } else if (NeverSplitOrMergeMods[mod.type] && mod.end === splitPos) {
      continue;
    } else if (mod.end < splitPos) {
      // before split, keep
      continue;
    } else if (allTrackChangesModifiers[mod.type] && mod.end <= splitPos) {
      // mod.end is exclusive for track changes modifiers
      continue;
    } else if (wordOnlyMods[mod.type]) {
      // if we split a wordOnlyMod remove it entirely. this is consistent with
      // what Word does, though is a little confusing
      oldMods.splice(m, 1);
      continue;
    } else {
      // formatting mods that end at the split point should carry over (e.g. bold, italic)
      // across split, split the modifier
      const newMod = Util.clone(mod);
      mod.end = splitPos;
      newMod.start = 0;
      newMod.end -= splitPos;

      if (isTagCommentModifier(mod) && isTagCommentModifier(newMod)) {
        if (mod.start === mod.end) {
          oldMods.splice(m, 1);
        }
        if (newMod.start === newMod.end) {
          continue;
        }
        newMod.data = Constants.buildTagCommentObjectShared(mod.data.authorID, uuidFunc ? uuidFunc() : 'tempID');
      }
      newMods.push(newMod);
    }
  }
}

export function dupe(p: Paragraph, start: number, length: number, uuidFunc: UUIDFunc) {
  if (start === undefined) {
    return paragraphClone(p);
  } else {
    if (start === 0 && (length === undefined || length === p.content.length)) {
      return paragraphClone(p);
    }
    if (start < 0) {
      start = p.content.length + start;
    }
    if (start < 0) {
      Log.warnNoCtx('@unassigned', 'Paragraph.dupeNegativeStart');
      return paragraphClone(p);
    }
    if (start > p.content.length) {
      Log.warnNoCtx('@unassigned', 'Paragraph.dupeStartPastEnd');
      return paragraphClone(p);
    }
    if (start + length > p.content.length) {
      Log.warnNoCtx('@unassigned', 'Paragraph.dupeStartPlusLengthPastEnd');
      return paragraphClone(p);
    }
    if (length < 0) {
      Log.warnNoCtx('@unassigned', 'Paragraph.dupeNegativeLength');
      return paragraphClone(p);
    }
    const copiedMods = Util.clone(p.modifiers);
    const newMods = [];
    splitModifiers(copiedMods, newMods, start, uuidFunc);
    if (length !== undefined) {
      splitModifiers(newMods, copiedMods, length, uuidFunc);
    }
    const res = create(undefined, ChildTypes[p.type], p.content.substr(start, length), newMods, p.tabLevel);
    replaceRenderOnlyModifiers(res);
    return res;
  }
}

export function splitParagraph(p: Paragraph, splitPos: number, uuidFunc ?: UUIDFunc) : Paragraph[] {
  let newP;
  const newParaID = uuidFunc ? uuidFunc() : undefined;
  const copiedMods = getCopiedModifiers(p.modifiers, uuidFunc);
  if (splitPos === 0) {
    switch (p.type) {
      case Types.CHAPTER:
        copiedMods.push({type: 'b', start: 0, end: 0});
        break;
    }
    newP = create(newParaID, p.type, '', copiedMods, p.tabLevel);
    return [newP, p];
  } else {
    if (hasModifier(p, [Modifiers.QUESTION])) {
      const responseMod: ResponseModifier = {type: Modifiers.RESPONSE, start: -1, end: -1};
      copiedMods.push(responseMod);
    }
  }
  if (splitPos < 0) {
    splitPos = p.content.length + splitPos;
  }

  splitModifiers(p.modifiers, copiedMods, splitPos);
  if (ClearAlignment[p.type]) {
    let c = copiedMods.length;
    while (c--) {
      if (AlignmentMods[copiedMods[c].type]) {
        copiedMods.splice(c, 1);
      }
    }
  }
  newP = create(newParaID, ChildTypes[p.type], p.content.substr(splitPos), copiedMods, p.tabLevel);
  sortModifiers(newP.modifiers);
  mergeAdjacentModifiers(newP.modifiers);
  p.content = p.content.substr(0, splitPos);

  return [p, newP];
}

function canMergeMods(src, mod) {
  if (mod.type !== src.type) {
    return false;
  }
  if (NeverSplitOrMergeMods[src.type]) {
    return false;
  }
  if (src.start > mod.end || src.end < mod.start) {
    return false;
  }
  if (Util.isObject(mod.data)) {
    if (allTrackChangesModifiers[mod.type] || mod.type === Modifiers.TAGCOMMENT) {
      if (mod.data.authorID !== src.data.authorID) {
        return false;
      }
      if (!Util.objCmpFast(mod.data.undoCount, src.data.undoCount)) {
        return false;
      }

      // don't merge reverts if they don't match, except for deletes
      // which we coalesce into a single delete
      const revert = mod.data.revert;
      const revertData = mod.data.revertData;
      const curMergeRevert = src && src.data && src.data.revert;
      const curMergeRevertData = src && src.data && src.data.revertData;
      if (revert && curMergeRevert) {
        // when to skip a merge when we have a revert:
        // two mods of type 'uc':
        // - may have different reverts, e.g. 'ptype' and 'tab'
        // - may have different revertData, e.g. 'pmod', italic and bold,
        if (curMergeRevert !== revert || !Util.objCmpFast(revertData, curMergeRevertData)) {
          return false; // different reverts, don't merge
        }
      }
    } else if (mod.type === Modifiers.MODADD || mod.type === Modifiers.MODDEL) {
      if (mod.data.type !== src.data.type) {
        return false;
      }
    }
  } else {
    if (mod.data !== src.data) {
      return false;
    }
  }
  return true;
}

function mergeAdjacentModifiers(modifiers: Modifier[]) {
  // assumes sorted by start
  // merge if overlapping and same type

  if (!modifiers || !modifiers.length) {
    return;
  }

  for (let i = 0; i < modifiers.length; ++i) {
    const src = modifiers[i];
    for (let j = i + 1; j < modifiers.length; ++j) {
      const mod = modifiers[j];
      if (mod.start > src.end) {
        break;
      }
      if (canMergeMods(src, mod)) {
        src.end = Math.max(src.end, mod.end);
        pickLaterTrackChangesTime(mod, src);
        modifiers.splice(j, 1);
        j--;
      }
    }
  }

  // possible that a merged modifier will change sort order, as 'end' is a secondary
  // sort factor if start matches.
  sortModifiers(modifiers);
  return modifiers;
}

export function cleanUpModifiers(m: Modifier[], length: number) {
  let i = m.length;
  while (i--) {
    if (!(m[i] as any).data || m[i].type in unacceptedModifiers) {
      if (isNaN(m[i].start) || isNaN(m[i].end)) {
        Log.warnNoCtx('@unassigned', 'cleanUpModifiers.nanStartOrEnd', m[i]);
        m.splice(i, 1);
        continue;
      }
      let cmp = gte;
      // unaccepted modifiers can have zero length, e.g. merge
      if (m[i].type in unacceptedModifiers || (wordOnlyMods[m[i].type] && wordOnlyMods[m[i].type].allowZeroLength)) {
        cmp = gt;
      }
      if (m[i].start !== -1 && cmp(m[i].start, m[i].end) && m[i].start !== 0) {
        m.splice(i, 1);
        continue;
      }
      if (m[i].start !== 0 && cmp(m[i].start, length)) {
        m.splice(i, 1);
        continue;
      }
      if (m[i].end > length) {
        m[i].end = length;
      }
    }
  }
  sortModifiers(m);
  mergeAdjacentModifiers(m);

  function gt(a: number, b: number) {
    return a > b;
  }
  function gte(a: number, b: number) {
    return a >= b;
  }
}

function checkForDeletedParagraph(p: Paragraph) {
  for (let m = 0; m < p.modifiers.length; m++) {
    const mod = p.modifiers[m];
    if (mod.type === Modifiers.UP || mod.type === Modifiers.AP) {
      return true;
    }
  }
  return false;
}

function changeToNormalDelete(p: Paragraph) {
  for (let m = 0; m < p.modifiers.length; m++) {
    const mod = p.modifiers[m];
    if (mod.type === Modifiers.UP) {
      mod.type = 'ud';
    } else if (mod.type === Modifiers.AP) {
      mod.type = 'ad';
    }
  }
}

export function mergeParagraphs(p1: Paragraph, p2: Paragraph, keepP1State = false) {
  if (!p2) {
    return p1;
  }
  p2 = paragraphClone(p2);

  const r1 = checkForDeletedParagraph(p1);
  const r2 = checkForDeletedParagraph(p2);

  if (r1 !== r2) {
    if (r1) {
      changeToNormalDelete(p1);
    } else {
      changeToNormalDelete(p2);
    }
  }

  const length = p1.content.length;
  for (let m = 0; m < p2.modifiers.length; m++) {
    const mod = p2.modifiers[m];
    if (mod.start >= 0) {
      mod.start += length;
      mod.end += length;
    }

    if (!keepP1State) {
      // if nothing in previous paragraph, just keep all the mods
      p1.modifiers.push(mod);
    } else if (!CopyModifiers[mod.type] || (p2.tabLevel && !p1.tabLevel && (mod.type === Modifiers.NUMBER || mod.type === Modifiers.BULLET))) {
      p1.modifiers.push(mod);
    }
  }
  if (!keepP1State) {
    // tabs/bullets are special -- maintain them
    if (p2.tabLevel && !p1.tabLevel) {
      p1.tabLevel = p2.tabLevel;
    }
  }
  p1.content += p2.content;
  sortModifiers(p1.modifiers);
  cleanUpModifiers(p1.modifiers, p1.content.length);
  p1.type = !keepP1State ? p2.type : p1.type;
  if (!p1.id && p2.id) {
    p1.id = p2.id;
  }
  return p1;
}

// Paragraphs are implicitly either in drafts or books
// their specific format at the moment is
// /media/(draftID|bookID) where the draft id comes from
// DBUtil.uuid() and a book has '_book' appended to it
export function matchValidMediaURLPath(urlPath: string) {
  const m = /^\/media\/([^_\/]+_[^_\/]+_[^_\/]+(?:_book)?)\/(.+)/.exec(urlPath);
  if (!m) {
    return null;
  }
  return {
    assetParentID: m[1],
    filename: m[2],
  };
}

export function getType(para: Paragraph): ParaType {
  if (para.type !== 'list') {
    const navMod = findOneModifierByType(para, 'nav');
    if (navMod && (navMod as any).data === 'title') {
      return 'title';
    }
    return para.type;
  } else {
    return para.type + (para.tabLevel ? para.tabLevel : 1) as ParaType;
  }
}

export function clearBulletNumber(para: Paragraph) {
  const mods = para.modifiers;
  let i = mods.length;
  while (i--) {
    if (mods[i].type === Modifiers.BULLET || mods[i].type === Modifiers.NUMBER) {
      mods.splice(i, 1);
    }
  }
}

export function checkNumber(para: Paragraph) {
  const mods = para.modifiers;
  for (let i = 0; i < mods.length; i++) {
    let m = mods[i];
    if (isParaNumberModifier(m)) {
      return m.data | 0;
    }
  }
  return undefined;
}

export function isDeleted(para: Paragraph) {
  return hasModifier(para, [Modifiers.UP, Modifiers.AP]);
}

export function getStartingNumbers(paragraphs: Paragraph[], idx: number) {
  const retVal = [0, 0, 0, 0, 0, 0, 0];
  if (idx === 0) {
    return retVal;
  }
  let para = paragraphs[idx];
  let firstTabLevel = para.tabLevel;

  if (!para || para.tabLevel) {
    idx = idx - 1; // only search backwards if in a bullet
    para = paragraphs[idx];
  }
  while (para && (para.tabLevel || isDeleted(para))) {
    if (!isDeleted(para) && !retVal[para.tabLevel || 0]) {
      let tabLevel = para.tabLevel!;
      const number = checkNumber(para);
      if (number !== undefined && firstTabLevel !== undefined && tabLevel <= firstTabLevel) {
        firstTabLevel = para.tabLevel;
        retVal[tabLevel] = number;
      }
    }
    --idx;
    para = paragraphs[idx];
  }
  return retVal;
}

export function updateNumbers(paragraphs, idx, startingNumbers) {
  if (!paragraphs || !paragraphs.length) {
    return [];
  }
  const touched: number[] = [];
  let para = paragraphs[idx];
  if (!para.tabLevel) {
    idx++;
    para = paragraphs[idx];
    if (!para) {
      return touched;
    }
  }
  let lastTabLevel = paragraphs[idx].tabLevel;
  while (para && para.tabLevel) {
    if (para.tabLevel < lastTabLevel) {
      for (let j = para.tabLevel + 1; j <= 6; j++) {
        startingNumbers[j] = 0;
      }
    } else {
      lastTabLevel = para.tabLevel;
    }
    if (checkNumber(para) !== undefined) {
      touched.push(idx);
      clearBulletNumber(para);
      addModifier(para, Modifiers.NUMBER, -1, -1, ++startingNumbers[para.tabLevel]);
    }
    idx++;
    para = paragraphs[idx];
  }
  return touched;
}

const DeleteParagraphRedlineModifiers = {ap: true, up: true};
const DeleteRedlineModifiers = {ad: true, ud: true};
const ModifyRedlineModifiers = {ac: true, ai: true, uc: true, ui: true};

export function paragraphClone(p: Paragraph): Paragraph {
  const res = Util.cloneExcludingFields(p, {renderCache: 1}) as Paragraph;
  if (p.renderCache) {
    res.renderCache = p.renderCache;
  }
  replaceRenderOnlyModifiers(res);
  return res;
}

export function makeImmutable<T extends Paragraph | RemoveParagraph>(p: T) {
  return Util.objectMakeImmutable(p, {renderCache: 1});
}


// {draftID0:{trackChangeID0:true}}
interface SelectedUndos {
  [k: string]: StashOf<boolean>;
}
export type Undos = '*' | SelectedUndos | string[];

// undos map of draftID => ids
export function undosHaveTrackChangesMod(undos: Undos | null, mod: TCModifier) {
  if (!undos) {
    return false;
  }
  if (undos === '*') {
    return true;
  } else if (!Array.isArray(undos)) {
    for (let draftID in undos) {
      const undo = undos[draftID];
      const uc = mod.data.undoCount[draftID] || (mod.data.undoCount as any as string); // legacy type
      if (undo.hasOwnProperty(uc)) {
        return true;
      }
    }
    return false;
  }
  return undos.indexOf(mod.data.undoCount as any as string) >= 0; // legacy type
}

export function shouldIncludeModifier(
  modifier: TCModifier,
  includeUndos: Undos,
  excludeUndos: Undos,
  excludeAuthors: StashOf<string>,
  excludeDraftID: string,
) {
  return undosHaveTrackChangesMod(includeUndos, modifier) &&
    (!excludeAuthors || !excludeAuthors.hasOwnProperty(modifier.data.authorID)) &&
    !undosHaveTrackChangesMod(excludeUndos, modifier) && (!excludeDraftID || !modifier.data.undoCount.hasOwnProperty(excludeDraftID));
}

export function stripRedlineModifiers(
    para: Paragraph,
    keepViewableMods = false,
    includeUndos: Undos = [],
    excludeAuthors: StashOf<string> = {},
    excludeUndos: Undos = [],
    excludeDraftID = '',
  ) {
  if (!para) {
    return para;
  }
  para = paragraphClone(para);
  const mods = para.modifiers;
  if (!mods) {
    return para;
  }
  const ranges: Range[] = [];
  let i = mods.length;
  while (i--) {
    if (mods[i]) {
      let m = mods[i];
      if (!isTCModifier(m)) {
        continue;
      }
      if (!m.data || m.data.undoCount === undefined ||
        shouldIncludeModifier(m, includeUndos, excludeUndos, excludeAuthors, excludeDraftID)) {
        continue;
      }
      if (DeleteParagraphRedlineModifiers[m.type]) {
        return undefined;
      } else if (DeleteRedlineModifiers[m.type]) {
        ranges.push({start: m.start, end: mods[i].end});
      } else if (!keepViewableMods && ModifyRedlineModifiers[mods[i].type]) {
        mods.splice(i, 1);
      }
    }
  }
  deleteContentRanges(para, ranges);
  return para;
}

export function stripNonBlameModifiers(para: Paragraph, excludeAuthors: StashOf<string>) {
  if (!para) {
    return para;
  }
  para = paragraphClone(para);
  const mods = para.modifiers;
  if (!mods) {
    return para;
  }
  const ranges: Range[] = [];
  let i = mods.length;
  while (i--) {
    let m = mods[i];
    if (!m || !isTCModifier(m)) {
      continue;
    }
    if (!m.data || !m.data.undoCount) {
      continue;
    }
    if ((!excludeAuthors || !excludeAuthors.hasOwnProperty(m.data.authorID)) && ModifyRedlineModifiers[m.type]) {
      mods.splice(i, 1);
    } else if (DeleteParagraphRedlineModifiers[m.type]) {
      return undefined;
    } else if (DeleteRedlineModifiers[m.type]) {
      ranges.push({start: m.start, end: m.end});
    }
  }
  deleteContentRanges(para, ranges);
  return para;
}

const HideAcceptedParagraphModifiers = {ap: true};
const HideAcceptedModifiers = {ad: true};
const IgnoreAcceptedModifiers = {ac: true, ai: true};

export function stripAcceptedModifiers(
    para: Paragraph,
    keepViewableMods: boolean,
    includeUndos: Undos,
    excludeAuthors: StashOf<string>,
    excludeUndos: Undos,
    excludeDraftID: string,
  ) {
  if (!para) {
    return para;
  }
  para = paragraphClone(para);

  const mods = para.modifiers;
  if (!mods) {
    return para;
  }
  const ranges: Range[] = [];
  let i = mods.length;
  while (i--) {
    let m = mods[i];
    if (!m || !isTCModifier(m)) {
      continue;
    }
    if (!m.data || !m.data.undoCount) {
      continue;
    }
    if (HideAcceptedParagraphModifiers[m.type]) {
      return undefined;
    } else if (
      !undosHaveTrackChangesMod(includeUndos, m) ||
      undosHaveTrackChangesMod(excludeUndos, m) ||
      (excludeAuthors && excludeAuthors.hasOwnProperty(m.data.authorID)) ||
      (excludeDraftID && m.data.undoCount.hasOwnProperty(excludeDraftID))) {

      if (DeleteParagraphRedlineModifiers[m.type]) {
        return undefined;
      } else if (DeleteRedlineModifiers[m.type]) {
        ranges.push({start: m.start, end: m.end});
      } else if (!keepViewableMods && ModifyRedlineModifiers[m.type]) {
        mods.splice(i, 1);
      }
    } else if (HideAcceptedModifiers[m.type]) {
      ranges.push({start: m.start, end: m.end});
    } else if (!keepViewableMods && IgnoreAcceptedModifiers[m.type]) {
      mods.splice(i, 1);
    }
  }
  deleteContentRanges(para, ranges);
  return para;
}

export function hasUnacceptedMods(para: Paragraph) {
  return !!findOneModifierByType(para, Object.keys(unacceptedModifiers) as ModifierTypeIn);
}

export function acceptModifier(para: Para, idx: number, noClean = false) {
  const mod = para.modifiers[idx];
  const acceptedType = unacceptedModifiers[mod.type];
  if (!isTCModifier(mod) || !acceptedType) {
    Log.warnNoCtx('@unassigned', 'acceptModifier.invalidType', {type: mod.type, mod: mod, paraID: (para as any).id});
    return;
  }
  if (mod.type === Modifiers.UD) {
    removeContent(para, mod.start, mod.end);
    return;
  }
  mod.type = acceptedType;
  if (mod.data) {
    let data = mod.data as ModTCData;
    delete data.revert;
    delete data.revertData;
  }
  if (!noClean) {
    cleanUpModifiers(para.modifiers, para.content ? para.content.length : 0);
  }
}

export function acceptAllModifiers(para: Para) {
  if (!para.modifiers) {
    return;
  }
  for (let i = 0; i < para.modifiers.length; ++i) {
    const mod = para.modifiers[i];
    const acceptedType = unacceptedModifiers[mod.type];
    if (!acceptedType) {
      continue;
    }
    acceptModifier(para, i);
  }
  cleanUpModifiers(para.modifiers, para.content ? para.content.length : 0);
}

export function getAuthorBlame(para: Paragraph, authors: StashOf<number> | null, start: number, end: number, getTagCommentAuthors = false) {
  if (end === undefined || end >= para.content.length) {
    end = para.content.length - 1;
  }
  if (!start) {
    start = 1;
  }
  if (start > end) {
    start = end;
  }

  let authorID = '';
  if (!authors) {
    authors = {};
  }

  let i, mod;
  if (getTagCommentAuthors) {
    for (i = 0; i < para.modifiers.length; i++) {
      mod = para.modifiers[i];

      if (mod.start > end) {
        break;
      }

      if (mod.end <= start) {
        continue;
      }

      if (mod.type === 'tagComment') {
        authorID = authorID || mod.data.authorID;

        if (!authors[mod.data.authorID]) {
          authors[mod.data.authorID] = 0;
        }

        if (mod.start > start) {
          getAuthorBlame(para, authors, start, mod.start);
        }

        authors[mod.data.authorID] += Math.min(mod.end, end) - Math.max(mod.start, start);
        start = mod.end;

        if (start >= end) {
          return authorID;
        }
      }
    }
  }

  for (i = 0; i < para.modifiers.length; i++) {
    mod = para.modifiers[i];

    if (mod.start > end) {
      break;
    }

    if (mod.end <= start) {
      continue;
    }

    if (allTrackChangesModifiers[mod.type]) {
      authorID = authorID || mod.data.authorID;

      if (!authors[mod.data.authorID]) {
        authors[mod.data.authorID] = 0;
      }

      authors[mod.data.authorID] += Math.min(mod.end, end) - Math.max(mod.start, start);
    }
  }

  return authorID;
}


export interface AuthorBlameTime { id: string; time: number; }
export function getAuthorBlameTime(para: Paragraph, start: number, end: number, authorsIn?: AuthorBlameTime[]): AuthorBlameTime[] {
  const authors: AuthorBlameTime[] = authorsIn || [];

  if (end === undefined || end >= para.content.length) {
    end = para.content.length - 1;
  }
  if (start < 0) {
    start = 0;
  }
  if (end < 0) {
    end = 0;
  }
  if (start > end) {
    start = end;
  }

  let authorID = '';
  let i, mod;
  for (i = 0; i < para.modifiers.length; i++) {
    mod = para.modifiers[i];

    if (mod.start > end) {
      break;
    }

    if (mod.end < start) {
      continue;
    }

    if (allTrackChangesModifiers[mod.type]) {
      authorID = authorID || mod.data.authorID;
      authors.push({id: mod.data.authorID, time: mod.data.editTime});
    }
  }

  authors.sort(function(a, b) {
    return b.time - a.time;
  });

  return authors;
}

const WriterOnlyModifiers = {tagComment: true, mention: true};

export function stripWriterOnlyModifiers(para: Paragraph) {
  if (!para) {
    return para;
  }
  para = paragraphClone(para);
  let found = false;
  const mods = para.modifiers;
  let i = mods.length;
  while (i--) {
    if (mods[i] && WriterOnlyModifiers[mods[i].type]) {
      found = true;
      removeContent(para, mods[i].start, mods[i].end);
    }
  }
  return found;
}

export function checkForWriterOnlyModifiers(para: Paragraph) {
  const mods = para.modifiers;
  let i = mods.length;
  while (i--) {
    if (mods[i] && WriterOnlyModifiers[mods[i].type]) {
      return true;
    }
  }
  return false;
}

export function wordCount(para: Paragraph, start ?: number, end ?: number) {
  // this assumes the paragraph is already filtered for view mode
  if (!para || !para.content) {
    return 0;
  }
  const content = para.content.substring(start || 0, end);
  const m = content.match(/[^\s]+/g);
  return m ? m.length : 0;
}

export function checkForMagicMori(para: Paragraph) {
  return para.content.indexOf(MAGIC_MORI_TAGS.base) !== -1;
}

export function isPlainParagraph(p: Paragraph) {
  if (p.type !== Types.P) {
    return false;
  }
  if (p.tabLevel) {
    return false;
  }
  for (let i = 0; i < p.modifiers.length; i++) {
    const mod = p.modifiers[i];
    if (mod.type === Modifiers.TAR || mod.type === Modifiers.TAC || mod.type === Modifiers.TAJ
      || mod.type === Modifiers.BULLET || mod.type === Modifiers.NUMBER) {
      return false;
    } else if (mod.start !== -1) {
      break;
    }
  }
  return true;
}

export function adjustTabLevel(p: Paragraph, increase = false) {
  p.tabLevel = Util.minmax( (p.tabLevel || 0) + (increase ? 1 : -1), 0, Constants.EDITOR_MAX_TAB_LEVEL);
}

export const DEFAULT_TAGS = Object.freeze([
  '#awkward',
  '#cut',
  '#factcheck',
  '#feedback',
  '#logic',
  '#love',
  '#needsmore',
  '#question',
  '#todo',
  '#typo',
  '#voice',
  '#wordchoice',
]);

export function fixupModUndoCount(draftID: string, mod: any) {
  if (!mod.data || !mod.data.undoCount || typeof mod.data.undoCount !== 'string') { return mod; }
  // example of undoCount that has the draftID: 8_1Ca+1_999-dft_0
  const draftIDMatch = mod.data.undoCount.match(/(^.+_.+_.+-(dft|ses))/);
  if (draftIDMatch) {
    draftID = draftIDMatch[1];
  }
  const obj = {};
  obj[draftID] = mod.data.undoCount;
  mod.data.undoCount = obj;
  return mod;
}

export function fixupParagraphUndoCounts(draftID: string, p: Paragraph) {
  for (let i = 0; i < p.modifiers.length; i++) {
    fixupModUndoCount(draftID, p.modifiers[i]);
  }
}

export function mergeAndSortAdjacentModifiers(modifiers: Modifier[]) {
  sortModifiers(modifiers);
  mergeAdjacentModifiers(modifiers);
}

export function fixupTrackChangesModsForDiffMods(p: Paragraph) {
  let i;
  let m;
  const tcMods: Modifier[] = [];
  const diffMods: Modifier[] = [];
  i = p.modifiers.length;
  while (i--) {
    m = p.modifiers[i];
    // deletes aren't detectable because the content is there in both
    if (allTrackChangesModifiers[m.type] && !DeleteNormalModifiers[m.type]) {
      tcMods.push(m);
      p.modifiers.splice(i, 1);
      continue;
    } else if (allDiffModifiers[m.type]) {
      diffMods.push({start: m.start, end: m.end, type: m.type});
    }
  }

  // diffMods is guaranteed to be sorted by 'start' and non overlapping
  // tcMods may overlap and are sorted by 'start'
  mergeAndSortAdjacentModifiers(diffMods);
  tcMods.reverse();

  const resMods: Modifier[] = [];
  let lastEndIdx = 0;
  for (i = 0; i < diffMods.length; ++i) {
    const d = diffMods[i];
    let foundTCModEndingAfterCurDiffMod = false;
    for (let j = lastEndIdx; j < tcMods.length; ++j) {
      m = tcMods[j];
      if (!foundTCModEndingAfterCurDiffMod) {
        lastEndIdx = j;
      }
      if (m.end <= d.start) {
        continue;
      }
      if (m.start >= d.end) {
        break;
      }
      if (m.end > d.end) {
        foundTCModEndingAfterCurDiffMod = true;
      }
      // we have overlap
      const clamped = Util.clone(m);
      clamped.start = Math.max(m.start, d.start);
      clamped.end = Math.min(m.end, d.end);
      resMods.push(clamped);
    }
  }

  addModifiers(p, resMods);
}

export function createTCModifier(
    accountID: AccountID,
    type: TCModifierType,
    start: number,
    end: number,
    undoCount: UndoCountData,
    revert ?: TCRevertType,
    revertData ?: TCRevertData,
    editTime ?: number,
  ) {
  const mod: TCModifier = {
    type: type,
    start: start,
    end: end,
    data: {
      authorID: accountID,
      undoCount: undoCount,
      editTime: editTime || Date.now(),
      createTime: editTime || Date.now(),
    },
  };
  if (revert) {
    mod.data.revert = revert;
  }
  if (revertData) {
    mod.data.revertData = revertData;
  }
  return mod;
}

export function createParaModifier(type: ParaModifierType): ParaModifier {
  return {type: type, start: -1, end: -1};
}

export function createParaCompareModifier(
    type: ParaCompareModifierType,
    start: number,
    end: number,
    dataType: StyleModifierType,
  ): ParaCompareModifier {
  return {type, start, end, data: {type: dataType}};
}

// assumes caller has prepped this para for mutations
// and will call updatePara
export function trackUserEdit(
    p: Paragraph,
    accountID: AccountID,
    typeIn: TCModifierType,
    start: number,
    end: number,
    undoCount: UndoCountData,
    revert ?: TCRevertType,
    revertData ?: TCRevertData,
    editTime ?: number,
  ) {
  const mod = createTCModifier(accountID, typeIn, start, end, undoCount, revert, revertData, editTime);
  const type = mod.type;
  const newMods = reconcileTrackChangesModifiers(p.modifiers, mod);
  if (!newMods.length) {
    return;
  }
  addModifier(p, type, start, end, mod.data);
}

export function convertParaDiffModsToTCMods(p: Paragraph, accountID: AccountID, undoCount: UndoCountData, autoAcceptChanges?: boolean) {
  let i = p.modifiers.length;
  while (i--) {
    const m = p.modifiers[i];
    if (!allDiffModifiers[m.type]) {
      continue;
    }
    if (!isParaCompareModifier(m)) {
      continue;
    }
    p.modifiers.splice(i, 1);
    switch (m.type) {
      case Modifiers.ADD:
        trackUserEdit(p, accountID, autoAcceptChanges ? 'ai' : 'ui', m.start, m.end, undoCount);
        break;
      case Modifiers.DEL:
        if (m.start === 0 && m.end === p.content.length) {
          trackUserEdit(p, accountID, autoAcceptChanges ? 'ap' : 'up', m.start, m.end, undoCount);
        } else {
          trackUserEdit(p, accountID, autoAcceptChanges ? 'ad' : 'ud', m.start, m.end, undoCount);
        }
        break;
      case Modifiers.MODADD:
      case Modifiers.MODDEL:
        if (m.data) {
          let data = m.data;
          trackUserEdit(p, accountID, autoAcceptChanges ? 'ac' : 'uc', m.start, m.end, undoCount, 'pmod', data.type);
        } else {
          Log.errorNoCtx('@unassigned', 'convertDiffModsToTCMods.invalidModAdd', {m: m, p: p, i: i});
        }
        break;
      default:
        Log.errorNoCtx('@unassigned', 'convertDiffModsToTCMods.unknownMod', {type: m.type, p: p});
        break;
    }
    i = Math.min(i, p.modifiers.length);
  }
}

const MOD_TO_TAG = {
  [Modifiers.B]: 'strong',
  [Modifiers.I]: 'em',
  [Modifiers.S]: 's',
  [Modifiers.U]: 'u',
};

export function convertToHtml(p: Paragraph): string {
  const strSpans = [p.content];
  const modOpenSpans = [''];
  const modCloseSpans = [''];

  function applyMarkdown(modStart: number, modEnd: number, modOpen: string, modClose: string) {
    let spanStart = 0;
    let spanEnd = 0;
    for (let i = 0; i < strSpans.length; ++i, spanStart = spanEnd) {
      const spanStr = strSpans[i];
      spanEnd = spanStart + spanStr.length;

      if (modEnd <= spanStart) {
        break;
      }
      if (spanEnd <= modStart) {
        continue;
      }

      const startIdx = Math.max(modStart - spanStart, 0);
      const endIdx = Math.min(modEnd - spanStart, spanStr.length);
      const oldModOpen = modOpenSpans[i];
      const oldModClose = modCloseSpans[i];
      const newModOpen = oldModOpen + modOpen;
      const newModClose = modClose + oldModClose;
      if (startIdx === 0 && endIdx === spanStr.length) {
        modOpenSpans[i] = newModOpen;
        modCloseSpans[i] = newModClose;
      } else {
        const newSpan = spanStr.slice(startIdx, endIdx);
        if (startIdx > 0) {
          strSpans[i] = spanStr.slice(0, startIdx);
          strSpans.splice(i + 1, 0, newSpan);
          modOpenSpans.splice(i + 1, 0, newModOpen);
          modCloseSpans.splice(i + 1, 0, newModClose);
          ++i;
        } else {
          strSpans[i] = newSpan;
          modOpenSpans[i] = newModOpen;
          modCloseSpans[i] = newModClose;
        }

        if (endIdx < spanStr.length) {
          strSpans.splice(i + 1, 0, spanStr.slice(endIdx));
          modOpenSpans.splice(i + 1, 0, oldModOpen);
          modCloseSpans.splice(i + 1, 0, oldModClose);
          break;
        }
      }
    }
  }

  for (const mod of p.modifiers) {
    const tag = MOD_TO_TAG[mod.type];
    if (tag) {
      applyMarkdown(mod.start, mod.end, `<${tag}>`, `</${tag}>`);
    }
  }

  let res = '';
  for (let i = 0; i < strSpans.length; ++i) {
    res += modOpenSpans[i] + strSpans[i] + modCloseSpans[i];
  }

  if (hasModifier(p, Modifiers.BULLET)) {
    res = '<li>' + res + '</li>';
  }
  return res;
}

function needSeparator(prevPara: Paragraph|null, para: Paragraph): boolean {
  if (!prevPara) {
    return false;
  }
  if (hasModifier(para, Modifiers.BULLET)) {
    return false;
  }
  return true;
}

export function convertParasToHtml(paras: Paragraph[]): string {
  let prevPara: Paragraph|null = null;
  let str = '';

  for (const para of paras) {
    if (needSeparator(prevPara, para)) {
      str += '<br/>';
    }
    str += convertToHtml(para);
    prevPara = para;
  }

  return str;
}

export const test = {
  mergeAdjacentModifiers: mergeAdjacentModifiers,
  splitModifiers: splitModifiers,
};
