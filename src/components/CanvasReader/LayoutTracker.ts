/**
* Copyright 2017-present Ampersand Technologies, Inc.
*
*/

export type LayoutTracker = LayoutTrackerLine | LayoutTrackerSentence | LayoutTrackerComment;

export interface LayoutTrackerLine {
  type: 'line';
  entryIdx: number;
  charStart: number;
  charEnd: number;
}

export interface LayoutTrackerSentence {
  type: 'sentence';
  entryIdx: number;
  sentenceIdx: number;
  charStart: number;
  charEnd: number;
}

export interface LayoutTrackerComment {
  type: 'comment';
  entryIdx: number;
  sentenceIdx: number;
  commentID: string;
}
