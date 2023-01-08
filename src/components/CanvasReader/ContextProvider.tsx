/**
* Copyright 2017-present Ampersand Technologies, Inc.
*/

import { ReaderContext } from 'clientjs/components/CanvasReader/ReaderContext';
import * as DomClassManager from 'overlib/client/domClassManager';
import * as PropTypes from 'prop-types';

export interface ProviderContext {
  readerContext: ReaderContext;
}

export class ContextProvider extends DomClassManager.SemanticColorRoot<{ context: ReaderContext }> {
  static childContextTypes = {
    readerContext: PropTypes.object,
  };

  shouldComponentUpdate(_nextProps: any, _nextState?: object) {
    return false;
  }

  getChildContext = (): ProviderContext => {
    return {readerContext: this.props.context};
  }
}
