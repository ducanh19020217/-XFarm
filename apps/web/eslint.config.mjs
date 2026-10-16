import config from '@xfarm/config/eslint';

export default [
  ...config,
  {
    ignores: ['.next/**', 'dist/**', 'node_modules/**'],
  },
];
