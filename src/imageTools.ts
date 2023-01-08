/**
* Copyright 2014-present Ampersand Technologies, Inc.
*/

import { uploadFile } from 'clientjs/uploadFile';
import * as Lib from 'overlib/client/imageToolsLib';
import * as Log from 'overlib/client/log';
import * as DataStore from 'overlib/shared/dataStore';

const gTempCache = {};

export function uploadCached(imageData: Lib.ImageData, draftID: string, cb: ErrDataCB<Lib.ImageURL>) {
  // look up in temp upload cache
  let cacheKey = draftID + ':' + (imageData.checksum || imageData.srcUrl) + '.' + imageData.fileType;
  if (gTempCache[cacheKey]) {
    return done(null, gTempCache[cacheKey]);
  }
  // look up in permanent upload cache
  if (!imageData.checksum) {
    uploadFile(imageData.blob, 'image', draftID, function(err, uploadedImageUrl) {
      return done(err, uploadedImageUrl);
    });
    return;
  }
  let cachedEntry = DataStore.getData(null, ['UploadedImages', cacheKey], '*');
  if (cachedEntry) {
    DataStore.updateData(['UploadedImages', cacheKey], { timestamp: Date.now() });
    let url = cachedEntry.url as string;
    cb(undefined, {url, w: cachedEntry.width, h: cachedEntry.height});
    return;
  }
  uploadFile(imageData.blob, 'image', draftID, function(err, uploadedImageUrl) {
    if (!err) {
      // store uploadedImageUrl in cache
      cachedEntry = {
        url: uploadedImageUrl,
        width: imageData.width,
        height: imageData.height,
        timestamp: Date.now(),
      };
      DataStore.upsertData(['UploadedImages', cacheKey], cachedEntry);
    }
    done(err, uploadedImageUrl);
  });

  function done(err, uploadedImageUrl) {
    gTempCache[cacheKey] = uploadedImageUrl;
    if (err) {
      return cb(err);
    }
    cb(undefined, {url: uploadedImageUrl, w: imageData.width, h: imageData.height});
  }
}

export function resizeAndUploadFile(file, draftID, maxEdgeSize, cb: ErrDataCB<Lib.ImageURL>) {
  Lib.loadToImageData(file, maxEdgeSize || 2048, function(err, imageData) {
    if (err || !imageData) {
      return cb(err || 'no imageData');
    }
    uploadCached(imageData, draftID, cb);
  });
}

export function resizeAndUploadImageElement(imgElm: HTMLImageElement, draftID, maxEdge, cb: ErrDataCB<Lib.ImageURL>) {
  let imageData = Lib.resizeAndOrient(imgElm, {exif: '', orientation: 0, checksum: 0}, 'paste', maxEdge);
  if (!imageData) {
    Log.error('@conor', 'resizaeAndUploadImageElement.noImageData', {draftID: draftID});
    return;
  }
  uploadCached(imageData, draftID, cb);
}

export * from 'overlib/client/imageToolsLib';
