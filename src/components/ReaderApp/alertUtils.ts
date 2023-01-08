/**
* Copyright 2018-present Ampersand Technologies, Inc.
*/

import * as AlertsDB from 'clientjs/shared/alertsDB';
import * as Constants from 'clientjs/shared/constants';
import * as Util from 'overlib/client/clientUtil';
import * as DataStore from 'overlib/shared/dataStore';
import * as Sketch from 'overlib/shared/sketch';

const ALERTS_SEEN_MASK = Util.objectMakeImmutable({
  _ids: {
    modTime: 1,
    seen: 1,
  },
});


export function unseenNotifications(watcher: DataStore.WatcherOpt): number {
  const alerts = DataStore.getData(watcher, ['alert'], ALERTS_SEEN_MASK);
  const seenTime = DataStore.getData(watcher, ['alertsStatus', 'seenTime']);
  let count = 0;
  for (const alertID in alerts) {
    if (alerts[alertID].modTime > seenTime && !alerts[alertID].seen) {
      count++;
    }
  }
  return count;
}

export function seenAlertComment(bookID: Constants.BookID, groupID: Constants.ReactionGroupID) {
  const key = AlertsDB.calcAlertCommentKey(bookID, groupID);
  Sketch.runAction('alerts.seenIt', key);
}
