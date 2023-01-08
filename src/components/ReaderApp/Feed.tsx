/**
* Copyright 2016-present Ampersand Technologies, Inc.
*/

import { Post } from 'clientjs/components/ReaderApp/Post';
import * as Constants from 'clientjs/shared/constants';
import * as Util from 'overlib/client/clientUtil';
import { DataWatcher } from 'overlib/client/components/DataWatcher';
import * as Log from 'overlib/client/log';
import * as Sketch from 'overlib/shared/sketch';
import * as PropTypes from 'prop-types';
import * as React from 'react';

const POST_MASK = Util.objectMakeImmutable({
  _ids: {
    postTime: 1,
    sticky: 1,
    feedType: 1,
    contentBlob: 1,
  },
});


function byPostTimeWSticky(a, b) {
  if (Boolean(a.sticky) !== Boolean(b.sticky)) {
    if (a.sticky) {
      return -1;
    } else {
      return 1;
    }
  }
  return b.postTime - a.postTime;
}

function addPostsToArray(postArray: Stash[], distributionID: Constants.DistributionID, posts: Stash, feedType: Constants.PostFeedType) {
  for (const postID in posts) {
    const post = posts[postID];
    // Old post types or incorrect feed, skip it
    if (!post.contentBlob || post.feedType !== feedType) {
      continue;
    }
    postArray.push({
      distributionID: distributionID,
      postID: postID,
      postTime: posts[postID].postTime,
      sticky: posts[postID].sticky,
    });
  }
}

interface Props {
  distributionID: Constants.DistributionID;
  reactionGroupID?: Constants.ReactionGroupID;
  feedType: Constants.PostFeedType;
  isDraft?: boolean;
  onClickOverride?: Function;
  classes?: string;
  _metricsName?: string;
}

export class Feed extends DataWatcher<Props, {}> {
  static propTypes = {
    distributionID: PropTypes.string.isRequired,
    reactionGroupID: PropTypes.string,
    feedType: PropTypes.string.isRequired,
    isDraft: PropTypes.bool,
    onClickOverride: PropTypes.func,
    classes: PropTypes.string,
    _metricsName: PropTypes.string,
  };

  render() {
    if (!this.props.distributionID) {
      Log.error('@sam', 'Draft must have distributionID');
      return null;
    }

    let postArray: Stash[] = [];
    if (this.props.isDraft) {
      addPostsToArray(
        postArray,
        this.props.distributionID,
        this.getData(['distributionSource', this.props.distributionID, 'posts'], POST_MASK),
        this.props.feedType,
      );
    } else {
      addPostsToArray(
        postArray,
        this.props.distributionID,
        this.getData(['distributions', this.props.distributionID, 'posts'], POST_MASK),
        this.props.feedType,
      );
    }

    postArray = postArray.sort(byPostTimeWSticky);
    const postEntries: JSX.Element[] = [];

    const currentLastRead: number = this.getData(['settingsGlobal', 'distributions', this.props.distributionID, 'lastRead']) || 0;

    for (let i = 0; i < postArray.length; ++i) {
      const post = postArray[i];
      const postTime: number = post.postTime;

      if (i === 0 && currentLastRead < postTime) {
        Sketch.runAction('distribution.updateLastRead', this.props.distributionID, postTime);
      }

      if (this.getData(['dismissedPosts', post.postID])) {
        continue;
      }

      const postPath = this.props.isDraft ?
        ['distributionSource', post.distributionID, 'posts', post.postID] :
        ['distributions', post.distributionID, 'posts', post.postID];


      postEntries.push(
        <Post
          key={post.postID}
          reactionGroupID={this.props.reactionGroupID}
          dataPath={postPath}
        />,
      );
    }

    if (this.props.feedType === Constants.POST_FEED_TYPE.OVERRIDE && !postEntries.length) {
      return null;
    }

    return <div classes={this.props.classes} >{postEntries}</div>;
  }
}
