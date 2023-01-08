/**
* Copyright 2015-present Ampersand Technologies, Inc.
*/

import * as Sketch from 'overlib/shared/sketch';
import * as Types from 'overlib/shared/types';


const verticalReaderSettings = Sketch.definePersonalTable('vrsettings', {
  limitScrolling: Types.withDefaultValue(Types.BOOL, true),
  verticalScrollArea: Types.withDefaultValue(Types.SHORTSTR, 'yes'),
  showPerfGraph: Types.withDefaultValue(Types.BOOL, false),
  fontSize: Types.withDefaultValue(Types.SHORTSTR, 'medium'),
  viewedFTE: Types.withDefaultValue(Types.BOOL, false),
  showedTutorial: Types.withDefaultValue(Types.BOOL, false),
  readerColor: Types.withDefaultValue(Types.INT, 0), // deprecated
  tapPageZonesEnabled: Types.withDefaultValue(Types.BOOL, true),
  tapPageZonesDisabled: Types.withDefaultValue(Types.BOOL, true), // disabled wins! @cory
  oneHandTapZones: Types.withDefaultValue(Types.BOOL, false),
  tapZoneForward: {
    posX: Types.withDefaultValue(Types.NUMBER, 1),
    posY: Types.withDefaultValue(Types.NUMBER, 0.6),
    width: Types.withDefaultValue(Types.NUMBER, 20),
    height: Types.withDefaultValue(Types.NUMBER, 20),
  },
  tapZoneBack: {
    posX: Types.withDefaultValue(Types.NUMBER, 1),
    posY: Types.withDefaultValue(Types.NUMBER, 0.5),
    width: Types.withDefaultValue(Types.NUMBER, 20),
    height: Types.withDefaultValue(Types.NUMBER, 20),
  },
  activeBookID: Types.IDSTR_NULLABLE,
});

Sketch.defineAction('vrsettings.setViewedFTE', actionSetViewedFTE, {
  supersedeBy: [],
  paramTypes: {
    viewedFTE: Types.BOOL,
  },
});
function actionSetViewedFTE(ctx: Context, viewedFTE: boolean, cb: ErrDataCB<any>) {
  Sketch.updateClientData(ctx, ['vrsettings', 'viewedFTE'], viewedFTE, cb);
}

Sketch.defineAction('vrsettings.setShowedTutorial', actionSetShowedTutorial, {
  supersedeBy: [],
  paramTypes: {
    showedTutorial: Types.BOOL,
  },
});
function actionSetShowedTutorial(ctx: Context, showedTutorial: boolean, cb: ErrDataCB<any>) {
  Sketch.updateClientData(ctx, ['vrsettings', 'showedTutorial'], showedTutorial, cb);
}

Sketch.defineAction('vrsettings.setActiveBookID', actionSetActiveBookID, {
  paramTypes: {
    activeBookID: Types.IDSTR_NULLABLE,
  },
});
function actionSetActiveBookID(ctx: Context, activeBookID: string|null, cb: ErrDataCB<any>) {
  Sketch.updateClientData(ctx, ['vrsettings', 'activeBookID'], activeBookID, cb);
}

Sketch.defineAction('vrsettings.setTapZonesEnabled', actionSetTapZonesEnabled, {
  supersedeBy: [],
  paramTypes: {
    tapZonesEnabled: Types.BOOL,
  },
});
function actionSetTapZonesEnabled(ctx: Context, tapZonesEnabled: boolean, cb: ErrDataCB<any>) {
  Sketch.updateClientData(ctx, ['vrsettings', 'tapPageZonesEnabled'], tapZonesEnabled, cb);
}

Sketch.defineAction('vrsettings.setTapZonesDisabled', actionSetTapZonesDisabled, {
  supersedeBy: [],
  paramTypes: {
    tapZonesDisabled: Types.BOOL,
  },
});
function actionSetTapZonesDisabled(ctx: Context, tapZonesDisabled: boolean, cb: ErrDataCB<any>) {
  Sketch.updateClientData(ctx, ['vrsettings', 'tapPageZonesDisabled'], tapZonesDisabled, cb);
}

Sketch.defineAction('vrsettings.setOneHandTapZonesEnabled', actionSetOneHandTapZonesEnabled, {
  supersedeBy: [],
  paramTypes: {
    oneHandTapZones: Types.BOOL,
  },
});
function actionSetOneHandTapZonesEnabled(ctx: Context, oneHandTapZones: boolean, cb: ErrDataCB<any>) {
  Sketch.updateClientData(ctx, ['vrsettings', 'oneHandTapZones'], oneHandTapZones, cb);
}

Sketch.defineAction('vrsettings.setTapZoneForward', actionSetTapZoneForward, {
  supersedeBy: [],
  paramTypes: {
    settings: Types.OBJECT,
  },
});
function actionSetTapZoneForward(ctx: Context, settings: Stash, cb: ErrDataCB<any>) {
  Sketch.updateClientData(ctx, ['vrsettings', 'tapZoneForward'], settings, cb);
}

Sketch.defineAction('vrsettings.setTapZoneBack', actionSetTapZoneBack, {
  supersedeBy: [],
  paramTypes: {
    settings: Types.OBJECT,
  },
});
function actionSetTapZoneBack(ctx: Context, settings: Stash, cb: ErrDataCB<any>) {
  Sketch.updateClientData(ctx, ['vrsettings', 'tapZoneBack'], settings, cb);
}

Sketch.defineAction('vrsettings.setReaderColor', actionSetReaderColor, {
  _deprecated: true,
  supersedeBy: [],
  paramTypes: {
    readerColor: Types.INT,
  },
});
function actionSetReaderColor(_ctx: Context, _readerColor: number, cb: ErrDataCB<any>) {
  cb();
}

Sketch.defineAction('vrsettings.setLimitScrolling', actionSetLimitScrolling, {
  supersedeBy: [],
  paramTypes: {
    limitScrolling: Types.BOOL,
  },
});
function actionSetLimitScrolling(ctx: Context, limitScrolling: boolean, cb: ErrDataCB<any>) {
  Sketch.updateClientData(ctx, ['vrsettings', 'limitScrolling'], limitScrolling, cb);
}

Sketch.defineAction('vrsettings.setVerticalScrollArea', actionSetVerticalScrollArea, {
  supersedeBy: [],
  paramTypes: {
    verticalScrollArea: Types.SHORTSTR,
  },
});
function actionSetVerticalScrollArea(ctx: Context, verticalScrollArea: string, cb: ErrDataCB<any>) {
  Sketch.updateClientData(ctx, ['vrsettings', 'verticalScrollArea'], verticalScrollArea, cb);
}

Sketch.defineAction('vrsettings.setShowPerfGraph', actionSetShowPerfGraph, {
  supersedeBy: [],
  paramTypes: {
    showPerfGraph: Types.BOOL,
  },
});
function actionSetShowPerfGraph(ctx: Context, showPerfGraph: boolean, cb: ErrDataCB<any>) {
  Sketch.updateClientData(ctx, ['vrsettings', 'showPerfGraph'], showPerfGraph, cb);
}

Sketch.defineAction('vrsettings.setFontSize', actionSetFontSize, {
  supersedeBy: [],
  paramTypes: {
    fontSize: Types.SHORTSTR,
  },
});
function actionSetFontSize(ctx: Context, fontSize: string, cb: ErrDataCB<any>) {
  Sketch.updateClientData(ctx, ['vrsettings', 'fontSize'], fontSize, cb);
}


export function getSchema() {
  return verticalReaderSettings.getSchema();
}
