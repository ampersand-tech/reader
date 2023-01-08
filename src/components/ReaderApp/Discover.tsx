/**
* Copyright 2018-present Ampersand Technologies, Inc.
*/

import { FONT_TABLE } from 'clientjs/components/CanvasReader/ReaderStyle';
import { FixedTemplate, registerContextSchema } from 'clientjs/components/FixedTemplate.tsx';
import { InstrumentedDataWatcher } from 'clientjs/InstrumentedDataWatcher';
import * as Metrics from 'clientjs/metrics';
import * as ReaderRoutes from 'clientjs/readerRoutes';
import * as Constants from 'clientjs/shared/constants';
import { TEST_FUNC } from 'clientjs/shared/constants';
import { MetadataSchema, GlobalSkuSchema, skuTags } from 'clientjs/shared/distributionsDB';
import * as Util from 'overlib/client/clientUtil';
import { DataWatcher } from 'overlib/client/components/DataWatcher';
import * as Flex from 'overlib/client/components/Flex.tsx';
import * as LayoutDrawable from 'overlib/client/components/Layout/LayoutDrawable';
import * as Navigation from 'overlib/client/navigation';
import { ComponentMap, Component, PROP_TYPE } from 'overlib/client/template/Component';
import * as ObjSchema from 'overlib/shared/objSchema';
import * as Types from 'overlib/shared/types';
import * as React from 'react';
import * as ReactDOM from 'react-dom';

const COMING_SOON = 'comingSoon';
const NOT_AVAILABLE = 'notAvailable';

const DIST_MASK = Util.objectMakeImmutable({
  skus: {
    _ids: {
      skuType: 1,
      tags: {
        _ids: 1,
      },
      childSkus: {
        _ids: 1,
      },
    },
  },
  metaData: {
    name: 1,
    tagline: 1,
    discoverImage: 1,
    comingSoon: 1,
    displayOrder: 1,
    hideAuthorTab: 1,
    primaryColor: 1,
    countryCodeWhiteList: 1,
  },
});

function cmpChannel(a: Channel, b: Channel) {
  const numDiff = Util.cmpNum(false, a.displayOrder, b.displayOrder);
  if (numDiff) {
    return numDiff;
  }
  return Util.cmpString(false, a.name, b.name);
}

function cmpSubscribedChannel(a: Channel, b: Channel) {
  // TODO: modtime?
  return Util.cmpString(false, a.name, b.name);
}

interface DiscoverEntryContext {
  image: string;
  name: string;
  tagline: string;
  onClick: () => void;
  preview: boolean;
  showComingSoonCard: boolean;
  showNotAvailableCard: boolean;
  primaryColor: string;
}

interface Book {
  skuPath: string[];
}

const bookSchema: StashOf<Types.Schema> = {
  skuPath: Types.STRING_ARRAY,
};

interface Channel extends DiscoverEntryContext {
  displayOrder: number;
}

const channelSchema: StashOf<Types.Schema> = {
  image: Types.SHORTSTR,
  name: Types.SHORTSTR,
  tagline: Types.SHORTSTR_NULLABLE,
  onClick: Types.FUNCTION,
  preview: Types.BOOL,
  displayOrder: Types.NUMBER,
  showComingSoonCard: Types.BOOL,
  showNotAvailableCard: Types.BOOL,
  primaryColor: Types.STRING,
};
const discoverEntrySchema = Util.clone(channelSchema);
delete discoverEntrySchema.displayOrder;

interface DiscoverContext {
  activeTab: number;
  onChangeTab: (activeTab: number) => void;
  pageOffsetX: string;
  exclusives: Book[];
  liveExclusives: Book[];
  bookWips: Book[];
  books: Book[];
  stories: Book[];
  classics: Book[];
  globalChannels: Channel[];
  comingSoonChannels: Channel[];
  subscribedChannels: Channel[];
}

export class DiscoverEntry extends DataWatcher<{channel: Channel}, {}> {
  static contextSchema: StashOf<Types.Schema> = discoverEntrySchema;
  static sampleContext: Stash = {
    image: '',
    name: 'TestEntry',
    tagline: 'Author of Test Entry',
    onClick: TEST_FUNC,
    preview: false,
    showComingSoonCard: false,
    showNotAvailableCard: false,
    primaryColor: 'pink',
  };
  render() {
    const context: DiscoverEntryContext = {
      name: this.props.channel.name,
      tagline: this.props.channel.tagline,
      image: this.props.channel.image,
      onClick: this.props.channel.onClick,
      preview: this.props.channel.preview,
      showComingSoonCard: this.props.channel.showComingSoonCard,
      showNotAvailableCard: this.props.channel.showNotAvailableCard,
      primaryColor: this.props.channel.primaryColor,
    };
    return (
      <FixedTemplate template='DiscoverEntry' context={context} />
    );
  }
}

registerContextSchema(module, 'DiscoverEntry', DiscoverEntry.contextSchema, DiscoverEntry.sampleContext);

class DiscoverEntryComponent extends Component {
  constructor() {
    super({
      channel: PROP_TYPE.OBJECT,
    }, false, false);
  }
  create(props: Stash, children: React.ReactElement<any>[], content: string | null, context: Stash): React.ReactElement<any>|null {
    this.process(props, children, content, context);
    return React.createElement(DiscoverEntry, props, content);
  }
}

interface TabBarProps {
  activeTabIndex: number;
  onChange: (activeIndex: number) => void;
}

interface TabBarState {
  fontsLoaded: boolean;
  adjustedX: number;
  activeTabIndex: number;
  dragging: boolean;
}

class TabBar extends DataWatcher<TabBarProps, TabBarState> {
  static TABS = [
    'Get Started',
    'Authors',
    'Books-in-Progress',
    'Books',
    'Extras & Excerpts',
  ];

  state: TabBarState = {
    fontsLoaded: false,
    adjustedX: 0,
    activeTabIndex: this.props.activeTabIndex,
    dragging: false,
  };

  private element: HTMLDivElement | null = null;
  private width: number;
  private widths: number[];

  private leftEdge: number = 0;
  private rightEdge: number = 0;

  private measure_(element?: HTMLDivElement | null) {
    element = element || this.element;
    if (!element) {
      return;
    }

    const children = element.querySelectorAll('div');
    this.width = element.parentElement!.getBoundingClientRect().width;
    this.widths = Array.prototype.map.call(children, c => c.getBoundingClientRect().width);
    // The edges are in the space of the final left- value rendered below,
    // which is why the left edge is positive and the right negative
    this.leftEdge = this.width * 0.5;
    let totalWidth = 0;
    for (const width of this.widths) {
      totalWidth += width;
    }
    this.rightEdge = -totalWidth + this.width * 0.5;
  }

  private measure(element?: HTMLDivElement | null, activeTabIndex?: number | null) {
    element = element || this.element;
    activeTabIndex = typeof activeTabIndex === 'number' ? activeTabIndex : this.state.activeTabIndex;

    if (!element || !this.width || !this.widths) {
      return 0;
    }

    const width = this.width;
    let adjustedX = width / 2;

    const widths = this.widths;

    for (let i = 0; i < activeTabIndex && i < TabBar.TABS.length; ++i) {
      adjustedX -= widths[i];
    }

    adjustedX -= widths[activeTabIndex] / 2;

    return adjustedX;
  }

  componentDidMount() {
    // Montserrat may not be loaded yet, so any measurements we take could be invalid.
    LayoutDrawable.setFontTable(FONT_TABLE, (_font) => {
      this.forceUpdate();
      this.requestAnimationFrame(() => {
        this.measure_();
        this.setState({
          fontsLoaded: true,
          adjustedX: this.measure(),
        });
      });
    });
  }

  componentWillReceiveProps(newProps) {
    this.setState({
      activeTabIndex: newProps.activeTabIndex,
      adjustedX: this.measure(undefined, newProps.activeTabIndex),
    });
  }

  getRef = e => {
    this.element = ReactDOM.findDOMNode(e) as HTMLDivElement | null;
    this.measure_();
    this.setState({adjustedX: this.measure()});
  }

  touchPoint: number | null = null;
  index: number | null = null;
  velocity: number = 0;

  onTouchStart = (e: React.TouchEvent<any>) => {
    if (e.touches.length !== 1) {
      return;
    }

    this.index = this.props.activeTabIndex;
    this.touchPoint = e.touches[0].pageX - this.state.adjustedX;

  }

  onTouchEnd = () => {
    const endTime = Date.now();
    // velocity of last 100ms of touch events
    const _100ms = 100;

    let velocity = 0; // pixels per millisecond
    let samples = 0;
    for (let i = 1; i < this.prevTouches.length; ++i) {
      const [ti, xi] = this.prevTouches[i - 1];
      const [t, x] = this.prevTouches[i];

      if (endTime - t > _100ms) {
        continue;
      }

      if (t === ti) {
        continue;
      }

      velocity += (x - xi) / (t - ti);
      samples += 1;
    }

    if (samples) {
      velocity /= samples;
    } else {
      velocity = 0;
    }

    this.velocity = velocity;
    this.prevTouches.splice(0);
    this.index = null;
    this.touchPoint = null;

    this.prevUpdateTimeStamp = Date.now();
    // Actual state updating happens in the RAF
    this.requestAnimationFrame(this.updateScroll);
  }


  prevUpdateTimeStamp: number = 0;
  updateScroll = () => {
    const now = Date.now();
    const dt = now - this.prevUpdateTimeStamp;
    this.prevUpdateTimeStamp = now;

    const reduction = 0.92;
    let newVel = this.velocity * Math.pow(reduction, Math.round(dt / 16.7)); // for each frame, reduce by 8%

    let newX = this.state.adjustedX + newVel * dt;


    if (newX > this.leftEdge) {
      newX = this.leftEdge;
      newVel = Math.abs(newVel) * -0.15;
    } else if (newX < this.rightEdge) {
      newX = this.rightEdge;
      newVel = Math.abs(newVel) * 0.15;
    }


    const VELOCITY_THRESHOLD = 0.2;
    const activeTabIndex = this.getActiveTabIndex(newX);

    // If less than threshold, we're done scrolling, just fire off the selection and let it transition into place
    if (Math.abs(newVel) < VELOCITY_THRESHOLD) {
      this.velocity = 0;


      this.props.onChange(activeTabIndex);

      this.setState({
        activeTabIndex,
        adjustedX: this.measure(),
        dragging: false,
      });
    } else {
      this.velocity = newVel;
      this.requestAnimationFrame(this.updateScroll);
      this.setState({
        adjustedX: newX,
        activeTabIndex,
      });
    }
  }

  private onClick(index) {
    // If we're currently sliding, treat a click as a brake instead of a direct action on the touch target
    if (this.state.dragging) {
      this.velocity = 0;
    } else {
      this.props.onChange(index);
    }
  }

  prevTouches: [number, number][] = []; // array of [timestamp, pageX]

  private getActiveTabIndex(adjustedX) {
    let onScreenPos = adjustedX;

    const children = this.element!.children;
    const widths = this.widths;

    const center = this.width / 2;

    let activeTabIndex = 0;

    for (let i = 0; i < children.length; ++i) {
      if (onScreenPos > center) {
        break;
      }
      activeTabIndex = i;
      onScreenPos += widths[i];
    }

    return activeTabIndex;
  }

  onTouchMove = e => {
    const adjustedX = e.touches[0].pageX - this.touchPoint!;
    const activeTabIndex = this.getActiveTabIndex(adjustedX);

    this.setState({adjustedX, activeTabIndex, dragging: true});

    this.prevTouches.push([Date.now(), adjustedX]);
  }

  render() {
    const opacity = i => i === this.state.activeTabIndex ? 1.0 : 0.5;

    const adjustedX = this.state.adjustedX;

    // More careful dancing here: until fonts are loaded, we don't want to show the tab bar in the wrong
    // location, using the wrong font, and we don't want the transition stuff to kick in.  It looks weird.

    let rowClasses = Util.combineClasses(
      `h-78 c-white-fg o-v ws-n as-fs fs-23 fw-700 pos-a left-${adjustedX} top-IPHONE_X_SAFE_AREA_TOP`,
      this.state.fontsLoaded
        ? (this.state.dragging
          ? ''
          : 'trans-l-0.5s'
        ) : 'op-0',
    );

    return (
      <Flex.Row
        ref={this.getRef}
        classes={rowClasses}
        onTouchStart={this.onTouchStart}
        onTouchEnd={this.onTouchEnd}
        onTouchMove={this.onTouchMove}
      >
        {TabBar.TABS.map((caption, index) =>
          <TabBarTab
            key={index}
            index={index}
            opacity={opacity(index)}
            onClick={() => this.onClick(index)}
            caption={caption}
            />,
        )}
      </Flex.Row>
    );
  }
}

function TabBarTab(props: {onClick: (n: number) => void, opacity: number, caption: string, index: number}) {
  return (
    <div
      onClick={props.onClick.bind(null, props.index)}
      classes={`p-t-32 p-x-10 op-${props.opacity} trans-o-.5s fw-600`}
    >
      {props.caption}
    </div>
  );
}

class TabBarComponent extends Component {
  constructor() {
    super({
      activeTabIndex: PROP_TYPE.NUMBER,
      onChange: PROP_TYPE.FUNCTION,
    }, false, false);
  }

  create(props: TabBarProps, children: React.ReactElement<any>[], content: string | null, context: Stash): React.ReactElement<any>|null {
    this.process(props, children, content, context);
    return <TabBar {...props} />;
  }
}

export class Discover extends InstrumentedDataWatcher<{activeTab?: string}, {activeTab: number, openCards: StashOf<1>}> {
  static noTransition = true;

  static getTransitionKey(_props) {
    return 'discover';
  }

  static contextSchema: StashOf<Types.Schema> = {
    activeTab: Types.NUMBER,
    onChangeTab: Types.FUNCTION,
    pageOffsetX: Types.STRING,
    exclusives: ObjSchema.ARRAY_OF(bookSchema),
    liveExclusives: ObjSchema.ARRAY_OF(bookSchema),
    bookWips: ObjSchema.ARRAY_OF(bookSchema),
    books: ObjSchema.ARRAY_OF(bookSchema),
    stories: ObjSchema.ARRAY_OF(bookSchema),
    classics: ObjSchema.ARRAY_OF(bookSchema),
    globalChannels: ObjSchema.ARRAY_OF(channelSchema),
    subscribedChannels: ObjSchema.ARRAY_OF(channelSchema),
    comingSoonChannels: ObjSchema.ARRAY_OF(channelSchema),
  };
  static sampleContext: Stash = {
    activeTab: 0,
    onChangeTab: TEST_FUNC,
    pageOffsetX: '0',
    exclusives: [],
    liveExclusives: [],
    bookWips: [],
    books: [],
    stories: [],
    classics: [],
    globalChannels: [],
    subscribedChannels: [],
    comingSoonChannels: [],
  };

  static customComponents = new ComponentMap({
    TabBar: new TabBarComponent(),
    DiscoverEntry: new DiscoverEntryComponent(),
  });

  state = {
    activeTab: 0,
    openCards: {},
  };

  genNavFunc = (channelID: Constants.DistributionID): (() => void) => {
    return () => {
      Navigation.go(ReaderRoutes.author1(channelID));
    };
  }

  onChangeTab = activeTab => {
    this.setState({activeTab});
    Navigation.go(ReaderRoutes.discover1(activeTab), {noHistory: true});
  }

  genShowCardFunc = (channelID: Constants.DistributionID, cardType: string): (() => void) => {
    return () => {
      const curOpenCards = Util.clone(this.state.openCards);
      if (curOpenCards.hasOwnProperty(channelID)) {
        delete curOpenCards[channelID];
      } else {
        curOpenCards[channelID] = cardType;
        // record a metric, they want to know about this author
        Metrics.recordInSet(Metrics.SET.READER.APP, 'preventNav.clicked', {
          cardType: cardType,
          distributionID: channelID,
        });
      }
      this.setState({openCards: curOpenCards});
    };
  }

  componentWillMount() {
    super.componentWillMount();
    this.setState({activeTab: parseInt(this.props.activeTab || '0', 10) || 0});
  }

  componentWillReceiveProps(newProps) {
    if ('string' === typeof newProps.activeTab) {
      this.setState({activeTab: parseInt(newProps.activeTab, 10) || 0});
    }
  }

  // this function is public so tests can call it
  addChannelToContext(
    context: DiscoverContext,
    distributionID: Constants.DistributionID,
    data: {skus: StashOf<GlobalSkuSchema>, metaData: MetadataSchema},
    isGlobal: boolean,
    countryCode: string,
    seenSkus: Set<Constants.SkuID>,
  ) {
    const metaData = data.metaData;
    const channelType = this.getData(['distributions', distributionID, 'type']);
    const isSubscribed = channelType !== undefined;
    const isComingSoon = metaData.comingSoon && !isSubscribed;

    const entry: Channel = {
      name: metaData.name,
      tagline: metaData.tagline,
      image: metaData.discoverImage,
      onClick: this.genNavFunc(distributionID),
      preview: channelType === Constants.CONTENT_DISTRIBUTION_TYPE.PREVIEW,
      displayOrder: metaData.displayOrder,
      showComingSoonCard: false,
      showNotAvailableCard: false,
      primaryColor: metaData.primaryColor || 'pink',
    };

    // Hide the channel link only, but still display the skus below
    if (!metaData.hideAuthorTab) {
      if (isSubscribed) {
        if (isGlobal) {
          context.globalChannels.push(entry);
        }
        context.subscribedChannels.push(entry);
      } else {
        entry.showComingSoonCard = this.state.openCards.hasOwnProperty(distributionID) && this.state.openCards[distributionID] === COMING_SOON;
        entry.showNotAvailableCard = this.state.openCards.hasOwnProperty(distributionID) && this.state.openCards[distributionID] === NOT_AVAILABLE;

        if (isComingSoon) {
          entry.onClick = this.genShowCardFunc(distributionID, COMING_SOON);
          context.comingSoonChannels.push(entry);
        } else {
          if (metaData.countryCodeWhiteList) {
            const whiteListString = metaData.countryCodeWhiteList;
            const countries = whiteListString.split(',');
            if (countries.indexOf(countryCode) < 0 && countryCode !== Constants.USER_ASSIGNED_COUNTRY_CODES.COUNTRY_UNKNOWN) {
              entry.onClick = this.genShowCardFunc(distributionID, NOT_AVAILABLE);
            }
          }
          context.globalChannels.push(entry);
        }
      }
    }


    const skus = data.skus;
    for (const skuID_ in skus) {
      const skuID = skuID_ as Constants.SkuID;

      if (seenSkus.has(skuID)) {
        continue;
      }
      seenSkus.add(skuID);

      const sku = skus[skuID];

      if (!Util.safeObjIsEmpty((sku as Stash).childSkus)) {
        continue;
      }

      if (sku.tags.hasOwnProperty(skuTags.HIDDEN)) {
        continue;
      }

      const bookData: Book = {
        skuPath: [isGlobal ? 'distributionGlobal' : 'distributions', distributionID, 'skus', skuID],
      };

      // These catgories can be double listed
      if (sku.tags.hasOwnProperty(skuTags.BOOKCON_LIVE)) {
        context.liveExclusives.push(bookData);
      } else if (sku.tags.hasOwnProperty(skuTags.BOOKCON)) {
        context.exclusives.push(bookData);
      }

      if (sku.tags.hasOwnProperty(skuTags.CLASSIC) || sku.skuType === Constants.CONTENT_TYPE.CLASSIC) {
        context.classics.push(bookData);
      } else if (sku.skuType === Constants.CONTENT_TYPE.WORKSHOP) {
        context.bookWips.push(bookData);
      } else if (sku.skuType === Constants.CONTENT_TYPE.BOOK) {
        context.books.push(bookData);
      } else {
        context.stories.push(bookData);
      }
    }
  }

  render() {
    const subscribedChannelsObj: Stash|undefined = this.getData(['distributions'], Util.IDS_MASK);
    const globalChannelsObj: Stash|undefined = this.getData(['distributionGlobal'], Util.IDS_MASK);
    const subscribedChannelIDs = (subscribedChannelsObj ? Object.keys(subscribedChannelsObj) : []) as Constants.DistributionID[];
    const globalChannelIDs = (globalChannelsObj ? Object.keys(globalChannelsObj) : []) as Constants.DistributionID[];
    const countryCode = this.getData(['syncInfo', 'countryCode']);

    const pageOffsetX = (this.state.activeTab * -100) + 'vw';

    const context: DiscoverContext = {
      activeTab: this.state.activeTab,
      onChangeTab: this.onChangeTab,
      pageOffsetX,
      exclusives: [],
      liveExclusives: [],
      bookWips: [],
      books: [],
      stories: [],
      classics: [],
      globalChannels: [],
      subscribedChannels: [],
      comingSoonChannels: [],
    };

    const seenSkus: Set<Constants.SkuID> = new Set();

    for (const distributionID of globalChannelIDs) {
      const data = this.getData(['distributionGlobal', distributionID], DIST_MASK);
      this.addChannelToContext(context, distributionID, data, true, countryCode, seenSkus);
    }

    for (const distributionID of subscribedChannelIDs) {
      if (globalChannelsObj && globalChannelsObj[distributionID]) {
        continue;
      }
      const data = Util.shallowClone(this.getData(['distributions', distributionID], DIST_MASK));
      data.skus = Util.shallowClone(data.skus);

      this.addChannelToContext(context, distributionID, data, false, countryCode, seenSkus);
    }

    context.globalChannels.sort(cmpChannel);
    context.comingSoonChannels.sort(cmpChannel);
    context.subscribedChannels.sort(cmpSubscribedChannel);

    return (
      <FixedTemplate template='Discover' testid='Discover' context={context} />
    );
  }
}

registerContextSchema(module, 'Discover', Discover.contextSchema, Discover.sampleContext, Discover.customComponents);

