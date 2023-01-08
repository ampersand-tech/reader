/**
* Copyright 2014-present Ampersand Technologies, Inc.
*/

import * as DBUtil from 'clientjs/dbUtil';
import * as Paragraph from 'clientjs/shared/paragraph';
import { Modifiers, WidgetTypes } from 'clientjs/shared/paragraphTypes';

let fixupCount = 0;

export function fixupImg2ModifiersInternal(p, imageId, el, cb) {
  const mods = p.modifiers;
  for (let m = 0; m < mods.length; m++) {
    if ((mods[m].type === Modifiers.IMG2 || mods[m].type === Modifiers.WIDGET) && mods[m].data.id === imageId) {
      mods[m].data.w = el.width;
      mods[m].data.h = el.height;
      fixupCount--;
    }
  }
  if (fixupCount === 0) {
    cb && cb();
  }
}

export function removeImg2FromParaInternal(p, id, cb) {
  const mods = p.modifiers;
  let m = p.modifiers.length;
  while (m--) {
    if (mods[m] && (mods[m].type === Modifiers.IMG2 || mods[m].type === Modifiers.WIDGET) && mods[m].data.id === id) {
      Paragraph.removeContent(p, mods[m].start, mods[m].end);
      fixupCount--;
      break;
    }
  }
  if (fixupCount === 0) {
    cb && cb();
  }
}

export function getImg2DimensionsInternal(p, imageId, url, fixupFunc, doneCB, delFunc, errCB) {
  const img = document.createElement('img');
  if (url.charAt(0) !== '/') {
    // external url, make sure not to send cookies so browser security will let us resize the image
    img.crossOrigin = 'Anonymous';
  }
  img.src = url;
  img.onload = fixupFunc.bind(null, p, imageId, img, doneCB);
  img.onerror = (function() {
    delFunc(p, imageId, doneCB);
    errCB && errCB(null, url);
  });
}

export function checkImg2DimensionsInternal(p, fixupFunc, doneCB, delFunc, errCB?) {
  const mods = p.modifiers;
  for (let m = 0; m < mods.length; m++) {
    if ((mods[m].type === Modifiers.IMG2 || (mods[m].type === Modifiers.WIDGET && mods[m].data.widget === WidgetTypes.IMG)) && !mods[m].data.id) {
      fixupCount++;
      mods[m].data.id = DBUtil.uuid();
      getImg2DimensionsInternal(p, mods[m].data.id, mods[m].data.url, fixupFunc, doneCB, delFunc, errCB);
    }
  }
  return p;
}

export function clearFixupCount() {
  fixupCount = 0;
}

export function getFixupCount() {
  return fixupCount;
}







