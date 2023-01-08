/**
* Copyright 2017-present Ampersand Technologies, Inc.
*
*/

import { Modifier, Modifiers, ParaType, isEmojiWidgetModifier, isImgWidgetModifier } from 'clientjs/shared/paragraphTypes';
import { FontDesc, FontManager } from 'overlib/client/components/Layout/Font';
import * as FontUtils from 'overlib/client/components/Layout/FontUtils';
import * as Util from 'overlib/shared/util';

export interface TextSegment {
  text: string;
  idx: number;
  accumulatedWidth: number;
  width: number;
  font: FontUtils.FontObject;
  fontDesc: FontDesc;
  fontChange: boolean;
  break: boolean;
  sentenceBreak?: boolean;
  sentenceIdx?: number;
  widget?: Modifier;
}

export interface ParagraphData {
  modifiers?: Modifier[];
  type: ParaType;
  content: string;
  tabLevel?: number;
  ordinality?: number;
}

export interface ParagraphImage {
  alignment: -1|0|1;
  url: string;
  w: number;
  h: number;
}

interface ProcessedModifiers {
  modsPerCharacter: string[][]; // arrays of mod types
  widgets: StashOf<Modifier>;
  alignment: -1|0|1;
  layer: boolean;
  paraImage?: ParagraphImage;
}

const sentenceEnd = /([.!?]["'\s])/;
const sentenceEnd2 = /^[.!?]["'\s]$/;
const sentenceSpace = /\s/;


function processModifiers(mods: Modifier[], contentLength: number): ProcessedModifiers {
  const res: ProcessedModifiers = {
    modsPerCharacter: [],
    widgets: {},
    alignment: -1,
    layer: false,
  };
  for (const mod of mods) {
    switch (mod.type) {
      case Modifiers.TAC:
        res.alignment = 0;
        break;
      case Modifiers.TAR:
        res.alignment = 1;
        break;
      case Modifiers.LAYER:
        res.layer = true;
        break;
      case Modifiers.WIDGET:
        res.widgets[mod.start.toString()] = mod;
        if (isImgWidgetModifier(mod)) {
          if (mod.start === 0 && contentLength === 1) {
            res.paraImage = {
              alignment: 0, // center
              url: mod.data.url,
              w: mod.data.w || 50,
              h: mod.data.h || 50,
            };
          } else if (mod.start === 0) {
            res.paraImage = {
              alignment: -1, // left
              url: mod.data.url,
              w: mod.data.w || 50,
              h: mod.data.h || 50,
            };
          } else if (!res.paraImage && mod.start === contentLength - 1) {
            res.paraImage = {
              alignment: 1, // right
              url: mod.data.url,
              w: mod.data.w || 50,
              h: mod.data.h || 50,
            };
          }
        }
        break;
      case Modifiers.B:
      case Modifiers.I:
      case Modifiers.U:
      case Modifiers.S:
      case Modifiers.MONOSPACE:
      case Modifiers.SUB:
      case Modifiers.SUP:
        if (mod.end > mod.start && mod.end > 0) {
          for (let i = mod.start; i < mod.end; i++) {
            if (!res.modsPerCharacter[i]) {
              res.modsPerCharacter[i] = [] as string[];
            }
            res.modsPerCharacter[i].push(mod.type);
          }
        }
        break;
    }
  }
  return res;
}

function applyMods(descIn: FontDesc, mods: string[]) {
  const desc = Util.clone(descIn);

  for (const mod of mods) {
    switch (mod) {
      case Modifiers.B:
        desc.fontWeight = 800;
        break;
      case Modifiers.I:
        desc.fontStyle = 'italic';
        break;
      case Modifiers.U:
        desc.textDecoration = 'underline';
        break;
      case Modifiers.S:
        desc.textDecoration = 'line-through';
        break;
      case Modifiers.SUB:
        desc.verticalAlign = 'sub';
        break;
      case Modifiers.SUP:
        desc.verticalAlign = 'super';
        break;
    }
  }

  return desc;
}

function computeModChanges(desc: FontDesc, modPerChar: string[][]): FontDesc[] {
  let fontsPerCharacter: FontDesc[] = [];
  for (let i = 0; i < modPerChar.length; i++) {
    if (!modPerChar[i]) {
      modPerChar[i] = [];
    }
    modPerChar[i].sort();
    if (i && modPerChar[i].length === modPerChar[i - 1].length &&
      modPerChar[i].join(',') === modPerChar[i - 1].join(',')) {
      continue;
    }
    fontsPerCharacter[i] = applyMods(desc, modPerChar[i]);
  }

  // add one more at the end to reset
  fontsPerCharacter[modPerChar.length] = applyMods(desc, []);

  return fontsPerCharacter;
}

function findBreaksAndChanges(
  fontsPerChar: FontDesc[], fontManager: FontManager,
  content: string, startSentence: number, endSentence: number,
  processed: ProcessedModifiers,
): TextSegment[] {
  let segments: TextSegment[] = [];
  let currWidth = 0;
  let accumulatedWidth = 0;
  let currFontDesc = fontsPerChar[0];
  let currFont: FontUtils.FontObject = fontManager.getFont(currFontDesc);
  let sentenceIdx = 0;
  let startIdx = 0;
  let contentLength = content.length;

  if (processed.paraImage) {
    if (processed.paraImage.alignment < 1) {
      startIdx = 1;
    } else {
      contentLength--;
    }
  }

  let lastIdx = startIdx;

  function addSegment(idx: number, canBreak: boolean, sentenceBreak: boolean) {
    if (sentenceIdx >= startSentence && sentenceIdx < endSentence) {
      if (!segments.length) {
        // add start marker
        segments.push({
          text: '',
          idx: lastIdx,
          accumulatedWidth: 0,
          width: 0,
          font: currFont,
          fontDesc: currFontDesc,
          fontChange: false,
          break: false,
          sentenceBreak: false,
          sentenceIdx: sentenceIdx,
        });
      }

      accumulatedWidth += currWidth;
      segments.push({
        text: '',
        idx: idx,
        accumulatedWidth: accumulatedWidth,
        width: currWidth,
        font: currFont,
        fontDesc: currFontDesc,
        fontChange: Boolean(fontsPerChar[idx] && idx < contentLength),
        break: canBreak,
        sentenceBreak: sentenceBreak,
        sentenceIdx: sentenceIdx,
        widget: idx > startIdx ? processed.widgets[(idx - 1).toString()] : undefined,
      });
    }

    if (sentenceBreak) {
      sentenceIdx++;
    }
    currWidth = 0;
    lastIdx = idx;
  }

  let breakNext = false;
  let terminateSentence = false;

  for (let i = startIdx; i < contentLength; ++i) {
    const c = content[i];
    if (fontsPerChar[i]) {
      if (i > startIdx) {
        addSegment(i, breakNext, breakNext && terminateSentence);
        if (breakNext && terminateSentence) {
          terminateSentence = false;
        }
      }
      currFontDesc = fontsPerChar[i];
      currFont = fontManager.getFont(currFontDesc);
    } else if (breakNext) {
      addSegment(i, breakNext, terminateSentence);
      terminateSentence = false;
    }
    breakNext = false;

    const widgetMod = processed.widgets[i.toString()];
    if (widgetMod) {
      const lineHeight = currFontDesc.lineSpacing * currFontDesc.fontSize;
      if (isImgWidgetModifier(widgetMod)) {
        currWidth += lineHeight * (widgetMod.data.w || 50) / (widgetMod.data.h || 50);
      } else if (isEmojiWidgetModifier(widgetMod)) {
        // assume square aspect ratio
        currWidth += lineHeight;
      }
      breakNext = true;
    } else {
      const prevCharacter = (i > startIdx) ? content[i - 1] : '';
      const nextCharacter = (i < contentLength - 1) ? content[i + 1] : '';
      const nextCharWidget = (i < contentLength - 1) ? processed.widgets[(i + 1).toString()] : undefined;
      const cWidth = currFont.getKerning(prevCharacter + c);
      currWidth += cWidth;
      if (c.match(sentenceSpace) || nextCharWidget) {
        breakNext = true;
      } else if ((c + nextCharacter).match(sentenceEnd2)) {
        terminateSentence = true;
      }
    }
  }
  addSegment(contentLength, false, false);

  if (segments.length) {
    const lastSegment = segments[segments.length - 1];
    lastSegment.break = false;
    lastSegment.sentenceBreak = false;
  }

  return segments;
}

export function getParagraphSegments(p: ParagraphData, fontManager: FontManager, fontDesc: FontDesc, startSentence?: number, endSentence?: number) {
  const processed = processModifiers(p.modifiers || [], p.content.length);
  const fontsPer = computeModChanges(fontDesc, processed.modsPerCharacter);
  return {
    segments: findBreaksAndChanges(fontsPer, fontManager, p.content, startSentence || 0, endSentence || Infinity, processed),
    alignment: processed.alignment,
    layer: processed.layer,
    paraImage: startSentence ? undefined : processed.paraImage,
  };
}

export function splitSentences(paragraph: string): string[] {
  const s = paragraph.split(sentenceEnd);
  const res: string[] = [];
  for (let i = 0; i < s.length - 1; i += 2) {
    res.push(s[i] + s[i + 1]);
  }
  if (s[s.length - 1].length) {
    res.push(s[s.length - 1]);
  }
  return res;
}

export function getSentence(content: string, index: number): {start: number, length: number} {
  const sentences = splitSentences(content);

  let start = 0;
  for (let i = 0; i < index; ++i) {
    start += sentences[i].length;
  }

  return {start, length: sentences[index].length};
}

export function getSentenceIndex(content: string, charStart: number): number {
  const sentences = splitSentences(content);

  let pos = 0;
  for (let i = 0; i < sentences.length; ++i) {
    pos += sentences[i].length;
    if (pos >= charStart) {
      return i;
    }
  }
  return sentences.length - 1;
}

interface TextElem {
  key: string;
  text: string;
  charStart: number;
  charEnd: number;
  font: FontDesc;
  xPos: number;
  width: number;
  sentenceIdx: number;
  widget?: Modifier;
}

export interface TextLine {
  key: string;
  charStart: number;
  charEnd: number;
  elems: TextElem[];
}

export function layoutParagraph(content: string, segments: TextSegment[], maxTextWidth: number, leadingIndent = 0): TextLine[] {
  const lines: TextLine[] = [];
  let curLine: TextLine = {
    key: '',
    charStart: -1,
    charEnd: -1,
    elems: [],
  };

  let rangeStart = 0;
  let lineBreakWidth = 0;
  let lastBreakIdx = 0;
  let rangeOffset = leadingIndent;
  let lineMaxWidth = maxTextWidth - leadingIndent;

  function addRangeToLine(rangeEnd: number) {
    if (rangeEnd < rangeStart) {
      return;
    }
    const charStart = segments[rangeStart].idx;
    const charEnd = segments[rangeEnd].idx;
    if (charEnd > charStart) {
      if (!curLine.key) {
        curLine.key = 'line_' + rangeStart;
      }
      const width = Math.ceil(segments[rangeEnd].accumulatedWidth - segments[rangeStart].accumulatedWidth);
      const sentenceIdx = segments[rangeEnd].sentenceIdx!;

      curLine.elems.push({
        key: 'segment_' + rangeStart + '_' + rangeEnd,
        text: content.slice(charStart, charEnd),
        charStart: charStart,
        charEnd: charEnd,
        font: segments[rangeEnd].fontDesc,
        widget: segments[rangeEnd].widget,
        xPos: rangeOffset,
        width: width,
        sentenceIdx: sentenceIdx,
      });
      rangeOffset += width;
    }
    rangeStart = rangeEnd;
  }

  function advanceLine() {
    if (curLine.elems.length) {
      curLine.charStart = curLine.elems[0].charStart;
      curLine.charEnd = curLine.elems[curLine.elems.length - 1].charEnd;
      lines.push(curLine);
    }
    curLine = {
      key: '',
      charStart: -1,
      charEnd: -1,
      elems: [],
    };
    lineBreakWidth = segments[rangeStart] ? segments[rangeStart].accumulatedWidth : 0;
    rangeOffset = 0;
    lineMaxWidth = maxTextWidth;
  }

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    if (lastBreakIdx && (seg.accumulatedWidth - lineBreakWidth > lineMaxWidth)) {
      addRangeToLine(lastBreakIdx);
      advanceLine();
    }
    if (seg.fontChange || seg.sentenceBreak || seg.widget || (segments[i + 1] && segments[i + 1].widget)) {
      addRangeToLine(i);
    }
    if (seg.break) {
      lastBreakIdx = i;
    }
  }

  if (rangeStart !== segments.length) {
    addRangeToLine(segments.length - 1);
  }
  advanceLine();

  return lines;
}
