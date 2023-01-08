/**
* Copyright 2018-present Ampersand Technologies, Inc.
*/

import * as GroupUtils from 'clientjs/groupUtils';
import * as Constants from 'clientjs/shared/constants';
import * as Util from 'overlib/client/clientUtil';
import * as Log from 'overlib/client/log';
import * as DataStore from 'overlib/shared/dataStore';

// create different user color schemes here
type ReactionColor = {
  duotoneDark: string,
  inlineBase: string,
  inlineGrad: string,
  name: string,
  trayBase: string,
  trayGrad: string,
};

const DarkUserColors: ReactionColor[] = [
  {inlineBase: '#E8CE23', inlineGrad: '#601082', trayBase: '#E8CE23', trayGrad: '#300842', duotoneDark: '#3a2660', name: 'yellow'},
  {inlineBase: '#ED9F3B', inlineGrad: '#601082', trayBase: '#ED9F3B', trayGrad: '#300842', duotoneDark: '#3a2660', name: 'orange'},
  {inlineBase: '#FF8A63', inlineGrad: '#601082', trayBase: '#FF8A63', trayGrad: '#300842', duotoneDark: '#3a2660', name: 'coral'},
  {inlineBase: '#FF6363', inlineGrad: '#601082', trayBase: '#FF6363', trayGrad: '#300842', duotoneDark: '#3a2660', name: 'red'},
  {inlineBase: '#FF63C1', inlineGrad: '#601082', trayBase: '#FF63C1', trayGrad: '#300842', duotoneDark: '#3a2660', name: 'pink'},
  {inlineBase: '#d28aff', inlineGrad: '#601082', trayBase: '#E063FF', trayGrad: '#300842', duotoneDark: '#3a2660', name: 'lavender'},
  {inlineBase: '#8D70FF', inlineGrad: '#601082', trayBase: '#8D70FF', trayGrad: '#300842', duotoneDark: '#3a2660', name: 'purple'},
  {inlineBase: '#63A1FF', inlineGrad: '#601082', trayBase: '#63A1FF', trayGrad: '#300842', duotoneDark: '#3a2660', name: 'blue'},
  {inlineBase: '#59E691', inlineGrad: '#102d82', trayBase: '#59E691', trayGrad: '#160842', duotoneDark: '#3a2660', name: 'green'},
];

const LightUserColors: ReactionColor[] = Util.clone(DarkUserColors);
LightUserColors[0] = {inlineBase: '#D4BB16', inlineGrad: '#8E6F29', trayBase: '#D4BB16', trayGrad: '#300842', duotoneDark: '#3a2660', name: 'yellow'};
LightUserColors[8] = {inlineBase: '#31D471', inlineGrad: '#267F5D', trayBase: '#31D471', trayGrad: '#160842', duotoneDark: '#3a2660', name: 'green'};

if (DarkUserColors.length !== Constants.REACTION_COLOR_COUNT) {
  Log.error('@unassigned', `Incorrect number of user colors. Expected ${Constants.REACTION_COLOR_COUNT}, got ${DarkUserColors.length}`);
}

if (LightUserColors.length !== Constants.REACTION_COLOR_COUNT) {
  Log.error('@unassigned', `Incorrect number of user colors. Expected ${Constants.REACTION_COLOR_COUNT}, got ${LightUserColors.length}`);
}

const userColors: StashOf<ReactionColor[]> = {
};
userColors[Constants.READER_COLOR.DARK] = DarkUserColors;
userColors[Constants.READER_COLOR.LIGHT] = LightUserColors;

export function getUserColor(
  watcher: DataStore.WatcherOpt,
  groupID: Constants.ReactionGroupID,
  userID: AccountID,
  forceColor?: Constants.ReaderColor,
): ReactionColor {
  const readerColor: Constants.ReaderColor =
    forceColor || DataStore.getData(watcher, ['settingsGlobal', 'reader', 'color'], 1) || Constants.READER_COLOR.DARK;
  const colorSet: ReactionColor[] = userColors[readerColor];
  return colorSet[GroupUtils.getColorSet(watcher, groupID, userID)];
}

export function getAllUserColors(watcher: DataStore.WatcherOpt, forceColor?: string): ReactionColor[] {
  const readerColor: Constants.ReaderColor =
    forceColor || DataStore.getData(watcher, ['settingsGlobal', 'reader', 'color'], 1) || Constants.READER_COLOR.DARK;
  return userColors[readerColor];
}
