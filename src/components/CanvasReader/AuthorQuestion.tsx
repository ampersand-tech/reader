/**
* Copyright 2017-present Ampersand Technologies, Inc.
*/

import { ProviderContext } from 'clientjs/components/CanvasReader/ContextProvider';
import { Paragraph } from 'clientjs/components/CanvasReader/Paragraph';
import { ParagraphData } from 'clientjs/components/CanvasReader/ParagraphUtils';
import { ParaLayout } from 'clientjs/components/CanvasReader/ReaderStyle';
import { AuthorNoteEntry } from 'clientjs/shared/readerParse';
import * as Util from 'overlib/client/clientUtil';
import { DataWatcher } from 'overlib/client/components/DataWatcher.tsx';
import * as Flex from 'overlib/client/components/Flex.tsx';
import { FontDesc } from 'overlib/client/components/Layout/Font';
import * as Sketch from 'overlib/shared/sketch';
import * as PropTypes from 'prop-types';
import * as React from 'react';

const DELIM = '\t';

interface AnswerProps {
  idx: number;
  text: string;
  selected: boolean;
  questionID: string;
  multi: boolean;
}
class Answer extends DataWatcher<AnswerProps, {}> {
  context: ProviderContext;
  static contextTypes = Util.shallowCloneAndCopy(DataWatcher.contextTypes, {
    readerContext: PropTypes.object.isRequired,
  });

  private onClick = () => {
    let answer: string = this.props.text;
    if (this.props.multi) {
      const questionData: any = this.getData(['vrquestions', this.context.readerContext.getBookID(), 'questions', this.props.questionID], '*');
      const curAnswerStr: string = questionData ? questionData.answer : '';
      if (curAnswerStr) {
        let prevAnswers = curAnswerStr.split(DELIM);
        const index = prevAnswers.indexOf(answer);
        if (index >= 0) {
          prevAnswers.splice(index, 1);
        } else {
          prevAnswers.push(answer);
        }
        answer = prevAnswers.join(DELIM);
      }
    }
    this.context.readerContext.recordMetric(
      'question.answer',
      {
        questionID: this.props.questionID,
        selectedStr: answer,
        note: '',
      },
    );
    Sketch.runAction('vrquestions.answerQuestion', this.context.readerContext.getBookID(), this.props.questionID, answer, '');
  }

  render() {
    const paragraph: ParagraphData = {
      content: this.props.text,
      type: 'paragraph',
      modifiers: [
        {
          type: 'layer',
          start: -1,
          end: -1,
        },
      ],
    };

    const layout = ParaLayout(paragraph.type);
    const paddingX = layout.padding;
    const selected = this.props.selected ? 'c-readerLayerHighlight-bg' : '';

    const font = this.context.readerContext.getFontStyle(this, 'paragraph') as FontDesc;
    const circleSize = font.fontSize;
    const lineHeight = font.fontSize * font.lineSpacing;

    return (
      <Flex.Row classes={`p-y-${lineHeight * 0.4}`} onClick={this.onClick}>
        <div classes={`c-readerLayerHighlight-b b-1 br-${circleSize * 0.5} w-${circleSize} h-${circleSize} m-l-${paddingX} ${selected}`} />
        <Paragraph
          classes={'fg-1 ' + (this.props.selected ? 'c-readerLayerSelected-fg' : '')}
          paragraph={paragraph}
          paddingLeft={paddingX}
          paddingRight={paddingX}
          extraMissingWidth={circleSize + paddingX}
        />
      </Flex.Row>
    );
  }
}

interface AuthorQuestionProps {
  entryIdx: number;
}

export class AuthorQuestion extends DataWatcher<AuthorQuestionProps, {}> {
  context: ProviderContext;
  static contextTypes = Util.shallowCloneAndCopy(DataWatcher.contextTypes, {
    readerContext: PropTypes.object.isRequired,
  });

  render() {
    const parsedData = this.context.readerContext.getRawParsedData();

    const authorNote = parsedData.entries[this.props.entryIdx] as AuthorNoteEntry;

    const questionData: any = this.getData(['vrquestions', this.context.readerContext.getBookID(), 'questions', authorNote.name], '*');

    const curAnswerStr: string = questionData ? questionData.answer : '';
    const curAnswerArray = curAnswerStr.split(DELIM);

    const font = this.context.readerContext.getFontStyle(this, 'paragraph') as FontDesc;
    const lineHeight = font.fontSize * font.lineSpacing;

    const answers: JSX.Element[] = [];
    for (let i = 0; i < authorNote.answers.length; ++i) {
      answers.push(
        <Answer
          multi={Boolean(authorNote.multi)}
          text={authorNote.answers[i]}
          idx={i}
          key={i}
          selected={curAnswerArray.indexOf(authorNote.answers[i]) >= 0}
          questionID={authorNote.name}
        />,
      );
    }
    const questions: JSX.Element[] = [];
    for (const paraID in authorNote.paragraphs) {
      const paragraph = authorNote.paragraphs[paraID];
      const layout = ParaLayout(paragraph.type);
      const paddingX = layout.padding;
      const paddingY = layout.spacing;
      questions.push(
        <Paragraph
          paragraph={paragraph}
          key={paraID}
          classes={`p-y-${paddingY}`}
          paddingLeft={paddingX}
          paddingRight={paddingX}
        />,
      );
    }
    return (
      <div classes={`c-readerText-fg p-b-${lineHeight}`} data-cacheable={true}>
        {questions}
        {answers}
      </div>
    );
  }
}
