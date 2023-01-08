/**
* Copyright 2016-present Ampersand Technologies, Inc.
*/

import { FixedTemplate, registerContextSchema } from 'clientjs/components/FixedTemplate.tsx';
import { ensureSubscribedRetError } from 'clientjs/components/Reader/ReaderPage.tsx';
import { SHORT_NAME, getName } from 'clientjs/components/ReaderUI/User.tsx';
import * as ReaderRoutes from 'clientjs/readerRoutes';
import * as AlertsDB from 'clientjs/shared/alertsDB';
import * as Constants from 'clientjs/shared/constants';
import * as SkuUtils from 'clientjs/skuUtils';
import * as Util from 'overlib/client/clientUtil';
import { DataWatcher } from 'overlib/client/components/DataWatcher.tsx';
import * as Navigation from 'overlib/client/navigation';
import * as Sketch from 'overlib/shared/sketch';
import * as Types from 'overlib/shared/types';
import * as React from 'react';

const ALERTS_MASK = Util.objectMakeImmutable({
  _ids: {
    type: 1,
    seen: 1,
    sentUserID: 1,
    extraData: {
      channelID: 1,
      skuID: 1,
      groupID: 1,
    },
  },
});

interface ReaderAppFTEContext {
  loading: boolean;
  title: string;
  authorName: string;
  coverImage: string;
  inviteeAccountID: string;
  inviteeName: string;
  alertID: Constants.AlertID;
  isPromotion: boolean;
  isDiscount: boolean;
  isInvite: boolean;
  cancelText: string;
  onClick: (alertID?: Constants.AlertID) => void;
  onClose: (alertID?: Constants.AlertID) => void;
}

export class ReaderAppFTE extends DataWatcher<{}, any> {
  static contextSchema: StashOf<Types.Schema> = {
    loading: Types.BOOL,
    title: Types.STRING,
    authorName: Types.STRING,
    coverImage: Types.STRING,
    inviteeAccountID: Types.STRING,
    inviteeName: Types.STRING,
    alertID: Types.STRING,
    isPromotion: Types.BOOL,
    isDiscount: Types.BOOL,
    isInvite: Types.BOOL,
    cancelText: Types.STRING,
    onClick: Types.FUNCTION,
    onClose: Types.FUNCTION,
  };

  private onFollowAlert = (alertID: Constants.AlertID) => {
    this.onClose(alertID);

    const alert = this.getData(['alert', alertID], null);
    AlertsDB.linkPathFromAlert(null, alert, (err, path) => {
      if (!err && path) {
        Navigation.unsafe_go(path);
      }
    });
  }

  private onClose = (alertID?: Constants.AlertID) => {
    if (alertID) {
      Sketch.runAction('alerts.seenIt', alertID);
    }
    Sketch.runAction('settingsGlobal.hideReaderFTE');
  }

  render() {
    const context: ReaderAppFTEContext = {
      loading: false,
      isPromotion: false,
      isDiscount: false,
      isInvite: false,
      cancelText: '',
      inviteeAccountID: '',
      inviteeName: '',
      alertID: '' as Constants.AlertID,
      title: '',
      authorName: '',
      coverImage: '',
      onClick: () => this.onClose(),
      onClose: () => this.onClose(),
    };

    let distributionID: Constants.DistributionID | undefined;
    let skuID: Constants.SkuID | undefined;
    let itemID: Constants.ContentItemID | undefined;

    // begin Tshirt hack
    const seenTShirtPromo = this.getData(['settingsGlobal', 'reader', 'FTE', 'tShirtPromo']);
    const tShirtPromoCount = this.getData(['settingsGlobal', 'reader', 'FTE', 'tShirtPromoCount']);

    if (!seenTShirtPromo && tShirtPromoCount === 0) {
      context.isPromotion = true;
      context.cancelText = 'SKIP';
      context.coverImage = 'images/BookBoss_Tank.png';

      context.onClick = () => {
        const TShirtPromoAlert = {
          seen: true,
          type: 'promotion',
          modTime: Date.now(),
          extraData: {
            contentID: Constants.TSHIRT_INVITATION,
          },
        } as AlertsDB.Alert;
        Sketch.runAction('alerts.insertPromotion', TShirtPromoAlert);
        Sketch.runAction('readerSettings.seenFTE', 'tShirtPromo');
        Navigation.go(ReaderRoutes.inviteContacts0);
      };
      context.onClose = () => {
        const TShirtPromoAlert = {
          type: 'promotion',
          modTime: Date.now(),
          extraData: {
            contentID: Constants.TSHIRT_INVITATION,
          },
        } as AlertsDB.Alert;
        Sketch.runAction('alerts.insertPromotion', TShirtPromoAlert);
        Sketch.runAction('readerSettings.seenFTE', 'tShirtPromo');
      };
    } else { // end Tshirt hack
      const alerts = this.getData(['alert'], ALERTS_MASK, {}) as StashOf<AlertsDB.Alert>;

      let displayedAlert : AlertsDB.Alert | undefined;
      let displayedAlertID = '' as Constants.AlertID;
      for (const _alertID in alerts) {
        const alertID = _alertID as Constants.AlertID;
        const alert = alerts[alertID];
        if (alert.seen || !( alert.type === 'discount' || alert.type === 'invitation') ) {
          continue;
        }
        displayedAlert = alert;
        displayedAlertID = alertID;
      }
      if (displayedAlert) {
        context.alertID = displayedAlertID;
        if (displayedAlert.type === 'discount' || displayedAlert.type === 'invitation') {
          context.cancelText = 'READ IT LATER';
          distributionID = displayedAlert.extraData.channelID;
          const err = ensureSubscribedRetError(this, distributionID);

          if (!err || err === 'loading') {
            context.isDiscount = ( displayedAlert.type === 'discount' );
            context.isInvite = ( displayedAlert.type === 'invitation' );
            if (err === 'loading') {
              context.loading = true;
            } else {
              if (displayedAlert.type === 'discount') {
                skuID = displayedAlert.extraData.skuID;
              } else {
                context.inviteeAccountID = displayedAlert.sentUserID;
                context.inviteeName = getName(this, { accountID: displayedAlert.sentUserID }, SHORT_NAME);

                const bookID = displayedAlert.extraData.bookID || (Object.keys(
                  this.getData(['reactionGroup2', displayedAlert.extraData.groupID, 'content'], Util.IDS_MASK, {}),
                )[0] || '') as Constants.BookID;

                itemID = Constants.extractContentID(bookID);
                skuID = SkuUtils.findSkuFromContent(this, distributionID, itemID) || undefined;
              }

              if (distributionID && skuID) {
                let personaID;

                if (itemID) {
                  personaID = this.getData(['distributions', distributionID, 'items', itemID, 'authorPersona'], '') || '';
                  context.title = this.getData(['distributions', distributionID, 'items', itemID, 'title'], '') || '';
                  context.coverImage = this.getData(['distributions', distributionID, 'items', itemID, 'coverImageURL'], '') || '';
                }

                personaID = personaID || this.getData(['distributions', distributionID, 'skus', skuID, 'personaID']) || '';
                context.title = context.title || this.getData(['distributions', distributionID, 'skus', skuID, 'title'], '') || '';
                context.coverImage = context.coverImage || this.getData(['distributions', distributionID, 'skus', skuID, 'coverStore'], '') || '';

                context.authorName = this.getData(['persona', personaID, 'name']);
              }
            }
          }
          context.onClick = () => this.onFollowAlert(context.alertID);
          context.onClose = () => this.onClose(context.alertID);
        }
      }
      if (!this.getData(['settingsGlobal', 'showReaderFTE'])) { //T shirt hack
        return null;
      }
    }

    return <FixedTemplate template='ReaderAppFTE' context={context}/>;
  }
}

registerContextSchema(module, 'ReaderAppFTE', ReaderAppFTE.contextSchema);
