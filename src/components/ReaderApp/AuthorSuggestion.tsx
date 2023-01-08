/**
* Copyright 2018-present Ampersand Technologies, Inc.
*
*/
import { FixedTemplate } from 'clientjs/components/FixedTemplate.tsx';
import * as ReaderModal from 'clientjs/components/ReaderUI/ReaderModal.tsx';
import * as Metrics from 'clientjs/metrics';
import { TEST_FUNC } from 'clientjs/shared/constants';
import { DataWatcher } from 'overlib/client/components/DataWatcher.tsx';
import { Component, PROP_TYPE } from 'overlib/client/template/Component.tsx';
import { registerContextSchema } from 'overlib/client/template/Template';
import * as Types from 'overlib/shared/types';
import * as React from 'react';


export class AuthorSuggestionComponent extends Component {
  constructor() {
    super({
      classes: PROP_TYPE.CLASSES,
    }, false, false);
  }
  create(props: Stash, children: React.ReactElement<any>[], content: string | null, context: Stash): React.ReactElement<any>|null {
    this.process(props, children, content, context);
    return React.createElement(AuthorSuggestion, props);
  }
}

interface AuthorSuggestionContext {
  onTyping: (value: string) => void;
  submit: () => void;
  classes?: string;
  authorValue: string;
}


export class AuthorSuggestion extends DataWatcher<{classes?: string}, {authorValue: string}> {
  static contextSchema: StashOf<Types.Schema> = {
    onTyping: Types.FUNCTION,
    submit: Types.FUNCTION,
    classes: Types.LONGSTR,
    authorValue: Types.STRING,
  };
  static sampleContext: Stash = {
    onTyping: TEST_FUNC,
    submit: TEST_FUNC,
    classes: '',
    authorValue: '',
  };

  state = {
    authorValue: '',
  };
  onTyping = (value: string) => {
    this.setState({authorValue: value});
  }
  submit = () => {
    if (!this.state.authorValue) {
      return;
    }
    Metrics.recordInSet(Metrics.SET.READER.APP, 'suggestion.author', {
      suggestion: this.state.authorValue,
    });
    this.setState({authorValue: ''});
    ReaderModal.openReaderModal({
      showOK: true,
      header: 'Got it!',
      text: 'Ampersand will email you as we add new authors.',
      textClasses: 'ta-c',
    });
  }
  render() {
    const context: AuthorSuggestionContext = {
      onTyping: this.onTyping,
      submit: this.submit,
      authorValue: this.state.authorValue,
      classes: this.props.classes || '',
    };
    return (
      <FixedTemplate template='AuthorSuggestion' testid='AuthorSuggestion' context={context} />
    );
  }
}

registerContextSchema(module, 'AuthorSuggestion', AuthorSuggestion.contextSchema, AuthorSuggestion.sampleContext);
