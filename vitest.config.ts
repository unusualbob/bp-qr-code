import { defineVitestConfig } from '@stencil/vitest/config';

export default defineVitestConfig({
  stencilConfig: './stencil.config.ts',
  test: {
    include: ['src/**/*.spec.tsx'],
    environment: 'stencil',
    setupFiles: ['./vitest-setup.ts']
  }
});
