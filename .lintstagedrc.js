/* eslint-disable no-undef */
/** @type {import('lint-staged').Config} */
export default {
  '*.{js,jsx}': ['eslint --fix', 'prettier --write'],
  '*.{json,css,md}': ['prettier --write'],
};
