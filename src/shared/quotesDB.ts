/**
* Copyright 2018-present Ampersand Technologies, Inc.
*/

import * as Perms from 'overlib/shared/perms';
import * as Sketch from 'overlib/shared/sketch';
import * as Types from 'overlib/shared/types';
import * as Util from 'overlib/shared/util';

export type QuoteID = string;

export interface Quote {
  content: string;
  title: string;
  author: string;

  contentStyle?: {
    fontFamily?: string;
    textAlign?: string;
    fontSize?: number;
    color?: string;
  };

  containerStyle?: {
    backgroundImage?: string;
  };
}

export interface ServerQuote extends Quote {
  modTime: number;
}

export const QUOTES_SCHEMA = Util.objectMakeImmutable({
  content: Types.LONGSTR,
  title: Types.SHORTSTR,
  author: Types.SHORTSTR,

  contentStyle: {
    fontFamily: Types.SHORTSTR_NULLABLE,
    textAlign: Types.SHORTSTR_NULLABLE,
    fontSize: Types.NUMBER_NULLABLE,
    color: Types.SHORTSTR_NULLABLE,
  },

  containerStyle: {
    backgroundImage: Types.SHORTSTR_NULLABLE,
  },
});

const SERVER_QUOTES_SCHEMA = Util.shallowCloneAndCopy(QUOTES_SCHEMA, {
  modTime: Types.NUMBER,
});

// key is account ID
export const quotesDB = Sketch.definePersonalTable('quotes', Sketch.MAP(SERVER_QUOTES_SCHEMA));

Sketch.defineAction('quote.save', saveQuote, {
  perms: [ Perms.loggedIn ],
  paramTypes: {
    quote: QUOTES_SCHEMA,
  },
});

function saveQuote(ctx: Context, quote: Quote, cb: ErrDataCB<QuoteID>) {
  const q = quote as ServerQuote;
  q.modTime = Date.now();

  const quoteID = Sketch.clientUUID(ctx, 'quoteID');

  const record: ServerQuote = Sketch.clientDataForCreate(ctx, ['quotes', quoteID]);
  record.modTime = Date.now();

  Util.copySomeFields(quote, record, ['content', 'title', 'author']);
  record.contentStyle = Util.copySomeFields(quote.contentStyle, record.contentStyle, ['fontFamily', 'textAlign', 'fontSize', 'color']);
  record.containerStyle = Util.copySomeFields(quote.containerStyle, record.containerStyle, ['backgroundImage']);

  Sketch.insertClientData(ctx, ['quotes', quoteID], record, err => {
    if (err) {
      return cb(err);
    } else {
      return cb(null, quoteID);
    }
  });
}
