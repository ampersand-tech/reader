/**
* Copyright 2015-present Ampersand Technologies, Inc.
*/

import * as Constants from 'clientjs/shared/constants';
import * as Sketch from 'overlib/shared/sketch';
import * as Types from 'overlib/shared/types';


const contactsDB = Sketch.defineSharedTable('contacts', Sketch.MAP({
  name: Types.SHORTSTR,
  faceURL: Types.SHORTSTR_NULLABLE,
  userType: Types.createEnum('USER_TYPE', Constants.USER_TYPE),

  _personal: {
    color: Types.INT,
    _deprecated: {
      reactionColorGroup: Types.INT,
    },
  },
}));


Sketch.defineAction('contacts.setColor', actionSetColor, {
  supersedeBy: ['contactID'],
  paramTypes: {
    contactID: Types.IDSTR,
    color: Types.INT,
  },
});
function actionSetColor(ctx: Context, contactID: AccountID, color: number, cb: ErrDataCB<any>) {
  if (contactID === ctx.user.id) {
    return cb('can not set your own contact color');
  }
  Sketch.updateClientData(ctx, ['contacts', contactID, 'color'], color, cb);
}

Sketch.defineAction('contacts.setFaceURL', actionSetFaceURL, {
  supersedeBy: [],
  paramTypes: {
    faceURL: Types.SHORTSTR_NULLABLE,
  },
});
function actionSetFaceURL(ctx: Context, faceURL: string|null, cb: ErrDataCB<any>) {
  Sketch.updateClientData(ctx, ['contacts', ctx.user.id, 'faceURL'], faceURL, cb);
}

Sketch.defineAction('contacts.removeContact', actionRemoveContact, {
  supersedeBy: [],
  paramTypes: {
    contactID: Types.IDSTR,
  },
});
function actionRemoveContact(ctx: Context, contactID: AccountID, cb: ErrDataCB<any>) {
  if (contactID === ctx.user.id) {
    return cb('can not remove yourself from contacts');
  }

  Sketch.removeMember(ctx, ['contacts', contactID], ctx.user.id, cb);
}


export function getSchema() {
  return contactsDB.getSchema();
}
