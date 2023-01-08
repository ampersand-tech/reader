/**
* Copyright 2016-present Ampersand Technologies, Inc.
*/

import * as JSVersion from 'clientjs/jsVersion';
import { DataWatcher } from 'overlib/client/components/DataWatcher.tsx';
import * as DataStore from 'overlib/shared/dataStore';


export class AutoUpdater extends DataWatcher<{}, {}> {
  componentDidMount() {
    DataStore.updateData(['App', 'selfUpdater', 'autoApplyUpdate'], false);
  }

  componentWillUnmount() {
    super.componentWillUnmount();
    DataStore.updateData(['App', 'selfUpdater', 'autoApplyUpdate'], true);
  }

  render() {
    const updateAvailable = this.getData(['App', 'selfUpdater', 'updateAvailable']);
    if (updateAvailable) {
      JSVersion.applyUpdate();
    }

    return null;
  }
}
