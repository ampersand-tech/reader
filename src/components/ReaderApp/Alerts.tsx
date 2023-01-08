/**
* Copyright 2018-present Ampersand Technologies, Inc.
*
*/

import { FixedTemplate, registerContextSchema } from 'clientjs/components/FixedTemplate.tsx';
import { AlertsEntry, AE, AEComment, AEInvite, AEDiscount, AEMention, AEDraftInvite, AEPromotion } from 'clientjs/components/ReaderApp/AlertsEntry';
import { getNameList, getName } from 'clientjs/components/ReaderUI/User';
import { getGroupName } from 'clientjs/groupUtils';
import * as ManuscriptInfo from 'clientjs/manuscriptInfo';
import * as ReaderRoutes from 'clientjs/readerRoutes';
import * as AlertsDB from 'clientjs/shared/alertsDB';
import { Alert, AlertComment, AlertInvite, AlertDiscount, AlertMention, AlertDraftInvite, AlertPromotion } from 'clientjs/shared/alertsDB';
import * as Constants from 'clientjs/shared/constants';
import { extractContentID } from 'clientjs/shared/constants';
import * as SkuUtils from 'clientjs/skuUtils';
import { DataWatcher } from 'overlib/client/components/DataWatcher.tsx';
import * as Navigation from 'overlib/client/navigation';
import { Component, ComponentMap } from 'overlib/client/template/Component.tsx';
import * as ObjSchema from 'overlib/shared/objSchema';
import * as Sketch from 'overlib/shared/sketch';
import * as Types from 'overlib/shared/types';
import * as React from 'react';

interface AlertsContext {
  entries: AE[];
  goToDiscover: () => void;
}

function cmpModTime(a: AE, b: AE): number {
  return b.modTime - a.modTime;
}
export class AlertsReact extends DataWatcher<{}, {}> {
  static contextSchema: StashOf<Types.Schema> = {
    entries: ObjSchema.ARRAY_OF(Types.OBJECT),
    goToDiscover: Types.FUNCTION,
  };

  static customComponents = new ComponentMap({
    AlertsEntry: new AlertsEntry(),
  });

  componentWillUnmount() {
    super.componentWillUnmount();
  }

  // pass alertID to clear it
  genFollowAlert = (alert: Alert, alertID: Constants.AlertID): (() => void) => {
    return () => {
      Sketch.runAction('alerts.seenIt', alertID);
      // begin Tshirt hack
      if (alert.type === 'promotion' && alert.extraData.contentID === Constants.TSHIRT_SUCCESS) {
        Navigation.openExternalURL('http://www.ampersand.com/ttpromo');
      } else { // end Tshirt hack
        AlertsDB.linkPathFromAlert(null, alert, (err, path) => {
          if (!err && path) {
            Navigation.unsafe_go(path);
          }
        });
      }
    };
  }

  entryFromAlert = (alert: Alert, alertID: Constants.AlertID): AE | null => {
    switch (alert.type) {
      case 'comment': {
        const alertComment: AlertComment = alert;
        const s = alertComment.extraData.contentID.split('.');
        let groupName = getGroupName(this, alertComment.extraData.groupID, true);
        const aeComment: AEComment = {
          type: 'comment',
          modTime: alertComment.modTime,
          count: alertComment.count,
          seen: alertComment.seen,
          title: this.getData(['distributions', s[0], 'items', s[1], 'title']) || '',
          groupName: groupName ? `(${groupName})` : '',
          who: getNameList(this, alertComment.extraData.userIDs.split(',') as AccountID[], 'shortName', 4),
          contentImage: this.getData(['distributions', s[0], 'items', s[1], 'coverImageURL']) || '',
          onClick: this.genFollowAlert(alertComment, alertID),
        };
        return aeComment;
      }
      case 'invitation': {
        const alertInvite: AlertInvite = alert;
        const aeInvite: AEInvite = {
          type: 'invitation',
          modTime: alertInvite.modTime,
          seen: alertInvite.seen,
          bookName: alertInvite.extraData.bookID
            ? this.getData(['distributions', alertInvite.extraData.channelID, 'items', extractContentID(alertInvite.extraData.bookID), 'title'], 1)
            : '',
          channelName: this.getData(['distributions', alertInvite.extraData.channelID, 'metaData', 'name']) || '',
          who: getName(this, {accountID: alertInvite.sentUserID}, 'shortName'),
          whoID: alertInvite.sentUserID,
          onClick: this.genFollowAlert(alertInvite, alertID),
        };
        return aeInvite;
      }
      case 'discount': {
        const alertDiscount: AlertDiscount = alert;
        const distributionID = alertDiscount.extraData.channelID;
        const skuID = alertDiscount.extraData.skuID;

        const aeDiscount: AEDiscount = {
          type: 'discount',
          modTime: alertDiscount.modTime,
          seen: alertDiscount.seen,
          channelName: this.getData(['distributions', distributionID, 'metaData', 'name']) || '',
          onClick: this.genFollowAlert(alertDiscount, alertID),
          contentImage: this.getData(['distributions', distributionID, 'skus', skuID, 'coverStore']) || '',
          skuTitle: this.getData(['distributions', distributionID, 'skus', skuID, 'title']) || '',
        };

        if (SkuUtils.isOwned(distributionID, skuID, false, this) || !aeDiscount.skuTitle) {
          if (!alertDiscount.seen) {
            Sketch.runAction('alerts.seenIt', alertID);
          }
          return null;
        }

        return aeDiscount;
      }
      case 'mention': {
        const alertMention: AlertMention = alert;
        const aeMention: AEMention = {
          type: 'mention',
          modTime: alertMention.modTime,
          seen: alertMention.seen,
          draftName: alertMention.extraData.draftID
          ? ManuscriptInfo.getManuscriptData(this, alertMention.extraData.draftID, ['title']) : '',
          who: alertMention.extraData.userIDs ? getNameList(this, alertMention.extraData.userIDs.split(',') as AccountID[], 'shortName', 4)
            : getName(this, {accountID: alertMention.sentUserID}, 'shortName'),
          whoID: alertMention.sentUserID,
          onClick: this.genFollowAlert(alertMention, alertID),
        };
        return aeMention;
      }
      case 'draftInvite': {
        const alertDraftInvite: AlertDraftInvite = alert;
        const aeDraftInvite: AEDraftInvite = {
          type: 'draftInvite',
          modTime: alertDraftInvite.modTime,
          seen: alertDraftInvite.seen,
          draftName: alertDraftInvite.extraData.draftID
          ? ManuscriptInfo.getManuscriptData(this, alertDraftInvite.extraData.draftID, ['title']) : '',
          who: getName(this, {accountID: alertDraftInvite.sentUserID}, 'shortName'),
          whoID: alertDraftInvite.sentUserID,
          onClick: this.genFollowAlert(alertDraftInvite, alertID),
        };
        return aeDraftInvite;
      }
      case 'promotion': {
        const alertPromotion: AlertPromotion = alert;
        const aePromotion: AEPromotion = {
          type: 'promotion',
          contentID: alertPromotion.extraData.contentID,
          modTime: alertPromotion.modTime,
          seen: alertPromotion.seen,
          onClick: this.genFollowAlert(alertPromotion, alertID),
        };
        return aePromotion;
      }
    }
    return null;
  }

  render() {
    const alerts: StashOf<Alert> = this.getData(['alert'], '*');
    const entries: AE[] = [];
    for (const _alertID in alerts) {
      const alertID = _alertID as Constants.AlertID;
      const alert = alerts[alertID];
      const entry = this.entryFromAlert(alert, alertID);
      entry && entries.push(entry);
    }
    entries.sort(cmpModTime);
    const context: AlertsContext = {
      entries,
      goToDiscover: () => {
        Navigation.go(ReaderRoutes.discover);
      },
    };

    return (
      <FixedTemplate template='Alerts' context={context} />
    );
  }
}

export class Alerts extends Component {
  constructor() {
    super({
    }, false, false);
  }
  create(props: Stash, children: React.ReactElement<any>[], content: string | null, context: Stash): React.ReactElement<any>|null {
    this.process(props, children, content, context);
    return React.createElement(AlertsReact, props, content);
  }
}

registerContextSchema(module, 'Alerts', AlertsReact.contextSchema, undefined, AlertsReact.customComponents);
