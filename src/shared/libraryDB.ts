/**
* Copyright 2016-present Ampersand Technologies, Inc.
*/

import * as Sketch from 'overlib/shared/sketch';
import * as Types from 'overlib/shared/types';

// keyed off of distributionID
const libraryDB = Sketch.definePersonalTable('library', Sketch.MAP({
  content: Sketch.MAP({
    dateAcquired: Types.TIME,
    skuID: Types.IDSTR,
    preview: Types.BOOL,

    // only set for private shares:
    name: Types.SHORTSTR,
    versionID: Types.IDSTR,
    modTime: Types.NUMBER,
  }),
}));


export function getSchema() {
  return libraryDB.getSchema();
}
