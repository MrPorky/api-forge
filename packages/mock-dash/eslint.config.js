import antfu from '@antfu/eslint-config'

export default antfu({
  type: 'lib',
  typescript: true,
  formatters: true,
  ignores: ['**/*gen.ts', 'examples/**/*'],
  rules: {
    'no-alert': 'off',
    'ts/explicit-function-return-type': 'off',
  },
})
