/**
* Copyright 2016-present Ampersand Technologies, Inc.
*/

import * as DataStore from 'overlib/shared/dataStore';
import * as Types from 'overlib/shared/types';


const gReaderAppStateSchema = {
  navTitle: Types.STRING,
  backButtonOverride: Types.STRING_NULLABLE,
  stripeLoaded: Types.BOOL,
  bookID: Types.STRING,
  subSkuReferrer: Types.STRING_NULLABLE,
};

DataStore.registerDataStore(module, 'ReaderAppState', {
  schema: gReaderAppStateSchema,
  allowSubobjectCreate: true,
});


DataStore.registerDataStore(module, 'ReaderLocalState', {
  schema: {
    bookID: Types.STRING,
    reactionGroupID: Types.STRING, // deprecated?
  },
  persistType: 'local',
});
