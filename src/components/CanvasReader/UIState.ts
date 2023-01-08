/**
* Copyright 2017-present Ampersand Technologies, Inc.
*
*/

import { LAYOUT_CONSTANTS } from 'clientjs/components/CanvasReader/ReaderStyle';
import * as DataStore from 'overlib/shared/dataStore';
import * as ObjSchema from 'overlib/shared/objSchema';
import * as Types from 'overlib/shared/types';

export interface ReaderSelection {
  entryIdx: string;
  pID: string;
  index: number;
  start: number;
  length: number;
}

export const NoteButtonID = 'note';

/*
 * Put all state for managing the state of the reader UI here
 */
const gUIStateSchema: Types.Schema = {
  workshopMode: Types.BOOL,
  // Selection is a sentence
  selection: {
    entryIdx: Types.STRING,
    pID: Types.STRING,
    index: Types.INT,
    start: Types.INT,
    length: Types.INT,
  },
  editCommentID: Types.STRING,
  bottomBarHeight: Types.INT,
  scaleFactor: Types.withDefaultValue(Types.NUMBER, 1),
  renderLocations: Types.BOOL,
  page: {
    width: Types.NUMBER,
    height: Types.NUMBER,
  },
  showToc: Types.BOOL,
  showSettings: Types.BOOL,
  showGroupMenu: Types.BOOL,
  showAdvancedSettings: Types.BOOL,
  showLayers: Types.BOOL,
  curPos: Types.NUMBER,
  activeBar: Types.STRING,
  lastActiveBar: Types.STRING,
  reactionPickerHeight: Types.NUMBER,
  viewNewComments: Types.BOOL,
  preventSpoilers: Types.withDefaultValue(Types.BOOL, true),
  quietMode: Types.withDefaultValue(Types.BOOL, false),
  keyboardHeight: Types.NUMBER,
  showReactionBar: Types.BOOL, // only relevant for plus button array mode
  plusButtonOpen: Types.BOOL, // only relevant for plus button array mode
  lightboxImagesEntryIndex: Types.NUMBER_NULLABLE,
  lightboxImageIndex: Types.NUMBER,
  showReactionBreakdown: Types.BOOL,
  reactionPath: Types.STRING_ARRAY,
  previouslyOpened: Types.NUMBER,
};

DataStore.registerDataStore(module, 'UIState', {
  schema: ObjSchema.MAP(gUIStateSchema),
  allowSubobjectCreate: true,
});

export function initDataStore(contentID: string, hasButtons: boolean) {
  const path = ['UIState', contentID];

  if (!DataStore.hasData(path)) {
    DataStore.resetToDefaults(path);
  }
  DataStore.replaceData(path.concat('workshopMode'), hasButtons);
}

export function cleanUpDataStore(contentID) {
  const path = ['UIState', contentID];
  DataStore.removeData(path);
}

export function calcBottomUXOffset(contentID: string, watcher: DataStore.WatcherOpt): number {
  const path = ['UIState', contentID];
  const bbar = DataStore.getData(watcher, path.concat('bottomBarHeight')) || 0;
  const activeBar = DataStore.getData(watcher, path.concat('activeBar'));
  let total;
  if (activeBar === NoteButtonID) {
    total = LAYOUT_CONSTANTS.NOTE_AREA_HEIGHT;
  } else if (activeBar) {
    total = bbar + DataStore.getData(watcher, path.concat('reactionPickerHeight')) || 0;
  } else {
    total = bbar;
  }
  return total;
}
