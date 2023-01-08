/**
* Copyright 2014-present Ampersand Technologies, Inc.
*/

import { ProviderContext } from 'clientjs/components/CanvasReader/ContextProvider.tsx';
import { LAYOUT_CONSTANTS } from 'clientjs/components/CanvasReader/ReaderStyle';
import { FixedTemplate, registerContextSchema } from 'clientjs/components/FixedTemplate.tsx';
import { unseenNotifications } from 'clientjs/components/ReaderApp/alertUtils';
import * as ReaderRoutes from 'clientjs/readerRoutes';
import * as Util from 'overlib/client/clientUtil';
import { DataWatcher } from 'overlib/client/components/DataWatcher';
import * as Flex from 'overlib/client/components/Flex';
import * as Navigation from 'overlib/client/navigation';
import { TEST_FUNC } from 'overlib/shared/constants';
import * as Types from 'overlib/shared/types';
import * as PropTypes from 'prop-types';
import * as React from 'react';

interface ReaderLocationsBarContext {
  goToNotifications: () => void;
  numNotifications: number;
  showAllLocations: () => void;
  showNewComments: () => void;
  showToc: boolean;
  toggleToc: () => void;
  viewNewComments: boolean;
}

interface ReaderLocationsBarProps {
  bookID: string;
}

export class ReaderLocationsBar extends DataWatcher<ReaderLocationsBarProps, {}> {
  context: ProviderContext;

  static contextSchema: StashOf<Types.Schema> = {
    goToNotifications: Types.FUNCTION,
    numNotifications: Types.NUMBER,
    showAllLocations: Types.FUNCTION,
    showNewComments: Types.FUNCTION,
    showToc: Types.BOOL,
    toggleToc: Types.FUNCTION,
    viewNewComments: Types.BOOL,
  };

  static sampleContext: Stash = {
    goToNotifications: TEST_FUNC,
    numNotifications: 3,
    showAllLocations: TEST_FUNC,
    showNewComments: TEST_FUNC,
    showToc: false,
    toggleToc: TEST_FUNC,
    viewNewComments: false,
  };

  static propTypes = {
    bookID: PropTypes.string.isRequired,
  };

  static contextTypes = Util.shallowCloneAndCopy(DataWatcher.contextTypes, {
    readerContext: PropTypes.object.isRequired,
  });


  private goToNotifications = () => {
    Navigation.go(ReaderRoutes.notifications, null);
  }

  toggleToc = () => {
    if (!this.context.readerContext.getUIState(null, ['showToc'])) {
      this.setState({navTop: 0});
    }
    this.context.readerContext.toggleToc();
  }

  showNewComments = () => {
    this.context.readerContext.replaceUIState(['viewNewComments'], true);
  }

  showAllLocations = () => {
    this.context.readerContext.replaceUIState(['viewNewComments'], false);
  }

  render() {
    const showToc = Boolean(this.context.readerContext.getUIState(this, ['showToc']));
    const viewNewComments = Boolean(this.context.readerContext.getUIState(this, ['viewNewComments']));
    // watch the current position, so that rerender happens during a change and the pages to next chapter is updated
    this.getData(['vrdata', this.props.bookID, 'positions', 'current']);

    const context: ReaderLocationsBarContext = {
      goToNotifications: this.goToNotifications,
      numNotifications: unseenNotifications(this),
      showToc: showToc,
      showAllLocations: this.showAllLocations,
      showNewComments: this.showNewComments,
      toggleToc: this.toggleToc,
      viewNewComments: viewNewComments,
    };
    return (
        <Flex.Col classes={`w-100% h-${LAYOUT_CONSTANTS.TOP_BAR_TOC_HEIGHT} c-readerFrameBackground-bg`}>
          <FixedTemplate template='ReaderLocationsBar' context={context} />
        </Flex.Col>
    );
  }
}

registerContextSchema(module, 'ReaderLocationsBar', ReaderLocationsBar.contextSchema, ReaderLocationsBar.sampleContext);
