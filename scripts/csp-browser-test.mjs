import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, join, normalize } from 'node:path';
import { chromium } from 'playwright';

const root = join(process.cwd(), 'www');
const contentTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml'
};
const csp = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "object-src 'none'",
  "base-uri 'self'"
].join('; ');

const server = createServer(async (request, response) => {
  try {
    const requestPath = new URL(request.url || '/', 'http://localhost').pathname;
    const normalized = normalize(requestPath === '/' ? '/index.html' : requestPath).replace(
      /^(\.\.[/\\])+/, 
      ''
    );
    const file = join(root, normalized);
    const fileStat = await stat(file);
    if (!fileStat.isFile()) throw new Error('not a file');

    response.writeHead(200, {
      'Content-Type': contentTypes[extname(file)] || 'application/octet-stream',
      'Content-Security-Policy': csp
    });
    createReadStream(file).pipe(response);
  } catch {
    response.writeHead(404);
    response.end('Not found');
  }
});

await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const address = server.address();
if (!address || typeof address === 'string') throw new Error('Unable to start CSP test server');

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
const consoleErrors = [];
const pageErrors = [];
page.on('console', message => {
  if (message.type() === 'error') consoleErrors.push(message.text());
});
page.on('pageerror', error => pageErrors.push(error.message));

try {
  await page.goto(`http://127.0.0.1:${address.port}/`, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => customElements.get('bp-qr-code'));

  const result = await page.evaluate(async () => {
    const qr = document.querySelector('#qr1');
    if (!qr) throw new Error('QR fixture was not found');
    await qr.componentOnReady?.();

    const initialSvg = Boolean(qr.shadowRoot?.querySelector('svg'));
    const iconNodes = qr.shadowRoot?.querySelector('slot[name="icon"]')?.assignedNodes().length || 0;
    const rendered = new Promise(resolve => qr.addEventListener('codeRendered', resolve, { once: true }));
    qr.contents = 'bitcoin:?r=https://bitpay.com/i/csp-updated';
    await rendered;
    const moduleCount = await qr.getModuleCount();
    await qr.animateQRCode('RadialRipple');

    return {
      initialSvg,
      updatedSvg: Boolean(qr.shadowRoot?.querySelector('svg')),
      iconNodes,
      moduleCount
    };
  });

  const cspErrors = consoleErrors.filter(message => /content security policy|refused to/i.test(message));
  if (!result.initialSvg || !result.updatedSvg) throw new Error('QR SVG did not render');
  if (result.iconNodes < 1) throw new Error('Slotted center icon was not assigned');
  if (result.moduleCount < 1) throw new Error('getModuleCount() returned an invalid value');
  if (cspErrors.length > 0) throw new Error(`CSP violations: ${cspErrors.join(' | ')}`);
  if (pageErrors.length > 0) throw new Error(`Page errors: ${pageErrors.join(' | ')}`);

  console.log('CSP browser test passed under script-src self without unsafe-eval.');
} finally {
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}
