/**
 * Copyright 2015-present Ampersand Technologies, Inc.
 */

import * as UserColors from 'clientjs/components/ReaderUI/UserColors.tsx';
import * as KnownData from 'clientjs/KnownData';
import * as Constants from 'clientjs/shared/constants';
import * as Util from 'overlib/client/clientUtil';
import { DataWatcher } from 'overlib/client/components/DataWatcher';
import * as Flex from 'overlib/client/components/Flex';
import * as DataStore from 'overlib/shared/dataStore';
import * as PropTypes from 'prop-types';
import * as React from 'react';


export const AT_NAME = 'atName';
export const FULL_NAME = 'fullName';
export const SHORT_NAME = 'shortName';

const CONTACT_MASK = Util.objectMakeImmutable({
  faceURL: 1,
  name: 1,
});

type ContactInfo = {
  faceURL: string;
  name: string;
};

const CONTACTS_MASK = Util.objectMakeImmutable({
  _ids: {
    name : 1,
  },
});

interface Props {
  accountID: AccountID;
  classes?: string;
  size?: number | number[];
  prefix?: string;
  noYou?: boolean;
  cardDetail?: string;
  cardRowRenderFunc?: Function;
  raw?: boolean;
  mentioned?: object;
  mayBeUnknown?: boolean;
  circle?: boolean;
  preserveCaps?: boolean;
  maxLength?: number;
  colorSet?: string;
  noColor?: boolean;
}

const PROP_TYPES = {
  accountID: PropTypes.string.isRequired,
  classes: PropTypes.string,
  size: PropTypes.oneOfType([
    PropTypes.number,
    PropTypes.arrayOf(PropTypes.number),
  ]),
  prefix: PropTypes.string,
  noYou: PropTypes.bool,
  cardDetail: PropTypes.string,
  cardRowRenderFunc: PropTypes.func,
  raw: PropTypes.bool,
  mentioned: PropTypes.object,
  mayBeUnknown: PropTypes.bool,
  circle: PropTypes.bool,
  preserveCaps: PropTypes.bool,
  maxLength: PropTypes.number,
  colorSet: PropTypes.number,
  noColor: PropTypes.bool,
};

function getContact(watcher: DataStore.WatcherOpt, props: Props) : ContactInfo|undefined {
  return KnownData.getKnownInfo(watcher, 'contacts', props.accountID, CONTACT_MASK, props.mayBeUnknown);
}

function faceURL(watcher: DataStore.WatcherOpt, props: Props) : string {
  const contact = getContact(watcher, props);
  return (contact && contact.faceURL) ? contact.faceURL : Util.assetUrl(Constants.DEFAULT_USER_PIC);
}

export function getName(watcher: DataStore.WatcherOpt, props: Props, nameType: string) : string {
  const contact = getContact(watcher, props);
  const contacts = DataStore.getData(watcher, ['KnownUsers'], CONTACTS_MASK);
  if (!contact) {
    return '...';
  }
  let name;
  switch (nameType) {
    case AT_NAME:
      name = Util.disambiguateContactName(contacts, props.accountID, false, false, DataStore.getData(watcher, ['contacts'], Util.IDS_MASK));
      name = (!props.mentioned || props.mentioned[name] ? '@' : '') + name;
      break;
    case FULL_NAME:
      name = contact.name;
      break;
    case SHORT_NAME:
    default:
      name = Util.disambiguateContactName(
        contacts,
        props.accountID,
        true,
        props.preserveCaps,
        DataStore.getData(watcher, ['contacts'], Util.IDS_MASK));
      break;
  }
  if (props.maxLength && name && name.length > props.maxLength) {
    name = name.slice(0, props.maxLength - 2) + '...';
  }
  return name;
}

export function getNameList(watcher: DataStore.WatcherOpt, ids: AccountID[], nameType?: string, maxNames?: number): string {
  if (!maxNames) {
    maxNames = Infinity;
  }
  const names: string[] = [];
  for (let i = 0 ; i < ids.length && i < maxNames; ++i) {
    const id = ids[i];
    names.push(getName(watcher, {accountID: id}, nameType || SHORT_NAME));
  }
  if (names.length === 0) {
    return ''; // should never happen
  }
  if (names.length < ids.length) {
    names[names.length - 1] = 'others';
  }
  return Util.formatNameList(names);
}

function getClasses(props: Props) {
  return Util.combineClasses(props.classes, props.preserveCaps ? undefined : 'tt-l');
}

export class Face extends DataWatcher<Props, {}> {
  static propTypes = PROP_TYPES;

  render() {
    const colorSet = (this.props.colorSet === null || this.props.colorSet === undefined) ?
      Constants.colorSetFromID(this.props.accountID) :
      this.props.colorSet;
    const userColors = UserColors.getAllUserColors(this);
    const baseColor = userColors[colorSet].inlineBase;
    const duotoneDark = userColors[colorSet].duotoneDark;

    let sizeArr = this.props.size;
    if (!sizeArr) {
      sizeArr = [64, 64];
    } else if (!Array.isArray(sizeArr)) {
      sizeArr = [sizeArr, sizeArr];
    }
    const radius = sizeArr[0] * .5;
    let classes = Util.combineClasses('pos-r br-' + radius + ' o-h ', this.props.classes);
    const style = {
      width: sizeArr[0],
      height: sizeArr[1],
      minWidth: sizeArr[0],
      minHeight: sizeArr[1],
    };

    const backgroundClasses = `pos-a fullSize c-${baseColor}-bg br-${radius} o-h `;
    const imageClasses = `pos-a fullSize br-${radius} o-h bgs-cover bg-c bgr-n`;
    const imageStyle = {
      backgroundImage: `url(${faceURL(this, this.props)})`,
    };
    const lightenClasses = `pos-a fullSize br-${radius} o-h c-${duotoneDark}-bg`;

    return (
      <div title={getName(this, this.props, FULL_NAME)} className='noInvert' classes={classes} style={style} >
        { this.props.noColor ?
          <div classes={imageClasses} style={imageStyle} /> :

          <div>
            <div classes={backgroundClasses}/>
            <div classes={imageClasses} style={imageStyle} className='user-face-duotone'/>
            <div classes={lightenClasses} className='user-face-lighten'/>
          </div>
        }
      </div>
    );
  }
}

export class Name extends DataWatcher<Props, {}> {
  static propTypes = PROP_TYPES;

  render() {
    return (
      <span classes={getClasses(this.props)}>
        {(this.props.prefix || '') + getName(this, this.props, SHORT_NAME)}
      </span>
    );
  }
}

export class FullName extends DataWatcher<Props, {}> {
  static propTypes = PROP_TYPES;

  render() {
    return (
      <span classes={getClasses(this.props)}>
        {(this.props.prefix || '') + getName(this, this.props, FULL_NAME)}
      </span>
    );
  }
}

export class Combo extends DataWatcher<Props, {}> {
  static propTypes = PROP_TYPES;

  render() {
    return (
      <Flex.Row classes={Util.combineClasses('ai-fs', this.props.classes)}>
        <Face {...this.props} classes=''/>
        <Name {...this.props} classes='m-x-10 w-n-0 fw-300'/>
      </Flex.Row>
    );
  }
}
