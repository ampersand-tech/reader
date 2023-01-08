/**
* Copyright 2017-present Ampersand Technologies, Inc.
*/

import { ReaderContext } from 'clientjs/components/CanvasReader/ReaderContext';
import * as Util from 'overlib/client/clientUtil';
import * as Log from 'overlib/client/log';
import { MS_PER_MINUTE } from 'overlib/shared/time';

const END_CHAR_LIMIT = 5000;

const ENTRY_CHAR_MASK = Util.objectMakeImmutable({
  charsSoFar: 1,
});

export type NavTarget = NavTargetSelection | NavTargetParagraph | NavTargetChar | NavTargetComment;

export interface NavTargetSelection {
  type: 'selection';
}

export interface NavTargetParagraph {
  type: 'paragraph';
  entryIdx: number;
}

export interface NavTargetChar {
  type: 'char';
  entryIdx: number;
  charIdx: number;
}

export interface NavTargetComment {
  type: 'comment';
  entryIdx: number;
  threadId: string;
  sentenceIdx: number;
  commentID: string;
}

export const NAV_PLACEMENT = Object.freeze({
  TOP: 'top',
  MIDDLE: 'middle',
  BOTTOM: 'bottom',
} as StashOf<NavPlacement>);
export type NavPlacement = 'top' | 'middle' | 'bottom';



export class Nav {
  private context: ReaderContext;
  constructor(context: ReaderContext) {
    this.context = context;
  }

  private getCurCharCount = (): number => {
    // NOTE: this isn't necessarily accurate, since ReaderNav doesn't always update the DB
    return this.context.getVRData(null, ['positions', 'current', 'totalCharacters']) || 0;
  }

  private updateSpeedData = (endPos: number) => {
    const startTime = this.context.speedStartTime;
    if (startTime === 0) {
      return this.context.updateSpeedData(0, endPos, 0);
    }

    const dt = (Date.now() - startTime) / MS_PER_MINUTE;

    const startPos = this.context.speedStartPos;
    const dPos = endPos - startPos;

    const speed = Math.abs(dPos / dt);
    this.context.updateSpeedData(speed, endPos, dPos);
  }

  private recordPosition = (): void => {
    const contentPos = this.context.getContentPosition();
    if (!contentPos) {
      this.updateSpeedData(0);  // contentPos comes back null at top of book, update pos accordingly.
      return;
    }

    this.context.showFTEIfNeeded();

    // update 'current
    const inLocations = this.context.getUIState(null, ['renderLocations']);
    this.context.setVRDataPosition('current', contentPos.start);

    // update contentTop
    if (inLocations) {
      const contentWindowPos = this.context.getContentPosition(true);
      if (!contentWindowPos) {
        Log.warn('@palmer', 'Content Window pos returned null');
      } else {
        this.context.setVRDataPosition('currentWindow', contentWindowPos.start);
      }
    } else {
      this.context.setVRDataPosition('currentWindow', contentPos.start);
    }

    // update 'max'
    const startEntry = this.context.getParsedData(null, ['entries', contentPos.start.entryIdx], ENTRY_CHAR_MASK);
    const startCharCount: number = startEntry.charsSoFar + contentPos.start.charIdx;
    this.updateSpeedData(startCharCount);
    const allCharCount = this.context.getVRData(null, ['allCharCount']);
    if (startCharCount >= allCharCount - END_CHAR_LIMIT) {
      this.context.recordMetric('manuscript.finished', {
        position: startCharCount,
        maxChars: allCharCount,
      });
    }

    // update 'max'
    const maxChars = this.context.getVRData(null, ['positions', 'max', 'totalCharacters']);
    if (startCharCount > maxChars && !inLocations) {
      this.context.setVRDataPosition('max', contentPos.start);
    }

    // update 'maxSeen'
    const endEntry = this.context.getParsedData(null, ['entries', contentPos.end.entryIdx], ENTRY_CHAR_MASK);
    const endCharCount: number = endEntry.charsSoFar + contentPos.end.charIdx;
    const maxSeenChars = this.context.getVRData(null, ['positions', 'maxSeen', 'totalCharacters']);
    if (endCharCount > maxSeenChars && !inLocations) {
      this.context.setVRDataPosition('maxSeen', contentPos.end);
    }

    this.context.updatePos(startCharCount);
  }

  public onScrollStop = (navMetricName?: string, metricDims?: Stash) => {
    const prevChars: number = this.getCurCharCount();
    this.recordPosition();
    // update triggers here once added

    if (!navMetricName) {
      return;
    }

    if (navMetricName.slice(0, 4) !== 'nav.') {
      Log.warn('@conor', 'bad.nav.metric', { navMetricName });
    }
    if (navMetricName === 'nav.animate') {
      return;
    }

    if (navMetricName.slice(-5) !== '.goto' && navMetricName !== 'nav.restore') {
      const curChars = this.getCurCharCount();
      if (curChars >= prevChars) {
        navMetricName += '.fwd';
      } else {
        navMetricName += '.back';
      }
    }

    metricDims = metricDims || {};
    metricDims.prevChars = prevChars;
    this.context.recordMetric(navMetricName, metricDims);
  }
}
