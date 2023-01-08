/**
* Copyright 2016-present Ampersand Technologies, Inc.
*/

import { FixedTemplate, registerContextSchema } from 'clientjs/components/FixedTemplate.tsx';
import * as KnownData from 'clientjs/KnownData';
import * as Util from 'overlib/client/clientUtil';
import { DataWatcher } from 'overlib/client/components/DataWatcher.tsx';
import * as Log from 'overlib/client/log';
import { Component, PROP_TYPE } from 'overlib/client/template/Component';
import { TEST_FUNC } from 'overlib/shared/constants';
import * as ObjSchema from 'overlib/shared/objSchema';
import * as Sketch from 'overlib/shared/sketch';
import * as Types from 'overlib/shared/types';
import * as PropTypes from 'prop-types';
import * as React from 'react';

const CONTACT_REQUESTS_MASK = Util.objectMakeImmutable({
  _ids: {
    contactorID: 1,
    contacteeID: 1,
    contactorName: 1,
    contacteeName: 1,
  },
});

const CONTACT_MASK = Util.objectMakeImmutable({
  name: 1,
});

interface ContactRequestItem {
  accept: () => void;
  id: string;
  name: string;
  sentToMe: boolean;
  remove: () => void;
}

interface ContactRequestListContext {
  requestList: ContactRequestItem[];
}

interface ContactRequestListProps {
  classes?: string;
}

export class ContactRequestListReact extends DataWatcher<ContactRequestListProps, {}> {

  static propTypes = {
    classes: PropTypes.string,
  };

  static contextSchema: StashOf<Types.Schema> = {
    requestList: ObjSchema.ARRAY_OF({
      accept: Types.FUNCTION,
      id: Types.IDSTR,
      name: Types.STRING,
      remove: Types.FUNCTION,
      sentToMe: Types.BOOL,
    }),
  };

  static sampleContext: Stash = {
    requestList: [{
      accept: TEST_FUNC,
      id: 'a',
      name: 'Testy McTestface',
      remove: TEST_FUNC,
      sentToMe: false,
    }, {
      accept: TEST_FUNC,
      id: 'b',
      name: 'Testy McTestface2',
      remove: TEST_FUNC,
      sentToMe: true,
    }],
  };

  acceptRequest = (requestID: string, contacteeID: string) => {
    const accountID = this.getData(['account', 'id']);
    if (contacteeID !== accountID) {
      Log.error('@palmer', 'Cannot accept contact request if not the contactee');
      return;
    }
    this.svrCmd('acceptContactRequest', { requestID }, (err, _data) => {
      if (err) {
        Log.error('@palmer', err);
      }
    });
  }

  removeRequest = (requestID: string) => {
    Sketch.runAction('contactRequests.remove', requestID);
  }

  render() {
    const requests = this.getData(['contactRequests'], CONTACT_REQUESTS_MASK);
    const accountID = this.getData(['account', 'id']);
    const requestList : ContactRequestItem[] = [];
    for (let id in requests) {
      const request = requests[id];
      const contact = request.contactorID === accountID ?
        KnownData.getKnownInfo(this, 'contacts', request.contacteeID, CONTACT_MASK) :
        KnownData.getKnownInfo(this, 'contacts', request.contactorID, CONTACT_MASK);
      const sentToMe = request.contacteeID === accountID;
      requestList.push({
        accept: this.acceptRequest.bind(this, id, request.contacteeID),
        name: contact.name,
        id,
        sentToMe,
        remove: this.removeRequest.bind(this, id),
      });
    }
    const context : ContactRequestListContext = {
      requestList,
    };

    return <FixedTemplate template='ContactRequestList' context={context}/>;
  }
}

export class ContactRequestList extends Component {
  constructor() {
    super({
      classes: PROP_TYPE.CLASSES,
    }, false, false);
  }
  create(props: Stash, children: React.ReactElement<any>[], content: string | null, context: Stash): React.ReactElement<any>|null {
    this.process(props, children, content, context);
    return React.createElement(ContactRequestListReact, props, content);
  }
}

registerContextSchema(module, 'ContactRequestList', ContactRequestListReact.contextSchema, ContactRequestListReact.sampleContext);
