/**
 * @satisfies {import("prettier").Config}
 * @see https://prettier.io/docs/en/configuration.html
 */
const config = {
  attributeGroup: ['^(id|name)$', '^data-', '^class$', '$DEFAULT'],
  bracketSpacing: true,
  plugins: ['prettier-plugin-organize-attributes'],
  pluginSearchDirs: false,
  singleQuote: true,
  trailingComma: 'es5',
};

export default config;