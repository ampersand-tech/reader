/**
* Copyright 2018-present Ampersand Technologies, Inc.
*/

import { FixedTemplate } from 'clientjs/components/FixedTemplate.tsx';
import { InstrumentedDataWatcher } from 'clientjs/InstrumentedDataWatcher.tsx';
import * as Metrics from 'clientjs/metrics';
import * as ReaderRoutes from 'clientjs/readerRoutes';
import * as Constants from 'clientjs/shared/constants';
import { TEST_FUNC } from 'clientjs/shared/constants';
import { SkuSchema } from 'clientjs/shared/distributionsDB';
import * as SkuUtils from 'clientjs/skuUtils';
import * as Util from 'overlib/client/clientUtil';
import * as Log from 'overlib/client/log';
import * as Navigation from 'overlib/client/navigation';
import { registerContextSchema } from 'overlib/client/template/Template';
import * as DataStore from 'overlib/shared/dataStore';
import * as Types from 'overlib/shared/types';
import * as React from 'react';

const SKU_MASK = Util.objectMakeImmutable({
  childSkus: {
    _ids: 1,
  },
  coverStore: 1,
  skuType: 1,
  title: 1,
  headline: 1,
  personaID: 1,
  description: 1,
  price: 1,
  parentSkuID: 1,
});

const PERSONA_MASK = Util.objectMakeImmutable({
  name: 1,
  faceURL: 1,
});

interface Props {
  dataPath: string[];
  reactionGroupID?: Constants.ReactionGroupID|null;
  back?: () => void;
}

interface SuperSkuInfoContext {
  coverImage: string;
  authorFaceURL: string;
  headline: string;
  description: string;
  priceString: string;
  buy: () => void;
  preview: () => void;
  back: () => void;
}

export class SuperSkuInfo extends InstrumentedDataWatcher<Props, {loading: boolean}> {
  state = {
    loading: false,
  };
  static contextSchema: StashOf<Types.Schema> = {
    coverImage: Types.SHORTSTR,
    authorFaceURL: Types.SHORTSTR,
    headline: Types.SHORTSTR,
    description: Types.LONGSTR,
    priceString: Types.SHORTSTR,
    buy: Types.FUNCTION,
    preview: Types.FUNCTION,
    back: Types.FUNCTION,
  };
  static sampleContext: Stash = {
    coverImage: '',
    authorFaceURL: 'https://example.com/faceURL.png',
    headline: 'Read this and all of Author\'s Stories',
    description: 'Lorem ipsum\nThe first',
    priceString: '$9.99',
    buy: TEST_FUNC,
    preview: TEST_FUNC,
    back: TEST_FUNC,
  };

  componentWillMount() {
    super.componentWillMount();
  }

  componentWillUnmount() {
    super.componentWillUnmount();
    DataStore.replaceData(['ReaderAppState', 'subSkuReferrer'], '');
  }

  private getDistributionID = (): Constants.DistributionID => {
    if (!this.props.dataPath || this.props.dataPath.length < 4) {
      Log.error('@sam', 'Invalid dataPath in SuperSkuInfo', {dataPath: this.props.dataPath});
      return '' as Constants.DistributionID;
    }
    return this.props.dataPath[1] as Constants.DistributionID;
  }

  private getSkuID = (): Constants.SkuID => {
    if (!this.props.dataPath || this.props.dataPath.length < 4) {
      Log.error('@sam', 'Invalid dataPath in SuperSkuInfo', {dataPath: this.props.dataPath});
    }
    return (this.props.dataPath[3]  || '') as Constants.SkuID;
  }

  private getReferrerSkuID = (): Constants.SkuID | '' => {
    const referrerSkuID = this.getData(['ReaderAppState', 'subSkuReferrer'], 1);
    if (referrerSkuID) {
      return referrerSkuID;
    }
    // fallback
    const childSkuIDs = this.getData(this.props.dataPath.concat('childSkus'), Util.IDS_MASK);
    if (childSkuIDs) {
      const ids = Object.keys(childSkuIDs);
      return ids[0] as Constants.SkuID || '';
    }
    return '';
  }

  private buy = (): void => {
    const childSkuID = this.getReferrerSkuID();
    const distributionID = this.getDistributionID();
    const skuID = this.getSkuID();
    this.setState({loading: true});
    SkuUtils.purchaseSku(distributionID, skuID, this.props.reactionGroupID || null, false, null, this.safeCb((err) => {
      this.setState({ loading: false });
      if (err) {
        Log.error('@conor', 'superSkuPurchase.error', { distributionID, skuID, err });
      } else if (childSkuID) {
        Metrics.recordInSet(Metrics.SET.READER.APP, 'purchase.supersku', {
          distributionID,
          reactionGroupID: this.props.reactionGroupID || 'unknown',
          skuID,
          childSkuID,
        });
        Navigation.goBack(ReaderRoutes.author2(distributionID, childSkuID));
      } else {
        // fallback
        this.preview();
      }
    }));
  }

  private preview = (): void => {
    Navigation.go(ReaderRoutes.author1(this.getDistributionID()));
  }

  private genSuperSkuLink = (parentSkuID: Constants.SkuID): (() => void) => {
    return () => {
      Navigation.go(ReaderRoutes.author2(this.getDistributionID(), parentSkuID));
    };
  }


  render() {
    const sku = this.getData(this.props.dataPath, SKU_MASK) as SkuSchema;
    if (!sku) {
      return null;
    }
    const distributionID = this.getDistributionID();
    const price: number = SkuUtils.getPriceFromSku(this, sku, distributionID, this.getSkuID()).displayPrice;
    const childCoverImage = this.getData(['distributions', distributionID, 'skus', this.getReferrerSkuID(), 'coverStore'], 1);
    const coverImage = childCoverImage || sku.coverStore || '';
    const persona = this.getData(['persona', sku.personaID], PERSONA_MASK);
    const authorFirstName = persona && persona.name ? persona.name.split(' ')[0] : 'Author';
    const authorFaceURL = persona && persona.faceURL ? persona.faceURL : '';

    const context: SuperSkuInfoContext = {
      coverImage,
      authorFaceURL,
      headline: sku.headline || `Read this and all of ${authorFirstName}'s Stories`,
      priceString: sku.parentSkuID ? 'GET IT' : Util.penniesToPriceString(price),
      description: sku.description || '',
      buy: sku.parentSkuID ? this.genSuperSkuLink(sku.parentSkuID) : this.buy,
      preview: this.preview,
      back: this.props.back || (() => {}),
    };
    return (
      <FixedTemplate template='SuperSkuInfo' testid='SuperSkuInfo' context={context} />
    );
  }
}

registerContextSchema(module, 'SuperSkuInfo', SuperSkuInfo.contextSchema, SuperSkuInfo.sampleContext);
