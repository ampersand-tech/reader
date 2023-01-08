/**
 * Copyright 2016-present Ampersand Technologies, Inc.
 *
 */

import * as CmsDataDB from 'clientjs/shared/cmsDataDB';
import * as Constants from 'clientjs/shared/constants';
import * as Jobs from 'overlib/shared/jobs';
import * as Perms from 'overlib/shared/perms';
import * as Sketch from 'overlib/shared/sketch';
import * as Types from 'overlib/shared/types';
import * as Util from 'overlib/shared/util';

// Add to this tag list to support new tags. May eventually be data driven, but for now, just a hardcoded stash
export const skuTags: StashOf<string> = {
  BOOKCON: 'bookCon',
  BOOKCON_LIVE: 'bookConLive',
  AMP_EDITION: 'ampEdition',
  CLASSIC: 'classic',
  HIDDEN: 'hidden',
};

export interface PostSchema {
  templateID: string;

  postTime: number;
  modTime: number;

  name: string;
  sticky: boolean;
  feedType: Constants.PostFeedType;
  hasNotification: boolean;

  personaID: string;

  contentBlob: string;

  labels: StashOf<{createdBy: string}>;
}
let POST_SCHEMA = {
  modTime: Types.TIME,

  templateID: Types.SHORTSTR,

  postTime: Types.TIME,
  name: Types.LONGSTR,
  sticky: Types.BOOL_NULLABLE,
  feedType: Types.createEnum('POST_FEED_TYPE', Constants.POST_FEED_TYPE),
  hasNotification: Types.BOOL,

  personaID: Types.IDSTR,

  contentBlob: Types.LONGSTR_NULLABLE, // if non-null, this is a new, template 2.0 type post

  labels: Sketch.MAP({
    createdBy: Types.ACCOUNTIDSTR,
  }),
};

export interface GlobalSkuSchema {
  id: string;

  contentCount: number;
  pageCount: number;

  title: string;
  description?: string;
  coverStore?: string;
  price: number; // in pennies
  personaID: string;
  skuType: Constants.ContentType;
  tags: StashOf<{tag: string}>;
  order?: number;
}

const GLOBAL_SKU_SCHEMA = {
  id: Types.IDSTR,

  contentCount: Types.INT,
  pageCount: Types.INT,

  title: Types.SHORTSTR,
  description: Types.LONGSTR_NULLABLE,
  coverStore: Types.SHORTSTR_NULLABLE,
  price: Types.INT, // in pennies
  personaID: Types.IDSTR,
  skuType: Types.createEnum('CONTENT_TYPE', Constants.CONTENT_TYPE),
  tags: Sketch.MAP({
    tag: Types.SHORTSTR,
  }),
  order: Types.NUMBER_NULLABLE,

  _deprecated: {
    priceSplitTest: Types.SHORTSTR_NULLABLE,
  },
};

function genSkuSchema(forSource: boolean) {
  const SKU_SCHEMA = {
    id: Types.IDSTR,

    modTime: Types.TIME,

    // Current metadata
    title: Types.SHORTSTR,
    subtitle: Types.SHORTSTR_NULLABLE,
    headline: Types.SHORTSTR_NULLABLE,
    description: Types.LONGSTR_NULLABLE,
    coverStore: Types.SHORTSTR_NULLABLE,
    bookBG: Types.SHORTSTR_NULLABLE,
    headerBG: Types.SHORTSTR_NULLABLE,
    headerColor: Types.SHORTSTR_NULLABLE,
    price: Types.INT, // in pennies
    isFullCover: Types.BOOL,
    personaID: Types.IDSTR,
    order: Types.NUMBER_NULLABLE,

    // determined by content type of first content piece
    skuType: Types.createEnum('CONTENT_TYPE', Constants.CONTENT_TYPE),

    templateID: Types.SHORTSTR_NULLABLE,
    templateContent: Types.LONGSTR_NULLABLE,

    content: Sketch.MAP({
      id: Types.IDSTR,
      order: Types.INT,
      templateID: Types.SHORTSTR_NULLABLE,
      templateContent: Types.LONGSTR_NULLABLE,
    }),

    parentSkuID: Types.IDSTR_NULLABLE,
    childSkus: Sketch.MAP({
      id: Types.IDSTR,
    }),

    labels: Sketch.MAP({
      createdBy: Types.ACCOUNTIDSTR,
    }),

    tags: Sketch.MAP({
      tag: Types.SHORTSTR,
    }),

    _server: {
      discountCodes: Sketch.MAP({
        price: Types.INT, // in pennies
      }),
    },

    _deprecated: {
      priceSplitTest: Types.SHORTSTR_NULLABLE,
    },
  };

  if (forSource) {
    // server-only fields are only server-only in the published version
    Util.copyFields(SKU_SCHEMA._server, SKU_SCHEMA);
    delete SKU_SCHEMA._server;
  }

  return SKU_SCHEMA;
}

export interface SkuSchema {
  id: Constants.SkuID;

  modTime: number;

  // Current metadata
  title: string;
  headline?: string;
  subtitle?: string;
  description?: string;
  coverStore?: string;
  bookBG?: string;
  headerBG?: string;
  headerColor?: string;
  price: number;
  isFullCover: boolean;
  personaID: string;
  order?: number;

  skuType: Constants.ContentType;

  templateID?: string;
  templateContent?: string;

  content: StashOf<{
    id: Constants.ContentItemID;
    order: number;
    templateID?: string;
    templateContent?: string;
  }>;

  parentSkuID?: Constants.SkuID;
  childSkus: StashOf<{
    id: Constants.SkuID;
  }>;

  labels: StashOf<{createdBy: string}>;
  tags: StashOf<{tag: string}>;

  discountCodes: StashOf<{
    price: number;
  }>;
}

export interface MetadataSchema {
  name: string;
  tagline: string;
  personaID: string;
  discoverImage: string;
  channelTabImage: string;
  modTime: number;
  comingSoon: boolean;
  displayOrder: number;
  hideAuthorTab: boolean;
  primaryColor: string;
  countryCodeWhiteList: string;
}
const METADATA_SCHEMA = {
  name: Types.SHORTSTR,
  tagline: Types.SHORTSTR,
  personaID: Types.IDSTR, // default persona for the channel, optional
  channelTabImage: Types.SHORTSTR,
  discoverImage: Types.SHORTSTR,
  modTime: Types.TIME,
  comingSoon: Types.BOOL,
  displayOrder: Types.NUMBER,
  hideAuthorTab: Types.BOOL,
  primaryColor: Types.SHORTSTR,
  countryCodeWhiteList: Types.LONGSTR,
  _deprecated: {
    aboutStr: Types.LONGSTR,
    channelNameSVG: Types.SHORTSTR,
  },
};

export interface DistributionSource {
  editors: StashOf<{
    permLevel: Constants.PersonaPermLevels;
  }>;
  previewID: Constants.DistributionID;

  isHidden: boolean;
  isNotActive: boolean;
  previewIsActive: boolean;
  isGlobalVisible: boolean;

  metaData: MetadataSchema;

  posts: StashOf<PostSchema>;
  skus: StashOf<SkuSchema>;
  items: StashOf<{
    createTime: number;
  }>;
  labels: StashOf<{
    labelName: string;
  }>;
}

const distributionSource = Sketch.defineSharedTable('distributionSource', Sketch.MAP({
  _tableOptions: {
    perms: [ Perms.adminOnly ],
  },

  editors: Sketch.EACH_MEMBER({
    permLevel: Types.createEnum('PERSONA_PERM_LEVEL', Constants.PERSONA_PERM_LEVELS),
  }),
  previewID: Types.IDSTR_NULLABLE,

  isHidden: Types.BOOL,
  isNotActive: Types.BOOL,
  previewIsActive: Types.BOOL,
  isGlobalVisible: Types.BOOL,

  metaData: METADATA_SCHEMA,

  posts: Sketch.MAP(POST_SCHEMA),
  skus: Sketch.MAP(genSkuSchema(true)),
  items: Sketch.MAP({
    createTime: Types.TIME,
  }), // TODO: proper schema?

  labels: Sketch.MAP({
    labelName: Types.SHORTSTR,
  }),
}));

export interface DistributionDest {
  type: Constants.ContentDistributionType;
  metaData: MetadataSchema;
  items: StashOf<CmsDataDB.ReleasedItemSchema>;
  posts: StashOf<PostSchema>;
  skus: StashOf<SkuSchema>;
}

const DISTRIBUTION_TYPE = Types.createEnum('DISTRIBUTION_TYPE', Constants.CONTENT_DISTRIBUTION_TYPE);

Sketch.defineSubscriptionTable('distributions', Sketch.MAP({
  type: DISTRIBUTION_TYPE,
  metaData: METADATA_SCHEMA,
  items: Sketch.MAP(CmsDataDB.RELEASED_ITEM_SCHEMA),
  posts: Sketch.MAP(POST_SCHEMA),
  skus: Sketch.MAP(genSkuSchema(false)),
}));

Sketch.defineGlobalTable('distributionGlobal', Sketch.MAP({
  metaData: METADATA_SCHEMA,
  skus: Sketch.MAP(GLOBAL_SKU_SCHEMA),
}));


export function isEditor(ctx: Context, distributionID: Constants.DistributionID, cb: ErrDataCB<boolean>) {
  Sketch.getClientData(ctx, ['distributionSource', distributionID, 'editors', ctx.user.id, 'permLevel'], null, function(err, permLevel) {
    if (err) {
      return cb(err);
    }

    if (permLevel !== Constants.PERSONA_PERM_LEVELS.EDITOR) {
      return cb(new Error('not allowed'));
    }

    return cb(null, true);
  });
}

/*
 METADATA
*/

function createPreviewData(ctx: Context, previewID: Constants.DistributionID, name: string, personaID: string, modTime: number): DistributionDest {
  let previewPath = ['distributions', previewID];
  const previewData = Sketch.clientDataForCreate(ctx, previewPath);
  previewData.type = Constants.CONTENT_DISTRIBUTION_TYPE.PREVIEW;
  previewData.metaData.name = name;
  previewData.metaData.personaID = personaID;
  previewData.metaData.modTime = modTime;
  return previewData;
}

Sketch.defineAction('distribution.create', actionCreateDistribution, {
  perms: [ Perms.adminOnly ],
  paramTypes: {
    name: Types.SHORTSTR,
    personaID: Types.IDSTR,
  },
});
function actionCreateDistribution(ctx: Context, name: string, personaID: string, cb: ErrDataCB<string>) {
  let distributionID = Sketch.clientUUID(ctx, 'distributionID');
  let srcPath = ['distributionSource', distributionID];
  let srcData = Sketch.clientDataForCreate(ctx, srcPath);
  const createTime = Sketch.clientTime(ctx);
  srcData.metaData.name = name;
  srcData.metaData.personaID = personaID;
  srcData.editors[ctx.user.id].permLevel = Constants.PERSONA_PERM_LEVELS.EDITOR;
  srcData.metaData.modTime = createTime;

  let dstPath = ['distributions', distributionID];
  let dstData = Sketch.clientDataForCreate(ctx, dstPath);
  dstData.metaData.name = name;
  dstData.metaData.personaID = personaID;
  dstData.metaData.modTime = createTime;

  let previewID = Sketch.clientUUID(ctx, 'previewID') as Constants.DistributionID;
  srcData.previewID = previewID;
  srcData.previewIsActive = true;
  let previewPath = ['distributions', previewID];
  let previewData = createPreviewData(ctx, previewID, name, personaID, createTime);

  let jobs = new Jobs.Queue();
  jobs.add(Sketch.insertClientData, ctx, srcPath, srcData);
  jobs.add(Sketch.insertClientData, ctx, dstPath, dstData);
  jobs.add(Sketch.insertClientData, ctx, previewPath, previewData);
  jobs.drain(function(err) {
    cb(err, distributionID);
  });
}

export const createPreviewDistribution = Sketch.defineAction('distribution.createPreview', actionCreatePreviewDistribution, {
  perms: [ Perms.adminOnly, isEditor ],
  paramTypes: {
    distributionID: Types.IDSTR,
  },
});
function actionCreatePreviewDistribution(ctx: Context, distributionID: Constants.DistributionID, cb: ErrDataCB</*previewID*/string>) {
  const jobs = new Jobs.Queue();
  jobs.collate('previewID', Sketch.getClientData, ctx, ['distributionSource', distributionID, 'previewID'], '*');
  jobs.collate('metaData', Sketch.getClientData, ctx, ['distributionSource', distributionID, 'metaData'], {name: 1, personaID: 1, modTime: 1});
  jobs.drain((err1, res) => {
    if (err1) {
      return cb(err1);
    }
    if (res.previewID) {
      return cb('already has preview distribution');
    }
    const previewID = Sketch.clientUUID(ctx, 'previewID') as Constants.DistributionID;
    let previewData = createPreviewData(ctx, previewID, res.metaData.name, res.metaData.personaID, res.metaData.modTime);
    const jobs2 = new Jobs.Queue();
    jobs2.add(Sketch.updateClientData, ctx, ['distributionSource', distributionID, 'previewID'], previewID);
    jobs2.add(Sketch.insertClientData, ctx, ['distributions', previewID], previewData);
    jobs2.drain(err2 => {
      cb(err2, previewID);
    });
  });
}

export const updateMetaData = Sketch.defineAction('distribution.updateMetaData', actionUpdateSetDistributionMetaData, {
  perms: [ Perms.adminOnly, isEditor ],
  paramTypes: {
    distributionID: Types.IDSTR,
    metaData: {
      name: Types.SHORTSTR_NULLABLE,
      tagline: Types.SHORTSTR_NULLABLE,
      personaID: Types.IDSTR_NULLABLE,
      channelTabImage: Types.SHORTSTR_NULLABLE,
      discoverImage: Types.SHORTSTR_NULLABLE,
      comingSoon: Types.BOOL_NULLABLE,
      primaryColor: Types.SHORTSTR_NULLABLE,
      displayOrder: Types.NUMBER_NULLABLE,
      hideAuthorTab: Types.BOOL_NULLABLE,
      countryCodeWhiteList: Types.LONGSTR_NULLABLE,
    },
  },
});
function actionUpdateSetDistributionMetaData(ctx, distributionID, metaData, cb) {
  metaData.modTime = Sketch.clientTime(ctx);
  Sketch.updateClientData(ctx, ['distributionSource', distributionID, 'metaData'], metaData, cb);
}

Sketch.defineAction('distribution.hide', actionHideDistribution, {
  perms: [ Perms.adminOnly, isEditor ],
  paramTypes: {
    distributionID: Types.IDSTR,
  },
});
function actionHideDistribution(ctx: Context, distributionID: string, cb: ErrDataCB<any>) {
  Sketch.updateClientData(ctx, ['distributionSource', distributionID, 'isHidden'], true, cb);
}

Sketch.defineAction('distribution.unhide', actionUnhideDistribution, {
  perms: [ Perms.adminOnly, isEditor ],
  paramTypes: {
    distributionID: Types.IDSTR,
  },
});
function actionUnhideDistribution(ctx: Context, distributionID: string, cb: ErrDataCB<any>) {
  Sketch.updateClientData(ctx, ['distributionSource', distributionID, 'isHidden'], false, cb);
}


/*
 POSTS
*/

Sketch.defineAction('distribution.post.create', actionCreatePost, {
  perms: [ Perms.adminOnly, isEditor ],
  paramTypes: {
    distributionID: Types.IDSTR,
    personaID: Types.IDSTR,
    templateID: Types.SHORTSTR,
    name: Types.LONGSTR_NULLABLE,
  },
});
function actionCreatePost(ctx, distributionID, personaID, templateID, name, cb) {
  const newPostID = Sketch.clientUUID(ctx, 'postID');
  const postPath = ['distributionSource', distributionID, 'posts', newPostID];

  const newPost = Sketch.clientDataForCreate(ctx, postPath);
  const postTime = Sketch.clientTime(ctx);
  newPost.templateID = templateID;
  newPost.personaID = personaID;
  newPost.postTime = postTime;
  newPost.name = name || 'New Post';
  newPost.modTime = postTime;
  newPost.sticky = false;
  newPost.contentBlob = '{}';

  Sketch.insertClientData(ctx, postPath, newPost, function(err) {
    cb(err, newPostID);
  });
}

Sketch.defineAction('distribution.unpublishChannel', actionUnpublishChannel, {
  perms: [ Perms.adminOnly, isEditor ],
  paramTypes: {
    distributionID: Types.IDSTR,
  },
  _deprecated: true,
});
function actionUnpublishChannel(_ctx: Context, _distributionID: string, cb: ErrDataCB<any>) {
  cb('deprecated');
}

Sketch.defineAction('distribution.unpublishPreview', actionUnpublishPreview, {
  perms: [ Perms.adminOnly, isEditor ],
  paramTypes: {
    distributionID: Types.IDSTR,
  },
});
function actionUnpublishPreview(ctx, distributionID, cb) {
  Sketch.getClientData(ctx, ['distributionSource', distributionID, 'previewID'], null, function(err, previewID) {
    if (err) {
      cb(err);
      return;
    }
    const jobs = new Jobs.Queue();
    jobs.add(Sketch.removeClientDataIfExists, ctx, ['distributions', previewID]);
    jobs.add(Sketch.updateClientData, ctx, ['distributionSource', distributionID], {previewIsActive: false});

    jobs.drain(cb);
  });
}

const METADATA_MASK = Util.objectMakeImmutable({
  name: 1,
  personaID: 1,
  modTime: 1,
});

Sketch.defineAction('distribution.republishChannel', actionRepublishChannel, {
  perms: [ Perms.adminOnly, isEditor ],
  paramTypes: {
    distributionID: Types.IDSTR,
  },
});
function actionRepublishChannel(ctx: Context, distributionID: string, cb: ErrDataCB<string>) {
  Sketch.getClientData(ctx, ['distributionSource', distributionID, 'metaData'], METADATA_MASK, function(err, metaData) {
    if (err) {
      cb(err);
      return;
    }
    const dstPath = ['distributions', distributionID];
    const dstData = Sketch.clientDataForCreate(ctx, dstPath);
    dstData.metaData.name = metaData.name;
    dstData.metaData.personaID = metaData.personaID;
    dstData.metaData.modTime = metaData.modTime;
    const jobs = new Jobs.Queue();
    jobs.add(Sketch.insertClientData, ctx, dstPath, dstData);
    jobs.add(Sketch.updateClientData, ctx, ['distributionSource', distributionID, 'isNotActive'], false);
    jobs.drain(function(err2) {
      cb(err2, distributionID);
    });
  });
}

Sketch.defineAction('distribution.republishPreview', actionRepublishPreview, {
  perms: [ Perms.adminOnly, isEditor ],
  paramTypes: {
    distributionID: Types.IDSTR,
  },
});
function actionRepublishPreview(ctx, distributionID, cb) {
  const jobs = new Jobs.Queue();
  jobs.collate('metaData', Sketch.getClientData, ctx, ['distributionSource', distributionID, 'metaData'], METADATA_MASK);
  jobs.collate('previewID', Sketch.getClientData, ctx, ['distributionSource', distributionID, 'previewID'], null);
  jobs.drain(function(err, res) {
    if (err) {
      cb(err);
      return;
    }
    if (!res.previewID) {
      actionCreatePreviewDistribution(ctx, distributionID, cb);
      return;
    }
    const jobs2 = new Jobs.Queue();
    const metaData = res.metaData;
    const dstPath = ['distributions', res.previewID];
    const dstData = Sketch.clientDataForCreate(ctx, dstPath);
    dstData.type = Constants.CONTENT_DISTRIBUTION_TYPE.PREVIEW;
    dstData.metaData.name = metaData.name;
    dstData.metaData.personaID = metaData.personaID;
    dstData.metaData.modTime = metaData.modTime;

    jobs2.add(Sketch.insertClientData, ctx, dstPath, dstData);
    jobs2.add(Sketch.updateClientData, ctx, ['distributionSource', distributionID], {previewIsActive: true});
    jobs2.drain(function(err2) {
      if (err2) {
        cb(err2);
        return;
      }
      cb(null, distributionID);
    });
  });
}

Sketch.defineAction('distribution.post.delete', actionDeletePost, {
  perms: [ Perms.adminOnly, isEditor ],
  paramTypes: {
    distributionID: Types.IDSTR,
    postID: Types.IDSTR,
  },
});
function actionDeletePost(ctx, distributionID, postID, cb) {
  let jobs = new Jobs.Queue();

  jobs.add(Sketch.removeClientDataIfExists, ctx, ['distributionSource', distributionID, 'posts', postID]);
  jobs.add(Sketch.removeClientDataIfExists, ctx, ['distributions', distributionID, 'posts', postID]);

  jobs.drain(cb);
}

Sketch.defineAction('distribution.post.update', actionUpdatePost, {
  perms: [ Perms.adminOnly, isEditor ],
  paramTypes: {
    distributionID: Types.IDSTR,
    postID: Types.IDSTR,
    changes: {
      templateID: Types.SHORTSTR_NULLABLE,
      personaID: Types.IDSTR_NULLABLE,
      name: Types.LONGSTR_NULLABLE,
      postTime: Types.TIME_NULLABLE,
      contentBlob: Types.LONGSTR_NULLABLE,
      sticky: Types.BOOL_NULLABLE,
      feedType: Types.createEnum('POST_FEED_TYPE', Constants.POST_FEED_TYPE, true),
      labels: Types.OBJECT_NULLABLE,
    },
  },
});
function actionUpdatePost(ctx, distributionID, postID, changes, cb) {
  let path = ['distributionSource', distributionID, 'posts', postID];

  let jobs = new Jobs.Queue();

  changes.modTime = Sketch.clientTime(ctx);
  if (changes.labels) {
    jobs.add(Sketch.replaceClientData, ctx, path.concat('labels'), changes.labels);
    delete changes.labels;
  }
  jobs.add(Sketch.updateClientData, ctx, path, changes);

  jobs.drain(cb);
}

/*
 SKUS
*/

Sketch.defineAction('distribution.sku.create', actionCreateSku, {
  perms: [ Perms.adminOnly, isEditor ],
  paramTypes: {
    distributionID: Types.IDSTR,
    sku: Types.OBJECT,
  },
});
const CMS_CONTENT_MASK = Util.objectMakeImmutable({
  coverImageURL: 1,
  currentVersionID: 1,
  contentType: 1,
});
function actionCreateSku(ctx: Context, distributionID: Constants.DistributionID, sku: Partial<SkuSchema>, cb) {
  let skuID = Sketch.clientUUID(ctx, 'skuID');
  let skuPath = ['distributionSource', distributionID, 'skus', skuID];

  let newSku = Sketch.clientDataForCreate(ctx, skuPath) as SkuSchema;
  newSku.modTime = Sketch.clientTime(ctx);
  Util.copyFields(sku, newSku);

  let itemID;
  let currentVersionID;

  if (sku.content && Object.keys(sku.content).length > 0) {
    let order = Infinity;
    for (const iid in sku.content) {
      if (sku.content[iid] && sku.content[iid].order < order) {
        itemID = iid;
        order = sku.content[iid].order;
      }
    }
    Sketch.getClientData(ctx, ['cmsData', itemID], CMS_CONTENT_MASK, gotCmsItem);
  } else {
    finish();
  }

  function gotCmsItem(err, item: CmsDataDB.CMSItemSchema) {
    if (err) {
      return cb(err);
    }

    newSku.coverStore = item.coverImageURL;

    currentVersionID = item.currentVersionID;

    if (currentVersionID) {
      Sketch.getClientData(ctx, ['cmsData', itemID, 'versions', currentVersionID, 'description'], 1, gotDescription);
    } else {
      finish();
    }
  }

  function gotDescription(err, description: string) {
    if (err) {
      return cb(err);
    }

    newSku.description = description;
    finish();
  }

  function finish() {
    skuTypeFromContent(ctx, newSku, (_err, skuType: Constants.ContentType | null) => {
      if (skuType) {
        newSku.skuType = skuType;
      }
      Sketch.insertClientData(ctx, skuPath, newSku, function(err) {
        cb(err, skuID);
      });
    });
  }
}

export function createSKU(distributionID: string, sku: Partial<SkuSchema>): /*SKUID*/string|null {
  return Sketch.runAction('distribution.sku.create', distributionID, sku);
}

function skuTypeFromContent(ctx: Context, sku: Partial<SkuSchema>, cb: ErrDataCB<Constants.ContentType | null>) {
  let bestItemID: string|null = null;
  if (sku.content) {
    let bestOrder = Infinity;
    for (const iid in sku.content) {
      if (sku.content[iid] && sku.content[iid].order < bestOrder) {
        bestItemID = iid;
        bestOrder = sku.content[iid].order;
      }
    }
  }
  if (!bestItemID) {
    return cb(new Error('not found'));
  }
  Sketch.getClientData(ctx, ['cmsData', bestItemID], CMS_CONTENT_MASK, (err: Error, content) => {
    if (err) {
      return cb(err);
    }
    cb(null, content.contentType);
  });
}

function updateChildSkuBackpointers(ctx: Context, distributionID: string, parentSkuID: string, newChildSkus: Stash|undefined, cb: ErrDataCB<void>) {
  Sketch.getClientData(ctx, ['distributionSource', distributionID, 'skus', parentSkuID, 'childSkus'], Util.IDS_MASK, (_err, oldChildSkus) => {
    oldChildSkus = oldChildSkus || {};
    newChildSkus = newChildSkus || {};
    const removed = Util.objFindRHSOnlyKeys(newChildSkus, oldChildSkus);
    const added = Util.objFindRHSOnlyKeys(oldChildSkus, newChildSkus);

    const jobs = new Jobs.Queue();
    for (const skuID of removed) {
      jobs.add(Sketch.updateClientData, ctx, ['distributionSource', distributionID, 'skus', skuID, 'parentSkuID'], null);
    }
    for (const skuID of added) {
      jobs.add(Sketch.updateClientData, ctx, ['distributionSource', distributionID, 'skus', skuID, 'parentSkuID'], parentSkuID);
    }
    jobs.drain((err) => {
      cb(err);
    });
  });
}

Sketch.defineAction('distribution.sku.update', actionUpdateSku, {
  perms: [ Perms.adminOnly, isEditor ],
  paramTypes: {
    distributionID: Types.IDSTR,
    skuID: Types.IDSTR,
    sku: Types.OBJECT,
  },
});
function actionUpdateSku(ctx, distributionID, skuID, sku: Partial<SkuSchema>, cb) {
  sku.modTime = Sketch.clientTime(ctx);
  skuTypeFromContent(ctx, sku, (_err, skuType: Constants.ContentType|null) => {
    if (skuType) {
      sku.skuType = skuType;
    }
    updateChildSkuBackpointers(ctx, distributionID, skuID, sku.childSkus, (err) => {
      if (err) {
        return cb(err);
      }
      Sketch.replaceClientData(ctx, ['distributionSource', distributionID, 'skus', skuID], sku, cb);
    });
  });
}

export function updateSku(distributionID: Constants.DistributionID, skuID: Constants.SkuID, sku: Partial<SkuSchema>) {
  return Sketch.runAction('distribution.sku.update', distributionID, skuID, sku);
}

Sketch.defineAction('distribution.sku.delete', actionDeleteSku, {
  perms: [ Perms.adminOnly, isEditor ],
  paramTypes: {
    distributionID: Types.IDSTR,
    skuID: Types.IDSTR,
  },
});
function actionDeleteSku(ctx, distributionID, skuID, cb) {
  let jobs = new Jobs.Queue();
  jobs.add(Sketch.removeClientDataIfExists, ctx, ['distributionSource', distributionID, 'skus', skuID]);
  jobs.add(Sketch.removeClientDataIfExists, ctx, ['distributions', distributionID, 'skus', skuID]);
  jobs.drain(cb);
}

/*
 ITEMS
*/

Sketch.defineAction('distributionSource.addContentItems', actionAddContentItemsToDistribution, {
  perms: [ Perms.adminOnly, isEditor ],
  paramTypes: {
    distributionID: Types.IDSTR,
    items: Types.OBJECT,
  },
});
function actionAddContentItemsToDistribution(ctx: Context, distributionID: string, items: Stash, cb) {
  const jobs = new Jobs.Queue();
  for (const itemID in items) {
    const path = ['distributionSource', distributionID, 'items', itemID];
    const itemData = Sketch.clientDataForCreate(ctx, path);
    itemData.createTime = Sketch.clientTime(ctx);
    jobs.add(next => {
      Sketch.getClientData(ctx, path, 1, (err, data) => {
        if (err && !Util.isNotFound(err)) {
          next(err);
        }
        if (data) {
          next();
        }
        Sketch.insertClientData(ctx, path, itemData, next);
      });
    });
  }
  jobs.drain(cb);
}

Sketch.defineAction('distributionSource.addContentItem', actionAddContentItemToDistribution, {
  perms: [ Perms.adminOnly, isEditor ],
  paramTypes: {
    distributionID: Types.IDSTR,
    itemID: Types.IDSTR,
  },
});
function actionAddContentItemToDistribution(ctx: Context, distributionID: string, itemID: string, cb) {
  actionAddContentItemsToDistribution(ctx, distributionID, {[itemID]: 1}, cb);
}

Sketch.defineAction('distributionSource.removeItem', removeContentItem, {
  perms: [ Perms.adminOnly, isEditor ],
  paramTypes: {
    distributionID: Types.IDSTR,
    itemID: Types.IDSTR,
  },
});
function removeContentItem(ctx: Context, distributionID: string, itemID: string, cb: ErrDataCB<void>) {
  Sketch.removeClientData(ctx, ['distributionSource', distributionID, 'items', itemID], cb);
}

/*
 LABELS
*/
function getLabelPath(distributionID, labelID) {
  return ['distributionSource', distributionID, 'labels', labelID];
}
Sketch.defineAction('distribution.label.create', actionCreateLabel, {
  perms: [ Perms.adminOnly ],
  paramTypes: {
    distributionID: Types.IDSTR,
    labelName: Types.SHORTSTR,
  },
});
function actionCreateLabel(ctx, distributionID, labelName, cb) {
  const labelID = Sketch.clientUUID(ctx, 'labelID');
  const path = getLabelPath(distributionID, labelID);
  const label = Sketch.clientDataForCreate(ctx, path);
  label.labelName = labelName;

  Sketch.insertClientData(ctx, path, label, function(err) {
    if (err) {
      return cb(err);
    }
    cb(null, labelID);
  });
}

Sketch.defineAction('distribution.label.rename', actionRenameLabel, {
  perms: [ Perms.adminOnly ],
  paramTypes: {
    distributionID: Types.IDSTR,
    labelID: Types.IDSTR,
    labelName: Types.SHORTSTR,
  },
});
function actionRenameLabel(ctx, distributionID, labelID, labelName, cb) {
  Sketch.updateClientData(ctx, getLabelPath(distributionID, labelID), {labelName}, cb);
}

Sketch.defineAction('distribution.label.delete', actionDeleteLabel, {
  perms: [ Perms.adminOnly ],
  paramTypes: {
    distributionID: Types.IDSTR,
    labelID: Types.IDSTR,
  },
});
function actionDeleteLabel(ctx, distributionID, labelID, cb) {
  const jobs = new Jobs.Queue();
  jobs.collate('items', Sketch.getClientData, ctx, ['distributionSource', distributionID, 'items'], Util.IDS_MASK);
  jobs.collate('skus', Sketch.getClientData, ctx, ['distributionSource', distributionID, 'skus'], Util.IDS_MASK);
  jobs.collate('posts', Sketch.getClientData, ctx, ['distributionSource', distributionID, 'posts'], Util.IDS_MASK);
  jobs.drain(function(err, res) {
    if (err) { return cb(err); }
    const jobs2 = new Jobs.Queue();
    jobs2.add(Sketch.removeClientDataIfExists, ctx, getLabelPath(distributionID, labelID));
    for (const itemID in res.items) {
      jobs2.add(Sketch.removeClientDataIfExists, ctx, ['cmsData', itemID, 'labels', labelID]);
    }
    for (const skuID in res.skus) {
      jobs2.add(Sketch.removeClientDataIfExists, ctx, ['distributionSource', distributionID, 'skus', skuID, 'labels', labelID]);
    }
    for (const postID in res.posts) {
      jobs2.add(Sketch.removeClientDataIfExists, ctx, ['distributionSource', distributionID, 'skus', postID, 'labels', labelID]);
    }
    jobs2.drain(cb);
  });
}

/*
 OTHER
*/

Sketch.defineAction('distribution.item.removeOrphaned', actionDeleteOrphanedItem, {
  perms: [ Perms.adminOnly, isEditor ],
  paramTypes: {
    distributionID: Types.IDSTR,
    itemID: Types.IDSTR,
  },
});
function actionDeleteOrphanedItem(ctx, distributionID, itemID, cb) {
  Sketch.removeClientDataIfExists(ctx, ['distributions', distributionID, 'items', itemID], cb);
}

export function distributionSourcePath(channelID: Constants.DistributionID, skuID: Constants.SkuID, itemID?: Constants.ContentItemID) {
  const ret = ['distributionSource', channelID, 'skus', skuID];
  if (itemID) {
    ret.push('content');
    ret.push(itemID);
  }
  return ret;
}

export function getChannelItemsMembershipTable(): any {
  return distributionSource.sqlTables.sketchdistributionsourceitems;
}
