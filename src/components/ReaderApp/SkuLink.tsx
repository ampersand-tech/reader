/**
* Copyright 2018-present Ampersand Technologies, Inc.
*/

import { FixedTemplate } from 'clientjs/components/FixedTemplate.tsx';
import * as ReaderRoutes from 'clientjs/readerRoutes';
import * as Constants from 'clientjs/shared/constants';
import { TEST_FUNC } from 'clientjs/shared/constants';
import { skuTags, SkuSchema, GlobalSkuSchema } from 'clientjs/shared/distributionsDB';
import * as SkuUtils from 'clientjs/skuUtils';
import * as Util from 'overlib/client/clientUtil';
import { DataWatcher } from 'overlib/client/components/DataWatcher.tsx';
import * as Navigation from 'overlib/client/navigation';
import { registerContextSchema } from 'overlib/client/template/Template';
import * as Types from 'overlib/shared/types';
import * as React from 'react';

const SKU_MASK = Util.objectMakeImmutable({
  content: { // only on non-globals
    _ids: 1,
  },
  contentCount: 1, // only on globals
  coverStore: 1,
  skuType: 1,
  title: 1,
  price: 1,
  personaID: 1,
  pageCount: 1,
  tags: {
    _ids: 1,
  },
});

interface SkuLinkContext {
  coverImage: string;
  size: number;
  gap: number;
  height: number;
  single: boolean;
  title: string;
  author: string;
  priceString: string;
  pageCount: number;
  numItems: number;
  open: () => void;
  ampersandEdition: boolean;
  preview: boolean;
}

interface SkuLinkProps {
  skuPath: string[];
  size: number;
  gap: number;
  single?: boolean;
  noAuthor?: boolean;
}


export class SkuLink extends DataWatcher<SkuLinkProps, {}> {
  static contextSchema: StashOf<Types.Schema> = {
    coverImage: Types.SHORTSTR,
    size: Types.NUMBER,
    gap: Types.NUMBER,
    height: Types.NUMBER,
    single: Types.BOOL,
    title: Types.SHORTSTR,
    author: Types.SHORTSTR,
    priceString: Types.SHORTSTR,
    numItems: Types.NUMBER,
    pageCount: Types.NUMBER,
    open: Types.FUNCTION,
    ampersandEdition: Types.BOOL,
    preview: Types.BOOL,
  };
  static sampleContext: Stash = {
    coverImage: '',
    size: 100,
    gap: 15,
    height: 100,
    single: false,
    title: 'My Sku',
    author: 'Cedric Boodles',
    priceString: '$9.99',
    numItems: 9,
    pageCount: 120,
    open: TEST_FUNC,
    ampersandEdition: true,
    preview: false,
  };

  private getDistributionID(): Constants.DistributionID {
    return this.props.skuPath[1] as Constants.DistributionID;
  }

  private getSkuID(): Constants.SkuID {
    return this.props.skuPath[3] as Constants.SkuID;
  }

  private open = () => {
    Navigation.go(ReaderRoutes.author2(this.getDistributionID(), this.getSkuID()));
  }

  render() {
    let sku: SkuSchema | GlobalSkuSchema;
    let contentCount: number;
    // Because global skus do not cary the content ids with them, we have to use contentCount
    // The types are only clear within the scopes below so do the contentCount assignment there to keep typescript happy
    if (this.props.skuPath[0] === 'distributionGlobal') {
      sku = this.getData(this.props.skuPath, SKU_MASK) as GlobalSkuSchema;
      contentCount = sku.contentCount;
    } else {
      sku = this.getData(this.props.skuPath, SKU_MASK) as SkuSchema;
      contentCount = Object.keys(sku.content || {}).length;
    }
    const distributionID = this.getDistributionID();
    const skuID = this.getSkuID();
    const price: number = SkuUtils.getPriceFromSku(this, sku, distributionID, skuID).displayPrice;
    const personaID = sku.personaID;
    const height = Constants.contentTypeAspectRatio(sku.skuType) * this.props.size;
    const context: SkuLinkContext = {
      coverImage: sku.coverStore || '',
      size: this.props.size,
      gap: this.props.gap,
      height,
      single: !!this.props.single,
      title: sku.title,
      author: this.props.noAuthor ? '' : this.getData(['persona', personaID, 'name']) || '',
      priceString: !price ? Util.penniesToPriceString(price) : '', // do not show price!
      numItems: contentCount > 1 ? contentCount : 0, // treat 1 as 0 so we don't display it
      pageCount: (sku as GlobalSkuSchema).pageCount || SkuUtils.skuPageCount(distributionID, skuID, this) || 0,
      open: this.open,
      ampersandEdition: (sku.tags && sku.tags.hasOwnProperty(skuTags.AMP_EDITION)),
      preview: this.getData(this.props.skuPath.slice(0, 2).concat('type'), 1) === Constants.CONTENT_DISTRIBUTION_TYPE.PREVIEW,
    };
    return (
      <FixedTemplate template='SkuLink' testid='SkuLink' context={context} />
    );
  }
}

registerContextSchema(module, 'SkuLink', SkuLink.contextSchema, SkuLink.sampleContext);
