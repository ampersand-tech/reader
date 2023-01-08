/**
* Copyright 2018-present Ampersand Technologies, Inc.
*/

import { LAYOUT_CONSTANTS } from 'clientjs/components/CanvasReader/ReaderStyle';
import { FixedTemplate } from 'clientjs/components/FixedTemplate.tsx';
import { unseenNotifications } from 'clientjs/components/ReaderApp/alertUtils';
import * as ReaderRoutes from 'clientjs/readerRoutes';
import * as Constants from 'clientjs/shared/constants';
import { TEST_FUNC } from 'clientjs/shared/constants';
import * as Util from 'overlib/client/clientUtil';
import { DataWatcher } from 'overlib/client/components/DataWatcher.tsx';
import * as Navigation from 'overlib/client/navigation';
import { registerContextSchema } from 'overlib/client/template/Template';
import * as ObjSchema from 'overlib/shared/objSchema';
import * as Types from 'overlib/shared/types';
import * as React from 'react';

interface Tab {
  onClick: () => void;
  active: boolean;
  beeped: boolean;
  icon: string;
  name: string;
}

interface TabContext {
  tabs: Tab[];
  visible: boolean;
  height: number;
}

export class TabBar extends DataWatcher<{}, {}> {
  static contextSchema: StashOf<Types.Schema> = {
    tabs: ObjSchema.ARRAY_OF({
      onClick: Types.FUNCTION,
      active: Types.BOOL,
      beeped: Types.BOOL,
      icon: Types.SHORTSTR,
      name: Types.SHORTSTR,
    }),
    visible: Types.BOOL,
    height: Types.NUMBER,
  };
  static sampleContext: Stash = {
    tabs: [
      {
        onClick: TEST_FUNC,
        active: false,
        beeped: true,
        icon: 'icons/icon_x_thin_21x21.svg',
        name: 'First',
      },
      {
        onClick: TEST_FUNC,
        active: true,
        beeped: false,
        icon: 'icons/icon_x_thin_21x21.svg',
        name: 'Second',
      },
    ],
    visible: true,
    height: LAYOUT_CONSTANTS.TAB_BAR_HEIGHT,
  };
  render() {
    const platform = this.getData(['App', 'platform']);
    const isIpad = (platform === Constants.LAYOUT_PLATFORM.IPAD || platform === Constants.LAYOUT_PLATFORM.DESKTOP);
    const context: TabContext = {
      tabs: [
        {
          onClick: () => { Navigation.go(ReaderRoutes.discover); },
          active: Navigation.currentlyAt(ReaderRoutes.discover, false),
          beeped: false,
          icon: 'icons/icon_reader_home_40x40.svg',
          name: 'Discover',
        },
        {
          onClick: () => { Navigation.go(ReaderRoutes.activity); },
          active: Navigation.currentlyAt(ReaderRoutes.activity, false),
          beeped: false,
          icon: 'icons/icon_reader_lightning.svg',
          name: 'Share',
        },
        {
          onClick: () => { Navigation.go(ReaderRoutes.group); },
          active: Navigation.currentlyAt(ReaderRoutes.group, false),
          beeped: false,
          icon: 'icons/icon_reader_chat_balloon_notifications.svg',
          name: 'Groups',
        },
        {
          onClick: () => { Navigation.go(ReaderRoutes.notifications); },
          active: Navigation.currentlyAt(ReaderRoutes.notifications, false),
          beeped: !!unseenNotifications(this),
          icon: 'icons/icon_reader_notifications_40x40.svg',
          name: 'Notifications',
        },
        {
          onClick: () => { Navigation.go(ReaderRoutes.account); },
          active: Navigation.currentlyAt(ReaderRoutes.account, false),
          beeped: false,
          icon: 'icons/icon_reader_profile_40x40.svg',
          name: 'Me',
        },
      ],
      visible: false,
      height: isIpad ? LAYOUT_CONSTANTS.TAB_BAR_HEIGHT_IPAD : LAYOUT_CONSTANTS.TAB_BAR_HEIGHT,
    };

    // If we're on at least one tab, show the tabbar
    for (let i = 0; i < context.tabs.length; ++i) {
      if (context.tabs[i].active) {
        context.visible = true;
        break;
      }
    }

    const children = Util.forceArray(this.props.children);
    children.push(<FixedTemplate key='tabBar' template='TabBar' testid='TabBar' context={context} />);
    return children;
  }
}

registerContextSchema(module, 'TabBar', TabBar.contextSchema, TabBar.sampleContext);
