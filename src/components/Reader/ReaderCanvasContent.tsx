/**
* Copyright 2016-present Ampersand Technologies, Inc.
*/

import * as ClientPerf from 'clientjs/clientPerf';
import { ProviderContext } from 'clientjs/components/CanvasReader/ContextProvider.tsx';
import { Nav } from 'clientjs/components/CanvasReader/Nav';
import { ReaderCache } from 'clientjs/components/CanvasReader/ReaderCache';
import * as Util from 'overlib/client/clientUtil';
import { DataWatcher } from 'overlib/client/components/DataWatcher.tsx';
import { RenderCanvas } from 'overlib/client/components/Layout/CanvasRenderer';
import * as IpcClientUtil from 'overlib/client/ipcClientUtil';
import * as DataStore from 'overlib/shared/dataStore';
import * as DataStoreWatch from 'overlib/shared/dataStoreWatch';
import { Point } from 'overlib/shared/mathUtils';
import * as PropTypes from 'prop-types';
import * as React from 'react';

const AVG_DT_FRAME_COUNT = 200;

export class ReaderCanvasContent extends DataWatcher<{}, {}> {
  context: ProviderContext;

  private renderCanvas: RenderCanvas | undefined;
  private firstRenderPerf: ClientPerf.PerfTimer | undefined;
  private readerCache: ReaderCache | undefined;
  private nav: Nav | undefined;
  private watcherHandle: DataStoreWatch.WatcherHandle | undefined;

  private dtSum = 0;
  private dtCount = 0;

  static defaultProps = {
    testid: 'ReaderCanvasContent',
  };

  static contextTypes = Util.shallowCloneAndCopy(DataWatcher.contextTypes, {
    readerContext: PropTypes.object.isRequired,
  });

  componentWillUnmount() {
    super.componentWillUnmount();
    this.destructor();
  }

  public destructor() {
    if (this.readerCache) {
      this.readerCache.destructor();
      this.readerCache = undefined;
    }
    if (this.watcherHandle) {
      DataStoreWatch.destroyDataReactor(this.watcherHandle);
      this.watcherHandle = undefined;
    }
  }

  private getCanvas = (): HTMLCanvasElement | undefined => {
    return this.renderCanvas ? this.renderCanvas.getCanvas() : undefined;
  }

  private getScreenOffset = (): Point => {
    return this.renderCanvas ? this.renderCanvas.getScreenOffset() : { x: 0, y: 0 };
  }

  private updateCanvasSize = (watcher: DataStoreWatch.WatcherOpt) => {
    DataStore.getData(watcher, ['App', 'width']);
    DataStore.getData(watcher, ['App', 'height']);

    const canvas = this.renderCanvas!.updateCanvasSize();
    if (!canvas) {
      return;
    }

    this.context.readerContext.replaceUIState(['page', 'height'], canvas.clientHeight);
    this.context.readerContext.replaceUIState(['page', 'width'], canvas.clientWidth);

    this.readerCache!.setCanvasSize(canvas.clientWidth, canvas.clientHeight);
  }

  private setRenderer = (renderCanvas: RenderCanvas | null) => {
    if (!renderCanvas) {
      if (this.renderCanvas) {
        // unmount
        this.destructor();
        this.renderCanvas = undefined;
      }
      return;
    }

    this.renderCanvas = renderCanvas;
    this.watcherHandle = DataStoreWatch.createDataReactor(0, this.updateCanvasSize, false);

    const curPos = this.context.readerContext.getVRData(null, ['positions', 'current']);
    if (!curPos) {
      this.readerCache!.scrollTo({
        entryIdx: 0,
      });
      return;
    }
    const entryIdx: number = this.context.readerContext.getEntryIdxFromElementID(curPos.elID) || 0;
    this.readerCache!.scrollTo({
      entryIdx: entryIdx,
      firstChar: curPos.firstChar,
    });
  }

  private draw = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    const renderPerf = ClientPerf.start('Reader', 'renderCanvas');

    const startTime = Date.now();

    this.readerCache!.render(ctx, width, height);

    const dt = Date.now() - startTime;
    this.dtSum += dt;
    this.dtCount++;

    // record slow render frames
    if (dt > 500 && !IpcClientUtil.isTestClient()) {
      this.context.readerContext.recordMetric('slowFrame', undefined, dt);
    }

    // record average frameDT every N frames
    if (this.dtCount >= AVG_DT_FRAME_COUNT) {
      const avgDT = this.dtSum / this.dtCount;
      this.dtSum = 0;
      this.dtCount = 0;
      this.context.readerContext.recordMetric('frameDt', undefined, avgDT);
    }

    if (this.firstRenderPerf) {
      ClientPerf.stop(this.firstRenderPerf);
      this.firstRenderPerf = undefined;
    }
    ClientPerf.stop(renderPerf);

    return false;
  }

  render() {
    if (!this.readerCache) {
      this.firstRenderPerf = ClientPerf.start('Reader', 'renderCanvasFirst');
      this.nav = new Nav(this.context.readerContext);
      this.readerCache = new ReaderCache(this.context.readerContext, this.nav, this.getCanvas, this.getScreenOffset);
    }

    return (
      <RenderCanvas
        ref={this.setRenderer}
        classes='fg-1'
        drawFunc={this.draw}
        onStoppedRendering={this.readerCache.onStoppedRendering}
        onBuffering={this.readerCache.onBuffering}
        getTouchAndScrollHandlersAt={this.readerCache.getTouchAndScrollHandlersAt}
        recordMetric={this.context.readerContext.recordMetric}
      />
    );
  }
}
