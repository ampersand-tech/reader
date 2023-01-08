/**
* Copyright 2016-present Ampersand Technologies, Inc.
*/

import { ProviderContext } from 'clientjs/components/CanvasReader/ContextProvider';
import { FixedTemplate, registerContextSchema } from 'clientjs/components/FixedTemplate';
import { TEST_FUNC } from 'clientjs/shared/constants';
import * as Util from 'overlib/client/clientUtil';
import { DataWatcher } from 'overlib/client/components/DataWatcher';
import * as Types from 'overlib/shared/types';
import * as PropTypes from 'prop-types';
import * as React from 'react';

interface ReaderQuietModeModalContext {
  quietMode: boolean;
  dismiss: (e: React.SyntheticEvent<HTMLElement>) => void;
}

interface ReaderQuietModeModalState {
  show: boolean;
}

const FADE_TRANSITION_TIME_MS = 300;
const SHOW_DURATION_MS = 1800;

export class ReaderQuietModeModal extends DataWatcher<{}, ReaderQuietModeModalState> {

  static contextSchema: StashOf<Types.Schema> = {
    quietMode: Types.BOOL,
    dismiss: Types.FUNCTION,
  };

  static sampleContext: Stash = {
    quietMode: false,
    dismiss: TEST_FUNC,
  };

  context: ProviderContext;
  static contextTypes = Util.shallowCloneAndCopy(DataWatcher.contextTypes, {
    readerContext: PropTypes.object.isRequired,
  });

  state = {
    show: false,
  };

  private quietModeAnimating : boolean = false;

  componentDidUpdate() {
    const quietMode = this.context.readerContext.getUIState(null, ['quietMode']);
    if (quietMode !== this.quietModeAnimating) {
      this.clearNamedTimeout('fade');
      this.setNamedTimeout('fade', () => this.fadeIn(), 0);
    }
    this.quietModeAnimating = quietMode;
  }

  fadeIn() {
    this.setState({show: true});
    this.setNamedTimeout('fade', () => this.fadeOut(), SHOW_DURATION_MS);
  }

  fadeOut() {
    this.setState({show: false});
  }

  dismiss = (e: React.SyntheticEvent<HTMLElement>) => {
    Util.eatEvent(e);
    this.clearNamedTimeout('fade');
    this.setState({show: false});
  }

  render() {
    const quietMode = this.context.readerContext.getUIState(this, ['quietMode']);

    const context: ReaderQuietModeModalContext = {
      quietMode: quietMode,
      dismiss: this.dismiss,
    };

    const style = {
      opacity: this.state.show ? 1 : 0,
      transition: 'opacity ' + FADE_TRANSITION_TIME_MS + 'ms ease',
    };

    return (
      <div
        style={style}
        classes={`h-150 w-150 pos-f m-a left-0 right-0 top-0 bot-0 ${this.state.show ? '' : 'ptrevt-n'}`}
      >
        <FixedTemplate template='ReaderQuietModeModal' context={context} />
      </div>
    );
  }
}

registerContextSchema(module, 'ReaderQuietModeModal', ReaderQuietModeModal.contextSchema, ReaderQuietModeModal.sampleContext);
