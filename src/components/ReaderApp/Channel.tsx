/**
* Copyright 2016-present Ampersand Technologies, Inc.
*/

import { FixedTemplate, registerContextSchema } from 'clientjs/components/FixedTemplate.tsx';
import { ensureSubscribed } from 'clientjs/components/Reader/ReaderPage';
import { Feed } from 'clientjs/components/ReaderApp/Feed.tsx';
import { NavOverlayReact } from 'clientjs/components/ReaderApp/NavOverlay.tsx';
import { ReaderLoadingIndicator } from 'clientjs/components/ReaderUI/ReaderLoadingIndicator.tsx';
import { InstrumentedDataWatcher } from 'clientjs/InstrumentedDataWatcher';
import * as ReaderRoutes from 'clientjs/readerRoutes';
import * as Constants from 'clientjs/shared/constants';
import { SkuSchema } from 'clientjs/shared/distributionsDB';
import { FixedTemplateName } from 'clientjs/shared/fixedTemplates';
import * as color from 'color';
import * as Util from 'overlib/client/clientUtil';
import * as Flex from 'overlib/client/components/Flex.tsx';
import { safeAreaSize } from 'overlib/client/domClassManager';
import * as Navigation from 'overlib/client/navigation';
import * as ObjSchema from 'overlib/shared/objSchema';
import * as Time from 'overlib/shared/time';
import * as Types from 'overlib/shared/types';
import * as React from 'react';
import * as ReactDOM from 'react-dom';
import * as seedrandom from 'seedrandom';

export const SCROLL_TRIGGER_HEADER_HEIGHT = 325;
export const SCROLL_TRIGGER_CHECK_PERIOD = 250; // 4 times a sec max

const TIMERANGE = Time.MS_PER_HOUR * 20;
const RANDOMSEED = 'lets_get_seedy';

const DROPDOWN_HEADER_HEIGHT = 44;

const SKU_MASK = Util.objectMakeImmutable({
  skuType: 1,
  childSkus: {
    _ids: 1,
  },
  order: 1,
});

const SKU_INFO_MASK = Util.objectMakeImmutable({
  title: 1,
  description: 1,
  coverStore: 1,
  modTime: 1,
  content: {
    _ids: 1,
  },
});

const SOURCE_LOGOS = Util.objectMakeImmutable({
  'The Atlantic': '/templateImages/demos/logo_atlantic.png',
  'The New York Times': '/templateImages/demos/logo_NYT.png',
  'CNN': '/templateImages/demos/logo_cnn.png',
  'NPR': '/templateImages/demos/logo_NPR.png',
  'ESPN': '/templateImages/demos/logo_espn.png',
});

const skuCmp = (a: Sku, b: Sku): number => {
  return a.order - b.order;
};

interface Sku {
  skuPath: string[];
  skuType: Constants.ContentType;
  order: number;
}

interface SkuSection {
  skuTypeHeader: string;
  skus: Sku[];
}

interface NewsArticle {
  bookID: Constants.BookID;
  source: string;
  title: string;
  image: string;
  desc: string;
  modTime: number;
  openContent: () => void;
}

const ARTICLE_SCHEMA = {
  bookID: Types.STRING,
  source: Types.STRING,
  title: Types.STRING,
  image: Types.STRING,
  desc: Types.STRING,
  modTime: Types.TIME,
  openContent: Types.FUNCTION,
};

interface NewsSection {
  title: string;
  titleColor: string;
  isGrid: boolean;
  isBigGrid: boolean;
  leadArticle: NewsArticle;
  articles: NewsArticle[];
  icon?: string;
  iconBG1?: string;
  iconBG2?: string;
  odd: boolean;
}

interface ChannelContext {
  distributionID: Constants.DistributionID;
  oldStyle: boolean;
  authorName: string;
  possessiveAuthorName: string;
  skus: Sku[];
  skuSections: SkuSection[];
  newsSections: NewsSection[];
  back: () => void;
  recordScrollRef: (element) => void;
  showCollapsedHeader: boolean;
  authorColor: string;
  headerHeight: number;
}

interface Props {
  currentTab?: string;
  distributionID?: Constants.DistributionID;
}

interface State {
  showCollapsedHeader: boolean;
}

export class Channel extends InstrumentedDataWatcher<Props, State> {
  state = {
    showCollapsedHeader: false,
  };
  static contextSchema: StashOf<Types.Schema> = {
    distributionID: Types.STRING,
    oldStyle: Types.BOOL,
    authorName: Types.STRING,
    possessiveAuthorName: Types.STRING,
    skus: ObjSchema.ARRAY_OF({
      skuPath: Types.STRING_ARRAY,
      skuType: Types.STRING,
      order: Types.NUMBER,
    }),
    skuSections: ObjSchema.ARRAY_OF({
      skuTypeHeader: Types.STRING,
      skus: ObjSchema.ARRAY_OF({
        skuPath: Types.STRING_ARRAY,
        skuType: Types.STRING,
        order: Types.NUMBER,
      }),
    }),
    newsSections: ObjSchema.ARRAY_OF({
      title: Types.STRING,
      titleColor: Types.STRING,
      isGrid: Types.BOOL,
      isBigGrid: Types.BOOL,
      leadArticle: ARTICLE_SCHEMA,
      articles: ObjSchema.ARRAY_OF(ARTICLE_SCHEMA),
      icon: Types.STRING_NULLABLE,
      iconBG1: Types.STRING_NULLABLE,
      iconBG2: Types.STRING_NULLABLE,
      odd: Types.BOOL,
    }),
    back: Types.FUNCTION,
    recordScrollRef: Types.FUNCTION,
    showCollapsedHeader: Types.BOOL,
    authorColor: Types.STRING,
    headerHeight: Types.NUMBER,
  };

  static defaultProps = {
    testid: 'readerChannel',
  };

  static getTransitionKey(props) {
    return 'channel-' + props.distributionID;
  }

  componentWillMount() {
    super.componentWillMount();
    this.invalidateServerData('subscribeToGlobalChannel', { distributionID: this.props.distributionID });
    window.addEventListener('scroll', this.onScroll, true);
  }

  componentWillUnmount() {
    super.componentWillUnmount();
    window.removeEventListener('scroll', this.onScroll, true);
  }

  componentWillReceiveProps(_nextProps) {
    this.invalidateServerData('subscribeToGlobalChannel', { distributionID: this.props.distributionID });
  }

  getAuthorName = () => {
    if (!this.props.distributionID) {
      return '';
    }
    const personaID = this.getData(['distributions', this.props.distributionID, 'metaData', 'personaID']);
    return this.getData(['persona', personaID, 'name']) || '';
  }

  getPossessiveAuthorName = () => {
    const authorName = this.getAuthorName();
    let authorFirstName = '';
    if (authorName) {
      const trimmed = authorName.trim();
      if (trimmed) {
        // TODO: Fix gross assumption here that first word is first name
        // Make it draw from a picker possibly in the future
        authorFirstName = authorName.split(' ')[0];
      }
    }

    let possessiveName = '';
    if (authorFirstName.length > 0) {
      possessiveName = authorFirstName[authorFirstName.length - 1] === 's' ?
        authorFirstName + '\'' :
        authorFirstName + '\'s';
    }
    return possessiveName;
  }

  getSkuSections = (skus: Sku[]) : SkuSection[] => {
    const skuSections : SkuSection[] = [];
    const skuSectionMap : StashOf<SkuSection> = {};
    for (const sku of skus) {
      const type = sku.skuType;
      if (!skuSectionMap[type]) {
        skuSectionMap[type] = {
          skuTypeHeader: Constants.contentTypeNamePlural(type, true),
          skus: [],
        };
      }
      skuSectionMap[type].skus.push(sku);
    }

    for (const id in Constants.CONTENT_TYPE) {
      const type = Constants.CONTENT_TYPE[id];
      if (!skuSectionMap[type]) {
        continue;
      }
      skuSections.push(skuSectionMap[type]);
    }
    return skuSections;
  }


  scrollArea: React.ReactInstance|null = null;
  recordScrollRef = (element) => {
    this.scrollArea = element;
  }

  doScrollCheck = () => {
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

  onScroll = () => {
    // Only scroll check every few frames
    // Do this by setting a timeout
    if (this.hasNamedTimeout('scrollCheck')) {
      return;
    }
    this.setNamedTimeout('scrollCheck', this.doScrollCheck, SCROLL_TRIGGER_CHECK_PERIOD, true);
  }

  rng = seedrandom(RANDOMSEED);
  private randomTime() {
    return Math.round(Date.now() - TIMERANGE * this.rng());
  }

  private getNewsSections = (skus: Sku[], templateName: FixedTemplateName): NewsSection[] => {
    let Sections;
    let doubleUpLead = false;
    if (templateName === 'AppleChannel') {
      Sections = [
        { title: 'Top Stories', color: '#e22', grid: true, count: 4 },
        { title: 'For You', color: '#8c5', grid: false, count: 100 },
      ];
    } else if (templateName === 'AtlanticChannel') {
      Sections = [
        {
          title: 'Top Stories',
          color: '#ff3b3b',
          grid: false,
          count: 1,
          icon: 'icons/icon_reader_librarybook.svg',
          iconBG1: '#E50084',
          iconBG2: '#ff3b3b',
        },
        {
          title: 'Trending',
          color: '#40ceff',
          grid: true,
          count: 3,
          icon: 'icons/icon_writer_home_active_projects.svg',
          iconBG1: '#6600E8',
          iconBG2: '#40ceff',
        },
        {
          title: 'Inspiring',
          color: '#43ffc0',
          grid: true,
          count: 2,
          icon: 'icons/icon_reader_feedback_lightbulb.svg',
          iconBG1: '#22BED1',
          iconBG2: '#43ffc0',
        },
        {
          title: 'Best Reads',
          color: '#ff8643',
          grid: false,
          count: 1,
          icon: 'icons/Signup_SurveyIcons-writing.svg',
          iconBG1: '#E50057',
          iconBG2: '#ff8643',
        },
      ];
      doubleUpLead = true;
    } else {
      return [];
    }

    const sections: NewsSection[] = [];
    let curSection: NewsSection | undefined;

    for (const sku of skus) {
      const skuData = this.getData(sku.skuPath, SKU_INFO_MASK);
      if (!skuData) {
        continue;
      }
      const itemID = Object.keys(skuData.content)[0] as Constants.ContentItemID;
      if (!itemID) {
        continue;
      }
      const bookID = Constants.makeBookID(this.props.distributionID!, itemID);

      const articleData: NewsArticle = {
        bookID,
        source: SOURCE_LOGOS[skuData.description || ''] || '',
        title: skuData.title || '',
        image: skuData.coverStore || '',
        desc: skuData.description || '',
        modTime: this.randomTime(),
        openContent: () => {
          Navigation.go(ReaderRoutes.content1(bookID));
        },
      };

      const prevSectionData = Sections[sections.length - 1];
      const sectionData = Sections[sections.length];

      if (!curSection || (curSection.articles.length >= (prevSectionData.count) && sections.length < Sections.length)) {
        curSection = {
          title: sectionData.title,
          titleColor: sectionData.color,
          isGrid: sectionData.grid,
          isBigGrid: sectionData.count < 3,
          leadArticle: articleData,
          articles: doubleUpLead ? [articleData] : [],
          icon: sectionData.icon || null,
          iconBG1: sectionData.iconBG1 || null,
          iconBG2: sectionData.iconBG2 || null,
          odd: Boolean(sections.length % 2),
        };
        sections.push(curSection);
      } else {
        curSection.articles.push(articleData);
      }
    }

    return sections;
  }

  render() {
    // re-seed so that we always get the same times
    this.rng = seedrandom(RANDOMSEED);
    const distributionID = this.props.distributionID;

    if (!distributionID) {
      Navigation.goBack();
      return null;
    }

    if (Constants.isMobileWriterChannelID(distributionID)) {
      Navigation.go(ReaderRoutes.account);
      return null;
    }

    if (Constants.isWriterPreviewChannelID(distributionID)) {
      return (
        <Flex.Col classes='pos-r fg-1 c-black-bg p-20'>Please close this window to return to your document.</Flex.Col>
      );
    }

    const res = ensureSubscribed(this, distributionID,
      [
        <ReaderLoadingIndicator key='1' />,
        <NavOverlayReact key='2' />,
      ],
    );

    if (res) {
      return res;
    }

    // HACK FOR RIDLEY DEMO CHANNEL
    const oldStyle: boolean = (distributionID === '3_3u2+1_92');

    // HACK FOR APPLE AND ATLANTIC DEMO CHANNELS
    let templateName: FixedTemplateName = 'Channel';
    if (distributionID === 'BF_1qX+1_22') {
      templateName = 'AppleChannel';
    } else if (distributionID === 'BF_1qX+1_5') {
      templateName = 'AtlanticChannel';
    }

    const skusPath = ['distributions', distributionID, 'skus'];
    const skuIDs = this.getData(skusPath, Util.IDS_MASK);
    const skus: Sku[] = [];

    for (const skuID in skuIDs) {
      const skuPath = skusPath.concat(skuID);
      const sku: SkuSchema = this.getData(skuPath, SKU_MASK);
      if (!sku.skuType) {
        continue;
      }

      // Do not show super skus
      if (!Util.safeObjIsEmpty(sku.childSkus)) {
        continue;
      }

      skus.push({
        skuPath,
        order: sku.order || 0,
        skuType: sku.skuType,
      });
    }

    skus.sort(skuCmp);

    const authorColorStr = this.getData(['distributions', distributionID, 'metaData', 'primaryColor'], 1) || '#555555';
    // darken by subtracting 50%, but min out at 0
    const authorColor: any = color(authorColorStr).hsl();
    authorColor.color[2] = Math.max(authorColor.color[2] - 50, 0);

    const context: ChannelContext = {
      authorName: this.getAuthorName(),
      possessiveAuthorName: this.getPossessiveAuthorName(),
      distributionID,
      oldStyle,
      skus,
      skuSections: this.getSkuSections(skus),
      newsSections: this.getNewsSections(skus, templateName),
      back: () => { Navigation.goBack(); },
      recordScrollRef: this.recordScrollRef,
      showCollapsedHeader: this.state.showCollapsedHeader,
      authorColor: authorColor.hex(),
      headerHeight: safeAreaSize.top + DROPDOWN_HEADER_HEIGHT,
    };

    return (
      <Flex.Col classes='pos-r fg-1'>
        <FixedTemplate template={templateName} context={context} />
        <Feed
          distributionID={distributionID}
          feedType={Constants.POST_FEED_TYPE.OVERRIDE}
          classes='pos-a top-0 left-0 right-0 bot-0'
          />
      </Flex.Col>
    );
  }
}

registerContextSchema(module, 'Channel', Channel.contextSchema);
registerContextSchema(module, 'AppleChannel', Channel.contextSchema);
registerContextSchema(module, 'AtlanticChannel', Channel.contextSchema);
