/**
* Copyright 2017-present Ampersand Technologies, Inc.
*/

import * as ClientNet from 'overlib/client/clientNet';
import * as Util from 'overlib/client/clientUtil';
import * as IpcUtil from 'overlib/client/ipcClientUtil';
import * as Log from 'overlib/client/log';
import * as Navigation from 'overlib/client/navigation';
import * as DataStore from 'overlib/shared/dataStore';
import * as Sketch from 'overlib/shared/sketch';

export function clearAppBadgeCount() {
  Log.debug('Clearing badge count');
  IpcUtil.sendCommand('updateBadgeCount', { count: 0 });
  ClientNet.svrCmd('clearBadgeCount', {});
}

export type NotificationType = 'posts';

export type BadgeLocation = 'navBarHome' | 'channelLink' | 'post';

interface BadgeDescripton {
  getBadgeCount: (watcher: DataStore.DataWatcher | null, ids?: StashOf<string>) => number;
  clearBadges?: (ids?: StashOf<string>) => void;
}

declare type BadgeLocationDescription = {[k in BadgeLocation]: BadgeDescripton};

export const BADGE_TABLE: {[k in NotificationType]: BadgeLocationDescription} = {
  posts: {
    navBarHome: {
      getBadgeCount: getPostAllBadgeCount.bind(null, 'navBarHome'),
    },
    channelLink: {
      getBadgeCount: getPostDistBadgeCount.bind(null, 'channelLink'),
    },
    post: {
      getBadgeCount: getPostBadgeCount.bind(null, 'post'),
      clearBadges: clearPostBadge,
    },
  },
};

const POST_MASK = Util.objectMakeImmutable({hasNotification: 1});

function getPostBadgeCount(location: BadgeLocation, watcher: DataStore.DataWatcher | null, ids) {
  if (!ids || !ids.distID || !ids.postID) {
    Log.error('@sam', 'getPostBadgeCount called without valid ids', ids);
    return 0;
  }
  const post = DataStore.getData(watcher, ['distributions', ids.distID, 'posts', ids.postID], POST_MASK);
  if (post && post.hasNotification) {
    const path = ['notifications', 'posts', 'badgeID', ids.distID + '.' + ids.postID, 'location', location];
    const isCleared = DataStore.getData(watcher, path, 1);
    if (!isCleared) {
      const isDimissed = DataStore.getData(watcher, ['dismissedPosts', ids.postID]);
      if (!isDimissed) {
        return 1;
      }
    }
  }
  return 0;
}

function getPostDistBadgeCount(location: BadgeLocation, watcher: DataStore.DataWatcher | null, ids) {
  if (!ids || !ids.distID) {
    Log.error('@sam', 'getPostDistBadgeCount called without valid ids', ids);
    return 0;
  }
  const posts = DataStore.getData(watcher, ['distributions', ids.distID, 'posts'], Util.IDS_MASK);
  let total = 0;
  for (const postID in posts) {
    total += getPostBadgeCount(location, watcher, {distID: ids.distID, postID: postID});
  }
  return total;
}

function getPostAllBadgeCount(location: BadgeLocation, watcher: DataStore.DataWatcher | null) {
  const distributions = DataStore.getData(watcher, ['distributions'], Util.IDS_MASK);
  let total = 0;
  for (const distID in distributions) {
    total += getPostDistBadgeCount(location, watcher, {distID: distID});
  }
  return total;
}


// These are the exported generic functions that should be used, stuff above is mapped through the BADGE_TABLE

export function getBadgeCount(watcher: DataStore.DataWatcher | null, location: BadgeLocation, ids?: StashOf<string>) {
  let total = 0;
  for (const notificationType in BADGE_TABLE) {
    const desc: BadgeLocationDescription = BADGE_TABLE[notificationType];
    const badgeDescription: BadgeDescripton|undefined = desc[location];
    if (badgeDescription) {
      total += badgeDescription.getBadgeCount(watcher, ids);
    }
  }
  return total;
}

function clearPostBadge(ids?: StashOf<string>) {
  if (!ids || !ids.distID || !ids.postID) {
    Log.error('@sam', 'clearPostBadge called without valid ids', ids);
    return;
  }
  const locations: BadgeLocation[] = ['navBarHome', 'channelLink', 'post'];
  Sketch.runAction('notification.clear', 'posts', ids.distID + '.' + ids.postID, locations);
}

export function clearBadges(location: BadgeLocation, ids?: StashOf<string>) {
  for (const notificationType in BADGE_TABLE) {
    const desc: BadgeLocationDescription = BADGE_TABLE[notificationType];
    const badgeDescription: BadgeDescripton|undefined = desc[location];
    if (badgeDescription && badgeDescription.clearBadges) {
      badgeDescription.clearBadges(ids);
    }
  }
}

export function handlePushNotification(path: string) {
  const pth = path.split('/');
  Navigation.unsafe_go(pth);
  return true;
}
