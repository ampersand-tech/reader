/**
* Copyright 2016-present Ampersand Technologies, Inc.
*/

import { ProviderContext } from 'clientjs/components/CanvasReader/ContextProvider';
import { Paragraph } from 'clientjs/components/CanvasReader/Paragraph.tsx';
import { ParagraphData } from 'clientjs/components/CanvasReader/ParagraphUtils';
import { SANS_SERIF_FONT } from 'clientjs/components/CanvasReader/ReaderStyle';
import * as Metrics from 'clientjs/metrics';
import * as Constants from 'clientjs/shared/constants';
import * as SkuUtils from 'clientjs/skuUtils';
import { SKU_PRICE_MASK } from 'clientjs/skuUtils';
import * as Util from 'overlib/client/clientUtil';
import { DataWatcher } from 'overlib/client/components/DataWatcher';
import * as Flex from 'overlib/client/components/Flex.tsx';
import { FontDesc } from 'overlib/client/components/Layout/Font';
import * as LayoutDrawable from 'overlib/client/components/Layout/LayoutDrawable';
import * as DataStore from 'overlib/shared/dataStore';
import * as PropTypes from 'prop-types';
import * as React from 'react';

function getPriceStringAndBuyFunction(
  watcher: DataStore.WatcherOpt,
  context: ProviderContext,
  distributionID: Constants.DistributionID,
  itemID: Constants.ContentItemID,
): {buyStr: string, buy: () => void } | null {
  const skuID = SkuUtils.findSkuFromContent(watcher, distributionID, itemID);
  if (!skuID) {
    return null;
  }
  const sku = DataStore.getData(watcher, ['distributions', distributionID, 'skus', skuID], SKU_PRICE_MASK);
  const priceData = SkuUtils.getPriceFromSku(watcher, sku, distributionID, skuID);
  if (!Util.isNumber(priceData.purchasePrice)) {
    return null;
  }
  let buy: () => void = () => {
    Metrics.recordInSet(Metrics.SET.READER.APP, 'purchase.fromPreview', {
      distributionID,
      skuID,
      itemID,
    });
    context.readerContext.buySku(skuID);
  };

  const hasSuperSku = priceData.displayPrice < 0 && sku.parentSkuID;

  if (priceData.displayPrice !== priceData.purchasePrice) {
    // We're in a split test, so wrap the buy function with the fake price
    buy = SkuUtils.priceTestWrapBuy(buy, distributionID, context.readerContext.getGroupID(), skuID, priceData.displayPrice);
  } else if (hasSuperSku) {
    buy = SkuUtils.genSuperSkuLinkFunc(distributionID, skuID, sku.parentSkuID, itemID);
  }

  return {
    buyStr: hasSuperSku ? 'GET THE REST' : Util.penniesToPriceString(priceData.displayPrice, 'KEEP READING FOR $'),
    buy: buy,
  };
}

interface ReaderPreviewLocationsInsertProps {
  scrollMarkId: string;
}
export class ReaderPreviewLocationsInsert extends DataWatcher<ReaderPreviewLocationsInsertProps, {}> {
  context: ProviderContext;
  static contextTypes = Util.shallowCloneAndCopy(DataWatcher.contextTypes, {
    readerContext: PropTypes.object.isRequired,
  });
  render() {
    const bookID = this.context.readerContext.getBookID();
    const distributionID = this.context.readerContext.getDistributionID();
    const itemID = Constants.extractContentID(bookID);
    let button: JSX.Element | null = null;

    const purchaseInfo = getPriceStringAndBuyFunction(this, this.context, distributionID, itemID);
    if (purchaseInfo) {
      button = (
        <div
          id={this.props.scrollMarkId}
          classes='as-c fw-400 fs-14 p-x-20 p-y-15 br-30 c-ash-fg c-ash-b b-1'
          onClick={purchaseInfo.buy}
        >
          {purchaseInfo.buyStr}
        </div>
      );
    }

    return (
      <Flex.Col classes='fs-20 m-y-30'>
        <div classes='fs-21 fy-i ta-c m-b-20'>Thanks for reading this preview.</div>
        {button}
      </Flex.Col>
    );
  }
}

export class ReaderPreviewInsert extends DataWatcher<{}, {}> {
  context: ProviderContext;
  static contextTypes = Util.shallowCloneAndCopy(DataWatcher.contextTypes, {
    readerContext: PropTypes.object.isRequired,
  });

  render() {
    if (!this.context.readerContext.isPreview(this)) {
      return null;
    }
    const bookID = this.context.readerContext.getBookID();
    const distributionID = this.context.readerContext.getDistributionID();
    const itemID = Constants.extractContentID(bookID);
    //const item : Item = this.getData(['distributions', distributionID, 'items', itemID], ITEM_MASK);

    const pageWidth = this.context.readerContext.getUIState(this, ['page', 'width']);

    // define header
    const headerData: ParagraphData = {
      content: 'Thanks for reading this preview.',
      type: 'paragraph',
    };
    const headerFontDesc : FontDesc = {
      fontFamily: SANS_SERIF_FONT,
      fontSize: 21,
      fontStyle: 'italic',
      fontWeight: 700,
      textDecoration: 'none',
      lineSpacing: 1.25,
      verticalAlign: 'baseline',
    };
    const header = (
      <Paragraph
        classes='ai-c c-white-fg'
        paragraph={headerData}
        paddingLeft={40}
        paddingRight={40}
        extraMissingWidth={20}
        font={headerFontDesc}
      />
    );

    let button: JSX.Element | null = null;

    const purchaseInfo = getPriceStringAndBuyFunction(this, this.context, distributionID, itemID);
    if (purchaseInfo) {
      const buttonFontDesc: FontDesc = {
        fontFamily: SANS_SERIF_FONT,
        fontSize: 16,
        fontStyle: 'normal',
        fontWeight: 700,
        textDecoration: 'none',
        lineSpacing: 1.75,
        verticalAlign: 'baseline',
      };
      const buttonFont = LayoutDrawable.getFontManager().getFont(buttonFontDesc);
      button = (
        <Flex.Row>
          <div classes='fg-1'/>
          <div classes='fs-16 m-t-30 p-x-30 p-y-15 br-25 c-white-bg' onClick={purchaseInfo.buy}>
            <div style={buttonFont} classes='c-black-fg'>{purchaseInfo.buyStr}</div>
          </div>
          <div classes='fg-1'/>
        </Flex.Row>
      );
    }

    const containerStyle = {
      borderStyle: 'wavey',
      borderTopWidth: '10px',
      borderColor: '#000',
      backgroundImage: `linear-gradient(166deg, #20467c 0%, #168ea8 75%)`,
    };

    const bottomBarHeight = this.context.readerContext.getUIState(this, ['bottomBarHeight']);

    return (
      <Flex.Col style={containerStyle} classes={`fs-20 m-t-20 p-y-50 m-b-${bottomBarHeight} w-${pageWidth}`}>
        {header}
        {button}
        <svg name='icons/ampersand_logo.svg' classes='h-70 w-65 m-t-60 c-white-fg op-0.5'/>
      </Flex.Col>
    );
  }
}
