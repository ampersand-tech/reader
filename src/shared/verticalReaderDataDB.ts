/**
* Copyright 2015-present Ampersand Technologies, Inc.
*/

import * as Jobs from 'overlib/shared/jobs';
import * as Sketch from 'overlib/shared/sketch';
import * as Types from 'overlib/shared/types';

const verticalReaderRangeSchema = {
  elID: Types.IDSTR,
  totalCharacters: Types.INT_NULLABLE,
  firstChar: Types.INT,
  lastChar: Types.INT,
  timestamp: Types.TIME_NULLABLE,
};

const marksSchema = {
  ranges: Sketch.MAP(verticalReaderRangeSchema),
  reactions: Sketch.MAP({ // key is type
    note: Types.LONGSTR,
    buddy: Types.LONGSTR,
  }),
  timestamp: Types.TIME,
  bookChecksum: Types.SHORTSTR,
};

const readingSpeedSchema: Types.Schema = {
  avgSpeed: Types.NUMBER,
  eventCount: Types.INT,
};

const vrDataDB = Sketch.definePersonalTable('vrdata', Sketch.MAP({
  positions: Sketch.MAP(verticalReaderRangeSchema),
  allCharCount: Types.INT,
  speed: readingSpeedSchema,
  _deprecated: {
    marks: Sketch.MAP(marksSchema),
    lastTrigger: Types.INT,
    lastQuestionTool: Types.INT,
  },
}));

export interface VerticalReaderRangeSchema {
  elID: string;
  totalCharacters: number | null;
  firstChar: number;
  lastChar: number;
  timestamp: number | null;
}

export interface VRData {
  positions: StashOf<VerticalReaderRangeSchema>;
  allCharCount: number;
  speed: {
    avgSpeed: number;
    eventCount: number;
  };
}

Sketch.defineAction('vrdata.create', actionCreateData, {
  paramTypes: {
    draftID: Types.IDSTR,
  },
});
function actionCreateData(ctx: Context, draftID: string, cb: ErrDataCB<any>) {
  const jobs = new Jobs.Queue();
  jobs.add(Sketch.initializeClientData, ctx, ['vrdata', draftID]);
  jobs.add(Sketch.initializeClientData, ctx, ['vrdata', draftID, 'positions', 'current']);
  jobs.add(Sketch.initializeClientData, ctx, ['vrdata', draftID, 'positions', 'max']);
  jobs.add(Sketch.initializeClientData, ctx, ['vrdata', draftID, 'positions', 'maxSeen']);
  jobs.add(Sketch.initializeClientData, ctx, ['vrdata', draftID, 'positions', 'currentWindow']);
  jobs.drain(cb);
}

Sketch.defineAction('vrdata.updateAvgSpeed', updateAvgSpeed, {
  supersedeBy: ['draftID'],
  paramTypes: {
    draftID: Types.IDSTR,
    eventCount: Types.INT,
    avgSpeed: Types.NUMBER,
  },
});
function updateAvgSpeed(
  ctx: Context,
  draftID: string,
  eventCount: number,
  avgSpeed: number,
  cb: ErrDataCB<any>,
) {
  Sketch.updateClientData(ctx, ['vrdata', draftID, 'speed'], {
    eventCount,
    avgSpeed,
  }, cb);
}

Sketch.defineAction('vrdata.setPosition', actionSetPosition, {
  supersedeBy: ['draftID', 'positionType'],
  paramTypes: {
    draftID: Types.IDSTR,
    positionType: Types.IDSTR,
    elID: Types.IDSTR,
    firstChar: Types.INT,
    lastChar: Types.INT,
  },
});
function actionSetPosition(
  ctx: Context,
  draftID: string,
  positionType: string,
  elID: string,
  firstChar: number,
  lastChar: number,
  cb: ErrDataCB<any>,
) {
  Sketch.updateClientData(ctx, ['vrdata', draftID, 'positions', positionType], {
    elID,
    firstChar,
    lastChar,
    timestamp: Sketch.clientTime(ctx),
  }, cb);
}

Sketch.defineAction('vrdata.setPositionTC', actionSetPositionTotalCharacters, {
  supersedeBy: ['draftID', 'positionType'],
  paramTypes: {
    draftID: Types.IDSTR,
    positionType: Types.IDSTR,
    elID: Types.IDSTR,
    totalCharacters: Types.INT,
    firstChar: Types.INT,
    lastChar: Types.INT,
  },
});
function actionSetPositionTotalCharacters(
  ctx: Context,
  draftID: string,
  positionType: string,
  elID: string,
  totalCharacters: number,
  firstChar: number,
  lastChar: number,
  cb: ErrDataCB<any>,
) {
  Sketch.updateClientData(ctx, ['vrdata', draftID, 'positions', positionType], {
    elID,
    totalCharacters,
    firstChar,
    lastChar,
    timestamp: Sketch.clientTime(ctx),
  }, cb);
}

Sketch.defineAction('vrdata.setAllCharCount', actionSetAllCharCount, {
  supersedeBy: ['draftID'],
  paramTypes: {
    draftID: Types.IDSTR,
    allCharCount: Types.INT,
  },
});
function actionSetAllCharCount(ctx: Context, draftID: string, allCharCount: number, cb: ErrDataCB<any>) {
  const jobs = new Jobs.Queue();
  jobs.add(Sketch.updateClientData, ctx, ['vrdata', draftID], {allCharCount});
  jobs.drain(cb);
}

Sketch.defineAction('vrdata.setLastTrigger', actionSetLastTrigger, {
  supersedeBy: ['draftID'],
  paramTypes: {
    draftID: Types.IDSTR,
    lastTrigger: Types.INT,
  },
  _deprecated: true,
});
function actionSetLastTrigger(_ctx, _draftID, _lastTrigger, cb: ErrDataCB<any>) {
  cb();
}

Sketch.defineAction('vrdata.setLastQuestionTool', actionSetLastQuestionTool, {
  supersedeBy: ['draftID'],
  paramTypes: {
    draftID: Types.IDSTR,
    lastQuestionTool: Types.INT,
  },
  _deprecated: true,
});
function actionSetLastQuestionTool(_ctx, _draftID, _lastQuestionTool, cb: ErrDataCB<any>) {
  cb();
}

Sketch.defineAction('vrdata.setMark', actionSetMark, {
  paramTypes: {
    draftID: Types.IDSTR,
    markID: Types.IDSTR,
    type: Types.SHORTSTR,
    general: Types.SHORTSTR_NULLABLE,
    feedback: Types.LONGSTR,
    note: Types.LONGSTR,
    ranges: Types.ARRAY, // WARNING no type checking here...
  },
  _deprecated: true,
});
function actionSetMark(_ctx, _draftID, _markID, _type, _general, _feedback, _note, _ranges, cb: ErrDataCB<any>) {
  cb();
}

Sketch.defineAction('vrdata.removeAllMarks', actionRemoveAllMarks, {
  paramTypes: {
    draftID: Types.IDSTR,
  },
  _deprecated: true,
});
function actionRemoveAllMarks(_ctx, _draftID, cb: ErrDataCB<any>) {
  cb();
}

Sketch.defineAction('vrdata.removeMark', actionRemoveMark, {
  paramTypes: {
    draftID: Types.IDSTR,
    markID: Types.IDSTR,
  },
  _deprecated: true,
});
function actionRemoveMark(_ctx, _draftID, _markID, cb: ErrDataCB<any>) {
  cb();
}

Sketch.defineAction('vrdata.upsertMark', actionUpsertMark, {
  supersedeBy: ['bookID', 'markID'],
  paramTypes: {
    bookID: Types.IDSTR,
    markID: Types.IDSTR,
    ranges: Types.OBJECT,
    reactions: Types.OBJECT,
    bookChecksum: Types.SHORTSTR,
  },
  _deprecated: true,
});
function actionUpsertMark(_ctx, _bookID, _markID, _ranges, _reactions, _bookChecksum, cb: ErrDataCB<any>) {
  cb();
}


export function getSqlTables() {
  return vrDataDB.sqlTables;
}
