/**
 * Copyright 2017-present Ampersand Technologies, Inc.
 *
 */
import { ReaderContext } from 'clientjs/components/CanvasReader/ReaderContext';

const CHARS_PER_LINE = 60;
const LINES_PER_PAGE = 24;

const CHARS_PER_PAGE = LINES_PER_PAGE * CHARS_PER_LINE;

export function pageBreakInfo(para: any): { page: number, chars: number } | null {
  if (!para) {
    return null;
  }
  let charsSoFar = para.charsSoFar;
  let pagesSoFar = Math.floor(charsSoFar / CHARS_PER_PAGE);
  let charsToNextPage = charsSoFar - pagesSoFar * CHARS_PER_PAGE;
  let charsInPara = para.content.length;
  let nextPageChar = charsInPara + charsToNextPage - CHARS_PER_PAGE;
  if (nextPageChar >= 0) {
    return { page: pagesSoFar + 1, chars: nextPageChar };
  }
  return null;
}

export function baseCharsToPages(chars): number {
  return Math.ceil(Math.max(chars / (CHARS_PER_PAGE), 0));
}

export function getTotalNumberOfPages(watcher: any, readerContext: ReaderContext ) {
  const allCharCount = readerContext.getVRData(watcher, ['allCharCount' ]);
  return baseCharsToPages(allCharCount);
}
