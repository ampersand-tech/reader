/**
* Copyright 2017-present Ampersand Technologies, Inc.
*/

import * as GlobalModal from 'clientjs/components/GlobalModal.tsx';
import { ensureSubscribed } from 'clientjs/components/Reader/ReaderPage.tsx';
import { NavOverlayReact as NavOverlay } from 'clientjs/components/ReaderApp/NavOverlay';
import { SkuInfo } from 'clientjs/components/ReaderApp/SkuInfo.tsx';
import { SuperSkuInfo } from 'clientjs/components/ReaderApp/SuperSkuInfo.tsx';
import { ReaderLoadingIndicator } from 'clientjs/components/ReaderUI/ReaderLoadingIndicator.tsx';
import { InstrumentedDataWatcher } from 'clientjs/InstrumentedDataWatcher';
import * as ReaderRoutes from 'clientjs/readerRoutes';
import * as Constants from 'clientjs/shared/constants';
import * as SkuUtils from 'clientjs/skuUtils';
import * as Util from 'overlib/client/clientUtil';
import { DataWatcherProps } from 'overlib/client/components/DataWatcher';
import * as Flex from 'overlib/client/components/Flex.tsx';
import { TRANS_MODE } from 'overlib/client/components/TransitionWrapper';
import * as Navigation from 'overlib/client/navigation';
import * as React from 'react';

interface SkuPageProps {
  distributionID: Constants.DistributionID;
  skuID: Constants.SkuID;
  reactionGroupID?: Constants.ReactionGroupID|null;
  discountCode?: string;
  transitionMode?: string;
}

export class SkuPage extends InstrumentedDataWatcher<SkuPageProps, {}> {

  componentWillMount() {
    super.componentWillMount();

    if (!this.props.transitionMode || this.props.transitionMode === TRANS_MODE.INCOMING) {

      this.setSku(this.props.distributionID, this.props.skuID);

      if (this.props.discountCode) {
        this.svrCmd('applyDiscountCode', {
          distributionID: this.props.distributionID,
          skuID: this.props.skuID,
          discountCode: this.props.discountCode,
        }, (err, discountPrice) => {
          if (!err) {
            GlobalModal.openModal('okCancel', {
              title: 'Applied Discount!',
              description: `Congratulations! You have received a special promotional price of ${Util.penniesToPriceString(discountPrice)}.`,
              ok: 'ok',
            });

            // remove the discount code from the URL
            const route = this.props.reactionGroupID ?
              ReaderRoutes.skuPageWithGroup(this.props.distributionID, this.props.skuID, this.props.reactionGroupID) :
              ReaderRoutes.skuPage(this.props.distributionID, this.props.skuID);
            Navigation.go(route, { noHistory: true });
          }
        });
      }
    }
  }
  componentDidUpdate(prevProps: Readonly<SkuPageProps & DataWatcherProps>, prevState: Readonly<{}>, prevContext: any) {
    if (super.componentDidUpdate) { super.componentDidUpdate(prevProps, prevState, prevContext); }
    if (!this.props.transitionMode) {
      this.setSku(this.props.distributionID, this.props.skuID);
    }
  }

  setSku = (distributionID: Constants.DistributionID, skuID: Constants.SkuID) => {
    // auto purchase free skus
    const sku = this.getData(['distributions', distributionID, 'skus', skuID], SkuUtils.SKU_PRICE_MASK);
    const priceData = sku ? SkuUtils.getPriceFromSku(this, sku, distributionID, skuID) : null;
    // don't auto purchase sku if another is going on. If it's different, we'll just let the
    // autopurchase on the reader handle it
    if (priceData && priceData.purchasePrice === 0 && !SkuUtils.isPurchaseInFlight()) {
      SkuUtils.purchaseSku(distributionID, skuID, this.props.reactionGroupID || null, false, null, null);
    }
  }

  back = () => {
    Navigation.goBack();
  }


  render() {
    const res = ensureSubscribed(this, this.props.distributionID,
      [
        <ReaderLoadingIndicator key='1' />,
        <NavOverlay key='2' />,
      ],
    );

    if (res) {
      return res;
    }

    const dataPath: string[] = ['distributions', this.props.distributionID, 'skus', this.props.skuID];
    if (!this.getData(dataPath, 1)) {
      // missing sku, redirect
      Navigation.go(ReaderRoutes.author1(this.props.distributionID), { noHistory: true });
      return;
    }

    const childSkus = this.getData(dataPath.concat('childSkus'), Util.IDS_MASK);
    return (
      <Flex.Col classes='fg-1 pos-r'>
        { Util.safeObjIsEmpty(childSkus) ?
          <SkuInfo dataPath={dataPath} reactionGroupID={this.props.reactionGroupID} back={this.back} /> :
          <SuperSkuInfo dataPath={dataPath} reactionGroupID={this.props.reactionGroupID} back={this.back} />
        }
        <NavOverlay/>
      </Flex.Col>
    );
  }
}
