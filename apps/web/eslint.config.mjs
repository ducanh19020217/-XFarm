import config from '@xfarm/config/eslint';
import nextPlugin from '@next/eslint-plugin-next';

export default [
  ...config,
  {
    plugins: {
      '@next/next': nextPlugin,
    },
    rules: {
      ...nextPlugin.configs.recommended.rules,
      '@next/next/no-img-element': 'off',
    },
  },
  {
    ignores: ['.next/**', 'dist/**', 'node_modules/**'],
  },
];
