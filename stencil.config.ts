import type { Config } from '@stencil/core';

export const config: Config = {
  namespace: 'bp-qr-code',
  outputTargets: [
    {
      type: 'dist',
      esmLoaderPath: '../loader'
    },
    {
      type: 'dist-custom-elements',
      customElementsExportBehavior: 'auto-define-custom-elements',
      externalRuntime: false
    }
  ]
};
