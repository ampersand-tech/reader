/**
* Copyright 2016-present Ampersand Technologies, Inc.
*/

import * as ReaderRoutes from 'clientjs/readerRoutes';
import * as Constants from 'clientjs/shared/constants';
import * as ParagraphTypes from 'clientjs/shared/paragraphTypes';
import { Paragraph } from 'clientjs/shared/paragraphTypes';
import * as ReaderParse from 'clientjs/shared/readerParse';
import { EntryTypes } from 'clientjs/shared/readerParse';
import * as ClientNet from 'overlib/client/clientNet';
import * as Util from 'overlib/client/clientUtil';
import * as LayoutDrawable from 'overlib/client/components/Layout/LayoutDrawable';
import * as FileStore from 'overlib/client/fileStore';
import * as Navigation from 'overlib/client/navigation';
import * as DataStore from 'overlib/shared/dataStore';
import * as Jobs from 'overlib/shared/jobs';
import * as nacl from 'tweetnacl';

// barely secure, but let's do it!
const SALT = new Uint8Array([0x5c, 0x85, 0xe5, 0xbd, 0xa6, 0x6d, 0x84, 0xd9]);

const PARAS_PER_CHUNK = 25; // arbitrary

interface BookManifest {
  hash: string; // actually a base64 encoded cryptokey, called hash to obfuscate
  chunks: string[];
}

export function readBook(bookID: Constants.BookID, reactionGroupID?: Constants.ReactionGroupID|null, instant?: boolean) {
  const path = reactionGroupID
    ? ReaderRoutes.content2(bookID, reactionGroupID)
    : ReaderRoutes.content1(bookID)
  ;
  Navigation.go(path, {instant: Boolean(instant)});
}

function nonceFromChunkID(chunkID: Uint8Array) {
  const nonce = new Uint8Array(chunkID.length + SALT.length);
  nonce.set(SALT, 0);
  nonce.set(chunkID, SALT.length);
  return nonce;
}

function loadChunk(filePath: string, chunkName: string, key: Uint8Array, cb: ErrDataCB<Paragraph[]>) {
  FileStore.find<string>(`${filePath}/${chunkName}`, (err, encryptedStr) => {
    if (err) {
      return cb(err);
    }
    const encryptedBytes = Util.bytesFromBase64(encryptedStr || '');
    const chunkID = Util.bytesFromBase64(chunkName);
    const res = nacl.secretbox.open(encryptedBytes, nonceFromChunkID(chunkID), key);
    if (!res) {
      return cb(`Failed to decrypt chunk ${chunkName}`);
    }
    cb(null, Util.safeParse(Util.bytesToString(res)));
  });
}

function loadFromManifest(filePath: string, cb: ErrDataCB<Paragraph[]>) {
  FileStore.find<BookManifest>(`${filePath}.manifest`, (err1, manifest) => {
    if (err1 || !manifest) {
      return cb(err1);
    }

    const key = Util.bytesFromBase64(manifest.hash);

    const jobs = new Jobs.Parallel();
    for (const chunkName of manifest.chunks) {
      jobs.collate(chunkName, loadChunk, filePath, chunkName, key);
    }
    jobs.drain((err, results) => {
      if (err) {
        return cb(err);
      }
      let paras: Paragraph[] = [];
      for (const chunkName of manifest.chunks) {
        paras = paras.concat(results[chunkName]);
      }
      cb(null, paras);
    });
  });
}

function writeManifest(filePath: string, data: Paragraph[], cb: ErrDataCB<void>) {
  const key = nacl.randomBytes(nacl.secretbox.keyLength);

  const manifest: BookManifest = {
    hash: Util.bytesToBase64(key),
    chunks: [],
  };

  const jobs = new Jobs.Parallel();
  for (let i = 0; i < data.length; i += PARAS_PER_CHUNK) {
    const chunkID = nacl.randomBytes(nacl.secretbox.nonceLength - SALT.length);
    const chunkName = Util.bytesToBase64(chunkID);
    manifest.chunks.push(chunkName);

    const chunkData = Util.safeStringify(data.slice(i, Math.min(data.length, i + PARAS_PER_CHUNK)));
    const encryptedBytes = nacl.secretbox(Util.bytesFromString(chunkData), nonceFromChunkID(chunkID), key);
    const encryptedStr = Util.bytesToBase64(encryptedBytes);

    jobs.add(FileStore.update, `${filePath}/${chunkName}`, encryptedStr);
  }

  jobs.drain((err1) => {
    if (err1) {
      return cb(err1);
    }

    FileStore.update(`${filePath}.manifest`, manifest, cb);
  });
}

export function bookFetch(distributionID: Constants.DistributionID, itemID: Constants.ContentItemID, isPreview: boolean, cb: ErrDataCB<Paragraph[]>) {
  let cmd = '';
  let params: Stash = {};
  let cacheName = '';

  if (Constants.isPseudoChannelID(distributionID)) {
    cmd = 'getDraftAsReleased';
    params.forMobileWriter = Constants.isMobileWriterChannelID(distributionID);
    params.draftID = itemID;
    if (params.forMobileWriter && DataStore.getData(null, ['drafts', itemID, 'isReadOnly'])) {
      const editCount = DataStore.getData(null, ['drafts', itemID, 'editCount']) || 0;
      cacheName = `drafts.${itemID}/${editCount}`;
    }
  } else {
    cmd = 'getReleasedData';
    params.distributionID = distributionID;
    params.itemID = itemID;
    params.isPreview = Boolean(isPreview);
    params.modTime = (
      DataStore.getData(null, ['library', distributionID, 'content', itemID, 'modTime']) ||
      DataStore.getData(null, ['distributions', distributionID, 'items', itemID, 'modTime'])
    );
    if (!params.modTime) {
      return cb(new Error('not found'));
    }

    cacheName = `${distributionID}.${itemID}/${params.modTime}${isPreview ? '-preview' : ''}`;
  }

  if (!cacheName) {
    ClientNet.svrCmd(cmd, params, cb);
    return;
  }

  const filePath = `bookData/${cacheName}`;
  loadFromManifest(filePath, function(_err, diskData) {
    if (diskData) {
      return cb(null, diskData);
    }
    ClientNet.svrCmd(cmd, params, function(err1, data: Paragraph[] | undefined) {
      if (err1 || !data) {
        return cb(err1);
      }

      writeManifest(filePath, data, function(err2) {
        cb(err2, data);
      });
    });
  });
}

export function preloadImages(data: ReaderParse.ParsedData) {
  const preloaded: Stash = {};

  function preloadUrl(url: string) {
    if (!url || preloaded[url]) {
      return;
    }
    if (url.startsWith('icons/')) {
      LayoutDrawable.getIcon(url);
    } else {
      LayoutDrawable.getImage(url);
    }
  }

  for (const entry of data.entries) {
    switch (entry.type) {
      case EntryTypes.paragraph:
        for (const mod of entry.modifiers) {
          if (ParagraphTypes.isImgWidgetModifier(mod) && mod.data.url) {
            preloadUrl(mod.data.url);
          }
        }
        break;
      case EntryTypes.images:
        for (const img of entry.images) {
          preloadUrl(img.url);
        }
        break;
      case EntryTypes.button:
        preloadUrl(entry.icon);
        for (const id in entry.reaction) {
          const reaction = entry.reaction[id];
          preloadUrl(reaction.icon);
        }
        break;
    }
  }
}
