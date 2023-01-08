/**
 * Copyright 2014-present Ampersand Technologies, Inc.
 *
 *
 */
'use strict';

var ZeroMain = appRequire('clientjs/zero/main.js');

ZeroMain.main('moriMain', function() {
  // make sure DataStores get registered
  appRequire('clientjs/clientSettings');
  appRequire('clientjs/imageTools');

  return appRequire('clientjs/components/Reader.tsx');
});

exports.getIpcSchema = ZeroMain.getIpcSchema;
