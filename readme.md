# BitPay QR Code

A framework-less QR Code Web Component.

## Usage

The preferred modern consumption model is the direct custom-element build, which defines `bp-qr-code` without the legacy Stencil ES5/ESM feature-detection loader:

```js
import '@bitpay/qr-code/bp-qr-code';
```

Then use the component anywhere in the document:

```html
<bp-qr-code contents="bitcoin:?r=https://bitpay.com/i/example"></bp-qr-code>
```

Modern browsers provide the Web Animations API used by `animateQRCode()`. The public Stencil methods are asynchronous in modern Stencil, so callers that use their return values should await them:

```js
await document.getElementById('qr1').animateQRCode('MaterializeIn');
const moduleCount = await document.getElementById('qr1').getModuleCount();
```

Existing callers that invoke `animateQRCode()` only for its side effect do not need to change.

## Content Security Policy

Generated QR component distribution assets are required to remain compatible with BitPay's strict script CSP and must not require `script-src 'unsafe-eval'`.

The project deliberately does not generate Stencil's `www` compatibility bundle. That output includes a legacy feature-detection loader which uses dynamic code generation even when the component itself does not. Consumers should use the direct `dist-custom-elements` build instead.

`npm run build` scans every generated JavaScript file under `dist/` and fails if it finds `eval(` or `new Function(`. `npm run test:csp` loads `dist/components/bp-qr-code.js` directly in Chromium with `script-src 'self'` and verifies rendering, property updates, the center icon, animation invocation, and the absence of CSP script violations.

The CSP browser fixture allows inline styles because Stencil injects component CSS at runtime; removing invoice-wide `unsafe-inline` is explicitly outside this modernization. The component also still renders its generated SVG string through an `innerHTML` sink. That is not the source of the historical `unsafe-eval` requirement; converting the QR SVG generator to JSX/DOM nodes is intentionally left as a follow-up to avoid changing QR geometry during this toolchain migration.

## Examples

```html
<bp-qr-code
  id="qr1"
  contents="customprotocol:?r=https://bitpay.com/i/exampleh3mCKGUna7v9S1z"
  module-color="#1c7d43"
  position-ring-color="#13532d"
  position-center-color="#1c7d43"
  mask-x-to-y-ratio="1.2"
  style="width: 200px; height: 200px; background-color: #fff"
>
  <img src="assets/icon.svg" slot="icon" />
</bp-qr-code>
```

## Contributing

Node.js 20 or newer is required.

```bash
npm install
npm start
```

`npm start` runs a development watch build. The CSP smoke fixture is served automatically by `npm run test:csp` after a production build.

### Production build

```bash
npm run build
```

### Run the tests

```bash
npm test
```

### Run the real-browser CSP smoke test

Build first, install Chromium for Playwright if necessary, then:

```bash
npm run build
npx playwright install chromium
npm run test:csp
```
