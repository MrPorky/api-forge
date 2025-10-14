import antfu from '@antfu/eslint-config'

export default antfu({
  type: 'lib',
  typescript: true,
  formatters: true,
  rules: {
    'ts/explicit-function-return-type': 'off',
  },
})
