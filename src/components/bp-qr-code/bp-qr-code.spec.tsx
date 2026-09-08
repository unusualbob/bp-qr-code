import { describe, expect, h, it, render } from '@stencil/vitest';

describe('bp-qr-code', () => {
  it('renders a QR code and exposes its module count', async () => {
    const { root } = await render(
      <bp-qr-code contents="bitcoin:?r=https://bitpay.com/i/example" />
    );
    const qr = root as any;

    expect(root.shadowRoot?.querySelector('svg')).not.toBeNull();
    expect(root.shadowRoot?.querySelectorAll('.module').length).toBeGreaterThan(0);
    await expect(qr.getModuleCount()).resolves.toBeGreaterThan(0);
  });

  it('rerenders when contents and protocol change and emits codeRendered', async () => {
    const { root, waitForChanges } = await render(
      <bp-qr-code contents="bitcoin:initial" protocol="bitcoin" />
    );
    const qr = root as any;
    let renderEvents = 0;
    root.addEventListener('codeRendered', () => renderEvents++);

    qr.contents = 'bitcoin:updated';
    qr.protocol = 'BITCOIN';
    await waitForChanges();

    expect(qr.contents).toBe('bitcoin:updated');
    expect(qr.protocol).toBe('BITCOIN');
    expect(renderEvents).toBeGreaterThan(0);
  });

  it('applies module and positioning colors', async () => {
    const { root } = await render(
      <bp-qr-code
        contents="bitcoin:colors"
        moduleColor="#123456"
        positionRingColor="#234567"
        positionCenterColor="#345678"
      />
    );

    expect(root.shadowRoot?.querySelector('.module')?.getAttribute('fill')).toBe('#123456');
    expect(root.shadowRoot?.querySelector('.position-ring')?.getAttribute('fill')).toBe('#234567');
    expect(root.shadowRoot?.querySelector('.position-center')?.getAttribute('fill')).toBe('#345678');
  });

  it('preserves legacy rendering behavior', async () => {
    const { root } = await render(
      <bp-qr-code contents="bitcoin:legacy" legacy={true}>
        <span slot="icon">icon</span>
      </bp-qr-code>
    );

    expect(root.shadowRoot?.querySelector('.position-ring')).toBeNull();
    expect(root.shadowRoot?.querySelector('.module')).toBeNull();
    expect(root.shadowRoot?.querySelectorAll('svg rect').length).toBeGreaterThan(1);
    expect(root.shadowRoot?.querySelector('#icon-container')?.getAttribute('style')).toContain(
      'display: none'
    );
  });

  it('masks the center for a slotted icon and honors maskXToYRatio', async () => {
    const plain = await render(<bp-qr-code contents="bitcoin:mask-test" />);
    const withIcon = await render(
      <bp-qr-code contents="bitcoin:mask-test" maskXToYRatio={1.5}>
        <span slot="icon">icon</span>
      </bp-qr-code>
    );

    const plainModules = plain.root.shadowRoot?.querySelectorAll('.module').length || 0;
    const maskedModules = withIcon.root.shadowRoot?.querySelectorAll('.module').length || 0;
    expect(maskedModules).toBeLessThan(plainModules);
    expect(withIcon.root.shadowRoot?.querySelector('#icon-wrapper')?.getAttribute('style')).toContain(
      '27%'
    );
  });
});
