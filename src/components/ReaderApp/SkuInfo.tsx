/**
* Copyright 2018-present Ampersand Technologies, Inc.
*
*/

import { FixedTemplate } from 'clientjs/components/FixedTemplate.tsx';
import { SCROLL_TRIGGER_HEADER_HEIGHT, SCROLL_TRIGGER_CHECK_PERIOD } from 'clientjs/components/ReaderApp/Channel';
import { InstrumentedDataWatcher } from 'clientjs/InstrumentedDataWatcher.tsx';
import * as ReaderRoutes from 'clientjs/readerRoutes';
import * as ReaderUtil from 'clientjs/readerUtil';
import { ReleasedItemSchema, CMSItemSchema } from 'clientjs/shared/cmsDataDB';
import * as Constants from 'clientjs/shared/constants';
import { TEST_FUNC } from 'clientjs/shared/constants';
import { SkuSchema } from 'clientjs/shared/distributionsDB';
import * as SkuUtils from 'clientjs/skuUtils';
import * as Util from 'overlib/client/clientUtil';
import { safeAreaSize } from 'overlib/client/domClassManager';
import * as Log from 'overlib/client/log';
import * as Navigation from 'overlib/client/navigation';
import { registerContextSchema } from 'overlib/client/template/Template';
import * as MathUtils from 'overlib/shared/mathUtils';
import * as ObjSchema from 'overlib/shared/objSchema';
import * as Types from 'overlib/shared/types';
import * as React from 'react';
import * as ReactDOM from 'react-dom';

const DROPDOWN_HEADER_HEIGHT = 44;
const DROPDOWN_BUY_BUTTON_HEIGHT = 59;

const SKU_MASK = Util.objectMakeImmutable({
  content: {
    _ids: {
      order: 1,
    },
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

const CONTENT_MASK = Util.objectMakeImmutable({
  title: 1,
  contentType: 1,
  coverImageURL: 1,
  contentDescriptor: 1,
  contentDisplayType: 1,
});

const CMS_CONTENT_MASK = Util.objectMakeImmutable({
  titleOverride: 1,
  contentType: 1,
  coverImageURL: 1,
  contentDescriptor: 1,
  contentDisplayType: 1,
  currentVersionID: 1,
  slug: 1,
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

interface SkuContent {
  coverImage: string;
  coverWidth: number;
  coverHeight: number;
  contentType: string;
  descriptor: string;
  title: string;
  preview: () => void;
  order: number;
}

function sortContent(a: SkuContent, b: SkuContent) {
  return a.order - b.order;
}

interface SkuInfoContext {
  coverImage: string;
  title: string;
  headline: string;
  skuType: string;
  authorName: string;
  authorFaceURL: string;
  viewAuthor: () => void;
  priceString: string;
  buy: () => void;
  preview: () => void;
  back: () => void;
  description: string;
  multiSku: boolean;
  viewItems: () => void;
  freeOrOwned: boolean;
  content: SkuContent[];
  recordScrollRef: (element) => void;
  showCollapsedHeader: boolean;
  headerHeight: number;
}

function scrollSmoothly(
  watcher: InstrumentedDataWatcher<any, any>,
  scrollElement: HTMLElement,
  element: HTMLElement,
) {
  const ease: MathUtils.EasingFunction = 'easeInOutQuad';
  const DURATION = 500;
  const FUDGE_Y = 70;

  const startTime = Date.now();

  const startY = scrollElement.scrollTop;
  element.scrollIntoView();
  const endY = scrollElement.scrollTop - FUDGE_Y;

  tick();

  function tick() {
    const deltaT = Date.now() - startTime;
    const scrollTop = MathUtils.interpEaseClamped(ease, startY, endY, deltaT / DURATION);
    scrollElement.scrollTop = scrollTop;

    if (deltaT < DURATION) {
      watcher.requestAnimationFrame(tick);
    }
  }
}

export class SkuInfo extends InstrumentedDataWatcher<Props, {loading: boolean, showCollapsedHeader: boolean}> {
  state = {
    loading: false,
    showCollapsedHeader: false,
  };
  static contextSchema: StashOf<Types.Schema> = {
    coverImage: Types.SHORTSTR,
    title: Types.SHORTSTR,
    headline: Types.SHORTSTR,
    skuType: Types.SHORTSTR,
    authorName: Types.SHORTSTR,
    authorFaceURL: Types.SHORTSTR,
    viewAuthor: Types.FUNCTION,
    priceString: Types.SHORTSTR,
    buy: Types.FUNCTION,
    preview: Types.FUNCTION,
    back: Types.FUNCTION,
    description: Types.LONGSTR,
    multiSku: Types.BOOL,
    viewItems: Types.FUNCTION,
    freeOrOwned: Types.BOOL,
    content: ObjSchema.ARRAY_OF({
      contentType: Types.SHORTSTR,
      title: Types.SHORTSTR,
      descriptor: Types.LONGSTR,
      coverImage: Types.SHORTSTR,
      coverWidth: Types.NUMBER,
      coverHeight: Types.NUMBER,
      preview: Types.FUNCTION,
      order: Types.NUMBER,
    }),
    recordScrollRef: Types.FUNCTION,
    showCollapsedHeader: Types.BOOL,
    headerHeight: Types.NUMBER,
  };
  static sampleContext: Stash = {
    coverImage: '',
    skuType: 'Sku Type',
    title: 'My Sku',
    headline: 'Sku Which Belongs to Me',
    authorName: 'Author Name',
    authorFaceURL: 'https://example.com/test.png',
    viewAuthor: TEST_FUNC,
    priceString: '$9.99',
    buy: TEST_FUNC,
    preview: TEST_FUNC,
    back: TEST_FUNC,
    description: 'A collection of books',
    multiSku: false,
    viewItems: TEST_FUNC,
    freeOrOwned: false,
    content: [],
    recordScrollRef: TEST_FUNC,
    showCollapsedHeader: false,
    headerHeight: DROPDOWN_HEADER_HEIGHT,
  };

  componentWillMount() {
    super.componentWillMount();
    window.addEventListener('scroll', this.onScroll, true);
  }

  componentWillUnmount() {
    super.componentWillUnmount();
    window.removeEventListener('scroll', this.onScroll, true);
  }

  private getDistributionID = (): Constants.DistributionID => {
    if (!this.props.dataPath || this.props.dataPath.length < 4) {
      Log.error('@sam', 'Invalid dataPath in SkuInfo', {dataPath: this.props.dataPath});
      return '' as Constants.DistributionID;
    }
    return this.props.dataPath[1] as Constants.DistributionID;
  }

  private getSkuID = (): Constants.SkuID => {
    if (!this.props.dataPath || this.props.dataPath.length < 4) {
      Log.error('@sam', 'Invalid dataPath in SkuInfo', {dataPath: this.props.dataPath});
    }
    return (this.props.dataPath[3]  || '') as Constants.SkuID;
  }

  private buy = (): void => {
    this.setState({loading: true});
    SkuUtils.purchaseSku(this.getDistributionID(), this.getSkuID(), this.props.reactionGroupID || null, false, null, () => {
      this.setState({ loading: false });
    });
  }

  private preview = (): void => {
    SkuUtils.readSku(this.getDistributionID(), this.getSkuID());
  }

  private isContentOwned = (contentID: Constants.ContentItemID): boolean => {
    const distributionID = this.getDistributionID();
    if (!distributionID || !contentID) {
      return false;
    }
    return SkuUtils.isContentOwned(distributionID, contentID, false, this);
  }

  private havePreview = (contentID: Constants.ContentItemID): boolean => {
    const distributionID = this.getDistributionID();
    if (!distributionID || !contentID) {
      return false;
    }
    return SkuUtils.isContentOwned(distributionID, contentID, true, this);
  }

  private genPreview = (contentID: Constants.ContentItemID): (() => void) => {
    return () => {
      const distributionID = this.getDistributionID();
      const bookID = Constants.makeBookID(distributionID, contentID);
      if (this.isContentOwned(contentID) || this.havePreview(contentID)) {
        ReaderUtil.readBook(bookID, this.props.reactionGroupID);
      } else {
        // get preview
        const skuID = this.getSkuID();
        if (distributionID && skuID) {
          SkuUtils.purchaseSku(distributionID, skuID, this.props.reactionGroupID || null, true, null, (err, result) => {
            if (err) {
              Log.warn('@sam', 'preview.item.fail', err);
              return;
            }
            if (result) {
              ReaderUtil.readBook(bookID, this.props.reactionGroupID);
            } else {
              Log.error('@sam', 'No error, but no result purchasing preview', {err});
            }
          });
        }
      }
    };
  }

  private getSkuContent = (coverWidth: number, sku: SkuSchema, contentID: Constants.ContentItemID): SkuContent | null => {
    if (this.props.dataPath[0] === 'distributions') {
      const contentData: ReleasedItemSchema = this.getData(this.props.dataPath.slice(0, 2).concat(['items', contentID]), CONTENT_MASK);
      if (!contentData) {
        Log.warn('@sam', 'sku.info.content.missing', {dataPath: this.props.dataPath, contentID});
        return null;
      }
      return {
        title: contentData.title,
        contentType: contentData.contentDisplayType || Constants.contentTypeName(contentData.contentType),
        descriptor: contentData.contentDescriptor || '',
        coverImage: contentData.coverImageURL || '',
        coverWidth,
        coverHeight: Math.round(coverWidth * Constants.contentTypeAspectRatio(contentData.contentType)),
        preview: this.genPreview(contentID),
        order: sku.content[contentID].order,
      };
    } else if (this.props.dataPath[0] === 'distributionSource') {
      const cmsItemData: CMSItemSchema = this.getData(['cmsData', contentID], CMS_CONTENT_MASK);
      if (!cmsItemData) {
        //TODO: auto-grab these?
        Log.warn('@sam', 'skueditor.unknown.item', { contentID });
        return null;
      }
      let title = cmsItemData.titleOverride;
      if (!title) {
        if (cmsItemData.currentVersionID) {
          const manuscript = this.getServerData('admin_getManuscript', { manuscriptID: cmsItemData.currentVersionID });
          title = manuscript && manuscript.title;
        }
      }

      return {
        title: title || cmsItemData.slug || 'NO TITLE FOUND',
        contentType: cmsItemData.contentDisplayType || Constants.contentTypeName(cmsItemData.contentType),
        descriptor: cmsItemData.contentDescriptor || '',
        coverImage: cmsItemData.coverImageURL || '',
        coverWidth,
        coverHeight: Math.round(coverWidth * Constants.contentTypeAspectRatio(cmsItemData.contentType)),
        preview: this.genPreview(contentID),
        order: sku.content[contentID].order,
      };
    }
    Log.error('@sam', 'Unknown data path for sku content', { dataPath: this.props.dataPath });
    return null;
  }


  scrollArea: React.ReactInstance|null = null;
  private recordScrollRef = (element) => {
    this.scrollArea = element;
  }

  private doScrollCheck = () => {
    if (this.scrollArea) {
      const component: Element = ReactDOM.findDOMNode(this.scrollArea);
      if (component) {
        if (component.scrollTop > SCROLL_TRIGGER_HEADER_HEIGHT) {
          if (!this.state.showCollapsedHeader) {
            this.setState({showCollapsedHeader: true});
          }
        } else {
          if (this.state.showCollapsedHeader) {
            this.setState({showCollapsedHeader: false});
          }
        }
      }
    }
  }

  private onScroll = () => {
    // Only scroll check every few frames
    // Do this by setting a timeout
    if (this.hasNamedTimeout('scrollCheck')) {
      return;
    }
    this.setNamedTimeout('scrollCheck', this.doScrollCheck, SCROLL_TRIGGER_CHECK_PERIOD, true);
  }

  private viewAuthor = () => {
    Navigation.go(ReaderRoutes.author1(this.getDistributionID()));
  }

  private viewItems = () => {
    const el = ReactDOM.findDOMNode(this) as HTMLElement;

    const contentHeader = el.querySelector('#contentHeader');
    if (this.scrollArea && contentHeader) {
      contentHeader && scrollSmoothly(this, ReactDOM.findDOMNode(this.scrollArea) as any, contentHeader as any);
    }
  }

  private genSuperSkuLink = (parentSkuID: Constants.SkuID): (() => void) => {
    return SkuUtils.genSuperSkuLinkFunc(this.getDistributionID(), this.getSkuID(), parentSkuID);
  }

  render() {
    const distributionID = this.getDistributionID();
    const sku = this.getData(this.props.dataPath, SKU_MASK) as SkuSchema;
    if (!sku) {
      return null;
    }
    const price: number = SkuUtils.getPriceFromSku(this, sku, this.getDistributionID(), this.getSkuID()).displayPrice;
    let content: SkuContent[] = [];
    const coverWidth = 90;
    for (const contentID in sku.content) {
      const skuContent = this.getSkuContent(coverWidth, sku, contentID as Constants.ContentItemID);
      if (skuContent) {
        content.push(skuContent);
      }
    }
    content.sort(sortContent);
    let coverImage = sku.coverStore || '';
    if (!coverImage) {
      for (const c of content) {
        if (c.coverImage) {
          coverImage = c.coverImage;
          break;
        }
      }
    }
    if (content.length === 1) {
      content = [];
    }
    const persona = this.getData(['persona', sku.personaID], PERSONA_MASK);
    const plural = (content.length > 1);
    const freeOrOwned = !price || SkuUtils.isOwned(distributionID, this.getSkuID(), false, this);
    const multiSku = content.length > 1;
    const context: SkuInfoContext = {
      coverImage: coverImage,
      skuType: sku.skuType ? (plural ? Constants.contentTypeNamePlural(sku.skuType) : Constants.contentTypeName(sku.skuType)) : '',
      title: sku.title || '',
      headline: sku.headline || sku.title || '',
      authorName: (persona && persona.name) || '',
      authorFaceURL: (persona && persona.faceURL) || '',
      viewAuthor: this.viewAuthor,
      priceString: (price < 0 && sku.parentSkuID) ? 'GET IT' : Util.penniesToPriceString(price, 'BUY $'),
      buy: (price < 0 && sku.parentSkuID) ? this.genSuperSkuLink(sku.parentSkuID) : this.buy,
      preview: this.preview,
      back: this.props.back || (() => {}),
      description: sku.description || '',
      multiSku,
      viewItems: this.viewItems,
      freeOrOwned,
      content: content,
      recordScrollRef: this.recordScrollRef,
      showCollapsedHeader: this.state.showCollapsedHeader,
      headerHeight: safeAreaSize.top + DROPDOWN_HEADER_HEIGHT + ((freeOrOwned && multiSku) ? 0 : DROPDOWN_BUY_BUTTON_HEIGHT) ,
    };

    return (
      <FixedTemplate template='SkuInfo' testid='SkuInfo' context={context} />
    );
  }
}

registerContextSchema(module, 'SkuInfo', SkuInfo.contextSchema, SkuInfo.sampleContext);
