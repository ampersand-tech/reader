/**
* Copyright 2017-present Ampersand Technologies, Inc.
*/
import { ScrollEventData } from 'overlib/client/components/Layout/MomentumScroller';

export const CANVAS_TOUCH_EVENTS = Object.freeze({
  SCROLL_CHANGE: 'scrollChange',
} as StashOf<CanvasTouchEvent>);

export type CanvasTouchEvent = 'scrollChange';

export type CanvasTouchEventCallback = (scrollData: ScrollEventData) => void;

export type PosType = 'max' | 'current' | 'maxSeen' | 'currentWindow';

export interface ContentPosition {
  entryIdx: string;
  paragraphID: string;
  charIdx: number;
}

export interface FullContentPosition {
  start: ContentPosition;
  end: ContentPosition;
}

export const TOC_CONTAINER_ID = 'tocContainer';
export const TOC_MENU_BAR_ID = 'tocTopBar';

export interface ScrollToParams {
  entryIdx: number;
  firstChar?: number;
  metric?: string;
}
