/**
* Copyright 2017-present Ampersand Technologies, Inc.
*/

import { ProviderContext } from 'clientjs/components/CanvasReader/ContextProvider.tsx';
import * as ReaderStyle from 'clientjs/components/CanvasReader/ReaderStyle';
import * as StandardAnims from 'clientjs/components/CanvasReader/StandardAnims';
import * as ReaderRoutes from 'clientjs/readerRoutes';
import * as Util from 'overlib/client/clientUtil';
import { DataWatcher } from 'overlib/client/components/DataWatcher';
import * as Flex from 'overlib/client/components/Flex.tsx';
import * as GestureControl from 'overlib/client/components/GestureControl';
import { TouchHandler, TouchLikeEvent, getTouches } from 'overlib/client/components/Layout/TouchDispatcher';
import * as Log from 'overlib/client/log';
import * as Navigation from 'overlib/client/navigation';
import * as MathUtils from 'overlib/shared/mathUtils';
import { Point, ScreenSpacePoint } from 'overlib/shared/mathUtils';
import * as PropTypes from 'prop-types';
import * as React from 'react';

const SvgCloseX = 'icons/icon_x_thin_21x21.svg';
const SvgLeftArrow = 'icons/icon_reader_lightbox_Larrow.svg';
const SvgRightArrow = 'icons/icon_reader_lightbox_Rarrow.svg';

interface ImageInfo {
  width: number;
  height: number;
  url: string;
  paraID: string;
}

interface LightBoxProps {
  imageIndex: number;
  images: Readonly<ImageInfo>[];
  onClose?: () => void;
}

interface LightBoxState {
  zoom: number;
  imageZoomCenter: Point; // in texture space (0, 1)
  screenZoomCenter: ScreenSpacePoint;
  touches: StashOf<ScreenSpacePoint>;

  animationCounter: number;
  animationDirection: 'left' | 'right' | null;
}

export class ImageLightbox extends DataWatcher<LightBoxProps, LightBoxState> implements TouchHandler {
  static contextTypes = Util.shallowCloneAndCopy(DataWatcher.contextTypes, {
    readerContext: PropTypes.object.isRequired,
  });

  context: ProviderContext;

  private minZoom = 1;

  static initialState: LightBoxState = {
    zoom: 1,
    imageZoomCenter: { x: 0.5, y: 0.5 },
    screenZoomCenter: { x: 0, y: 0 } as ScreenSpacePoint,
    touches: {} as StashOf<ScreenSpacePoint>,

    animationCounter: 0,
    animationDirection: null,
  };

  state = Util.clone(ImageLightbox.initialState);

  reset(props) {
    const image = this.getImage(props);

    const pageWidth: number = this.context.readerContext.getUIState(this, ['page', 'width']);
    const pageHeight: number = this.context.readerContext.getUIState(this, ['page', 'height']);

    this.minZoom = 1;

    if (image.width > pageWidth) {
      this.minZoom = pageWidth / image.width;
    }

    if (image.height > pageHeight) {
      let heightRatio = pageHeight / image.height;

      if (heightRatio < this.minZoom) {
        this.minZoom = heightRatio;
      }
    }

    this.setState({
      zoom: this.minZoom,
      imageZoomCenter: {
        x: 0.5, y: 0.5,
      },
      screenZoomCenter: {
        x: 0.5 * pageWidth,
        y: 0.5 * pageHeight,
      } as ScreenSpacePoint,
    });
  }

  private getImage(props?: LightBoxProps): ImageInfo {
    props = props || this.props;
    if (props.imageIndex < 0 || props.imageIndex >= props.images.length) {
      Log.error('@unassigned', 'ImageLightbox.bad.imageIndex', {imageIndex: props.imageIndex, imageCount: props.images.length});
    }

    return props.images[props.imageIndex];
  }

  componentWillMount() {
    super.componentWillMount();

    GestureControl.suppress('BackSwipe');

    this.reset(this.props);

    const image = this.getImage(this.props);

    this.context.readerContext.recordMetric('lightbox.opened', {
      image: image.url,
      paraID: image.paraID,
    });
  }

  componentWillUnmount() {
    GestureControl.unsuppress('BackSwipe');

    const image = this.getImage();

    this.context.readerContext.recordMetric('lightbox.closed', {
      image: image.url,
      paraID: image.paraID,
    });

    super.componentWillUnmount();
  }

  componentWillReceiveProps(newProps) {
    if (this.props.imageIndex !== newProps.imageIndex) {
      this.reset(newProps);
    }
  }

  private setZoomAround(zoom: number, zoomCenter: ScreenSpacePoint, centerForDrag?: ScreenSpacePoint) {
    zoom = MathUtils.clamp(this.minZoom, 100, zoom);
    const imageZoomCenter = this.screenToImageSpace(zoomCenter, centerForDrag);
    this.setState({zoom, imageZoomCenter, screenZoomCenter: zoomCenter});
  }

  onTouchStart = (e: TouchLikeEvent) => {
    this.setState({ touches: getTouches(e) });
  }

  onTouchMove = (e: TouchLikeEvent) => {
    const oldTouches = this.state.touches;
    const newTouches = getTouches(e);

    const oldKeys = Object.keys(oldTouches).sort();
    const newKeys = Object.keys(newTouches).sort();
    for (let i = 0; i < Math.max(oldKeys.length, newKeys.length); ++i) {
      if (oldKeys[i] !== newKeys[i]) {
        // touch IDs changed
        this.setState({ touches: newTouches });
        return;
      }
    }

    let zoom = this.state.zoom;
    if (newKeys.length > 1) {
      let d0 = MathUtils.dist(oldTouches[newKeys[0]], oldTouches[newKeys[1]]);
      let d1 = MathUtils.dist(newTouches[newKeys[0]], newTouches[newKeys[1]]);
      if (d0) {
        zoom *= d1 / d0;
      }
    }

    const oldCentroid = { x: 0, y: 0 } as ScreenSpacePoint;
    const newCentroid = { x: 0, y: 0 } as ScreenSpacePoint;
    for (const key in newTouches) {
      oldCentroid.x += oldTouches[key].x / newKeys.length;
      oldCentroid.y += oldTouches[key].y / newKeys.length;
      newCentroid.x += newTouches[key].x / newKeys.length;
      newCentroid.y += newTouches[key].y / newKeys.length;
    }

    const offsetCenter = {
      x: this.state.screenZoomCenter.x + newCentroid.x - oldCentroid.x,
      y: this.state.screenZoomCenter.y + newCentroid.y - oldCentroid.y,
    } as ScreenSpacePoint;

    this.setZoomAround(zoom, newCentroid, offsetCenter);
    this.setState({ touches: newTouches });
  }

  onTouchEnd = (_e: TouchLikeEvent) => {
    this.setState({ touches: {} });

    const image = this.getImage();

    const imageSize = {x: image.width, y: image.height};

    const imageScreenSize = {
      x: imageSize.x * this.state.zoom,
      y: imageSize.y * this.state.zoom,
    };

    const screenSize = this.getScreenSize();

    const upperLeft = this.imageToScreenSpace({ x: 0, y: 0 });
    const lowerRight = {
      x: upperLeft.x + image.width * this.state.zoom,
      y: upperLeft.y + image.height * this.state.zoom,
    };

    for (const c of ['x', 'y']) {
      const min = upperLeft[c];
      const max = lowerRight[c];
      const size = screenSize[c];
      const screenZoomCenter = {
        x: this.state.screenZoomCenter.x,
        y: this.state.screenZoomCenter.y,
      } as ScreenSpacePoint;

      if (imageScreenSize[c] < size) {
        if (min < 0) {
          screenZoomCenter[c] -= min;
          this.setState({screenZoomCenter});
        } else if (max >= size) {
          screenZoomCenter[c] = size - (1 - this.state.imageZoomCenter[c]) * imageSize[c] * this.state.zoom;
          this.setState({screenZoomCenter});
        }
      } else {
        if (min > 0) {
          screenZoomCenter[c] -= min;
          this.setState({screenZoomCenter});
        } else if (max <= size) {
          screenZoomCenter[c] = size - (1 - this.state.imageZoomCenter[c]) * imageSize[c] * this.state.zoom;
          this.setState({screenZoomCenter});
        }
      }
    }
  }

  onWheel = (e: React.WheelEvent<any>) => {
    const p = (Util.eventPageX(e) || { x: 0, y: 0 }) as ScreenSpacePoint;
    this.setZoomAround(this.state.zoom - (e.deltaY / 200), p);
  }

  private imageToScreenSpace(imageP: Point): ScreenSpacePoint {
    const image = this.getImage();

    const imgWidth = image.width * this.state.zoom;
    const imgHeight = image.height * this.state.zoom;

    return {
      x: imageP.x + this.state.screenZoomCenter.x - this.state.imageZoomCenter.x * imgWidth,
      y: imageP.y + this.state.screenZoomCenter.y - this.state.imageZoomCenter.y * imgHeight,
    } as ScreenSpacePoint;
  }

  private screenToImageSpace(screenP: ScreenSpacePoint, screenZoomCenter?: ScreenSpacePoint, imageZoomCenter?: Point): Point {
    screenZoomCenter = screenZoomCenter || this.state.screenZoomCenter;
    imageZoomCenter = imageZoomCenter || this.state.imageZoomCenter;

    const image = this.getImage();

    const imgWidth = image.width * this.state.zoom;
    const imgHeight = image.height * this.state.zoom;

    return {
      x: imageZoomCenter.x + (screenP.x - screenZoomCenter.x) / imgWidth,
      y: imageZoomCenter.y + (screenP.y - screenZoomCenter.y) / imgHeight,
    };
  }

  private swipe(direction: 'left' | 'right', cb: () => void) {
    this.setState({
      animationDirection: direction,
    }, () => {
      this.setState({
        animationCounter: this.state.animationCounter + 1,
      });
      cb();
    });
  }

  goNext = () => {
    this.swipe('right', () => {
      const newIndex = (this.props.imageIndex + 1) % this.props.images.length;
      this.context.readerContext.replaceUIState(['lightboxImageIndex'], newIndex);
    });
  }

  goPrev = () => {
    this.swipe('left', () => {
      const newIndex = (this.props.imageIndex - 1 + this.props.images.length) % this.props.images.length;
      this.context.readerContext.replaceUIState(['lightboxImageIndex'], newIndex);
    });
  }

  getScreenSize(): ScreenSpacePoint {
    return {
      x: this.context.readerContext.getUIState(this, ['page', 'width']),
      y: this.context.readerContext.getUIState(this, ['page', 'height']),
    } as ScreenSpacePoint;
  }

  render() {
    if (this.props.images.length < 1) {
      Log.error('@unassigned', 'ImageLightbox.no_images');
      Navigation.go(ReaderRoutes.root);
      return;
    }

    const image = this.getImage();

    const imageSize = {x: image.width, y: image.height};

    const imageScreenSize = {
      x: imageSize.x * this.state.zoom,
      y: imageSize.y * this.state.zoom,
    };

    const screenSize = this.getScreenSize();

    const upperLeft = this.imageToScreenSpace({ x: 0, y: 0 });
    const lowerRight = {
      x: upperLeft.x + image.width * this.state.zoom,
      y: upperLeft.y + image.height * this.state.zoom,
    };

    for (const c of ['x', 'y']) {
      const min: number = upperLeft[c];
      const max: number = lowerRight[c];
      const size: number = screenSize[c];

      if (imageScreenSize[c] < size) {
        // The image can fit onscreen.  Don't let it clip off the edges.
        if (min < 0) {
          upperLeft[c] = 0;
        } else if (max >= size) {
          upperLeft[c] = size - imageScreenSize[c];
        }
      } else {
        // Image does not fit onscreen.  Force as much of it as possible onto the screen
        if (min > 0) {
          upperLeft[c] = 0;
        } else if (max <= size) {
          upperLeft[c] = size - imageScreenSize[c];
        }
      }
    }

    const style: React.CSSProperties = {
      left: upperLeft.x,
      top: upperLeft.y,
      width: image.width * this.state.zoom,
      height: image.height * this.state.zoom,
    };

    const slideAnim = this.state.animationDirection === null
      ? null
      : (this.state.animationDirection === 'left'
        ? StandardAnims.slideLeft(screenSize.x)
        : StandardAnims.slideRight(screenSize.x)
    );

    const arrowClasses = 'c-white-f w-20 h-20 p-x-30 p-y-20 c-smoke-f active:c-white-f';

    return (
      <div
        classes='c-black-bg'
        style={{ width: screenSize.x, height: screenSize.y }}
        data-touchHandler={this}
      >
        <div
          key={this.state.animationCounter}
          style={{backgroundColor: 'black', left: 0, top: 0, width: screenSize.x, height: screenSize.y}}
          {...slideAnim}
        >
          <img src={image.url} style={style} />
        </div>
        <svg name={SvgCloseX} classes='right-0 top-0 p-15 w-20 h-20 c-smoke-f active:c-white-f' onClick={this.props.onClose} />
        { this.props.images.length === 1
        ? null
        : <Flex.Row
            classes={Util.combineClasses(
              `c-#0008-bg c-white-fg pos-a ai-c left-0`,
              `bot-${ReaderStyle.LAYOUT_CONSTANTS.SAFE_AREA_BOTTOM}`,
              `w-${screenSize.x}`,
            )}>
            <Flex.Col classes='fg-3' />
            <Flex.Col>
              { this.props.imageIndex > 0
              ? <svg name={SvgLeftArrow} classes={arrowClasses} onClick={this.goPrev} />
              : <div classes={arrowClasses} />
              }
            </Flex.Col>
            <Flex.Col classes='fg-2' />
            <Flex.Col classes='w-80 ai-c p-t-2'>
              <div style={{fontFamily: 'Montserrat'}}>
                {`page ${this.props.imageIndex + 1} of ${this.props.images.length}`}
              </div>
            </Flex.Col>
            <Flex.Col classes='fg-2' />
            <Flex.Col>
              { this.props.imageIndex < this.props.images.length - 1
              ? <svg name={SvgRightArrow} classes={arrowClasses} onClick={this.goNext} />
              : <div classes={arrowClasses} />
              }
            </Flex.Col>
            <Flex.Col classes='fg-3' />
          </Flex.Row>
        }
      </div>
    );
  }
}
