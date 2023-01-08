/**
 * Copyright 2015-present Ampersand Technologies, Inc.
 *
 *
 */

import * as Jobs from 'overlib/shared/jobs';
import * as Sketch from 'overlib/shared/sketch';
import * as Types from 'overlib/shared/types';

const vrQuestionsDB = Sketch.definePersonalTable('vrquestions', Sketch.MAP({
  questions: Sketch.MAP({
    answer: Types.LONGSTR,
    note: Types.LONGSTR,
  }),
}));

Sketch.defineAction('vrquestions.create', actionCreateData, {
  paramTypes: {
    draftID: Types.IDSTR,
  },
  _deprecated: true,
});
function actionCreateData(ctx, draftID, cb) {
  ctx;
  draftID;
  cb();
}

Sketch.defineAction('vrquestions.answerQuestion', actionAnswerQuestion, {
  paramTypes: {
    draftID: Types.IDSTR,
    questionID: Types.LONGSTR,
    answer: Types.LONGSTR,
    note: Types.LONGSTR,
  },
});
function actionAnswerQuestion(ctx, draftID, questionID, answer, note, cb) {
  const path = ['vrquestions', draftID, 'questions', questionID];
  const jobs = new Jobs.Queue();
  jobs.add(Sketch.initializeClientPath, ctx, path);
  jobs.add(Sketch.updateClientData, ctx, path, { answer: answer, note: note });
  jobs.drain(cb);
}

Sketch.defineAction('vrquestions.removeAllQuestions', actionRemoveAllQuestions, {
  paramTypes: {
    draftID: Types.IDSTR,
  },
});
function actionRemoveAllQuestions(ctx, draftID, cb) {
  Sketch.removeClientDataIfExists(ctx, ['vrquestions', draftID, 'questions'], cb);
}

Sketch.defineAction('vrquestions.removeQuestion', actionRemoveQuestion, {
  paramTypes: {
    draftID: Types.IDSTR,
    questionID: Types.IDSTR,
  },
});
function actionRemoveQuestion(ctx, draftID, questionID, cb) {
  Sketch.removeClientDataIfExists(ctx, ['vrquestions', draftID, 'questions', questionID], cb);
}


export function getSqlTables() {
  return vrQuestionsDB.sqlTables;
}


