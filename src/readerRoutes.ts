/**
* Copyright 2018-present Ampersand Technologies, Inc.
*/

import { BookID, DistributionID, ReactionGroupID, SkuID } from 'clientjs/shared/constants';
import * as Navigation from 'overlib/client/navigation';
import { mkRoute, Route0, Route1, Route2, Route3, Route4, Route5 } from 'overlib/client/router';

type Email = string;
type InReaderLocation = string;
type DiscountCode = string;

export const emailUnsubSubmitted: Route0 =
  mkRoute(['reader', 'email', 'unsub', 'submitted']);

export const emailResub: Route0 =
  mkRoute(['reader', 'email', 'resub']);

export const emailUnsub: Route0 =
  mkRoute(['reader', 'email', 'unsub']);

export const signup: Route0 =
  mkRoute(['reader', 'signup']);

export const signup_oauth: Route5<string, string, string, string, string> =
  mkRoute(['reader', 'signup', ':authType', ':userID', ':accessToken', ':email', ':name']);

export const login0: Route0 =
  mkRoute(['reader', 'login']);

export const login1: Route1<Email> =
  mkRoute<string>(['reader', 'login', ':email']);

export const recoverPassword0: Route0 =
  mkRoute(['reader', 'recoverPassword']);

export const recoverPassword1: Route1<Email> =
  mkRoute<Email>(['reader', 'recoverPassword', ':email']);

export const resetPassword: Route2<Email, string> =
  mkRoute<Email, string>(['reader', 'resetpassword', ':email', ':code']);

export const redirect: Route0 =
  mkRoute(['reader', 'redirect', '**']);

export const root: Route0 =
  mkRoute([]);

export const readerRoot: Route0 =
  mkRoute(['reader']);

// not a navigable route
const contentSubroute: Route0 =
  mkRoute(['reader', 'content']);
export function isInContentRoute() {
  return Navigation.currentlyAt(contentSubroute, false);
}

export const content1: Route1<BookID> =
  mkRoute<BookID>(['reader', 'content', ':bookID']);

export const content2: Route2<BookID, ReactionGroupID> =
  mkRoute<BookID, ReactionGroupID>(['reader', 'content', ':bookID', ':reactionGroupID']);

export const content3: Route3<BookID, ReactionGroupID, InReaderLocation> =
  mkRoute<BookID, ReactionGroupID, InReaderLocation>(['reader', 'content', ':bookID', ':reactionGroupID', ':location']);

export const author1: Route1<DistributionID> =
  mkRoute<DistributionID>(['reader', 'discover', ':distributionID']);

export const author2: Route2<DistributionID, SkuID> =
  mkRoute<DistributionID, SkuID>(['reader', 'discover', ':distributionID', ':skuID']);

export const author3: Route3<DistributionID, SkuID, ReactionGroupID> =
  mkRoute<DistributionID, SkuID, ReactionGroupID>(['reader', 'discover', ':distributionID', ':skuID', ':reactionGroupID']);

export const skuPage: Route2<DistributionID, SkuID> =
  mkRoute<DistributionID, SkuID>(['reader', 'discover', 'skuInfo', ':distributionID', ':skuID']);

export const skuPageWithGroup: Route3<DistributionID, SkuID, ReactionGroupID> =
  mkRoute<DistributionID, SkuID, ReactionGroupID>(['reader', 'discover', 'skuInfo', ':distributionID', ':skuID', ':reactionGroupID']);

export const skuPageWithDiscount: Route4<DistributionID, SkuID, ReactionGroupID, DiscountCode> =
  mkRoute<DistributionID, SkuID, ReactionGroupID, DiscountCode>(
    ['reader', 'discover', 'skuInfo', ':distributionID', ':skuID', ':reactionGroupID', ':discountCode'],
  );

export const createGroup: Route0 =
  mkRoute(['reader', 'createGroup']);

export const group: Route0 =
  mkRoute(['reader', 'group']);

export const group1: Route1<ReactionGroupID> =
  mkRoute<ReactionGroupID>(['reader', 'group', ':groupID']);

export const group2: Route2<ReactionGroupID, BookID> =
  mkRoute<ReactionGroupID, BookID>(['reader', 'group', ':groupID', ':bookID']);

export const inviteGroup: Route2<ReactionGroupID, BookID> =
  mkRoute<ReactionGroupID, BookID>(['reader', 'group', ':groupID', ':bookID', 'inviteGroup']);

export const noContactsAccess: Route0 =
  mkRoute(['reader', 'noContactsAccess']);

export const notifications: Route0 =
  mkRoute(['reader', 'notifications']);

export const account: Route0 =
  mkRoute(['reader', 'account']);

export const accountSettings: Route0 =
  mkRoute(['reader', 'account', 'settings']);

export const notify: Route0 =
  mkRoute(['reader', 'notify']);

export const activity: Route0 =
  mkRoute(['reader', 'activity']);

export const discover: Route0 =
  mkRoute(['reader', 'discover']);

type DiscoverSubpage = number;

export const discover1: Route1<DiscoverSubpage> =
  mkRoute(['reader', 'discover', 'tab', ':activeTab']);

export const contacts: Route0 =
  mkRoute(['reader', 'contacts']);

export const inviteContacts0: Route0 =
  mkRoute(['reader', 'inviteContacts']);

export const inviteContacts2: Route2<ReactionGroupID, BookID> =
mkRoute<ReactionGroupID, BookID>(['reader', 'group', ':groupID', ':bookID', 'inviteContacts']);

export const quote0: Route1<string> =
  mkRoute<string>(['reader', 'quote', ':quote']);

export const quote1: Route2<string, string> =
  mkRoute<string>(['reader', 'quote', ':quote', ':quoteID']);

export const legal0: Route0 =
  mkRoute(['legal']);

export const legal1: Route1<string> =
  mkRoute(['legal', ':doc']);

export const _404: Route0 =
  mkRoute(['404']);

export namespace Legacy {
  // tslint:disable:no-shadowed-variable
  export const emailUnsubSubmitted: Route0 =
    mkRoute(['email', 'unsub', 'submitted']);

  export const emailResub: Route0 =
    mkRoute(['email', 'resub']);

  export const emailUnsub: Route0 =
    mkRoute(['email', 'unsub']);

  export const signup: Route0 =
    mkRoute(['signup']);

  export const login0: Route0 =
    mkRoute(['login']);

  export const login1: Route1<Email> =
    mkRoute<string>(['login', ':email']);

  export const recoverPassword0: Route0 =
    mkRoute(['recoverPassword']);

  export const recoverPassword1: Route1<Email> =
    mkRoute<Email>(['recoverPassword', ':email']);

  export const resetPassword: Route2<Email, string> =
    mkRoute<Email, string>(['resetpassword', ':email', ':code']);

  export const redirect: Route0 =
    mkRoute(['redirect', '**']);
}

export namespace Legacy2 {
  export const content1: Route1<BookID> =
    mkRoute<BookID>(['content', ':bookID']);

  export const content2: Route2<BookID, ReactionGroupID> =
    mkRoute<BookID, ReactionGroupID>(['content', ':bookID', ':reactionGroupID']);

  export const content3: Route3<BookID, ReactionGroupID, string> =
    mkRoute<BookID, ReactionGroupID, string>(['content', ':bookID', ':reactionGroupID']);

  export const author1: Route1<DistributionID> =
    mkRoute<DistributionID>(['author', ':distributionID']);

  export const author2: Route2<DistributionID, SkuID> =
    mkRoute<DistributionID, SkuID>(['author', ':distributionID', ':skuID']);

  export const author3: Route3<DistributionID, SkuID, ReactionGroupID> =
    mkRoute<DistributionID, SkuID, ReactionGroupID>(['author', ':distributionID', ':skuID', ':reactionGroupID']);

  export const skuPage: Route2<DistributionID, SkuID> =
    mkRoute<DistributionID, SkuID>(['skuInfo', ':distributionID', ':skuID']);

  export const skuPageWithGroup: Route3<DistributionID, SkuID, ReactionGroupID> =
    mkRoute<DistributionID, SkuID, ReactionGroupID>(['skuInfo', ':distributionID', ':skuID', ':reactionGroupID']);

  export const group1: Route1<ReactionGroupID> =
    mkRoute<ReactionGroupID>(['group', ':groupID']);

  export const group2: Route2<ReactionGroupID, BookID> =
    mkRoute<ReactionGroupID, BookID>(['group', ':groupID', ':bookID']);

  export const inviteGroup: Route2<ReactionGroupID, BookID> =
    mkRoute<ReactionGroupID, BookID>(['group', ':groupID', ':bookID', 'inviteGroup']);

  export const noContactsAccess: Route0 =
    mkRoute(['noContactsAccess']);

  export const notifications: Route0 =
    mkRoute(['notifications']);

  export const account: Route0 =
    mkRoute(['account']);

  export const notify: Route0 =
    mkRoute(['notify']);

  export const activity: Route0 =
    mkRoute(['activity']);

  export const contacts: Route0 =
    mkRoute(['contacts']);
}

export namespace Legacy3 {
  export const author1: Route1<DistributionID> =
    mkRoute<DistributionID>(['reader', 'author', ':distributionID']);

  export const author2: Route2<DistributionID, SkuID> =
    mkRoute<DistributionID, SkuID>(['reader', 'author', ':distributionID', ':skuID']);

  export const author3: Route3<DistributionID, SkuID, ReactionGroupID> =
    mkRoute<DistributionID, SkuID, ReactionGroupID>(['reader', 'author', ':distributionID', ':skuID', ':reactionGroupID']);

  export const skuPage: Route2<DistributionID, SkuID> =
    mkRoute<DistributionID, SkuID>(['reader', 'skuInfo', ':distributionID', ':skuID']);

  export const skuPageWithGroup: Route3<DistributionID, SkuID, ReactionGroupID> =
    mkRoute<DistributionID, SkuID, ReactionGroupID>(['reader', 'skuInfo', ':distributionID', ':skuID', ':reactionGroupID']);
}
