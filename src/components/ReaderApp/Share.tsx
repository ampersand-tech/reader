/**
* Copyright 2018-present Ampersand Technologies, Inc.
*/

import { FixedTemplate } from 'clientjs/components/FixedTemplate.tsx';
import * as ReaderModal from 'clientjs/components/ReaderUI/ReaderModal.tsx';
import { InstrumentedDataWatcher } from 'clientjs/InstrumentedDataWatcher.tsx';
import * as ReaderRoutes from 'clientjs/readerRoutes';
import { DistributionID } from 'clientjs/shared/constants';
import * as QuotesDB from 'clientjs/shared/quotesDB';
import * as Util from 'overlib/client/clientUtil';
import * as Navigation from 'overlib/client/navigation';
import { registerContextSchema } from 'overlib/client/template/Template';
import { TEST_FUNC } from 'overlib/shared/constants';
import * as ObjSchema from 'overlib/shared/objSchema';
import * as Types from 'overlib/shared/types';
import * as React from 'react';

interface QuoteSchema {
  quote: QuotesDB.Quote;
  goToQuote: () => void;
}

interface ShareContext {
  veronicaQuotes: QuoteSchema[];
  laurenQuotes: QuoteSchema[];
  victoriaQuotes: QuoteSchema[];
  myQuotes: QuoteSchema[];
  goToLauren: () => void;
  goToVictoria: () => void;
  goToVeronica: () => void;
  goToCreateGroup: () => void;
  veronicaGlobal: boolean;
  laurenGlobal: boolean;
  victoriaGlobal: boolean;
}

export class Share extends InstrumentedDataWatcher<{}, {}> {
  static noTransition = true;
  static contextSchema: StashOf<Types.Schema> = {
    veronicaQuotes: ObjSchema.ARRAY_OF({
      goToQuote: Types.FUNCTION,
      quote: QuotesDB.QUOTES_SCHEMA,
    }),
    laurenQuotes: ObjSchema.ARRAY_OF({
      goToQuote: Types.FUNCTION,
      quote: QuotesDB.QUOTES_SCHEMA,
    }),
    victoriaQuotes: ObjSchema.ARRAY_OF({
      goToQuote: Types.FUNCTION,
      quote: QuotesDB.QUOTES_SCHEMA,
    }),
    myQuotes: ObjSchema.ARRAY_OF({
      goToQuote: Types.FUNCTION,
      quote: QuotesDB.QUOTES_SCHEMA,
    }),
    goToLauren: Types.FUNCTION,
    goToVictoria: Types.FUNCTION,
    goToVeronica: Types.FUNCTION,
    goToCreateGroup: Types.FUNCTION,
    laurenGlobal: Types.BOOL,
    victoriaGlobal: Types.BOOL,
    veronicaGlobal: Types.BOOL,
  };
  static sampleContext: Stash = {
    veronicaQuotes: [],
    laurenQuotes: [],
    victoriaQuotes: [],
    myQuotes: [],
    goToLauren: TEST_FUNC,
    goToVeronica: TEST_FUNC,
    goToVictoria: TEST_FUNC,
    goToCreateGroup: TEST_FUNC,
    laurenGlobal: true,
    victoriaGlobal: true,
    veronicaGlobal: true,
  };

  goToQuote = (q: Stash, id?: string) => {
    const quote = Util.cloneAndStrip(q, ['modTime']);
    if (!id) {
      Navigation.go(ReaderRoutes.quote0(encodeURIComponent(Util.safeStringify(quote))));
    } else {
      Navigation.go(ReaderRoutes.quote1(encodeURIComponent(Util.safeStringify(quote)), id));
    }
  }

  goToAuthor = (distributionID: DistributionID) => {
    ReaderModal.openReaderModal({
      showOK: true,
      onOK: () => Navigation.go(ReaderRoutes.author1(distributionID)),
      okCaption: 'TAKE ME THERE',
      header: 'Make your own quote art!',
      headerClasses: 'fs-18 fw-500',
      text: 'You can create quote artwork from anything you read on Ampersand.',
      textClasses: 'fs-18 ta-c',
      showCancel: true,
      cancelCaption: 'CANCEL',
    });
  }

  getPresetQuotes = () => {
    const veronicaQuotes: QuoteSchema[] = [];
    const victoriaQuotes: QuoteSchema[] = [];
    const laurenQuotes: QuoteSchema[] = [];
    const veronica0 = {
      content: 'Honor has no place in survival.',
      title: 'Carve the Mark',
      author: 'Veronica Roth',
      contentStyle: {
        fontFamily: 'Raleway',
        textAlign: 'center',
        fontSize: 22,
        color: '#e5e6e8',
      },
      containerStyle: {
        backgroundImage: 'url(images/quote_bitmap_2@3x.png)',
      },
    };
    const veronica1 = {
      content: 'You want to see people as extremes. Bad or good, trustworthy or not.' +
       ' I understand. It’s easier that way. But that isn’t how people work.',
      title: 'Carve the Mark',
      author: 'Veronica Roth',
      contentStyle: {
        fontFamily: 'Montserrat',
        textAlign: 'center',
        fontSize: 22,
        color: 'black',
      },
      containerStyle: {
        backgroundImage: 'url(images/quote_bitmap_4@2x.png)',
      },
    };
    const veronica2 = {
      content: 'A soft heart was a gift, whether given easily or with great reluctance. I would never take it for granted again.',
      title: 'The Fates Divide',
      author: 'Veronica Roth',
      contentStyle: {
        fontFamily: 'PT Serif',
        textAlign: 'left',
        fontSize: 22,
        color: 'black',
      },
      containerStyle: {
        backgroundImage: 'url(images/quote_bitmap_3@2x.png)',
      },
    };
    veronicaQuotes.push({
      quote: veronica0,
      goToQuote: () => this.goToQuote(veronica0),
    });
    veronicaQuotes.push({
      quote: veronica1,
      goToQuote: () => this.goToQuote(veronica1),
    });
    veronicaQuotes.push({
      quote: veronica2,
      goToQuote: () => this.goToQuote(veronica2),
    });
    const lauren0 = {
      content: 'Normal is a word invented by boring people to make them feel better about being boring.',
      title: 'Replica',
      author: 'Lauren Oliver',
      contentStyle: {
        fontFamily: 'Montserrat',
        textAlign: 'center',
        fontSize: 22,
        color: 'black',
      },
      containerStyle: {
        backgroundImage: 'url(images/quote_bitmap@3x.png)',
      },
    };
    const lauren1 = {
      content: 'When Lyra read, it was as if a series of small windows open in the back of her mind, ' +
      'flooding her with light and fresh air and visions of other places, other lives, other, period.',
      title: 'Replica',
      author: 'Lauren Oliver',
      contentStyle: {
        fontFamily: 'PT Serif',
        textAlign: 'center',
        fontSize: 24,
        color: 'black',
      },
      containerStyle: {
        backgroundImage: 'url(images/quote_bitmap_5@2x.png)',
      },
    };
    const lauren2 = {
      content: 'When she was little, she’d liked to pretend that stars were really' +
      ' lights anchoring distant islands, as if she wasn’t looking up but only out across a dark sea.' +
      ' She knew the truth now but still found stars comforting, especially in their sameness. A sky full of burning replicas.',
      title: 'Replica',
      author: 'Lauren Oliver',
      contentStyle: {
        fontFamily: 'Raleway',
        textAlign: 'center',
        fontSize: 18,
        color: 'black',
      },
      containerStyle: {
        backgroundImage: 'url(images/quote_bitmap_4@2x.png)',
      },
    };
    laurenQuotes.push({
      quote: lauren0,
      goToQuote: () => this.goToQuote(lauren0),
    });
    laurenQuotes.push({
      quote: lauren1,
      goToQuote: () => this.goToQuote(lauren1),
    });
    laurenQuotes.push({
      quote: lauren2,
      goToQuote: () => this.goToQuote(lauren2),
    });
    const victoria0 = {
      content: 'If there’s one thing I should forget, it’s him.',
      title: 'War Storm',
      author: 'Victoria Aveyard',
      contentStyle: {
        fontFamily: 'Noto Serif',
        textAlign: 'center',
        fontSize: 26,
        color: '#e5e6e8',
      },
      containerStyle: {
        backgroundImage: 'url(images/quote_bitmap_2@3x.png)',
      },
    };
    const victoria1 = {
      content: 'To rise. And rise alone.',
      title: 'War Storm',
      author: 'Victoria Aveyard',
      contentStyle: {
        fontFamily: 'Raleway',
        textAlign: 'center',
        fontSize: 29,
        color: '#e5e6e8',
      },
      containerStyle: {
        backgroundImage: 'linear-gradient(135deg, #3023ae 0%, #c86dd7 100%)',
      },
    };
    const victoria2 = {
      content: 'I will not be a red queen.',
      title: 'War Storm',
      author: 'Victoria Aveyard',
      contentStyle: {
        fontFamily: 'PT Serif',
        textAlign: 'center',
        fontSize: 38,
        color: '#e5e6e8',
      },
      containerStyle: {
        backgroundImage: 'linear-gradient(  0deg, #f5515f 0%, #9f041b 100%)',
      },
    };
    victoriaQuotes.push({
      quote: victoria0,
      goToQuote: () => this.goToQuote(victoria0),
    });
    victoriaQuotes.push({
      quote: victoria1,
      goToQuote: () => this.goToQuote(victoria1),
    });
    victoriaQuotes.push({
      quote: victoria2,
      goToQuote: () => this.goToQuote(victoria2),
    });

    return {veronicaQuotes, victoriaQuotes, laurenQuotes};
  }

  private isChannelAvailable(distributionID: DistributionID) {
    return (
      Boolean(this.getData(['distributions', distributionID, 'metaData'], 1)) ||
      (this.getData(['distributionGlobal', distributionID, 'metaData', 'comingSoon'], 1) === false)
    );
  }

  render() {
    const {veronicaQuotes, victoriaQuotes, laurenQuotes} = this.getPresetQuotes();
    const quoteObj: Stash = this.getData(['quotes'], '*');
    const quoteIDs = Object.keys(quoteObj).sort((a, b) => quoteObj[b].modTime - quoteObj[a].modTime);
    const myQuotes: QuoteSchema[] = [];
    for (const id of quoteIDs) {
      const quote = quoteObj[id];
      myQuotes.push({
        goToQuote: () => this.goToQuote(quote, id),
        quote: Util.cloneAndStrip(quote, ['modTime']),
      });
    }
    const laurenID: DistributionID = '3_4ks+1_19' as DistributionID;
    const veronicaID: DistributionID = 'BF_17V+1_8' as DistributionID;
    const victoriaID: DistributionID = 'BF_17Z+1_29' as DistributionID;

    const context: ShareContext = {
      veronicaQuotes,
      laurenQuotes,
      victoriaQuotes,
      goToLauren: () => this.goToAuthor(laurenID),
      goToVeronica: () => this.goToAuthor(veronicaID),
      goToVictoria: () => this.goToAuthor(victoriaID),
      goToCreateGroup: () => Navigation.go(ReaderRoutes.createGroup),
      myQuotes,
      laurenGlobal: this.isChannelAvailable(laurenID),
      veronicaGlobal: this.isChannelAvailable(veronicaID),
      victoriaGlobal: this.isChannelAvailable(victoriaID),
    };
    return (
      <FixedTemplate template='Share' testid='Share' context={context} />
    );
  }
}

registerContextSchema(module, 'Share', Share.contextSchema, Share.sampleContext);
