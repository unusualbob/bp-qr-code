import {
  Component,
  Element,
  Event,
  EventEmitter,
  h,
  Method,
  Prop,
  State,
  Watch
} from '@stencil/core';

import { addPlugin, animate } from 'just-animate';
import { waapiPlugin } from 'just-animate/lib.es2015/web';
import qrcode from 'qrcode-generator';
import {
  getAnimationPreset,
  QRCodeAnimation,
  QRCodeEntity,
  AnimationPreset
} from './animations';

addPlugin(waapiPlugin);

@Component({
  tag: 'bp-qr-code',
  styleUrl: 'bp-qr-code.css',
  shadow: true
})
export class BpQRCode {
  @Element() qrCodeElement: HTMLElement;

  @Prop() contents = '';
  @Prop() protocol = '';
  @Prop() moduleColor = '#000';
  @Prop() positionRingColor = '#000';
  @Prop() positionCenterColor = '#000';
  @Prop() maskXToYRatio = 1;
  @Prop() legacy = false;

  @State() data = '';
  @State() moduleCount = 0;

  @Event() codeRendered: EventEmitter<void>;

  /**
   * The first update must run after load to query the created shadowRoot for
   * slotted nodes.
   */
  componentDidLoad() {
    this.updateQR();
  }

  componentDidUpdate() {
    this.codeRendered.emit();
  }

  @Watch('contents')
  @Watch('protocol')
  @Watch('moduleColor')
  @Watch('positionRingColor')
  @Watch('positionCenterColor')
  @Watch('maskXToYRatio')
  @Watch('legacy')
  updateQR() {
    const realSlot = this.qrCodeElement.shadowRoot?.querySelector('slot');
    const hasSlot = realSlot ? realSlot.assignedNodes().length > 0 : false;

    this.data = this.generateQRCodeSVG(this.contents, hasSlot);
  }

  /**
   * Modern Stencil exposes public component methods asynchronously. Existing
   * callers that ignore the return value continue to work unchanged.
   */
  @Method()
  async animateQRCode(animation?: AnimationPreset | QRCodeAnimation): Promise<void> {
    this.executeAnimation(
      typeof animation === 'string' ? getAnimationPreset(animation) : animation
    );
  }

  @Method()
  async getModuleCount(): Promise<number> {
    return this.moduleCount;
  }

  executeAnimation(animation: QRCodeAnimation) {
    const shadowRoot = this.qrCodeElement.shadowRoot;
    if (!shadowRoot) return;

    const modules = Array.from(shadowRoot.querySelectorAll('.module'));
    const rings = Array.from(shadowRoot.querySelectorAll('.position-ring'));
    const centers = Array.from(shadowRoot.querySelectorAll('.position-center'));
    const icons = Array.from(shadowRoot.querySelectorAll('#icon-wrapper'));
    const setEntityType = (array: Element[], entity: QRCodeEntity) => {
      return array.map(element => ({ element, entityType: entity }));
    };

    const animationAdditions = [
      ...setEntityType(modules, QRCodeEntity.Module),
      ...setEntityType(rings, QRCodeEntity.PositionRing),
      ...setEntityType(centers, QRCodeEntity.PositionCenter),
      ...setEntityType(icons, QRCodeEntity.Icon)
    ]
      .map(({ element, entityType }) => ({
        element,
        positionX: parseInt((element as HTMLElement).dataset.column || '0', 10),
        positionY: parseInt((element as HTMLElement).dataset.row || '0', 10),
        entityType
      }))
      .map(entityInfo =>
        animation(
          entityInfo.element,
          entityInfo.positionX,
          entityInfo.positionY,
          this.moduleCount,
          entityInfo.entityType
        )
      );

    animate(animationAdditions).play();
  }

  generateQRCodeSVG(contents: string, maskCenter: boolean) {
    const qr = qrcode(
      /* Auto-detect QR Code version to use */ 0,
      /* Highest error correction level */ 'H'
    );
    qr.addData(contents);
    qr.make();
    const margin = 4;
    this.moduleCount = qr.getModuleCount();
    const pixelSize = this.moduleCount + margin * 2;
    const coordinateShift = pixelSize / 2;
    return `
    <svg
        version="1.1"
        xmlns="http://www.w3.org/2000/svg"
        width="100%"
        height="100%"
        viewBox="${0 - coordinateShift} ${0 -
      coordinateShift} ${pixelSize} ${pixelSize}"
        preserveAspectRatio="xMinYMin meet">
    <rect
        width="100%"
        height="100%"
        fill="white"
        fill-opacity="0"
        cx="${-coordinateShift}"
        cy="${-coordinateShift}"/>
    ${
      this.legacy
        ? ''
        : renderQRPositionDetectionPatterns(
            this.moduleCount,
            margin,
            this.positionRingColor,
            this.positionCenterColor,
            coordinateShift
          )
    }
    ${renderQRModulesSVG(
      qr,
      this.moduleCount,
      margin,
      maskCenter,
      this.maskXToYRatio,
      this.legacy,
      this.moduleColor,
      coordinateShift
    )}
    </svg>`;

    function renderQRPositionDetectionPatterns(
      count: number,
      margin: number,
      ringFill: string,
      centerFill: string,
      coordinateShift: number
    ) {
      return `
      ${renderQRPositionDetectionPattern(
        margin,
        margin,
        margin,
        ringFill,
        centerFill,
        coordinateShift
      )}
      ${renderQRPositionDetectionPattern(
        count - 7 + margin,
        margin,
        margin,
        ringFill,
        centerFill,
        coordinateShift
      )}
      ${renderQRPositionDetectionPattern(
        margin,
        count - 7 + margin,
        margin,
        ringFill,
        centerFill,
        coordinateShift
      )}
      `;
    }

    function renderQRPositionDetectionPattern(
      x: number,
      y: number,
      margin: number,
      ringFill: string,
      centerFill: string,
      coordinateShift: number
    ) {
      return `
      <path class="position-ring" fill="${ringFill}" data-column="${x -
        margin}" data-row="${y - margin}" d="M${x - coordinateShift} ${y -
        0.5 -
        coordinateShift}h6s.5 0 .5 .5v6s0 .5-.5 .5h-6s-.5 0-.5-.5v-6s0-.5 .5-.5zm.75 1s-.25 0-.25 .25v4.5s0 .25 .25 .25h4.5s.25 0 .25-.25v-4.5s0-.25-.25-.25h-4.5z"/>
      <path class="position-center" fill="${centerFill}" data-column="${x -
        margin +
        2}" data-row="${y - margin + 2}" d="M${x + 2 - coordinateShift} ${y +
        1.5 -
        coordinateShift}h2s.5 0 .5 .5v2s0 .5-.5 .5h-2s-.5 0-.5-.5v-2s0-.5 .5-.5z"/>
      `;
    }

    function renderQRModulesSVG(
      qrCode: ReturnType<typeof qrcode>,
      count: number,
      margin: number,
      maskCenter: boolean,
      maskXToYRatio: number,
      legacy: boolean,
      moduleFill: string,
      coordinateShift: number
    ) {
      let svg = '';
      for (let column = 0; column < count; column += 1) {
        const positionX = column + margin;
        for (let row = 0; row < count; row += 1) {
          if (
            qrCode.isDark(column, row) &&
            (legacy ||
              (!isPositioningElement(row, column, count) &&
                !isRemovableCenter(
                  row,
                  column,
                  count,
                  maskCenter,
                  maskXToYRatio
                )))
          ) {
            const positionY = row + margin;
            svg += legacy
              ? `
            <rect x="${positionX - 0.5 - coordinateShift}" y="${positionY -
                  0.5 -
                  coordinateShift}" width="1" height="1" />
            `
              : `
            <circle
                class="module"
                fill="${moduleFill}"
                cx="${positionX - coordinateShift}"
                cy="${positionY - coordinateShift}"
                data-column="${column}"
                data-row="${row}"
                r="0.5"/>`;
          }
        }
      }
      return svg;
    }

    function isPositioningElement(row: number, column: number, count: number) {
      const elemWidth = 7;
      return row <= elemWidth
        ? column <= elemWidth || column >= count - elemWidth
        : column <= elemWidth
          ? row >= count - elemWidth
          : false;
    }

    /**
     * For ErrorCorrectionLevel 'H', up to 30% of the code can be corrected. To
     * be safe, we limit damage to 10%.
     */
    function isRemovableCenter(
      row: number,
      column: number,
      count: number,
      maskCenter: boolean,
      maskXToYRatio: number
    ) {
      if (!maskCenter) return false;
      const center = count / 2;
      const safelyRemovableHalf = Math.floor((count * Math.sqrt(0.1)) / 2);
      const safelyRemovableHalfX = safelyRemovableHalf * maskXToYRatio;
      const safelyRemovableHalfY = safelyRemovableHalf / maskXToYRatio;
      const safelyRemovableStartX = center - safelyRemovableHalfX;
      const safelyRemovableEndX = center + safelyRemovableHalfX;
      const safelyRemovableStartY = center - safelyRemovableHalfY;
      const safelyRemovableEndY = center + safelyRemovableHalfY;

      return (
        row >= safelyRemovableStartY &&
        row <= safelyRemovableEndY &&
        column >= safelyRemovableStartX &&
        column <= safelyRemovableEndX
      );
    }
  }

  render() {
    return (
      <div id="qr-container">
        <div
          id="icon-container"
          style={this.legacy ? { display: 'none', visibility: 'hidden' } : {}}
        >
          <div
            id="icon-wrapper"
            style={{ width: `${18 * this.maskXToYRatio}%` }}
            data-column={this.moduleCount / 2}
            data-row={this.moduleCount / 2}
          >
            <slot name="icon" />
          </div>
        </div>
        {/*
          This remains an innerHTML sink for compatibility with the existing SVG
          generator. The SVG is generated only from QR data and component color
          values. Replacing it with JSX/DOM nodes is intentionally left for a
          follow-up so the CSP toolchain migration does not alter QR geometry.
        */}
        <div innerHTML={this.data} />
      </div>
    );
  }
}
