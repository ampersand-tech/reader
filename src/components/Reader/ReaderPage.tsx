/**
* Copyright 2014-present Ampersand Technologies, Inc.
*/

import { ReaderWrapper } from 'clientjs/components/Reader/ReaderWrapper.tsx';
import { ReaderLoadingIndicator } from 'clientjs/components/ReaderUI/ReaderLoadingIndicator.tsx';
import * as ReaderModal from 'clientjs/components/ReaderUI/ReaderModal.tsx';
import * as ReaderRoutes from 'clientjs/readerRoutes';
import * as Constants from 'clientjs/shared/constants';
import { DataWatcher } from 'overlib/client/components/DataWatcher.tsx';
import * as Flex from 'overlib/client/components/Flex.tsx';
import * as Log from 'overlib/client/log';
import * as Navigation from 'overlib/client/navigation';
import * as DataStore from 'overlib/shared/dataStore';
import * as Util from 'overlib/shared/util';
import * as PropTypes from 'prop-types';
import * as React from 'react';

interface ReaderPageProps {
  bookID: Constants.BookID;
  reactionGroupID?: Constants.ReactionGroupID;
  location?: string;
}

export class ReaderPage extends DataWatcher<ReaderPageProps, {}> {
  static propTypes = {
    bookID: PropTypes.string.isRequired,
    reactionGroupID: PropTypes.string,
    location: PropTypes.string,
  };

  componentDidMount() {
    // store bookID so we can navigate back here on cold start
    // if we're not a writer preview
    if (Constants.extractChannelID(this.props.bookID) !== Constants.WRITER_PREVIEW_CHANNEL) {
      DataStore.replaceData(['ReaderLocalState'], { bookID: this.props.bookID, reactionGroupID: this.props.reactionGroupID || '' });
    }
  }

  componentWillUnmount() {
    super.componentWillUnmount();
    DataStore.replaceData(['ReaderLocalState'], { bookID: '', reactionGroupID: '' });
  }

  render() {
    const [distributionID, itemID] = Constants.splitBookID(this.props.bookID);

    const res = ensureSubscribed(this, distributionID, <ReaderLoadingIndicator />);
    if (res) {
      return res;
    }

    const isPseudoChannel = Constants.isPseudoChannelID(distributionID);
    const isPrivateShare = Constants.isPrivateShareChannelID(distributionID);
    if (!isPseudoChannel && !isPrivateShare && !DataStore.hasData(['distributions', distributionID, 'items', itemID])) {
      Navigation.go(ReaderRoutes._404, {noHistory: true});
    }

    // Used to change the key and trigger a reload
    const isPreview = this.getData(['library', distributionID, 'content', itemID, 'preview'], 1, true);
    let readerKey = 'reader-' + this.props.bookID;
    if (isPreview) {
      readerKey += '-preview';
    }

    const watchForDraftChanges = Constants.isWriterPreviewBookID(this.props.bookID);
    if (watchForDraftChanges) {
      // watch editCount to reload on edits
      const editCount = this.getData(['drafts', itemID, 'editCount']);
      if (editCount) {
        readerKey += ':' + editCount;
      }
    }
    return (
      <ReaderWrapper
        key={readerKey}
        bookID={this.props.bookID}
        reactionGroupID={this.props.reactionGroupID}
        location={this.props.location}
      />
    );
  }
}

export function ensureSubscribedRetError(watcher: DataWatcher, distributionID: Constants.DistributionID) {
  if (Constants.isPseudoChannelID(distributionID) || Constants.isPrivateShareChannelID(distributionID)) {
    return null;
  }


  if (!watcher.getData(['distributions', distributionID], 1)) {
    if (watcher.getData(['distributionGlobal', distributionID], 1)) {
      const res = watcher.getServerDataWithError('subscribeToGlobalChannel', { distributionID });
      if (res.err) {
        return res.err;
      }
    } else {
      return 'not found';
    }

    return 'loading';
  }

  return null;
}

export function ensureSubscribed(
  watcher: DataWatcher,
  distributionID: Constants.DistributionID,
  loadingIndicator: null | JSX.Element | JSX.Element[],
) {
  const err = ensureSubscribedRetError(watcher, distributionID);
  if (!err) {
    return null;
  }

  if (err === Constants.ACCOUNT_ERRORS.CONTENT_NOT_AVAILABLE_IN_REGION) {
    ReaderModal.openReaderModal({
      showOK: true,
      header: 'Content Not Available',
      text: 'Sorry! This content is not available in your country.',
      textClasses: 'ta-c',
    });
    Navigation.goBack();
    return <span classes=''/>;
  }

  if (Util.isNotFound(err)) {
    // unknown distributionID, just go to the discover page
    Navigation.goBack();
    return <span />;
  }

  if (err !== 'loading') {
    Log.warn('@conor', 'ensureSubscribed.error', { distributionID, err });
    Navigation.goBack();
    return <span />;
  }

  return (
    <Flex.Col classes='pos-r fg-1'>
      {loadingIndicator}
    </Flex.Col>
  );
}
